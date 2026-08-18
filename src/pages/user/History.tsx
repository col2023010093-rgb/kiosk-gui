import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { recentMeasurements } from "../../data/mockHealth";
import type { VitalStatus } from "../../data/mockHealth";

const STATUS_STYLES: Record<VitalStatus, string> = {
	normal: "bg-good-tint text-good",
	monitor: "bg-warn-tint text-warn",
	attention: "bg-bad-tint text-bad",
};

const STATUS_LABELS: Record<VitalStatus, string> = {
	normal: "Normal",
	monitor: "Monitor",
	attention: "Needs attention",
};

export default function History() {
	return (
		<>
			<Navbar eyebrow="Timeline" title="History" subtitle="A chronological view of your past check-ins." />

			<Card>
				<ol className="relative flex flex-col gap-6 border-l border-line pl-6">
					{recentMeasurements.map((m) => (
						<li key={m.id} className="relative">
							<span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="text-sm font-semibold text-ink">{m.date}</p>
									<p className="font-mono text-xs text-muted">{m.time}</p>
								</div>
								<span
									className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[m.status]}`}
								>
									{STATUS_LABELS[m.status]}
								</span>
							</div>
							<dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-4">
								<div>
									HR <span className="text-ink">{m.heartRate}</span>
								</div>
								<div>
									BP <span className="text-ink">{m.bloodPressure}</span>
								</div>
								<div>
									SpO&#8322; <span className="text-ink">{m.spo2}</span>
								</div>
								<div>
									BMI <span className="text-ink">{m.bmi}</span>
								</div>
							</dl>
						</li>
					))}
				</ol>
			</Card>
		</>
	);
}
