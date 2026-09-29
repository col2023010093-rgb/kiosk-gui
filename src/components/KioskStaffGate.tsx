import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function KioskStaffGate({ children }: { children: ReactNode }) {
	const { user, loading } = useAuth();

	if (loading) return null;
	if (!user || (user.role !== "clinic_staff" && user.role !== "admin")) {
		return <Navigate to="/kiosk" replace />;
	}

	return <>{children}</>;
}
