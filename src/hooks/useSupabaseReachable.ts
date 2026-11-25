import { useEffect, useState } from "react";

export type Reachability = "checking" | "online" | "offline";

const CHECK_MS = 10000;
const TIMEOUT_MS = 3000;

/** True if Supabase answers within a few seconds. A no-cors request needs no keys or headers. */
async function probe(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return false;
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return true;
  } catch {
    return false;
  }
}

/** Whether the kiosk can reach Supabase right now; rechecked every 10 s and on network events. */
export function useSupabaseReachable(): Reachability {
  const [state, setState] = useState<Reachability>("checking");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await probe();
      if (!cancelled) setState(ok ? "online" : "offline");
    };
    void run();
    const id = window.setInterval(run, CHECK_MS);
    window.addEventListener("online", run);
    window.addEventListener("offline", run);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", run);
      window.removeEventListener("offline", run);
    };
  }, []);

  return state;
}
