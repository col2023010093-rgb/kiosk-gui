/**
 * Non-functional scaffolding for a *future* custom backend API, reserved in
 * case this project ever moves off calling Supabase directly from the
 * client. Nothing in the app currently imports `apiFetch` — every real
 * service (auth.ts, patient.ts, measurement.ts) talks to Supabase directly
 * via `lib/supabaseClient.ts`, and `report.ts` currently returns static mock
 * data (see its own module doc). This file has no bearing on either of
 * those; do not assume `apiFetch`/`ApiError` are live or wired into
 * anything until a real backend exists to point `BASE_URL` at.
 */

// Set this once the backend exists. Left blank for same-origin mock/dev use.
const BASE_URL = "";

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: { "Content-Type": "application/json", ...init?.headers },
		...init,
	});

	if (!res.ok) {
		throw new ApiError(`Request to ${path} failed`, res.status);
	}

	return (await res.json()) as T;
}
