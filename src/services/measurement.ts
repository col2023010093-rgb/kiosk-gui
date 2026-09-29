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

// Both sensor endpoints are served by the single consolidated sensor_server.py
// on port 5000 (formerly two separate scripts on 5000 and 5001 — see that
// file's docstring for the merge rationale).
const SENSOR_BASE_URL = (import.meta.env.VITE_SENSOR_BASE_URL ?? "http://localhost:5000").replace(/\/$/, "");
const HEART_RATE_SPO2_URL = `${SENSOR_BASE_URL}/api/heart-rate-spo2`;
const TEMPERATURE_URL = `${SENSOR_BASE_URL}/api/temperature`;
const SENSOR_TIMEOUT_MS = 12_000;

async function readSensorResponse<T>(url: string, label: string): Promise<T> {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), SENSOR_TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		const body: unknown = await response.json().catch(() => null);
		if (!response.ok) {
			const message =
				typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
					? body.error
					: `${label} sensor request failed (${response.status})`;
			throw new Error(message);
		}
		return body as T;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw new Error(`${label} sensor timed out. Check that the device is connected and retry.`, { cause: error });
		}
		if (error instanceof Error) throw new Error(error.message, { cause: error });
		throw new Error(`${label} sensor is unavailable.`, { cause: error });
	} finally {
		window.clearTimeout(timeout);
	}
}

function requireFiniteNumber(value: unknown, label: string, min: number, max: number): number {
	if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
		throw new Error(`${label} sensor returned an invalid reading. Please retry.`);
	}
	return value;
}

interface SensorReader {
	/**
	 * True if this reader returns placeholder data instead of a real
	 * hardware reading. Set to false once the corresponding physical sensor
	 * (see height_sensor_server.py, a future BP sensor server) is wired up.
	 */
	simulated: boolean;
	read: () => Promise<Partial<SensorReading>>;
}

// Physical sensor capture — unrelated to Supabase, left as-is. heightWeight
// and bloodPressure still have no hardware endpoint wired up (see
// height_sensor_server.py, which exists but isn't called from here yet), so
// those two readers return simulated data and are flagged `simulated: true`.
// runAssessment uses that flag to mark the whole result as simulated, and
// saveHealthRecord refuses to persist a simulated result — see below.
const SENSOR_READERS: Record<SensorKey, SensorReader> = {
	heightWeight: {
		simulated: true,
		read: async () => {
			const heightCm = 162;
			const weightKg = round1(randomBetween(58, 72));
			const bmi = round1(weightKg / (heightCm / 100) ** 2);
			return { heightCm, weightKg, bmi };
		},
	},
	bloodPressure: {
		simulated: true,
		read: async () => {
			return {
				bloodPressureSystolic: Math.round(randomBetween(110, 132)),
				bloodPressureDiastolic: Math.round(randomBetween(70, 88)),
			};
		},
	},
	heartRateSpo2: {
		simulated: false,
		read: async () => {
			const data = await readSensorResponse<Partial<{ bpm: number; spo2: number }>>(
				HEART_RATE_SPO2_URL,
				"Heart rate/SpO2"
			);
			return {
				heartRate: Math.round(requireFiniteNumber(data.bpm, "Heart rate", 30, 220)),
				oxygenSaturation: Math.round(requireFiniteNumber(data.spo2, "Oxygen saturation", 70, 100)),
			};
		},
	},
	temperature: {
		simulated: false,
		read: async () => {
			const data = await readSensorResponse<Partial<{ celsius: number }>>(TEMPERATURE_URL, "Temperature");
			return { temperatureCelsius: round1(requireFiniteNumber(data.celsius, "Temperature", 25, 45)) };
		},
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
	const simulatedSensors: SensorKey[] = [];
	for (const sensorKey of sensors) {
		const reader = SENSOR_READERS[sensorKey];
		const partial = await reader.read();
		Object.assign(reading, partial);
		if (reader.simulated) simulatedSensors.push(sensorKey);
	}

	return {
		id: `m-${Date.now()}`,
		patientId,
		testType,
		recordedAt: new Date().toISOString(),
		...reading,
		status: computeStatus(reading),
		isSimulated: simulatedSensors.length > 0,
		simulatedSensors,
	};
}

/**
 * Persists an AssessmentResult to health_records once the kiosk flow completes.
 *
 * Refuses to write results that include simulated/placeholder sensor data
 * (see SENSOR_READERS above) — a demo reading must never be recorded as if
 * it came from a real screening. Callers should check `result.isSimulated`
 * themselves *before* calling this, so the person sees a "demo mode" state
 * rather than a save-failed error; this check is a defense-in-depth backstop
 * in case a future caller forgets to.
 */
export async function saveHealthRecord(
	result: AssessmentResult,
	opts: { kioskId?: string | null; measuredBy?: string | null } = {}
): Promise<HealthRecord> {
	if (result.isSimulated) {
		throw new Error(
			"Refusing to save a measurement that includes simulated/placeholder sensor data " +
				`(${result.simulatedSensors.join(", ")}). Connect the real sensor(s) before this can be recorded.`
		);
	}

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

type HealthRecordWithProfile = HealthRecord & {
	patients: {
		identification_number: string | null;
		profiles: { first_name: string; last_name: string } | null;
	} | null;
};

export async function listRecentHealthRecords(limit = 50): Promise<HealthRecordWithPatient[]> {
	const { data, error } = await supabase
		.from("health_records")
		.select("*, patients(identification_number, profiles!fk_profile(first_name, last_name))")
		.order("measured_at", { ascending: false })
		.limit(limit);

	if (error) throw error;
	return ((data ?? []) as unknown as HealthRecordWithProfile[]).map(({ patients, ...record }) => ({
		...record,
		patients: patients?.profiles
			? { first_name: patients.profiles.first_name, middle_name: null, last_name: patients.profiles.last_name, identification_number: patients.identification_number ?? "" }
			: null,
	}));
}

export { getVitalStatus };
