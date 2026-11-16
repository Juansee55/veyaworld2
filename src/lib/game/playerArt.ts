import { supabase } from "@/integrations/supabase/client";
import type { ArtKind } from "@/game/art/layout";
export type PlayerArt = Awaited<ReturnType<typeof listMyArt>>[number];

const UPLOAD_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

async function resolveUser() {
  const { data: sessionData } = await withTimeout(
    supabase.auth.getSession(),
    10_000,
    "No se pudo verificar la sesión.",
  );
  if (sessionData.session?.user) return sessionData.session.user;
  const { data, error } = await withTimeout(
    supabase.auth.getUser(),
    10_000,
    "No se pudo verificar la sesión.",
  );
  if (error || !data.user) throw new Error("Sign in to upload");
  return data.user;
}

/** The signed-in player's own uploads. */
export async function listMyArt() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) return [];
  const { data, error } = await supabase.from("player_art").select("*").eq("user_id", user.id).order("created_at");
  if (error) throw new Error(errorMessage(error, "Could not list uploads"));
  return data ?? [];
}

export async function savePlayerArt(file: File, sheet: Blob, kind: ArtKind, frames: number, frameMs: number) {
  const user = await resolveUser();
  const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
  const folder = `${user.id}/${crypto.randomUUID()}`;
  const originalPath = `${folder}/original.${isGif ? "gif" : "png"}`;
  const sheetPath = `${folder}/sheet.png`;
  const uploaded: string[] = [];

  const uploadOne = async (path: string, content: Blob, contentType: string) => {
    const { error } = await withTimeout(
      supabase.storage.from("player-art").upload(path, content, { contentType, upsert: false }),
      UPLOAD_TIMEOUT_MS,
      "La subida tardó demasiado. Inténtalo de nuevo.",
    );
    if (error) throw new Error(errorMessage(error, "No se pudo subir la imagen"));
    uploaded.push(path);
  };

  try {
    await Promise.all([
      uploadOne(originalPath, file, isGif ? "image/gif" : "image/png"),
      uploadOne(sheetPath, sheet, "image/png"),
    ]);
    const { data, error } = await withTimeout(
      supabase
        .from("player_art")
        .insert({
          user_id: user.id,
          kind,
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Upload",
          original_path: originalPath,
          sheet_path: sheetPath,
          frames,
          frame_ms: frameMs,
        })
        .select()
        .single(),
      UPLOAD_TIMEOUT_MS,
      "No se pudo guardar el diseño en la base de datos.",
    );
    if (error) throw new Error(errorMessage(error, "No se pudo guardar el diseño"));
    return data;
  } catch (error) {
    if (uploaded.length > 0) {
      await withTimeout(supabase.storage.from("player-art").remove(uploaded), 5000, "Cleanup timeout").catch(() => undefined);
    }
    throw error instanceof Error ? error : new Error(errorMessage(error, "No se pudo guardar"));
  }
}

export async function deletePlayerArt(art: { id: string; sheet_path: string; original_path: string }) {
  const { error } = await supabase.from("player_art").delete().eq("id", art.id);
  if (error) throw new Error(errorMessage(error, "Upload could not be deleted."));
  await supabase.storage.from("player-art").remove([art.sheet_path, art.original_path]);
}
