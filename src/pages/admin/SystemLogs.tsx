import { Info, AlertTriangle, AlertCircle } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { mockSystemLogs } from "../../data/mockLogs";
import type { LogLevel } from "../../data/mockLogs";

const LEVEL_META: Record<LogLevel, { icon: typeof Info; className: string }> = {
	info: { icon: Info, className: "bg-primary-tint text-primary" },
	warning: { icon: AlertTriangle, className: "bg-warn-tint text-warn" },
	error: { icon: AlertCircle, className: "bg-bad-tint text-bad" },
};

export default function SystemLogs() {
	return (
		<>
			<Navbar eyebrow="Administrator" title="System Logs" subtitle="Recent kiosk and application activity." />

			<Card>
				<div className="flex flex-col divide-y divide-line">
					{mockSystemLogs.map((log) => {
						const meta = LEVEL_META[log.level];
						const Icon = meta.icon;
						return (
							<div key={log.id} className="flex items-start gap-3 py-3.5">
								<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
									<Icon className="h-4 w-4" />
								</span>
								<div>
									<p className="text-sm text-ink">{log.message}</p>
									<p className="mt-0.5 font-mono text-[11px] text-muted">
										{new Date(log.timestamp).toLocaleString("en-US", {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</Card>
		</>
	);
}
