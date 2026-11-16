export function validateWorldArt(kind: "tileset" | "object", width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error("La imagen debe tener dimensiones válidas.");
  return { width, height, count: kind === "tileset" ? Math.ceil(width / 16) * Math.ceil(height / 16) : Math.ceil(width / 16) };
}