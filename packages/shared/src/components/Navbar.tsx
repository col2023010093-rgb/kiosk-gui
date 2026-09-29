import type { ReactNode } from "react";
import { Bell } from "lucide-react";

interface NavbarProps {
	eyebrow?: string;
	title: string;
	subtitle?: string;
	actions?: ReactNode;
}

// Page-level header used inside dashboard pages (title + optional actions).
// Distinct from Sidebar, which is the persistent app-level navigation.
export default function Navbar({ eyebrow, title, subtitle, actions }: NavbarProps) {
	return (
		<div className="mb-7 flex items-center justify-between gap-4">
			<div>
				{eyebrow && (
					<div className="font-mono text-[11.5px] font-semibold uppercase tracking-[2px] text-primary">
						{eyebrow}
					</div>
				)}
				<h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{title}</h1>
				{subtitle && <div className="mt-1 text-[13.5px] text-muted">{subtitle}</div>}
			</div>
			<div className="flex shrink-0 items-center gap-3.5">
				{actions}
				<button
					type="button"
					aria-label="Notifications"
					className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line bg-white text-muted transition-colors hover:border-primary hover:text-primary-deep"
				>
					<Bell className="h-[17px] w-[17px]" />
				</button>
			</div>
		</div>
	);
}
