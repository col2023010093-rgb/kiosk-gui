import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Patient } from "../types/Patient";
import type { AssessmentResult } from "../types/Measurement";
import { KioskSessionContext } from "./kioskSessionState";

export function KioskSessionProvider({ children }: { children: ReactNode }) {
	const [staffUnlocked, setStaffUnlocked] = useState(false);
	const [staffName, setStaffName] = useState<string | null>(null);
	const [patient, setPatient] = useState<Patient | null>(null);
	const [measurement, setMeasurement] = useState<AssessmentResult | null>(null);

	const unlockStaff = useCallback((name: string) => {
		setStaffUnlocked(true);
		setStaffName(name);
	}, []);

	const lockStaff = useCallback(() => {
		setStaffUnlocked(false);
		setStaffName(null);
	}, []);

	const resetSession = useCallback(() => {
		setPatient(null);
		setMeasurement(null);
	}, []);

	return (
		<KioskSessionContext.Provider
			value={{
				staffUnlocked,
				staffName,
				unlockStaff,
				lockStaff,
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
