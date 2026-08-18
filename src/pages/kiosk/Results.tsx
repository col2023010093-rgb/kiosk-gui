import { useEffect } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useKioskSession } from "../../hooks/useKioskSession";
import { getGenericRecommendations } from "../../utils/helpers";
import type { VitalStatus } from "../../types/Measurement";

const statusMeta: Record<VitalStatus, { label: string; className: string; Icon: ElementType }> = {
	normal: { label: "Normal", className: "bg-good-tint text-good", Icon: CheckCircle2 },
	monitor: { label: "Monitor", className: "bg-warn-tint text-warn", Icon: AlertTriangle },
	attention: { label: "Needs Attention", className: "bg-bad-tint text-bad", Icon: AlertCircle },
};

const toneDot: Record<string, string> = {
	good: "bg-good",
	warn: "bg-warn",
	bad: "bg-bad",
};

function VitalTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
	return (
		<div className="rounded-2xl border border-line bg-white p-4">
			<div className="text-[11px] text-muted">{label}</div>
			<div className="mt-1 font-mono text-lg font-semibold text-ink">
				{value}
				{unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
			</div>
		</div>
	);
}

export default function Results() {
	const navigate = useNavigate();
	const { patient, measurement } = useKioskSession();

	useEffect(() => {
		if (!patient || !measurement) navigate("/kiosk/scan", { replace: true });
	}, [patient, measurement, navigate]);

	if (!patient || !measurement) return null;

	const meta = statusMeta[measurement.status];
	const recommendations = getGenericRecommendations(measurement);

	return (
		<div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center bg-bg px-6 py-10 text-ink">
			<div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${meta.className}`}>
				<meta.Icon size={14} />
				{meta.label}
			</div>
			<h1 className="mt-4 text-2xl font-bold text-ink">Here are your results, {patient.first_name}</h1>
			<p className="mt-1 text-sm text-muted">Recorded just now</p>

			<div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
				<VitalTile
					label="Blood Pressure"
					value={`${measurement.bloodPressureSystolic}/${measurement.bloodPressureDiastolic}`}
				/>
				<VitalTile label="Heart Rate" value={`${measurement.heartRate}`} unit="bpm" />
				<VitalTile label="SpO2" value={`${measurement.oxygenSaturation}`} unit="%" />
				<VitalTile label="Temperature" value={(measurement.temperatureCelsius ?? 0).toFixed(1)} unit="°C" />
				<VitalTile label="Weight" value={(measurement.weightKg ?? 0).toFixed(1)} unit="kg" />
				<VitalTile label="BMI" value={`${measurement.bmi}`} />
			</div>

			<div className="mt-8 w-full rounded-2xl border border-line bg-white p-5">
				<h2 className="mb-3 text-sm font-bold text-ink">Generic Health Recommendations</h2>
				<div className="flex flex-col gap-3">
					{recommendations.map((rec) => (
						<div key={rec.title} className="flex gap-3">
							<span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[rec.tone]}`} />
							<div>
								<div className="text-sm font-semibold text-ink">{rec.title}</div>
								<div className="text-xs text-muted">{rec.description}</div>
							</div>
						</div>
					))}
				</div>
				<p className="mt-4 text-[11px] text-muted">
					This screening result is for health awareness only and is not a medical diagnosis. Consult
					qualified healthcare personnel for medical advice.
				</p>
			</div>

			<button
				onClick={() => navigate("/kiosk/complete")}
				className="mt-8 w-full max-w-sm rounded-2xl bg-primary py-4 text-base font-semibold text-white transition-colors hover:bg-primary-deep"
			>
				Save & Finish
			</button>
		</div>
	);
}
