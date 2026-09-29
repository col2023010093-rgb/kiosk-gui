import type { ProfileRole } from "./database";

// Not a raw table row — this is the synthesized session shape combining
// Supabase auth.users + our profiles row, used app-wide for "who's logged in".
export type UserRole = ProfileRole; // "user" | "clinic_staff" | "admin"

export interface User {
	id: string; // profiles.profile_id
	authId: string; // profiles.auth_id (== auth.users.id)
	fullName: string;
	email: string;
	role: UserRole;
	avatarInitials?: string;
}
