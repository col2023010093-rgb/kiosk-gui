import type { ReactNode } from "react";

interface KioskLayoutProps {
  children: ReactNode;
}

export default function KioskLayout({ children }: KioskLayoutProps) {
  return <div className="min-h-screen w-full bg-bg overflow-hidden">{children}</div>;
}