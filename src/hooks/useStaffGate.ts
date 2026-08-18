import { useCallback, useRef, useState } from "react";

/**
 * Discreet staff-mode entry point for a public kiosk device. Rather than a
 * visible "Staff Login" button (which advertises the existence of a staff
 * mode to anyone standing at the kiosk), staff tap an unlabeled target a set
 * number of times within a short window.
 *
 * This is convenience/obscurity, not a security boundary — the real access
 * control is whatever auth check runs on the staff login screen itself, not
 * this gate. Don't treat "reached the staff login form" as "authenticated".
 */
const REQUIRED_TAPS = 5;
const WINDOW_MS = 3000;

export function useStaffGate(onUnlock: () => void) {
	const [progress, setProgress] = useState(0);
	const tapsRef = useRef<number[]>([]);

	const registerTap = useCallback(() => {
		const now = Date.now();
		tapsRef.current = [...tapsRef.current.filter((t) => now - t < WINDOW_MS), now];
		setProgress(tapsRef.current.length);
		if (tapsRef.current.length >= REQUIRED_TAPS) {
			tapsRef.current = [];
			setProgress(0);
			onUnlock();
		}
	}, [onUnlock]);

	return { registerTap, progress };
}
