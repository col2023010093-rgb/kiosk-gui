import { supabase, lookupPatientLocal } from "@generick/shared";
import type { LocalPatient } from "@generick/shared";
import type { Patient } from "@generick/shared";
import type { PatientRow, ProfileRow } from "@generick/shared";

type PatientWithProfile = PatientRow & {
	profiles: Pick<ProfileRow, "first_name" | "last_name" | "email"> | null;
};

const PATIENT_SELECT = "*, profiles!fk_profile(first_name, last_name, email)";

function toPatient(record: PatientWithProfile): Patient {
	if (!record.profiles) throw new Error("Patient account details are unavailable.");
	const { profiles, ...patient } = record;
	return { ...patient, first_name: profiles.first_name, middle_name: null, last_name: profiles.last_name, email: profiles.email };
}

/** Kiosk barcode scan -> patient lookup by identification_number. */
export async function findPatientByBarcode(barcode: string): Promise<Patient | null> {
	const trimmed = barcode.trim();
	if (!trimmed) return null;

        // Offline-first: look in the kiosk's local patient cache (refreshed by the nightly sync).
        // Not cached, or the local service is unreachable -> fall through to Supabase below.
        try {
                const cached = await lookupPatientLocal(trimmed);
                if (cached) return patientFromLocal(cached);
        } catch (err) {
                console.warn("Local patient lookup failed; trying Supabase.", err);
        }

	const { data, error } = await supabase
		.from("patients")
		.select(PATIENT_SELECT)
		.eq("identification_number", trimmed)
		.maybeSingle();

	if (error) throw error;
	return data ? toPatient(data as PatientWithProfile) : null;
}

/** Staff-side search by name or ID number. */
export async function searchPatients(query: string): Promise<Patient[]> {
	const q = query.trim();
	const { data, error } = await supabase.from("patients").select(PATIENT_SELECT).order("created_at", { ascending: false });
	if (error) throw error;
	const patients = (data ?? []).map((record) => toPatient(record as PatientWithProfile));
	if (!q) return patients;
	const needle = q.toLocaleLowerCase();
	return patients.filter((patient) =>
		`${patient.first_name} ${patient.last_name} ${patient.identification_number ?? ""}`.toLocaleLowerCase().includes(needle)
	);
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
	const { data, error } = await supabase
		.from("patients")
		.select(PATIENT_SELECT)
		.eq("patient_id", patientId)
		.maybeSingle();

	if (error) throw error;
	return data ? toPatient(data as PatientWithProfile) : null;
}

export async function getPatientByProfileId(profileId: string): Promise<Patient | null> {
	const { data, error } = await supabase.from("patients").select(PATIENT_SELECT).eq("profile_id", profileId).maybeSingle();
	if (error) throw error;
	return data ? toPatient(data as PatientWithProfile) : null;
}

export async function countPatients(): Promise<number> {
	const { count, error } = await supabase.from("patients").select("*", { count: "exact", head: true });
	if (error) throw error;
	return count ?? 0;
}

export interface StaffPatientRegistration {
	firstName: string;
	lastName: string;
	email: string;
	patientType: Patient["patient_type"];
	birthdate: string;
	sex: NonNullable<Patient["sex"]>;
	contactNumber: string;
	address: string;
	identificationNumber: string;
	course?: string;
	department?: string;
}

/** Staff registration creates the required profile before its linked patient record. */
export async function registerPatient(input: StaffPatientRegistration): Promise<Patient> {
	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.insert({ auth_id: null, role: "user", first_name: input.firstName, last_name: input.lastName, email: input.email })
		.select()
		.single();
	if (profileError) throw profileError;

	const { data, error } = await supabase
		.from("patients")
		.insert({
			profile_id: profile.profile_id,
			patient_type: input.patientType,
			identification_number: input.identificationNumber,
			sex: input.sex,
			birthdate: input.birthdate,
			contact_number: input.contactNumber,
			address_legacy: input.address,
			course: input.patientType === "student" ? input.course : null,
			department: input.patientType !== "student" ? input.department : null,
		})
		.select()
		.single();
	if (error) throw error;
	return { ...data, first_name: profile.first_name, middle_name: null, last_name: profile.last_name, email: profile.email };
}

/** Builds a display-only Patient from a cached row. Fields the cache does not hold are left empty. */
function patientFromLocal(c: LocalPatient): Patient {
        return {
                patient_id: c.patient_id,
                identification_number: c.identification_number,
                patient_type: c.patient_type,
                sex: c.sex,
                birthdate: c.birthdate,
                first_name: c.first_name ?? "",
                middle_name: null,
                last_name: c.last_name ?? "",
                email: "",
        } as unknown as Patient;
}