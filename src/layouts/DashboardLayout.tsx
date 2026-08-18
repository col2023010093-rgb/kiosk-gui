import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";

interface DashboardLayoutProps {
	children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	const { user } = useAuth();
	const isKiosk = (user?.role ?? "user") === "user";

	return (
		<div className={`flex bg-bg text-ink ${isKiosk ? "h-dvh overflow-hidden" : "min-h-screen"}`}>
			{!isKiosk && <Sidebar />}
			<main className={isKiosk ? "h-dvh min-w-0 flex-1 overflow-hidden" : "min-w-0 flex-1 px-10 py-[30px] pb-12"}>
				{children}
			</main>
		</div>
	);
}