type Listener = (msg: string, kind: "info" | "error") => void;
const listeners = new Set<Listener>();
export function notify(msg: string, kind: "info" | "error" = "info") { for (const l of listeners) l(msg, kind); }
export function onNotify(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
