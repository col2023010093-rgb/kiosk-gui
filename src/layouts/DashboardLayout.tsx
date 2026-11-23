import type { ReactNode } from "react";

interface DashboardLayoutProps {
	children: ReactNode;
}

// The kiosk is for patients only, so this is always the full-screen layout without a sidebar.
// (The staff/admin sidebar now lives in staff-portal-export/.)
export default function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<div className="flex h-dvh overflow-hidden bg-bg text-ink">
			<main className="h-dvh min-w-0 flex-1 overflow-hidden">{children}</main>
		</div>
	);
}
