import { useEffect, useState } from "react";
import { BODIES, DEFAULT_LOOK, HATS, HEADS, MELEES, sanitizeUsername, type Look } from "@/game/catalog";
import type { ArtKind } from "@/game/art/layout";
import { deletePlayerArt, listMyArt, type PlayerArt } from "@/lib/game/playerArt";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/game/notify";
import { ArtUploadEditor } from "./ArtUploadEditor";
import { GaniViewer } from "./GaniViewer";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  look: Look;
  username: string;
  saving: boolean;
  onClose: () => void;
  onSave: (look: Look, username: string) => void;
}

function Preview({ look }: { look: Look }) {
  return <GaniViewer look={look} initialAnim="idle" initialZoom={3} />;
}

function Row({ title, items, value, onPick }: { title: string; items: { id: string; label: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Button key={it.id} onClick={() => onPick(it.id)}
            className={`border-2 px-2 py-1 text-sm ${it.id === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground"}`}>
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function Wardrobe({ look, username, saving, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Look>(look);
  const [name, setName] = useState(username);
  const [mine, setMine] = useState<PlayerArt[]>([]);
  const [rewardIds, setRewardIds] = useState<string[]>([]);
  const clean = sanitizeUsername(name);
  const refresh = () => { void listMyArt().then(setMine, () => undefined); };
  useEffect(refresh, []);
  useEffect(() => { void supabase.from("autumn_rewards").select("reward_id").then(({ data }) => setRewardIds((data ?? []).map((r) => r.reward_id))); }, []);
  const custom = (kind: ArtKind) => mine.filter((a) => a.kind === kind).map((a) => ({ id: `custom:${a.id}`, label: `★ ${a.name}` }));
  const remove = async (art: PlayerArt) => {
    try { await deletePlayerArt(art); }
    catch (error) { notify(error instanceof Error ? error.message : "Upload could not be deleted.", "error"); return; }
    const key = `${art.kind}_id` as keyof Look;
    if (draft[key] === `custom:${art.id}`) setDraft({ ...draft, [key]: DEFAULT_LOOK[key] });
    refresh();
  };
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-3" onClick={onClose}>
      <div className="pixel-panel max-h-[92dvh] w-full max-w-md overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl text-primary">Wardrobe</h2>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-muted-foreground" aria-label="Close">✕</Button>
        </div>
        <div className="flex flex-col gap-4">
          <Preview look={draft} />
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Name</span>
            <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-border bg-input px-2 py-1.5 text-base text-foreground outline-none focus:border-primary" />
          </label>
          <Row title="Hat" items={[...HATS.filter((h) => !h.id.startsWith("hat_autumn_") || rewardIds.includes(h.id)), ...custom("hat")]} value={draft.hat_id} onPick={(id) => setDraft({ ...draft, hat_id: id })} />
          <Row title="Head" items={[...HEADS, ...custom("head")]} value={draft.head_id} onPick={(id) => setDraft({ ...draft, head_id: id })} />
          <Row title="Body" items={[...BODIES, ...custom("body")]} value={draft.body_id} onPick={(id) => setDraft({ ...draft, body_id: id })} />
          <Row title="Melee" items={[...MELEES, ...custom("melee")]} value={draft.melee_id} onPick={(id) => setDraft({ ...draft, melee_id: id })} />
          <ArtUploadEditor look={draft} onDone={(art) => { setMine((prev) => prev.some((x) => x.id === art.id) ? prev : [...prev, art]); refresh(); setDraft((d) => ({ ...d, [`${art.kind}_id`]: `custom:${art.id}` })); }} />
          {mine.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">My uploads</div>
              <ul className="flex flex-col gap-1">
                {mine.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 flex-1 break-words">{a.kind} · {a.name}{a.frames > 1 ? " (animated)" : ""}</span>
                    <Button variant="ghost" className="px-2 py-0.5 text-xs text-destructive" onClick={() => void remove(a)}>Delete</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button disabled={saving || clean.length < 2} onClick={() => onSave(draft, clean)}
            className="border-2 border-primary bg-primary py-2 text-lg text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Save look"}
          </Button>
        </div>
      </div>
    </div>
  );
}
