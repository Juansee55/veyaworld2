import { describe, expect, it, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { deletePlayerArt, listMyArt, savePlayerArt } from "@/lib/game/playerArt";

describe("player art uploads (body and head)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await supabase.auth.signInWithPassword({ email: "tester@veya.local", password: "secret" });
  });

  it("uploads body and head sheets concurrently, lists them, and preserves stored sheets", async () => {
    const bodyFile = new File([new Uint8Array([137, 80, 78, 71])], "my-body.png", { type: "image/png" });
    const bodySheet = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
    const savedBody = await savePlayerArt(bodyFile, bodySheet, "body", 1, 100);

    const headFile = new File([new Uint8Array([137, 80, 78, 71])], "my-head.png", { type: "image/png" });
    const headSheet = new Blob([new Uint8Array([5, 6, 7, 8])], { type: "image/png" });
    const savedHead = await savePlayerArt(headFile, headSheet, "head", 1, 100);

    expect(savedBody.kind).toBe("body");
    expect(savedBody.name).toBe("my-body");
    expect(savedHead.kind).toBe("head");
    expect(savedHead.name).toBe("my-head");

    const mine = await listMyArt();
    expect(mine.map((a) => a.id)).toEqual([savedBody.id, savedHead.id]);

    const { data: downloaded } = await supabase.storage.from("player-art").download(savedBody.sheet_path);
    expect(downloaded).not.toBeNull();
    expect(downloaded?.size).toBe(4);

    await deletePlayerArt(savedBody);
    const remaining = await listMyArt();
    expect(remaining.map((a) => a.id)).toEqual([savedHead.id]);
  });
});
