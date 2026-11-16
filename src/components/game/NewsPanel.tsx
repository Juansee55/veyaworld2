import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { supabase } from "@/integrations/supabase/client";
import { worldArtUrl } from "@/lib/game/world-art";
import { validateNews } from "@/lib/game/social-rules";
import { notify } from "@/lib/game/notify";
import { PxButton, PxInput } from "./hub/ui";
import { Plus, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";

function NewsImage({ path, onOpen }: { path: string; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { let active = true; void worldArtUrl(path).then((url) => { if (active) setUrl(url); }).catch(() => {}); return () => { active = false; }; }, [path]);
  return url ? <PxButton className="mb-3 w-full border-0 bg-transparent p-0" onClick={() => onOpen(url)} aria-label="Ampliar imagen de noticia"><img src={url} alt="Imagen de noticia" loading="lazy" className="max-h-72 w-full object-contain" /></PxButton> : null;
}

export function NewsPanel({ isAdmin, userId, onClose }: { isAdmin: boolean; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const news = useQuery({ queryKey: ["world-news"], queryFn: async () => { const { data, error } = await supabase.from("world_news").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const [compose, setCompose] = useState(false), [title, setTitle] = useState(""), [body, setBody] = useState(""), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [image, setImage] = useState("");
  const publish = async () => {
    setBusy(true); let path: string | null = null;
    try {
      const fields = validateNews(title, body, isAdmin);
      if (file) {
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) throw new Error("Seleccioná una imagen.");
        path = `${userId}/news/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await supabase.storage.from("player-art").upload(path, file); if (error) throw error;
      }
      const { error } = await supabase.from("world_news").insert({ ...fields, author_id: userId, image_path: path }); if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["world-news"] }); setCompose(false); setTitle(""); setBody(""); setFile(null); notify("Noticia publicada");
    } catch (e) { if (path) await supabase.storage.from("player-art").remove([path]); notify(e instanceof Error ? e.message : "No se pudo publicar", "error"); }
    finally { setBusy(false); }
  };
  return <div className="absolute inset-0 z-40 flex flex-col bg-background/95 p-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]">
    <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><h2 className="text-2xl text-primary">Noticias</h2><div className="flex gap-2">{isAdmin && <PxButton onClick={() => setCompose(!compose)}><Plus className="mr-1 inline size-4" />Subir noticia</PxButton>}<PxButton onClick={onClose} aria-label="Cerrar noticias"><X className="size-4" /></PxButton></div></header>
    <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto touch-pan-y">
      {compose && isAdmin && <form onSubmit={(e) => { e.preventDefault(); void publish(); }} className="mb-6 flex flex-col gap-3 border-b-2 border-border pb-4">
        <PxInput placeholder="Título" aria-label="Título de noticia" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea aria-label="Texto de noticia" placeholder="Noticia" maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 border-2 border-border bg-input p-2 text-foreground" />
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Imagen de noticia" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <PxButton tone="primary" type="submit" disabled={busy}>{busy ? "Publicando…" : "Publicar"}</PxButton>
      </form>}
      {news.isPending && <p role="status">Cargando noticias…</p>}{news.error && <p role="alert" className="text-destructive">No se pudieron cargar las noticias.</p>}
      {news.data?.length === 0 && <p className="text-muted-foreground">Todavía no hay noticias.</p>}
      {news.data?.map((n) => <article key={n.id} className="mb-6 border-b border-border pb-6">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><div><time className="text-sm text-muted-foreground">{new Date(n.created_at).toLocaleDateString("es-AR")}</time><h3 className="break-words text-xl text-primary">{n.title}</h3></div>{isAdmin && <PxButton aria-label="Eliminar noticia" onClick={() => void (async () => { if (!window.confirm("¿Eliminar esta noticia?")) return; const { error } = await supabase.from("world_news").delete().eq("id", n.id); if (error) notify("No se pudo eliminar", "error"); else { if (n.image_path) await supabase.storage.from("player-art").remove([n.image_path]); await qc.invalidateQueries({ queryKey: ["world-news"] }); } })()}><Trash2 className="size-4" /></PxButton>}</div>
        {n.image_path && <NewsImage path={n.image_path} onOpen={setImage} />}<p className="whitespace-pre-wrap break-words text-lg">{n.body}</p>
      </article>)}
    </div>
    {image && <div className="absolute inset-0 z-50 bg-background"><TransformWrapper minScale={0.25} maxScale={8} centerOnInit>{({ zoomIn, zoomOut }) => <><TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}><img src={image} alt="Imagen ampliada de noticia" className="max-h-[85dvh] max-w-[95vw] object-contain" /></TransformComponent><div className="absolute right-4 top-4 flex gap-2"><PxButton aria-label="Acercar imagen" onClick={() => zoomIn()}><ZoomIn /></PxButton><PxButton aria-label="Alejar imagen" onClick={() => zoomOut()}><ZoomOut /></PxButton><PxButton aria-label="Cerrar imagen" onClick={() => setImage("")}><X /></PxButton></div></>}</TransformWrapper></div>}
  </div>;
}