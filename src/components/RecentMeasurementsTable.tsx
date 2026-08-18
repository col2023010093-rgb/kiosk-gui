import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { recentMeasurements, type VitalStatus } from "../data/mockHealth";

const STATUS_STYLES: Record<VitalStatus, string> = {
	normal: "bg-success/10 text-success",
	monitor: "bg-warn/10 text-warn",
	attention: "bg-bad/10 text-bad",
};

const STATUS_LABELS: Record<VitalStatus, string> = {
	normal: "Normal",
	monitor: "Monitor",
	attention: "Needs attention",
};

const COLUMNS = ["Date", "Time", "Heart Rate", "Blood Pressure", "SpO₂", "Temperature", "BMI", "Status"];

export function RecentMeasurementsTable() {
	return (
		<motion.section
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
			className="rounded-3xl border border-line bg-white p-6 shadow-sm"
		>
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-bold text-ink">Recent Measurements</h3>
				<span className="font-mono text-xs text-muted">Last {recentMeasurements.length} readings</span>
			</div>

			{/* Desktop / tablet table */}
			<div className="mt-4 hidden overflow-x-auto sm:block">
				<table className="w-full border-collapse text-left text-sm">
					<thead>
						<tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
							{COLUMNS.map((col) => (
								<th key={col} className="px-3 py-2 font-semibold">
									{col}
								</th>
							))}
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody>
						{recentMeasurements.map((row) => (
							<tr key={row.id} className="border-b border-line last:border-0 hover:bg-app/60">
								<td className="whitespace-nowrap px-3 py-3 font-medium text-ink">{row.date}</td>
								<td className="whitespace-nowrap px-3 py-3 font-mono text-muted">{row.time}</td>
								<td className="whitespace-nowrap px-3 py-3 text-ink">{row.heartRate}</td>
								<td className="whitespace-nowrap px-3 py-3 text-ink">{row.bloodPressure}</td>
								<td className="whitespace-nowrap px-3 py-3 text-ink">{row.spo2}</td>
								<td className="whitespace-nowrap px-3 py-3 text-ink">{row.temperature}</td>
								<td className="whitespace-nowrap px-3 py-3 text-ink">{row.bmi}</td>
								<td className="whitespace-nowrap px-3 py-3">
									<span
										className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[row.status]}`}
									>
										{STATUS_LABELS[row.status]}
									</span>
								</td>
								<td className="whitespace-nowrap px-3 py-3 text-right">
									<button className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
										View Details
										<ChevronRight className="h-3.5 w-3.5" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile card list */}
			<div className="mt-4 flex flex-col gap-3 sm:hidden">
				{recentMeasurements.map((row) => (
					<div key={row.id} className="rounded-2xl border border-line bg-app/50 p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold text-ink">{row.date}</p>
								<p className="font-mono text-xs text-muted">{row.time}</p>
							</div>
							<span
								className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[row.status]}`}
							>
								{STATUS_LABELS[row.status]}
							</span>
						</div>

						<dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
							<dt className="text-muted">Heart Rate</dt>
							<dd className="text-right text-ink">{row.heartRate}</dd>
							<dt className="text-muted">Blood Pressure</dt>
							<dd className="text-right text-ink">{row.bloodPressure}</dd>
							<dt className="text-muted">SpO₂</dt>
							<dd className="text-right text-ink">{row.spo2}</dd>
							<dt className="text-muted">Temperature</dt>
							<dd className="text-right text-ink">{row.temperature}</dd>
							<dt className="text-muted">BMI</dt>
							<dd className="text-right text-ink">{row.bmi}</dd>
						</dl>

						<button className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-line py-2 text-xs font-semibold text-primary">
							View Details
							<ChevronRight className="h-3.5 w-3.5" />
						</button>
					</div>
				))}
			</div>
		</motion.section>
	);
}
