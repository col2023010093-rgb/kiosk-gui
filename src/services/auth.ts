import { supabase } from "../lib/supabaseClient";
import type { ProfileRow } from "../types/database";
import type { User } from "../types/User";

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

export interface RegisterInput {
	fullName: string;
	email: string;
	password: string;
	birthdate: string;
	sex: "male" | "female";
	contactNumber: string;
	address: string;
	identificationNumber: string;
}

export interface RegisterResult {
	success: boolean;
	error?: string;
}

/**
 * Self-registration: creates the auth.users row, then a linked profiles row
 * (role: "user") and a linked patients row so kiosk barcode lookups and
 * the patient dashboard both resolve to the same person.
 * Best-effort name split: first word -> first_name, remainder -> last_name.
 */
export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
	const [firstName, ...rest] = input.fullName.trim().split(/\s+/);
	const lastName = rest.join(" ") || firstName;

	const { data, error: signUpError } = await supabase.auth.signUp({
		email: input.email,
		password: input.password,
	});
	if (signUpError || !data.user) {
		return { success: false, error: signUpError?.message ?? "Could not create account." };
	}

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.insert({ auth_id: data.user.id, role: "user", first_name: firstName, last_name: lastName, email: input.email })
		.select()
		.single();
	if (profileError) {
		return { success: false, error: profileError.message };
	}

	const { error: patientError } = await supabase.from("patients").insert({
		profile_id: profile.profile_id,
		patient_type: "student",
		identification_number: input.identificationNumber,
		first_name: firstName,
		last_name: lastName,
		sex: input.sex,
		birthdate: input.birthdate,
		contact_number: input.contactNumber,
		email: input.email,
		address: input.address,
	});
	if (patientError) {
		return { success: false, error: patientError.message };
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
