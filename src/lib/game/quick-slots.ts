import { useEffect, useState } from "react";
import { DEFAULT_QUICK_SLOTS as defaults, normalizeQuickSlots, assignQuickSlot } from "./autumn-rules";
export function useQuickSlots(userId: string) {
  const key = `veya:quick-slots:${userId}`;
  const [slots, setSlots] = useState<string[]>(defaults);
  useEffect(() => {
    const read = () => { try { setSlots(normalizeQuickSlots(JSON.parse(localStorage.getItem(key) ?? "null"))); } catch { setSlots([...defaults]); } };
    read(); window.addEventListener("veya-slots", read);
    return () => window.removeEventListener("veya-slots", read);
  }, [key]);
  const assign = (index: number, value: string) => { const next = assignQuickSlot(slots, index, value); setSlots(next); localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event("veya-slots")); };
  return { slots, assign };
}