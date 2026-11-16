export interface ArtCrop { x: number; y: number; w: number; h: number }
export function boundedCrop(crop: ArtCrop, width: number, height: number): ArtCrop {
  const x = Math.max(0, Math.min(width - 1, Math.round(crop.x) || 0));
  const y = Math.max(0, Math.min(height - 1, Math.round(crop.y) || 0));
  return { x, y, w: Math.max(1, Math.min(width - x, Math.round(crop.w) || width)), h: Math.max(1, Math.min(height - y, Math.round(crop.h) || height)) };
}
export function tileCrop(id: number, width: number, height: number) {
  const cols = Math.ceil(width / 16), x = (id % cols) * 16, y = Math.floor(id / cols) * 16;
  return { x, y, w: Math.max(0, Math.min(16, width - x)), h: Math.max(0, Math.min(16, height - y)) };
}