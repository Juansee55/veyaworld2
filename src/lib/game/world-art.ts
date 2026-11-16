import { supabase } from "@/integrations/supabase/client";
import { validateWorldArt } from "./world-art-rules";
export type WorldAsset = import("@/integrations/supabase/types").Database["public"]["Tables"]["world_assets"]["Row"];
const signedUrls = new Map<string, { expires: number; promise: Promise<string> }>();
export async function worldArtUrl(path: string) {
  const known = signedUrls.get(path);
  if (known && known.expires > Date.now()) return known.promise;
  const promise = supabase.storage.from("player-art").createSignedUrl(path, 3600).then(({ data, error }) => {
    if (error) { signedUrls.delete(path); throw error; }
    return data.signedUrl;
  });
  signedUrls.set(path, { expires: Date.now() + 3000000, promise });
  return promise;
}
export async function uploadWorldArt(file: File, kind: "tileset" | "object") {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("Seleccioná una imagen PNG, JPG, WebP o GIF.");
  const image = await createImageBitmap(file);
  try {
    validateWorldArt(kind, image.width, image.height);
    const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Iniciá sesión.");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "png";
    const path = `${user.id}/world/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("player-art").upload(path, file); if (uploadError) throw uploadError;
    const { data, error } = await supabase.from("world_assets").insert({ name: file.name.slice(0, 40), kind, path, width: image.width, height: image.height }).select().single();
    if (error) { await supabase.storage.from("player-art").remove([path]); throw error; }
    return data;
  } finally { image.close(); }
}