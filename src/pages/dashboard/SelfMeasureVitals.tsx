import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, HeartPulse, Droplet, Thermometer, Ruler, Check, Loader2, ArrowLeft } from "lucide-react";
import { runAssessment, saveHealthRecord } from "../../services/measurement";
import { getPatientByProfileId } from "../../services/patient";
import { useAuth } from "../../hooks/useAuth";
import type { Patient } from "../../types/Patient";
import type { AssessmentResult, AssessmentType } from "../../types/Measurement";

interface Step {
key: string;
label: string;
icon: ElementType;
}

const ALL_STEPS: Step[] = [
{ key: "bp", label: "Blood Pressure", icon: Activity },
{ key: "hr", label: "Heart Rate", icon: HeartPulse },
{ key: "spo2", label: "Oxygen Saturation", icon: Droplet },
{ key: "temp", label: "Body Temperature", icon: Thermometer },
{ key: "size", label: "Height & Weight", icon: Ruler },
];

const STEPS_BY_TEST: Record<AssessmentType, string[]> = {
bmi: ["size"],
blood_pressure: ["bp"],
heart_rate_spo2: ["hr", "spo2"],
temperature: ["temp"],
complete: ["bp", "hr", "spo2", "temp", "size"],
};

const RESULT_ROWS: { key: keyof AssessmentResult; label: string; unit?: string }[] = [
{ key: "heightCm", label: "Height", unit: "cm" },
{ key: "weightKg", label: "Weight", unit: "kg" },
{ key: "bmi", label: "BMI" },
{ key: "bloodPressureSystolic", label: "Systolic BP", unit: "mmHg" },
{ key: "bloodPressureDiastolic", label: "Diastolic BP", unit: "mmHg" },
{ key: "heartRate", label: "Heart Rate", unit: "bpm" },
{ key: "oxygenSaturation", label: "SpO\u2082", unit: "%" },
{ key: "temperatureCelsius", label: "Temperature", unit: "\u00b0C" },
];

export default function SelfMeasureVitals() {
const navigate = useNavigate();
const location = useLocation();
const { user } = useAuth();
const testType = (location.state as { testType?: AssessmentType } | null)?.testType ?? "complete";

const steps = ALL_STEPS.filter((step) => STEPS_BY_TEST[testType].includes(step.key));

const [activeIndex, setActiveIndex] = useState(0);
const [doneIndexes, setDoneIndexes] = useState<number[]>([]);
const [result, setResult] = useState<AssessmentResult | null>(null);
const [patient, setPatient] = useState<Patient | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
if (!user) return;
getPatientByProfileId(user.id).then(setPatient).catch(() => setPatient(null));
}, [user]);

useEffect(() => {
if (!patient) return;
let index = 0;
const interval = setInterval(() => {
setDoneIndexes((prev) => [...prev, index]);
index += 1;

if (index >= steps.length) {
clearInterval(interval);
runAssessment(patient.patient_id, testType)
.then((r) => {
setResult(r);
saveHealthRecord(r).catch((err) => console.error("Failed to save health record:", err));
})
.catch((err) => {
setError(err instanceof Error ? err.message : "Assessment failed");
});
return;
}
setActiveIndex(index);
}, 1100);

return () => clearInterval(interval);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [patient]);

if (error) {
return (
<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
<h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
<p className="mt-2 max-w-sm text-sm text-muted">{error}</p>
<button
type="button"
onClick={() => navigate("/dashboard")}
className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-deep"
>
<ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
</button>
</div>
);
}

if (!patient) {
return (
<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
<Loader2 className="h-6 w-6 animate-spin text-primary" />
<p className="mt-3 text-sm text-muted">Loading your profile…</p>
</div>
);
}

if (result) {
return (
<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
<div className="font-mono text-xs uppercase tracking-[3px] text-primary">Sensor test complete</div>
<h1 className="mt-2 text-2xl font-bold text-ink">Readings captured</h1>
<p className="mt-2 max-w-sm text-center text-sm text-muted">
These values came straight off the sensor readers — use them to confirm each sensor path
is wired correctly.
</p>

<div className="mt-8 w-full max-w-sm rounded-2xl border border-line bg-white p-5">
<dl className="space-y-2.5">
{RESULT_ROWS.filter((row) => result[row.key] !== undefined).map((row) => (
<div key={row.key} className="flex items-center justify-between text-sm">
<dt className="text-muted">{row.label}</dt>
<dd className="font-semibold text-ink">
{String(result[row.key])}
{row.unit ? ` ${row.unit}` : ""}
</dd>
</div>
))}
</dl>
<div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
<span className="text-muted">Status</span>
<span
className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
result.status === "normal"
? "bg-good-tint text-good"
: result.status === "monitor"
? "bg-amber-100 text-amber-700"
: "bg-red-100 text-red-700"
}`}
>
{result.status}
</span>
</div>
</div>

<button
type="button"
onClick={() => navigate("/dashboard")}
className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-deep"
>
<ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
</button>
</div>
);
}

return (
<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
<div className="font-mono text-xs uppercase tracking-[3px] text-primary">Measuring vitals</div>
<h1 className="mt-2 text-2xl font-bold text-ink">Please stay still{patient ? `, ${patient.first_name}` : ""}</h1>
<p className="mt-2 text-sm text-muted">Running the sensors for this assessment.</p>

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
