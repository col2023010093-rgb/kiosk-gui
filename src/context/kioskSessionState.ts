import { createContext, useContext } from "react";
import type { Patient } from "../types/Patient";
import type { AssessmentResult } from "../types/Measurement";

export interface KioskSessionValue {
	staffUnlocked: boolean;
	staffName: string | null;
	unlockStaff: (name: string) => void;
	lockStaff: () => void;

	patient: Patient | null;
	setPatient: (patient: Patient | null) => void;

	measurement: AssessmentResult | null;
	setMeasurement: (measurement: AssessmentResult | null) => void;

	resetSession: () => void;
}

export const KioskSessionContext = createContext<KioskSessionValue | undefined>(undefined);

export function useKioskSession() {
	const ctx = useContext(KioskSessionContext);
	if (!ctx) throw new Error("useKioskSession must be used within a KioskSessionProvider");
	return ctx;
}
