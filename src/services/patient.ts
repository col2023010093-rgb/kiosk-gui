import { supabase } from "../lib/supabaseClient";
import type { Patient } from "../types/Patient";

/** Kiosk barcode scan -> patient lookup by identification_number. */
export async function findPatientByBarcode(barcode: string): Promise<Patient | null> {
	const trimmed = barcode.trim();
	if (!trimmed) return null;

	const { data, error } = await supabase
		.from("patients")
		.select("*")
		.eq("identification_number", trimmed)
		.maybeSingle();

	if (error) throw error;
	return data;
}

/** Staff-side search by name or ID number. */
export async function searchPatients(query: string): Promise<Patient[]> {
	const q = query.trim();
	let request = supabase.from("patients").select("*").order("created_at", { ascending: false });

	if (q) {
		request = request.or(
			`first_name.ilike.%${q}%,last_name.ilike.%${q}%,identification_number.ilike.%${q}%`
		);
	}

	const { data, error } = await request;
	if (error) throw error;
	return data ?? [];
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
	const { data, error } = await supabase
		.from("patients")
		.select("*")
		.eq("patient_id", patientId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function getPatientByProfileId(profileId: string): Promise<Patient | null> {
	const { data, error } = await supabase.from("patients").select("*").eq("profile_id", profileId).maybeSingle();
	if (error) throw error;
	return data;
}

export async function countPatients(): Promise<number> {
	const { count, error } = await supabase.from("patients").select("*", { count: "exact", head: true });
	if (error) throw error;
	return count ?? 0;
}

export async function registerPatient(
	input: Omit<Patient, "patient_id" | "created_at" | "age">
): Promise<Patient> {
	const { data, error } = await supabase.from("patients").insert(input).select().single();
	if (error) throw error;
	return data;
}
