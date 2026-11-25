import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ScanLine, X, Keyboard } from "lucide-react";
import { useUsbScanner, findPatientOffline } from "@generick/shared";
import { useKioskSession } from "../../context/kioskSessionState";
import { useSupabaseReachable } from "../../hooks/useSupabaseReachable";

export default function ScanBarcode() {
    const navigate = useNavigate();
    const { setPatient } = useKioskSession();
    const reachability = useSupabaseReachable();
    const [manualCode, setManualCode] = useState("");
    const [showManual, setShowManual] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScan = useCallback(
        async (code: string) => {
            setChecking(true);
            setError(null);
            try {
                const found = await findPatientOffline(code);
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

    // Fixed: calling the imported `useUsbScanner` hook instead of undefined `useBarcodeScanner`
    useUsbScanner(handleScan, reachability === "offline");

    function handleManualSubmit(e: FormEvent) {
        e.preventDefault();
        if (manualCode.trim()) handleScan(manualCode.trim());
    }

    if (reachability === "checking") return null;
    if (reachability === "online") return <Navigate to="/login" replace />;

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
                Hold your user ID or QR code up to the scanner.
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