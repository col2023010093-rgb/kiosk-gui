export type { HealthRecordRow as HealthRecord } from "./database";

export type VitalStatus = "normal" | "monitor" | "attention";

// --- Assessment-driven workflow types ---
// Used for the kiosk's live, per-sensor capture flow, where a record is being
// built up incrementally before it's ever persisted to health_records. Kept
// separate from HealthRecord (the persisted DB row) because most fields here
// are legitimately absent depending on which sensors have run so far.

export type AssessmentType =
	| "bmi"
	| "blood_pressure"
	| "heart_rate_spo2"
	| "temperature"
	| "complete";

/** Physical sensors that exist on the kiosk. One assessment may need several. */
export type SensorKey = "heightWeight" | "bloodPressure" | "heartRateSpo2" | "temperature";

export interface AssessmentResult {
	id: string;
	patientId: string;
	testType: AssessmentType;
	recordedAt: string;
	status: VitalStatus;
	bloodPressureSystolic?: number;
	bloodPressureDiastolic?: number;
	heartRate?: number;
	oxygenSaturation?: number;
	temperatureCelsius?: number;
	heightCm?: number;
	weightKg?: number;
	bmi?: number;
}
