import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { listRecentHealthRecords } from "../../services/measurement";
import type { HealthRecordWithPatient } from "../../services/measurement";
import { getVitalStatus, patientFullName } from "../../utils/helpers";
import type { VitalStatus } from "../../types/Measurement";

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

export default function Measurements() {
	const [records, setRecords] = useState<HealthRecordWithPatient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		listRecentHealthRecords()
			.then(setRecords)
			.catch((err) => setError(err instanceof Error ? err.message : "Could not load measurements."))
			.finally(() => setLoading(false));
	}, []);

	return (
		<>
			<Navbar eyebrow="Clinic Staff" title="Measurements" subtitle="Recent kiosk readings across all patients." />

			<Card>
				{loading && <p className="px-3 py-6 text-sm text-muted">Loading measurements…</p>}
				{error && <p className="px-3 py-6 text-sm text-bad">{error}</p>}
				{!loading && !error && records.length === 0 && (
					<p className="px-3 py-6 text-sm text-muted">No measurements recorded yet.</p>
				)}
				{!loading && !error && records.length > 0 && (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-left text-sm">
							<thead>
								<tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
									<th className="px-3 py-2 font-semibold">Patient</th>
									<th className="px-3 py-2 font-semibold">Recorded</th>
									<th className="px-3 py-2 font-semibold">BP</th>
									<th className="px-3 py-2 font-semibold">HR</th>
									<th className="px-3 py-2 font-semibold">SpO&#8322;</th>
									<th className="px-3 py-2 font-semibold">Temp</th>
									<th className="px-3 py-2 font-semibold">BMI</th>
									<th className="px-3 py-2 font-semibold">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-line">
								{records.map((m) => {
									const status = getVitalStatus(m);
									return (
										<tr key={m.record_id}>
											<td className="whitespace-nowrap px-3 py-3 font-medium text-ink">
												{m.patients ? patientFullName(m.patients) : "Unknown patient"}
											</td>
											<td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted">
												{new Date(m.measured_at).toLocaleString("en-US", {
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-ink">
												{m.systolic ?? "—"}/{m.diastolic ?? "—"}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-ink">{m.heart_rate ?? "—"}</td>
											<td className="whitespace-nowrap px-3 py-3 text-ink">{m.spo2 != null ? `${m.spo2}%` : "—"}</td>
											<td className="whitespace-nowrap px-3 py-3 text-ink">
												{m.temperature != null ? `${m.temperature.toFixed(1)}°C` : "—"}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-ink">{m.bmi ?? "—"}</td>
											<td className="whitespace-nowrap px-3 py-3">
												<span
													className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
												>
													{STATUS_LABELS[status]}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</>
	);
}
