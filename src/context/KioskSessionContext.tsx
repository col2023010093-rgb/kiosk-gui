import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { Patient } from "../types/Patient";
import type { AssessmentResult } from "../types/Measurement";
import { KioskSessionContext } from "./kioskSessionState";

export function KioskSessionProvider({ children }: { children: ReactNode }) {
	const [patient, setPatient] = useState<Patient | null>(null);
	const [measurement, setMeasurement] = useState<AssessmentResult | null>(null);

	const resetSession = useCallback(() => {
		setPatient(null);
		setMeasurement(null);
	}, []);

	useEffect(() => {
		if (!patient) return;

		let lastActivity = Date.now();
		const markActivity = () => {
			lastActivity = Date.now();
		};
		const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
		activityEvents.forEach((event) => window.addEventListener(event, markActivity));

		const interval = window.setInterval(() => {
			if (Date.now() - lastActivity >= 2 * 60 * 1000) resetSession();
		}, 1000);

		return () => {
			window.clearInterval(interval);
			activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
		};
	}, [patient, resetSession]);

	return (
		<KioskSessionContext.Provider
			value={{
				patient,
				setPatient,
				measurement,
				setMeasurement,
				resetSession,
			}}
		>
			{children}
		</KioskSessionContext.Provider>
	);
}
