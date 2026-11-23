import { supabase, saveRecordLocal, LocalApiUnavailableError } from "@generick/shared";
import { VITAL_RANGES } from "@generick/shared";
import type {
	AssessmentResult,
	AssessmentType,
	HealthRecord,
	SensorKey,
	VitalStatus,
} from "@generick/shared";

function randomBetween(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function round1(value: number) {
	return Math.round(value * 10) / 10;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

// All sensor endpoints are served by the single consolidated sensor_server.py
// on port 5000.
const HEIGHT_URL = "/api/height";
const WEIGHT_URL = "/api/weight";
const HEART_RATE_SPO2_URL = "/api/heart-rate-spo2";
const TEMPERATURE_URL = "/api/temperature";

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 220;

type ProgressCallback = (partial: Partial<SensorReading>) => void;

interface SensorReader {
	/**
	 * True if this reader returns placeholder data instead of a real
	 * hardware reading. Set to false once the corresponding physical sensor
	 * (e.g. a future BP sensor server) is wired up.
	 */
	simulated: boolean;
	/** `onPartial` lets a reader report values as soon as each one is ready. */
	read: (onPartial?: ProgressCallback) => Promise<Partial<SensorReading>>;
}

/** Fetches a sensor endpoint and surfaces the server's { error } message on failure. */
async function fetchSensor<T>(url: string, label: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error ?? `${label} sensor request failed (${response.status})`);
	}
	return response.json();
}

// Physical sensor capture — unrelated to Supabase, left as-is. heightWeight,
// heartRateSpo2 and temperature read from real hardware via sensor_server.py.
// bloodPressure still has no hardware endpoint wired up, so it returns
// simulated data and is flagged `simulated: true`. runAssessment uses that
// flag to mark the whole result as simulated, and saveHealthRecord refuses to
// persist a simulated result — see below.
const SENSOR_READERS: Record<SensorKey, SensorReader> = {
	heightWeight: {
		simulated: false,
		read: async (onPartial) => {
			// Sequential on purpose: sensor_server.py runs with threaded=False.
			// 1) Height
			const { heightCm: rawHeight } = await fetchSensor<{ heightCm: number }>(HEIGHT_URL, "Height");
			const heightCm = round1(rawHeight);
			if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
				throw new Error(`Implausible height reading (${Math.round(heightCm)} cm). Please stand straight under the sensor.`);
			}
			onPartial?.({ heightCm });

			// 2) Weight (waits for the person to stand still)
			const { weightKg: rawWeight } = await fetchSensor<{ weightKg: number }>(WEIGHT_URL, "Weight");
			const weightKg = round1(rawWeight);
			onPartial?.({ weightKg });

			// 3) BMI, calculated from the two. Short pause so the UI visibly "calculates".
			await sleep(800);
			const bmi = round1(weightKg / (heightCm / 100) ** 2);
			onPartial?.({ bmi });

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
			const data = await fetchSensor<{ bpm: number; spo2: number }>(HEART_RATE_SPO2_URL, "Heart rate/SpO2");
			return { heartRate: data.bpm, oxygenSaturation: data.spo2 };
		},
	},
	temperature: {
		simulated: false,
		read: async () => {
			const data = await fetchSensor<{ celsius: number }>(TEMPERATURE_URL, "Temperature");
			return { temperatureCelsius: data.celsius };
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
export async function runAssessment(
	patientId: string,
	testType: AssessmentType,
	onProgress?: (partial: Partial<AssessmentResult>) => void
): Promise<AssessmentResult> {
	const sensors = ASSESSMENT_SENSORS[testType];
	const reading: Partial<SensorReading> = {};
	const simulatedSensors: SensorKey[] = [];
	for (const sensorKey of sensors) {
		const reader = SENSOR_READERS[sensorKey];
		const partial = await reader.read((p) => {
			Object.assign(reading, p);
			onProgress?.({ ...reading });
		});
		Object.assign(reading, partial);
		onProgress?.({ ...reading });
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
        // Local SQLite first; the sync worker forwards it to Supabase later.
        // Only "service unreachable" falls through to the direct Supabase insert below.
        try {
                const saved = await saveRecordLocal({
                        patient_id: result.patientId,
                        measured_by: opts.measuredBy ?? null,
                        systolic_bp: result.bloodPressureSystolic ?? null,
                        diastolic_bp: result.bloodPressureDiastolic ?? null,
                        heart_rate: result.heartRate ?? null,
                        temperature: result.temperatureCelsius ?? null,
                        spo2: result.oxygenSaturation ?? null,
                        height_cm: result.heightCm ?? null,
                        weight_kg: result.weightKg ?? null,
                        bmi: result.bmi ?? null,
                        measured_at: result.recordedAt,
                });
                return {
                        record_id: saved.record_id,
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
                } as HealthRecord;
        } catch (err) {
                if (!(err instanceof LocalApiUnavailableError)) throw err;
                console.warn("Local database unavailable; saving directly to Supabase.");
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

