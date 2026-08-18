import { supabase } from "../lib/supabaseClient";
import { getVitalStatus } from "../utils/helpers";
import { VITAL_RANGES } from "../utils/constants";
import type {
	AssessmentResult,
	AssessmentType,
	HealthRecord,
	SensorKey,
	VitalStatus,
} from "../types/Measurement";

function randomBetween(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function round1(value: number) {
	return Math.round(value * 10) / 10;
}

const ASSESSMENT_SENSORS: Record<AssessmentType, SensorKey[]> = {
	bmi: ["heightWeight"],
	blood_pressure: ["bloodPressure"],
	heart_rate_spo2: ["heartRateSpo2"],
	temperature: ["temperature"],
	complete: ["heightWeight", "bloodPressure", "heartRateSpo2", "temperature"],
};

type SensorReading = Pick<
	AssessmentResult,
	| "heightCm"
	| "weightKg"
	| "bmi"
	| "bloodPressureSystolic"
	| "bloodPressureDiastolic"
	| "heartRate"
	| "oxygenSaturation"
	| "temperatureCelsius"
>;

const HEART_RATE_SPO2_URL = "http://localhost:5001/api/heart-rate-spo2";
const TEMPERATURE_URL = "http://localhost:5000/api/temperature";

// Physical sensor capture — unrelated to Supabase, left as-is. heightWeight
// and bloodPressure still have no hardware endpoint wired up (see
// height_sensor_server.py, which exists but isn't called from here yet).
const SENSOR_READERS: Record<SensorKey, () => Promise<Partial<SensorReading>>> = {
	heightWeight: async () => {
		const heightCm = 162;
		const weightKg = round1(randomBetween(58, 72));
		const bmi = round1(weightKg / (heightCm / 100) ** 2);
		return { heightCm, weightKg, bmi };
	},
	bloodPressure: async () => {
		return {
			bloodPressureSystolic: Math.round(randomBetween(110, 132)),
			bloodPressureDiastolic: Math.round(randomBetween(70, 88)),
		};
	},
	heartRateSpo2: async () => {
		const response = await fetch(HEART_RATE_SPO2_URL);
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.error ?? `Heart rate/SpO2 sensor request failed (${response.status})`);
		}
		const data: { bpm: number; spo2: number } = await response.json();
		return { heartRate: data.bpm, oxygenSaturation: data.spo2 };
	},
	temperature: async () => {
		const response = await fetch(TEMPERATURE_URL);
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.error ?? `Temperature sensor request failed (${response.status})`);
		}
		const data: { celsius: number } = await response.json();
		return { temperatureCelsius: data.celsius };
	},
};

function computeStatus(reading: Partial<SensorReading>): VitalStatus {
	const r = VITAL_RANGES;
	const { bloodPressureSystolic: sys, bloodPressureDiastolic: dia, heartRate, oxygenSaturation, temperatureCelsius: temp, bmi } = reading;

	const isAttention =
		(sys !== undefined && sys > r.bloodPressureSystolic.monitorMax) ||
		(dia !== undefined && dia > r.bloodPressureDiastolic.monitorMax) ||
		(heartRate !== undefined && (heartRate < r.heartRate.normalMin - 10 || heartRate > r.heartRate.normalMax + 20)) ||
		(oxygenSaturation !== undefined && oxygenSaturation < r.oxygenSaturation.normalMin - 3);

	if (isAttention) return "attention";

	const isMonitor =
		(sys !== undefined && sys > r.bloodPressureSystolic.normalMax) ||
		(dia !== undefined && dia > r.bloodPressureDiastolic.normalMax) ||
		(heartRate !== undefined && heartRate > r.heartRate.normalMax) ||
		(oxygenSaturation !== undefined && oxygenSaturation < r.oxygenSaturation.normalMin) ||
		(temp !== undefined && (temp < r.temperatureCelsius.normalMin || temp > r.temperatureCelsius.normalMax)) ||
		(bmi !== undefined && (bmi > r.bmi.normalMax || bmi < r.bmi.normalMin));

	if (isMonitor) return "monitor";

	return "normal";
}

/** Runs the requested sensors and returns an in-memory reading. Does NOT persist it. */
export async function runAssessment(patientId: string, testType: AssessmentType): Promise<AssessmentResult> {
	const sensors = ASSESSMENT_SENSORS[testType];
	const reading: Partial<SensorReading> = {};
	for (const sensorKey of sensors) {
		const partial = await SENSOR_READERS[sensorKey]();
		Object.assign(reading, partial);
	}

	return {
		id: `m-${Date.now()}`,
		patientId,
		testType,
		recordedAt: new Date().toISOString(),
		...reading,
		status: computeStatus(reading),
	};
}

/** Persists an AssessmentResult to health_records once the kiosk flow completes. */
export async function saveHealthRecord(
	result: AssessmentResult,
	opts: { kioskId?: string | null; measuredBy?: string | null } = {}
): Promise<HealthRecord> {
	const { data, error } = await supabase
		.from("health_records")
		.insert({
			patient_id: result.patientId,
			kiosk_id: opts.kioskId ?? null,
			measured_by: opts.measuredBy ?? null,
			systolic: result.bloodPressureSystolic ?? null,
			diastolic: result.bloodPressureDiastolic ?? null,
			heart_rate: result.heartRate ?? null,
			temperature: result.temperatureCelsius ?? null,
			spo2: result.oxygenSaturation ?? null,
			height: result.heightCm ?? null,
			weight: result.weightKg ?? null,
			bmi: result.bmi ?? null,
			measured_at: result.recordedAt,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function listHealthRecordsForPatient(patientId: string, limit = 20): Promise<HealthRecord[]> {
	const { data, error } = await supabase
		.from("health_records")
		.select("*")
		.eq("patient_id", patientId)
		.order("measured_at", { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data ?? [];
}

/** Staff-facing recent measurements list, joined with patient name. */
export interface HealthRecordWithPatient extends HealthRecord {
	patients: { first_name: string; middle_name: string | null; last_name: string; identification_number: string } | null;
}

export async function listRecentHealthRecords(limit = 50): Promise<HealthRecordWithPatient[]> {
	const { data, error } = await supabase
		.from("health_records")
		.select("*, patients(first_name, middle_name, last_name, identification_number)")
		.order("measured_at", { ascending: false })
		.limit(limit);

	if (error) throw error;
	return (data ?? []) as HealthRecordWithPatient[];
}

export { getVitalStatus };
