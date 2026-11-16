export function validateStatus(text: string) { if (text.length > 280) throw new Error("El estado admite hasta 280 caracteres."); return text.trim(); }
export function validateNews(title: string, body: string, admin: boolean) {
  if (!admin) throw new Error("Solo administradores pueden publicar noticias.");
  if (!title.trim() || title.trim().length > 120 || !body.trim() || body.trim().length > 10000) throw new Error("Completá el título y la noticia.");
  return { title: title.trim(), body: body.trim() };
}