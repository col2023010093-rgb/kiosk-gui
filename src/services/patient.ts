import { supabase } from "../lib/supabaseClient";
import type { Patient } from "../types/Patient";
import type { PatientRow, ProfileRow } from "../types/database";

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
		})
		.select()
		.single();
	if (error) throw error;
	return { ...data, first_name: profile.first_name, middle_name: null, last_name: profile.last_name, email: profile.email };
}
