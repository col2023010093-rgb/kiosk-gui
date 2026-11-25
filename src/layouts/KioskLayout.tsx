import { useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KioskSessionContext } from "../context/kioskSessionState";

interface KioskLayoutProps {
  children: ReactNode;
}

// If nobody touches the kiosk, clear the patient and results so the next person never sees them.
const IDLE_LIMIT_MS = 90_000;
// Measuring needs the person to stand still without touching the screen.
const MEASURING_LIMIT_MS = 300_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "mousemove"] as const;

export default function KioskLayout({ children }: KioskLayoutProps) {
  const session = useContext(KioskSessionContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const hasSession = Boolean(session?.patient || session?.measurement);
  const resetSession = session?.resetSession;
  // The complete screen has its own countdown and reset.
  const skip = pathname === "/kiosk/complete";
  const limit = pathname === "/kiosk/measure" ? MEASURING_LIMIT_MS : IDLE_LIMIT_MS;

  useEffect(() => {
    if (!hasSession || skip || !resetSession) return;
    let timer = 0;
    const expire = () => {
      resetSession();
      navigate("/kiosk", { replace: true });
    };
    const restart = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(expire, limit);
    };
    restart();
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, restart));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, restart));
    };
  }, [hasSession, skip, limit, resetSession, navigate]);

  return <div className="min-h-screen w-full bg-bg overflow-hidden">{children}</div>;
}
