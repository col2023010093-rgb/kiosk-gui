import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ShieldCheck, BarChart3, Settings, ScrollText, ArrowRight } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { mockStaffAccounts } from "../../data/mockStaff";
import { mockSystemLogs } from "../../data/mockLogs";
import { countPatients } from "../../services/patient";

const SECTIONS = [
	{ to: "/admin/users", label: "Users", icon: Users, stat: "Patient accounts" },
	{ to: "/admin/staff-accounts", label: "Staff Accounts", icon: ShieldCheck, stat: "Clinic staff" },
	{ to: "/admin/reports", label: "Reports", icon: BarChart3, stat: "System & staff summaries" },
	{ to: "/admin/settings", label: "Settings", icon: Settings, stat: "Kiosk configuration" },
	{ to: "/admin/logs", label: "System Logs", icon: ScrollText, stat: "Recent activity" },
];

export default function Dashboard() {
	const [patientCount, setPatientCount] = useState<number | null>(null);

	useEffect(() => {
		countPatients().then(setPatientCount).catch(() => setPatientCount(null));
	}, []);

	const activeStaff = mockStaffAccounts.filter((s) => s.status === "active").length;
	const recentWarnings = mockSystemLogs.filter((l) => l.level !== "info").length;

	return (
		<>
			<Navbar eyebrow="Administrator" title="System Overview" subtitle="Account administration and system health at a glance." />

			<div className="mb-6 grid gap-4 sm:grid-cols-3">
				<Card>
					<p className="text-xs uppercase tracking-wide text-muted">Registered Patients</p>
					<p className="mt-2 text-3xl font-bold text-ink">{patientCount ?? "—"}</p>
				</Card>
				<Card>
					<p className="text-xs uppercase tracking-wide text-muted">Active Staff Accounts</p>
					<p className="mt-2 text-3xl font-bold text-ink">{activeStaff}</p>
				</Card>
				<Card>
					<p className="text-xs uppercase tracking-wide text-muted">Log Entries Needing Review</p>
					<p className="mt-2 text-3xl font-bold text-ink">{recentWarnings}</p>
				</Card>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{SECTIONS.map(({ to, label, icon: Icon, stat }) => (
					<Link
						key={to}
						to={to}
						className="flex items-center justify-between rounded-2xl border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
					>
						<div className="flex items-center gap-3">
							<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-tint text-primary">
								<Icon className="h-5 w-5" />
							</span>
							<div>
								<p className="text-sm font-semibold text-ink">{label}</p>
								<p className="text-xs text-muted">{stat}</p>
							</div>
						</div>
						<ArrowRight className="h-4 w-4 text-muted" />
					</Link>
				))}
			</div>
		</>
	);
}
