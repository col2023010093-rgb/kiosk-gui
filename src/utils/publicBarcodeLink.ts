// Pure helpers shared by UserDashboard (builds the QR link) and
// PublicBarcodeView (reads it), so the query-parameter format lives in one place.
//
// Privacy note: the link carries only the patient's ID number, an optional
// masked display name, and an expiry time. It never carries emails, tokens,
// or measurements. The expiry is a client-side courtesy, not security —
// anything sensitive must be enforced by the future API.

export const PUBLIC_BARCODE_PATH = "/public-barcode";

/** How long a generated link stays usable on the phone. */
export const PUBLIC_BARCODE_TTL_MS = 10 * 60 * 1000;

const ID_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const MAX_LABEL_LENGTH = 60;

export interface PublicBarcodeParams {
	id: string;
	label: string | null;
	expiresAt: number;
}

export type PublicBarcodeParseResult =
	| { status: "ok"; params: PublicBarcodeParams }
	| { status: "invalid" };

/**
 * Base URL the phone should open. Defaults to the current origin. If the kiosk
 * itself runs on localhost (a phone cannot reach that), set VITE_PUBLIC_APP_URL
 * to an address the phone can reach, e.g. http://192.168.1.20:5173
 */
export function getPublicBaseUrl(): string {
	const configured: unknown = import.meta.env.VITE_PUBLIC_APP_URL;
	if (typeof configured === "string" && configured.trim()) {
		return configured.trim().replace(/\/+$/, "");
	}
	return window.location.origin;
}

/** "Juan Dela Cruz" -> "J. Cruz". Returns null when there is no usable name. */
export function maskDisplayName(fullName: string | null | undefined): string | null {
	const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return null;
	const initial = parts[0][0].toUpperCase();
	if (parts.length === 1) return `${initial}.`;
	return `${initial}. ${parts[parts.length - 1]}`;
}

/** "2021-00123" -> "••••••0123" (shows at most the last 4 characters). */
export function maskIdentificationNumber(id: string): string {
	const visible = Math.min(4, Math.floor(id.length / 2));
	return `${"•".repeat(id.length - visible)}${id.slice(id.length - visible)}`;
}

interface BuildInput {
	baseUrl: string;
	id: string;
	label?: string | null;
	now: number;
}

export function buildPublicBarcodeUrl({ baseUrl, id, label, now }: BuildInput): string {
	const query = new URLSearchParams({ id, exp: String(now + PUBLIC_BARCODE_TTL_MS) });
	if (label) query.set("n", label);
	return `${baseUrl}${PUBLIC_BARCODE_PATH}?${query.toString()}`;
}

export function parsePublicBarcodeParams(search: URLSearchParams): PublicBarcodeParseResult {
	const id = (search.get("id") ?? "").trim();
	if (!ID_PATTERN.test(id)) return { status: "invalid" };

	const expiresAt = Number(search.get("exp"));
	if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) return { status: "invalid" };

	const rawLabel = (search.get("n") ?? "").trim().slice(0, MAX_LABEL_LENGTH);
	return { status: "ok", params: { id, label: rawLabel || null, expiresAt } };
}