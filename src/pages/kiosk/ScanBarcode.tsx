import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, X, Keyboard } from "lucide-react";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { findPatientByBarcode } from "../../services/patient";
import { useKioskSession } from "../../hooks/useKioskSession";

export default function ScanBarcode() {
	const navigate = useNavigate();
	const { setPatient } = useKioskSession();
	const [manualCode, setManualCode] = useState("");
	const [showManual, setShowManual] = useState(false);
	const [checking, setChecking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleScan = useCallback(
		async (code: string) => {
			setChecking(true);
			setError(null);
			try {
				const found = await findPatientByBarcode(code);
				if (found) {
					setPatient(found);
					navigate("/kiosk/confirm");
				} else {
					navigate("/kiosk/not-registered", { state: { barcode: code } });
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Could not look up this barcode.");
			} finally {
				setChecking(false);
			}
		},
		[navigate, setPatient]
	);

	useBarcodeScanner(handleScan, true);

	function handleManualSubmit(e: FormEvent) {
		e.preventDefault();
		if (manualCode.trim()) handleScan(manualCode.trim());
	}

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
			<button
				onClick={() => navigate("/kiosk")}
				className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-ink"
				aria-label="Cancel and return to idle screen"
			>
				<X size={18} />
			</button>

			<div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-accent-tint">
				<span className="absolute inset-0 animate-ping rounded-full border-2 border-accent/40" />
				<div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep">
					<ScanLine size={44} className="text-white" />
				</div>
			</div>

			<h1 className="mt-8 text-2xl font-bold text-ink">Scan your barcode</h1>
			<p className="mt-2 max-w-sm text-center text-sm text-muted">
				Hold your patient ID or QR code up to the scanner.
			</p>

			<button
				onClick={() => setShowManual((v) => !v)}
				className="mt-6 flex items-center gap-2 text-xs font-medium text-primary"
			>
				<Keyboard size={14} />
				{showManual ? "Hide manual entry" : "Enter code manually"}
			</button>

			{showManual && (
				<form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
					<input
						value={manualCode}
						onChange={(e) => setManualCode(e.target.value)}
						placeholder="e.g. 00214"
						className="w-40 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-primary"
					/>
					<button type="submit" disabled={checking} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
						{checking ? "Checking…" : "Go"}
					</button>
				</form>
			)}
			{error && <p className="mt-3 max-w-sm text-center text-sm text-bad">{error}</p>}
		</div>
	);
}
