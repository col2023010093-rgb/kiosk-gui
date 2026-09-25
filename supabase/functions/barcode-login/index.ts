import { createClient } from "jsr:@supabase/supabase-js@2";

const GENERIC_ERROR = { error: "Unable to sign in with this barcode." };
const BARCODE_PATTERN = /^BC-[A-Z0-9]{8}$/;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MINUTES = 5;

function corsHeaders(origin: string) {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		Vary: "Origin",
	};
}

function jsonResponse(body: unknown, status: number, origin: string) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
	});
}

async function hashClientKey(ip: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

Deno.serve(async (req) => {
	const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders(allowedOrigin) });
	}
	if (req.method !== "POST") {
		return jsonResponse(GENERIC_ERROR, 405, allowedOrigin);
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!supabaseUrl || !serviceRoleKey) {
		console.error("barcode-login misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
		return jsonResponse(GENERIC_ERROR, 500, allowedOrigin);
	}

	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	const clientKey = await hashClientKey(clientIp);

	// --- Rate limit check ---
	const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
	const { count: recentAttempts, error: rateLimitError } = await admin
		.from("barcode_login_attempts")
		.select("id", { count: "exact", head: true })
		.eq("client_key", clientKey)
		.gte("attempted_at", windowStart);

	if (rateLimitError) {
		console.error("barcode-login rate limit check failed:", rateLimitError.message);
		return jsonResponse(GENERIC_ERROR, 500, allowedOrigin);
	}

	if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
		await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: false });
		return jsonResponse(
			{ error: "Too many attempts. Please wait a few minutes and try again." },
			429,
			allowedOrigin
		);
	}

	// --- Parse + validate input ---
	let barcodeId: unknown;
	try {
		const body = await req.json();
		barcodeId = body?.barcode_id;
	} catch {
		await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: false });
		return jsonResponse(GENERIC_ERROR, 401, allowedOrigin);
	}

	if (typeof barcodeId !== "string" || !BARCODE_PATTERN.test(barcodeId)) {
		await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: false });
		return jsonResponse(GENERIC_ERROR, 401, allowedOrigin);
	}

	// --- Look up the profile ---
	const { data: profile, error: lookupError } = await admin
		.from("profiles")
		.select("profile_id, auth_id, email")
		.eq("barcode_id", barcodeId)
		.maybeSingle();

	if (lookupError || !profile || !profile.auth_id || !profile.email) {
		await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: false });
		return jsonResponse(GENERIC_ERROR, 401, allowedOrigin);
	}

	// --- Issue a one-time redemption token ---
	const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
		type: "magiclink",
		email: profile.email,
	});

	const tokenHash = linkData?.properties?.hashed_token;

	if (linkError || !tokenHash) {
		console.error("barcode-login could not generate link:", linkError?.message);
		await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: false });
		return jsonResponse(GENERIC_ERROR, 401, allowedOrigin);
	}

	await admin.from("barcode_login_attempts").insert({ client_key: clientKey, success: true });
	await admin.from("audit_logs").insert({
		profile_id: profile.profile_id,
		action: "barcode_login",
		table_name: "profiles",
		record_id: profile.profile_id,
	});

	return jsonResponse({ token_hash: tokenHash }, 200, allowedOrigin);
});