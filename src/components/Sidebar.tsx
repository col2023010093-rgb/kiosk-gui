import { NavLink } from "react-router-dom";
import {
	LayoutDashboard,
	FileText,
	HeartPulse,
	History,
	UserCircle,
	Users,
	UserPlus,
	ClipboardList,
	BarChart3,
	ShieldCheck,
	Settings,
	ScrollText,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/User";

interface NavItem {
	label: string;
	to: string;
	icon: typeof LayoutDashboard;
	end?: boolean;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
	user: [
		{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
		{ label: "Health Records", to: "/dashboard/records", icon: FileText },
		{ label: "Recommendations", to: "/dashboard/recommendations", icon: HeartPulse },
		{ label: "History", to: "/dashboard/history", icon: History },
		{ label: "Profile", to: "/dashboard/profile", icon: UserCircle },
	],
	clinic_staff: [
		{ label: "Dashboard", to: "/staff", icon: LayoutDashboard, end: true },
		{ label: "Patients", to: "/staff/patients", icon: Users },
		{ label: "Register Patient", to: "/staff/register", icon: UserPlus },
		{ label: "Measurements", to: "/staff/measurements", icon: ClipboardList },
		{ label: "Reports", to: "/staff/reports", icon: BarChart3 },
	],
	admin: [
		{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
		{ label: "Users", to: "/admin/users", icon: Users },
		{ label: "Staff Accounts", to: "/admin/staff-accounts", icon: ShieldCheck },
		{ label: "Reports", to: "/admin/reports", icon: BarChart3 },
		{ label: "Settings", to: "/admin/settings", icon: Settings },
		{ label: "System Logs", to: "/admin/logs", icon: ScrollText },
	],
};

const navLinkClass = (isActive: boolean) =>
	`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
		isActive ? "bg-primary text-white" : "text-muted hover:bg-app hover:text-ink"
	}`;

export default function Sidebar() {
	const { user } = useAuth();
	const role = user?.role ?? "user";
	const items = NAV_BY_ROLE[role];

	return (
		<aside className="flex w-[236px] shrink-0 flex-col border-r border-line bg-white p-[18px]">
			<div className="flex items-center gap-2.5 px-1.5 pb-7">
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep">
					<HeartPulse className="h-4 w-4 text-white" strokeWidth={2.25} />
				</div>
				<div>
					<div className="text-[15px] font-bold text-ink">GenErick</div>
					<div className="mt-0.5 text-[10px] uppercase tracking-[1.5px] text-muted">
						{role === "user" ? "Patient Portal" : role === "clinic_staff" ? "Clinic Staff" : "Administrator"}
					</div>
				</div>
			</div>

			<nav className="flex flex-col gap-0.5">
				{items.map(({ label, to, icon: Icon, end }) => (
					<NavLink key={to} to={to} end={end} className={({ isActive }) => navLinkClass(isActive)}>
						<Icon className="h-[17px] w-[17px]" />
						{label}
					</NavLink>
				))}
			</nav>

			{user && (
				<div className="mt-auto flex items-center gap-2.5 border-t border-line px-2.5 pt-3.5">
					<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-[13px] font-semibold text-white">
						{user.avatarInitials}
					</div>
					<div>
						<div className="text-[13px] font-semibold text-ink">{user.fullName}</div>
						<div className="text-[11px] text-muted">{user.email}</div>
					</div>
				</div>
			)}
		</aside>
	);
}
