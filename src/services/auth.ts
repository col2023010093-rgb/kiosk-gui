import { supabase } from "../lib/supabaseClient";
import type { ProfileRow } from "../types/database";
import type { User } from "../types/User";
import {
	validateAndNormalizeRegistration,
	type RegistrationInput,
} from "../utils/registrationValidation";

export interface LoginResult {
	success: boolean;
	user?: User;
	error?: string;
}

function toUser(profile: ProfileRow): User {
	return {
		id: profile.profile_id,
		authId: profile.auth_id,
		fullName: `${profile.first_name} ${profile.last_name}`.trim(),
		email: profile.email,
		role: profile.role,
		avatarInitials: `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase() || undefined,
	};
}

export async function fetchProfileForAuthId(authId: string): Promise<User | null> {
	const { data, error } = await supabase.from("profiles").select("*").eq("auth_id", authId).maybeSingle();
	if (error) throw error;
	return data ? toUser(data) : null;
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error || !data.user) {
		return { success: false, error: error?.message ?? "Sign in failed." };
	}

	const user = await fetchProfileForAuthId(data.user.id);
	if (!user) {
		return { success: false, error: "Signed in, but no profile record was found for this account." };
	}

	return { success: true, user };
}

export type RegisterInput = RegistrationInput;

export interface RegisterResult {
	success: boolean;
	error?: string;
}

/**
 * Client-side validation is duplicated here as a defensive usability guard.
 * Supabase RLS, database constraints, and a server-side registration endpoint
 * must still enforce these rules because callers can bypass this client.
 */
export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
	const validation = validateAndNormalizeRegistration(input);
	if (!validation.value) return { success: false, error: validation.error ?? "Invalid registration details." };
	const value = validation.value;
	const address = [
		value.address.houseNumber,
		value.address.street,
		value.address.barangay,
		value.address.cityMunicipality,
		value.address.province,
		value.address.region,
		value.address.country,
	]
		.filter(Boolean)
		.join(", ");

	const { data, error: signUpError } = await supabase.auth.signUp({
		email: value.email,
		password: value.password,
	});
	if (signUpError || !data.user) {
		return { success: false, error: signUpError?.message ?? "Could not create account." };
	}

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.insert({ auth_id: data.user.id, role: "user", first_name: value.firstName, last_name: value.lastName, email: value.email })
		.select()
		.single();
	if (profileError) {
		return { success: false, error: "Could not finish creating the account." };
	}

	const { error: patientError } = await supabase.from("patients").insert({
		profile_id: profile.profile_id,
		patient_type: value.patientType,
		identification_number: value.identificationNumber,
		first_name: value.firstName,
		last_name: value.lastName,
		sex: value.sex,
		birthdate: value.birthdate,
		course: value.course ?? null,
		department: value.department ?? null,
		contact_number: value.contactNumber,
		email: value.email,
		address,
	});
	if (patientError) {
		return { success: false, error: "Could not finish creating the patient record." };
	}

	return { success: true };
}

export async function logoutRequest(): Promise<void> {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<{ sent: boolean; error?: string }> {
	const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
	if (error) return { sent: false, error: error.message };
	return { sent: true };
}
