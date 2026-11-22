import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, HeartPulse, Droplet, Thermometer, Ruler, Scale, Calculator, Check, Loader2, ArrowLeft } from "lucide-react";
import { runAssessment, saveHealthRecord } from "@generick/shared";
import { getPatientByProfileId } from "@generick/shared";
import { useAuth } from "@generick/shared";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import type { Patient } from "@generick/shared";
import type { AssessmentResult, AssessmentType } from "@generick/shared";

interface Step {
    key: string;
    label: string;
    icon: ElementType;
    /** Result fields that must hold a real reading before this step counts as done. */
    fields: (keyof AssessmentResult)[];
}

// Listed in the same order the sensors actually run in measurement.ts.
const ALL_STEPS: Step[] = [
    { key: "height", label: "Height", icon: Ruler, fields: ["heightCm"] },
    { key: "weight", label: "Weight", icon: Scale, fields: ["weightKg"] },
    { key: "bmi", label: "BMI", icon: Calculator, fields: ["bmi"] },
    { key: "bp", label: "Blood Pressure", icon: Activity, fields: ["bloodPressureSystolic", "bloodPressureDiastolic"] },
    { key: "hr", label: "Heart Rate", icon: HeartPulse, fields: ["heartRate"] },
    { key: "spo2", label: "Oxygen Saturation", icon: Droplet, fields: ["oxygenSaturation"] },
    { key: "temp", label: "Body Temperature", icon: Thermometer, fields: ["temperatureCelsius"] },
];

const STEPS_BY_TEST: Record<AssessmentType, string[]> = {
    bmi: ["height", "weight", "bmi"],
    blood_pressure: ["bp"],
    heart_rate_spo2: ["hr", "spo2"],
    temperature: ["temp"],
    complete: ["height", "weight", "bmi", "bp", "hr", "spo2", "temp"],
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

// How long to wait between reads while a sensor has not produced data yet.
const RETRY_DELAY_MS = 1500;
// After this many empty reads, show a gentle "check placement" hint (loading still continues).
const HINT_AFTER_ATTEMPTS = 5;

/** A reading counts as data only if it is a finite number greater than zero. */
function hasReading(value: unknown): boolean {
    if (value === undefined || value === null || value === "") return false;
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
}

function stepHasData(result: Partial<AssessmentResult>, step: Step): boolean {
    return step.fields.every((field) => hasReading(result[field]));
}

/** Text shown next to a finished step, e.g. "172.4 cm" or "120/80 mmHg". */
function stepValueText(result: Partial<AssessmentResult>, step: Step): string {
    if (step.key === "bp") {
        return `${result.bloodPressureSystolic}/${result.bloodPressureDiastolic} mmHg`;
    }
    const row = RESULT_ROWS.find((r) => r.key === step.fields[0]);
    const value = result[step.fields[0]];
    return `${String(value)}${row?.unit ? ` ${row.unit}` : ""}`;
}

export default function SelfMeasureVitals() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const testType = (location.state as { testType?: AssessmentType } | null)?.testType ?? "complete";

    const steps = ALL_STEPS.filter((step) => STEPS_BY_TEST[testType].includes(step.key));

    const [doneKeys, setDoneKeys] = useState<string[]>([]);
    const [partial, setPartial] = useState<Partial<AssessmentResult>>({});
    const [attempts, setAttempts] = useState(0);
    const [result, setResult] = useState<AssessmentResult | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        getPatientByProfileId(user.id).then(setPatient).catch(() => setPatient(null));
    }, [user]);

    // Keep reading the sensors until EVERY step in this assessment has real data.
    // Each step turns into a check mark (with its value) the moment its reading
    // arrives, so height, weight and BMI show up one after another.
    useEffect(() => {
        if (!patient) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const handleProgress = (p: Partial<AssessmentResult>) => {
            if (cancelled) return;
            setPartial((prev) => ({ ...prev, ...p }));
            const finished = steps.filter((s) => stepHasData(p, s)).map((s) => s.key);
            // Union with what we already have so a retry never un-checks a finished step.
            setDoneKeys((prev) => Array.from(new Set([...prev, ...finished])));
        };

        const attempt = async () => {
            let reading: AssessmentResult | null = null;
            try {
                reading = await runAssessment(patient.patient_id, testType, handleProgress);
            } catch {
                // Sensor not ready / no signal yet: treat as "no data" and keep trying.
                reading = null;
            }
            if (cancelled) return;

            if (reading) {
                const finished = steps.filter((s) => stepHasData(reading as AssessmentResult, s)).map((s) => s.key);
                setDoneKeys(finished);

                if (finished.length === steps.length) {
                    try {
                        // Simulated readings (no hardware wired up yet) are shown but never
                        // persisted — see DemoModeBanner in the result view below.
                        if (!reading.isSimulated) {
                            await saveHealthRecord(reading);
                        }
                    } catch (err) {
                        if (!cancelled) setError(err instanceof Error ? err.message : "Could not save your results");
                        return;
                    }
                    if (!cancelled) setResult(reading);
                    return;
                }
            }

            setAttempts((n) => n + 1);
            timer = setTimeout(attempt, RETRY_DELAY_MS);
        };

        void attempt();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
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
                    {result.isSimulated
                        ? "Hardware is offline, so the placeholder sensors below are standing in for the real ones. This reading was not saved."
                        : "These values came straight off the sensor readers — use them to confirm each sensor path is wired correctly."}
                </p>

                {result.isSimulated && <DemoModeBanner className="mt-6 w-full max-w-sm" />}

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

    // The active step is the first one that does not have data yet.
    const activeKey = steps.find((s) => !doneKeys.includes(s.key))?.key;
    const showHint = attempts >= HINT_AFTER_ATTEMPTS;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
            <div className="font-mono text-xs uppercase tracking-[3px] text-primary">Measuring vitals</div>
            <h1 className="mt-2 text-2xl font-bold text-ink">Please stay still{patient ? `, ${patient.first_name}` : ""}</h1>
            <p className="mt-2 text-sm text-muted">Running the sensors for this assessment.</p>

            <div className="mt-10 flex w-full max-w-sm flex-col gap-3" aria-live="polite">
                {steps.map((step) => {
                    const isDone = doneKeys.includes(step.key);
                    const isActive = step.key === activeKey;
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
                            {isDone && stepHasData(partial, step) && (
                                <span className="ml-auto text-sm font-semibold text-ink">{stepValueText(partial, step)}</span>
                            )}
                            {isActive && step.key === "bmi" && (
                                <span className="ml-auto text-xs text-muted">Calculating…</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {showHint && (
                <p role="status" className="mt-6 max-w-sm text-center text-sm text-muted">
                    Still waiting for sensor data. Make sure you are standing correctly on the platform and hold still.
                </p>
            )}

            <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-bg"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Cancel
            </button>
        </div>
    );
}
