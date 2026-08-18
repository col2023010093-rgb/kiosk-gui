import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useKioskSession } from "../hooks/useKioskSession";

export default function KioskStaffGate({ children }: { children: ReactNode }) {
	const { staffUnlocked } = useKioskSession();

	if (!staffUnlocked) {
		return <Navigate to="/kiosk" replace />;
	}

	return <>{children}</>;
}
