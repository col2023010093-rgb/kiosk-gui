import type { HealthRecord, VitalStatus } from "../types/Measurement";
import type { AssessmentResult } from "../types/Measurement";
import type { Patient } from "../types/Patient";
import { VITAL_RANGES } from "./constants";

export interface Recommendation {
	title: string;
	description: string;
	tone: "good" | "warn" | "bad";
}

export function calculateAge(birthdate: string): number {
	const dob = new Date(birthdate);
	const diffMs = Date.now() - dob.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

export function formatDateShort(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initialsFromName(fullName: string): string {
	return fullName
		.split(" ")
		.filter(Boolean)
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

/** patients.first_name/middle_name/last_name -> display name. DB has no fullName column. */
export function patientFullName(patient: Pick<Patient, "first_name" | "middle_name" | "last_name">): string {
	return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(" ");
}

/**
 * health_records has no `status` column — it's derived client-side from
 * VITAL_RANGES, same thresholds the old mock data encoded by hand.
 * Any null reading (sensor didn't run / not yet measured) is excluded from
 * the check rather than treated as abnormal.
 */
export function getVitalStatus(r: HealthRecord): VitalStatus {
	const checks: boolean[] = [];
	const monitor: boolean[] = [];

	if (r.systolic != null) monitor.push(r.systolic > VITAL_RANGES.bloodPressureSystolic.monitorMax);
	if (r.diastolic != null) monitor.push(r.diastolic > VITAL_RANGES.bloodPressureDiastolic.monitorMax);
	if (r.systolic != null) checks.push(r.systolic <= VITAL_RANGES.bloodPressureSystolic.normalMax);
	if (r.diastolic != null) checks.push(r.diastolic <= VITAL_RANGES.bloodPressureDiastolic.normalMax);
	if (r.heart_rate != null)
		checks.push(r.heart_rate >= VITAL_RANGES.heartRate.normalMin && r.heart_rate <= VITAL_RANGES.heartRate.normalMax);
	if (r.spo2 != null) monitor.push(r.spo2 < VITAL_RANGES.oxygenSaturation.normalMin);
	if (r.temperature != null)
		checks.push(
			r.temperature >= VITAL_RANGES.temperatureCelsius.normalMin &&
				r.temperature <= VITAL_RANGES.temperatureCelsius.normalMax
		);
	if (r.bmi != null) checks.push(r.bmi >= VITAL_RANGES.bmi.normalMin && r.bmi <= VITAL_RANGES.bmi.normalMax);

	if (monitor.some(Boolean)) return "attention";
	if (checks.some((ok) => !ok)) return "monitor";
	return "normal";
}

/**
 * Generic, rule-based wellness tips derived from vitals just captured on the
 * kiosk (before/after they're persisted to health_records).
 * NOT a diagnosis — plain threshold checks against utils/constants.ts.
 * Always prompts escalation to staff/clinicians rather than naming a condition,
 * per AGENTS.md's non-negotiable health/privacy rules.
 */
export function getGenericRecommendations(m: AssessmentResult): Recommendation[] {
	const tips: Recommendation[] = [];

	if ((m.bloodPressureSystolic ?? 0) > 129 || (m.bloodPressureDiastolic ?? 0) > 84) {
		tips.push({
			title: "Monitor your blood pressure",
			description: "Your reading is above the typical range. Reduce salt intake and recheck within a few days.",
			tone: "warn",
		});
	} else {
		tips.push({
			title: "Blood pressure looks good",
			description: "Keep up your current diet and hydration habits.",
			tone: "good",
		});
	}

	if ((m.bmi ?? 0) > 24.9) {
		tips.push({
			title: "Watch your BMI",
			description: "A short daily walk and balanced meals can help bring this back into range.",
			tone: "warn",
		});
	} else if (m.bmi != null && m.bmi < 18.5) {
		tips.push({
			title: "BMI is below the typical range",
			description: "Consider a nutrient-rich diet and mention this to clinic staff if it persists.",
			tone: "warn",
		});
	} else {
		tips.push({
			title: "Healthy weight range",
			description: "Your BMI is within the typical range. Keep up your current routine.",
			tone: "good",
		});
	}

	if (m.oxygenSaturation != null && m.oxygenSaturation < 95) {
		tips.push({
			title: "Low oxygen saturation",
			description: "Please inform clinic staff before you leave — this reading is below the typical range.",
			tone: "bad",
		});
	}

	tips.push({
		title: "Schedule your next check-in",
		description: "Regular check-ins help track your health trends over time.",
		tone: "good",
	});

	return tips;
}
