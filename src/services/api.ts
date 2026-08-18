// Thin fetch wrapper for the future backend API. No backend exists yet —
// every current service (auth.ts, patient.ts, measurement.ts, report.ts)
// uses mock data and does not call this module. Wire it in once the API ships.

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
