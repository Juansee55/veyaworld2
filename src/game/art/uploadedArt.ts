import body1 from "@/assets/era_personal_body_graal6923107-121.png.asset.json";
import body2 from "@/assets/era_personal_body_graal6828141-154.png.asset.json";
import body3 from "@/assets/Uploadd4.png.asset.json";
import body4 from "@/assets/era_personal_body_graal3326168-310.png.asset.json";
import body5 from "@/assets/era_personal_body_graal3219846-436.png.asset.json";
import body6 from "@/assets/era_personal_body_graal4877935-120.png.asset.json";
import head1 from "@/assets/era_personal_head_graal5959237-108.png.asset.json";
import head2 from "@/assets/era_personal_head_graal5943207-107.png.asset.json";
import { DIRECTIONS, FRAME_COLS, FRAME_H, FRAME_W } from "../catalog";
import { makeCanvas } from "./pixel";

const sources = [body1, body2, body3, body4, body5, body6, head1, head2];
const sheets = new Map<string, HTMLCanvasElement>();
let loading: Promise<void> | undefined;

function decodeAsset(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error("Image load timeout")), 4000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error("Image load failed")); };
    image.src = url;
    if (image.complete && image.naturalWidth > 0) { clearTimeout(timer); resolve(image); }
  });
}

export function loadUploadedArt() {
  loading ??= Promise.allSettled(sources.map(async (asset, i) => {
    const image = await decodeAsset(asset.url);
    const body = i < 6;
    const { canvas, ctx } = makeCanvas(FRAME_W * FRAME_COLS, FRAME_H * 4);
    DIRECTIONS.forEach((dir, row) => {
      const index = { up: 0, left: 1, down: 2, right: 3 }[dir];
      for (let col = 0; col < 4; col++) {
        const sx = body ? index * 32 : 0;
        const sy = body ? (col === 2 ? 32 : col === 3 ? 128 : 0) : index * 32;
        ctx.drawImage(image, sx, sy, 32, 32, col * FRAME_W, row * FRAME_H + (body ? 16 : col === 1 ? 1 : 0), 32, 32);
      }
    });
    sheets.set(`${body ? "body" : "head"}:upload_${body ? "body" : "head"}_${body ? i + 1 : i - 5}`, canvas);
  })).then(() => undefined);
  return loading;
}

export function uploadedSheets() { return sheets; }