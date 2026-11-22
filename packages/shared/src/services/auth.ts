import { supabase } from "@generick/shared";
import type { ProfileRow } from "@generick/shared";
import type { User } from "@generick/shared";
import {
validateAndNormalizeRegistration,
type RegistrationInput,
} from "@generick/shared";

export interface LoginResult {
success: boolean;
user?: User;
error?: string;
}

function toUser(profile: ProfileRow): User {
return {
id: profile.profile_id,
authId: profile.auth_id ?? "",
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
// The database trigger public.handle_new_user() creates the profile and patient
// rows from this metadata inside the signup transaction, so the browser must
// not insert them itself (that would duplicate rows and breaks under RLS when
// email confirmation means there is no session yet).
const { data, error: signUpError } = await supabase.auth.signUp({
email: value.email,
password: value.password,
options: {
data: {
first_name: value.firstName,
last_name: value.lastName,
patient_type: value.patientType,
identification_number: value.identificationNumber,
sex: value.sex,
birthdate: value.birthdate,
contact_number: value.contactNumber,
course: value.course ?? "",
department: value.department ?? "",
country: value.address.country,
region: value.address.region,
province: value.address.province ?? "",
city_municipality: value.address.cityMunicipality,
barangay: value.address.barangay,
street: value.address.street,
house_number: value.address.houseNumber,
},
},
});
if (signUpError || !data.user) {
return { success: false, error: signUpError?.message ?? "Could not create account." };
}

return { success: true };
}

export async function logoutRequest(): Promise<void> {
const { error } = await supabase.auth.signOut();
if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<{ sent: boolean; error?: string }> {
const base = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${base}/reset-password` });
if (error) return { sent: false, error: error.message };
return { sent: true };
}

export interface BarcodeLoginResponse {
token_hash?: string;
error?: string;
}

export async function loginWithBarcodeRequest(barcodeId: string): Promise<LoginResult> {
const { data, error: invokeError } = await supabase.functions.invoke<BarcodeLoginResponse>("barcode-login", {
body: { barcode_id: barcodeId },
});

if (invokeError || !data?.token_hash) {
return { success: false, error: data?.error ?? "Unable to sign in with this barcode." };
}

// This is what actually creates the real, refreshable Supabase session —
// the Edge Function only ever hands back a single-use redemption token.
const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
token_hash: data.token_hash,
type: "magiclink",
});
if (verifyError || !verifyData.user) {
return { success: false, error: "Unable to sign in with this barcode." };
}

const user = await fetchProfileForAuthId(verifyData.user.id);
if (!user) {
return { success: false, error: "Signed in, but no profile record was found for this account." };
}

return { success: true, user };
}

export async function getMyBarcode(): Promise<string | null> {
const { data, error } = await supabase.rpc("get_my_barcode");
if (error) throw error;
return data;
}

export async function hasRecoverySession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function updatePassword(password: string): Promise<{ updated: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { updated: false, error: error.message };
  await supabase.auth.signOut();
  return { updated: true };
}
