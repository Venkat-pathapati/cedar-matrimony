"use client";

import { useEffect, useState } from "react";
import { clientGet, type Summary } from "./api";

const EMPTY: Summary = { pending_interests: 0, accepted_unseen: 0, unread_messages: 0, total: 0 };

/** Notification counts for the signed-in member. Refreshes every 45s, and right away when a page fires "cedar-notify". */
export function useSummary(active: boolean): Summary {
  const [s, setS] = useState<Summary>(EMPTY);
  useEffect(() => {
    if (!active) { setS(EMPTY); return; }
    let live = true;
    const load = () => clientGet<Summary>("/api/notifications/summary").then((r) => { if (live) setS(r); }).catch(() => {});
    load();
    const t = setInterval(load, 45000);
    window.addEventListener("cedar-notify", load);
    window.addEventListener("cedar-messages", load);
    return () => { live = false; clearInterval(t); window.removeEventListener("cedar-notify", load); window.removeEventListener("cedar-messages", load); };
  }, [active]);
  return s;
}
export const refreshNotifications = () => window.dispatchEvent(new Event("cedar-notify"));
