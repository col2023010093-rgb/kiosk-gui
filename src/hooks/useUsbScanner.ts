import { useEffect, useRef } from "react";

/**
 * USB HID (keyboard-wedge) scanner listener for the kiosk login screen.
 *
 * This is distinct from `useBarcodeScanner` (used on /kiosk/scan for patient
 * identity lookup): that one only needs to work when no input is focused.
 * This hook must keep listening even while the email/password fields are
 * focused, and must strip any scanner characters out of whatever's focused
 * instead of letting them get typed into it.
 *
 * Detection heuristic: genuine scanners emit keystrokes far faster than a
 * human can type. We can't classify the very first keystroke of a burst in
 * isolation (there's no prior timing to compare yet), so it's allowed to
 * reach the focused field as normal. From the second keystroke on, if the
 * gap since the previous one is under `interKeyThresholdMs`, we treat the
 * whole burst as a scan: every further character in it is intercepted
 * (preventDefault, never reaches the field), and the one character that
 * already landed is rolled back by restoring the field's pre-burst value.
 * Enter with a long-enough buffer completes the scan; a gap over
 * `interKeyThresholdMs` mid-burst, or the overall `bufferTimeoutMs` elapsing,
 * abandons it and lets normal typing resume.
 */

interface UseUsbScannerOptions {
	/** Max ms between keystrokes to still count as scanner input. Default 30ms. */
	interKeyThresholdMs?: number;
	/** Max ms a whole scan sequence may take before it's discarded. Default 500ms. */
	bufferTimeoutMs?: number;
	/** Minimum characters (before Enter) required to fire onScan. Default 6. */
	minLength?: number;
}

type ValueSetter = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => void;

// Writing `element.value = x` directly does not notify React, because React
// patches the native property setter and listens for the resulting `input`
// event. Calling the *original* native setter and then dispatching `input`
// ourselves makes a rollback show up as a normal controlled-input change.
const setNativeValue: ValueSetter = (element, value) => {
	const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
	descriptor?.set?.call(element, value);
	element.dispatchEvent(new Event("input", { bubbles: true }));
};

function isTextEntryElement(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
	if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false;
	if (el instanceof HTMLInputElement) {
		return ["text", "email", "password", "search", "tel", "url", "number"].includes(el.type);
	}
	return true;
}

export function useUsbScanner(onScan: (code: string) => void, enabled = true, options: UseUsbScannerOptions = {}) {
	const { interKeyThresholdMs = 30, bufferTimeoutMs = 500, minLength = 6 } = options;

	const bufferRef = useRef("");
	const lastKeyTimeRef = useRef(0);
	const burstStartTimeRef = useRef(0);
	const isScanningRef = useRef(false);
	const suppressedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	const suppressedFieldSnapshotRef = useRef("");

	// Keep the latest callback without re-binding the global listener every render.
	const onScanRef = useRef(onScan);
	useEffect(() => {
		onScanRef.current = onScan;
	}, [onScan]);

	useEffect(() => {
		if (!enabled) return;

		function resetBurst() {
			bufferRef.current = "";
			isScanningRef.current = false;
			suppressedFieldRef.current = null;
			suppressedFieldSnapshotRef.current = "";
		}

		function handleKeyDown(e: KeyboardEvent) {
			// Don't let modifier combos (paste, copy, browser shortcuts) affect
			// scan-timing state at all.
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			const now = performance.now();
			const sinceLastKey = now - lastKeyTimeRef.current;
			const target = e.target;

			if (e.key === "Enter") {
				const code = bufferRef.current;
				const wasScanning = isScanningRef.current;
				if (wasScanning) {
					// The scan owns this keystroke: never submit whatever form the
					// focused field belongs to.
					e.preventDefault();
					e.stopPropagation();
				}
				resetBurst();
				lastKeyTimeRef.current = now;
				if (wasScanning && code.length >= minLength) {
					onScanRef.current(code);
				}
				return;
			}

			if (!e.key || e.key.length !== 1) {
				// Non-character keys (Backspace, Tab, arrows, ...) — and any
				// synthetic keydown with no `key` at all (autofill, some IME/
				// virtual-keyboard events) — shouldn't be swallowed and
				// shouldn't reset scan timing either.
				lastKeyTimeRef.current = now;
				return;
			}

			const gapTooLong = sinceLastKey > interKeyThresholdMs;
			const burstAgeTooLong = burstStartTimeRef.current !== 0 && now - burstStartTimeRef.current > bufferTimeoutMs;

			if (gapTooLong || burstAgeTooLong) {
				// Starting a fresh possible burst. Snapshot whatever's focused so
				// a later rollback (if this turns out to be a scan) has something
				// to restore. This first character is allowed through normally —
				// we can't classify it yet.
				resetBurst();
				burstStartTimeRef.current = now;
				bufferRef.current = e.key;
				if (isTextEntryElement(target)) {
					suppressedFieldRef.current = target;
					suppressedFieldSnapshotRef.current = target.value;
				}
				lastKeyTimeRef.current = now;
				return;
			}

			// Fast enough to be scanner input.
			bufferRef.current += e.key;
			lastKeyTimeRef.current = now;

			if (!isScanningRef.current) {
				isScanningRef.current = true;
				// This is the first keystroke we're confident about — roll back
				// the one character that already landed from the previous
				// keydown, if any, before we start suppressing further ones.
				const field = suppressedFieldRef.current;
				if (field && document.contains(field)) {
					setNativeValue(field, suppressedFieldSnapshotRef.current);
				}
			}

			if (isTextEntryElement(target)) {
				e.preventDefault();
				e.stopPropagation();
			}
		}

		// `capture: true` so this still runs even if some other input handler
		// on the page calls stopPropagation.
		window.addEventListener("keydown", handleKeyDown, true);
		return () => {
			window.removeEventListener("keydown", handleKeyDown, true);
			resetBurst();
		};
	}, [enabled, interKeyThresholdMs, bufferTimeoutMs, minLength]);
}