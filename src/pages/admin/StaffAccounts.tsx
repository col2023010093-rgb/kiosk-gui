import { ShieldCheck, ShieldOff } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { mockStaffAccounts } from "../../data/mockStaff";

export default function StaffAccounts() {
	return (
		<>
			<Navbar eyebrow="Administrator" title="Staff Accounts" subtitle="Clinic staff with kiosk and dashboard access." />

			<Card>
				<div className="flex flex-col divide-y divide-line">
					{mockStaffAccounts.map((s) => (
						<div key={s.id} className="flex items-center justify-between gap-4 py-4">
							<div>
								<p className="text-sm font-semibold text-ink">{s.fullName}</p>
								<p className="text-xs text-muted">
									{s.position} · {s.email}
								</p>
								<p className="mt-0.5 font-mono text-[11px] text-muted">
									Last login {new Date(s.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
								</p>
							</div>
							<span
								className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
									s.status === "active" ? "bg-good-tint text-good" : "bg-bad-tint text-bad"
								}`}
							>
								{s.status === "active" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
								{s.status}
							</span>
						</div>
					))}
				</div>
			</Card>
		</>
	);
}
