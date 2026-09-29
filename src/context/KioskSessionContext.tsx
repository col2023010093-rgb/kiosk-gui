import { useState, useCallback, useContext } from "react"; // 👈 Added useContext
import type { ReactNode } from "react";
import type { Patient } from "@generick/shared";
import type { AssessmentResult } from "@generick/shared";
import { KioskSessionContext } from "./kioskSessionState";

export function KioskSessionProvider({ children }: { children: ReactNode }) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [measurement, setMeasurement] = useState<AssessmentResult | null>(null);

    const resetSession = useCallback(() => {
        setPatient(null);
        setMeasurement(null);
    }, []);

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

// 👈 Add this hook export
export function useKioskSession() {
    const context = useContext(KioskSessionContext);
    if (!context) {
        throw new Error("useKioskSession must be used within a KioskSessionProvider");
    }
    return context;
}