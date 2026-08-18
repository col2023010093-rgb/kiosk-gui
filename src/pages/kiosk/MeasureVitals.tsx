import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, HeartPulse, Droplet, Thermometer, Ruler, Check, Loader2 } from "lucide-react";
import { useKioskSession } from "../../hooks/useKioskSession";
import { runAssessment, saveHealthRecord } from "../../services/measurement";

interface Step {
key: string;
label: string;
icon: ElementType;
}

const steps: Step[] = [
{ key: "bp", label: "Blood Pressure", icon: Activity },
{ key: "hr", label: "Heart Rate", icon: HeartPulse },
{ key: "spo2", label: "Oxygen Saturation", icon: Droplet },
{ key: "temp", label: "Body Temperature", icon: Thermometer },
{ key: "size", label: "Height & Weight", icon: Ruler },
];

export default function MeasureVitals() {
const navigate = useNavigate();
const { patient, setMeasurement } = useKioskSession();
const [activeIndex, setActiveIndex] = useState(0);
const [doneIndexes, setDoneIndexes] = useState<number[]>([]);
const [error, setError] = useState<string | null>(null);
const startedRef = useRef(false);

useEffect(() => {
if (!patient) {
navigate("/kiosk/scan", { replace: true });
return;
}
if (startedRef.current) return;
startedRef.current = true;

let index = 0;
const interval = setInterval(() => {
setDoneIndexes((prev) => [...prev, index]);
index += 1;

if (index >= steps.length) {
clearInterval(interval);
void runAssessment(patient.patient_id, "complete")
	.then(async (result) => {
		await saveHealthRecord(result);
		setMeasurement(result);
		window.setTimeout(() => navigate("/kiosk/results"), 700);
	})
	.catch((err) => {
		setError(err instanceof Error ? err.message : "Could not save the measurement.");
	});
return;
}
setActiveIndex(index);
}, 1100);

return () => clearInterval(interval);
}, [patient, navigate, setMeasurement]);

if (!patient) return null;

if (error) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
			<h1 className="text-2xl font-bold">Measurement could not be completed</h1>
			<p className="mt-2 max-w-sm text-sm text-muted">{error}</p>
			<button type="button" onClick={() => navigate("/kiosk/scan", { replace: true })} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">
				Return to scan
			</button>
		</div>
	);
}

return (
<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
<div className="font-mono text-xs uppercase tracking-[3px] text-primary">Measuring vitals</div>
<h1 className="mt-2 text-2xl font-bold text-ink">Please stay still, {patient.first_name}</h1>
<p className="mt-2 text-sm text-muted">The kiosk is recording your vital signs automatically.</p>

<div className="mt-10 flex w-full max-w-sm flex-col gap-3">
{steps.map((step, i) => {
const isDone = doneIndexes.includes(i);
const isActive = i === activeIndex && !isDone;
const Icon = step.icon;
return (
<div
key={step.key}
className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
isDone
? "border-good-tint bg-good-tint"
: isActive
? "border-primary bg-primary-tint"
: "border-line bg-white"
}`}
>
<div
className={`flex h-9 w-9 items-center justify-center rounded-xl ${
isDone ? "bg-good text-white" : isActive ? "bg-primary text-white" : "bg-bg text-muted"
}`}
>
{isDone ? (
<Check size={16} />
) : isActive ? (
<Loader2 size={16} className="animate-spin" />
) : (
<Icon size={16} />
)}
</div>
<span className={`text-sm font-medium ${isDone || isActive ? "text-ink" : "text-muted"}`}>
{step.label}
</span>
</div>
);
})}
</div>
</div>
);
}
