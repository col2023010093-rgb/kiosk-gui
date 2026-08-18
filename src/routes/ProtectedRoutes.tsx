import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/authContextState";
import type { UserRole } from "../types/User";

interface ProtectedRouteProps {
	children: ReactNode;
	allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
	const { user, isAuthenticated } = useAuthContext();

	// Not logged in at all -> send to login.
	if (!isAuthenticated || !user) {
		return <Navigate to="/login" replace />;
	}

	// Logged in, but wrong role for this route -> send to login too
	// (swap this for a "not authorized" page later if you want a distinct message).
	if (!allowedRoles.includes(user.role)) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
