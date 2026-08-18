import { useEffect, useRef } from "react";

/**
 * USB HID (keyboard-wedge) barcode scanners emit keystrokes far faster than
 * a human can type, terminated by Enter. This hook distinguishes a genuine
 * scan from stray/manual keyboard input by measuring inter-keystroke timing,
 * so it's safe to keep listening globally without capturing normal typing
 * elsewhere on the page.
 *
 * Tuned for 1D Code128 LSB ID barcodes. MAX_INTERVAL_MS is generous enough
 * to tolerate slower/older scanner hardware while still rejecting manual typing.
 */
const MAX_INTERVAL_MS = 40;
const MIN_BARCODE_LENGTH = 4;

export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
	const bufferRef = useRef("");
	const lastKeyTimeRef = useRef(0);

	useEffect(() => {
		if (!enabled) return;

		function handleKeyDown(e: KeyboardEvent) {
			const now = performance.now();
			const elapsed = now - lastKeyTimeRef.current;
			lastKeyTimeRef.current = now;

			// Gap too long -> treat as the start of a new (possible) scan sequence.
			if (elapsed > MAX_INTERVAL_MS) {
				bufferRef.current = "";
			}

			if (e.key === "Enter") {
				const code = bufferRef.current.trim();
				bufferRef.current = "";
				if (code.length >= MIN_BARCODE_LENGTH) {
					onScan(code);
				}
				return;
			}

			if (e.key.length === 1) {
				bufferRef.current += e.key;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onScan, enabled]);
}
