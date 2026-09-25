import { useCallback, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, ScanLine } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Toast, { type ToastMessage } from "../../components/Toast";
import { useAuth } from "../../hooks/useAuth";
import { useUsbScanner } from "../../hooks/useUsbScanner";
import { playScanSuccessTone, playScanErrorTone } from "../../utils/scanFeedback";
import { ROLE_HOME_ROUTE } from "../../utils/constants";

export default function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string } | null)?.from;
	const { login, loginWithBarcode } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastIdRef = useRef(0);

	function showToast(type: ToastMessage["type"], text: string) {
		toastIdRef.current += 1;
		setToast({ id: toastIdRef.current, type, text });
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!email || !password) {
			setError("Enter both email and password.");
			return;
		}

		setLoading(true);
		let result;
		try {
			result = await login(email.trim(), password);
		} catch {
			setError("Could not sign in. Please try again.");
			return;
		} finally {
			setLoading(false);
		}

		if (!result.success) {
			setError(result.error ?? "Sign in failed. Check your email and password.");
			return;
		}

		navigate(from ?? ROLE_HOME_ROUTE[result.role ?? "user"]);
	}

// Barcode scan login — works even while the email/password fields are
	// focused (see useUsbScanner). Deliberately never stores or displays the
	// scanned code; it's only ever passed straight through to the auth call.
	const handleScan = useCallback(
		async (code: string) => {
			if (scanning || loading) return; // one attempt at a time
			setScanning(true);
			setError(null);
			let result;

			try {
				result = await loginWithBarcode(code);
			} catch {
				playScanErrorTone();
				showToast("error", "Could not sign in with that scan. Please try again.");
				setScanning(false);
				return;
			}

			if (!result.success) {
				playScanErrorTone();
				showToast("error", result.error ?? "Unrecognized barcode.");
				setScanning(false);
				return;
			}

			playScanSuccessTone();
			// Unlike password login, a card scan always goes to the user's own
			// dashboard — it's not a continuation of the kiosk operator flow
			// that IdleScreen's "Tap to begin" sets `from` up for.
			navigate(ROLE_HOME_ROUTE[result.role ?? "user"]);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[scanning, loading, loginWithBarcode, navigate]
	);
	useUsbScanner(handleScan, !scanning && !loading);

	return (
		<AuthLayout
			eyebrow="Patient Authentication"
			title="Welcome back"
			subtitle="Sign in to view your health records and recommendations."
		>
			<Toast toast={toast} onDismiss={() => setToast(null)} />
			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<Input
					label="Email"
					type="email"
					placeholder="you@example.com"
					icon={<Mail className="h-4.5 w-4.5" />}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoComplete="username"
				/>
				<Input
					label="Password"
					type="password"
					placeholder="••••••••"
					icon={<Lock className="h-4.5 w-4.5" />}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
				/>

				<div className="flex items-center justify-end text-[13px]">
					<Link to="/forgot-password" className="font-medium text-accent hover:text-accent-deep">
						Forgot password?
					</Link>
				</div>

				{error && <p className="text-[13px] text-bad">{error}</p>}

				<Button type="submit" fullWidth loading={loading} disabled={scanning}>
					{loading ? "Signing in…" : "Sign In"}
				</Button>

				<div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[1.5px] text-faint">
					<span className="h-px flex-1 bg-line" />
					or scan your barcode
					<span className="h-px flex-1 bg-line" />
				</div>

				<div
					className={`flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-medium transition-colors ${
						scanning
							? "border-accent/40 bg-accent-tint/50 text-accent-deep"
							: "border-dashed border-line text-muted"
					}`}
				>
					<ScanLine className={`h-4.5 w-4.5 ${scanning ? "animate-pulse" : ""}`} />
					{scanning ? "Checking your barcode…" : "Ready to scan — no need to tap anything"}
				</div>

				<p className="text-center text-[13px] text-muted">
					Don&rsquo;t have an account?{" "}
					<Link to="/register" className="font-medium text-accent hover:text-accent-deep">
						Register
					</Link>
				</p>
			</form>
		</AuthLayout>
	);
}