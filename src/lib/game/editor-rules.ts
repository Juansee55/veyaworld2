export function assertEditorAdmin(isAdmin: boolean) {
  if (!isAdmin) throw new Error("Solo administradores.");
}
export function propSize(prop: { display_w?: number | null; display_h?: number | null }, furniture: { w: number; h: number }) {
  return { w: prop.display_w ?? furniture.w, h: prop.display_h ?? furniture.h };
}
export function validatePlayerDestination(input: { userId: string; mapId: string; x: number; y: number }, width: number, height: number) {
  if (!/^[0-9a-f-]{36}$/i.test(input.userId) || !Number.isFinite(input.x) || !Number.isFinite(input.y) || input.x < 0 || input.y < 0 || input.x >= width * 16 || input.y >= height * 16 || input.x > 4000 || input.y > 4000) throw new Error("Destino inválido.");
  return input;
}