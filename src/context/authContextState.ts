import { createContext, useContext } from "react";
import type { User, UserRole } from "../types/User";

export interface AuthContextValue {
	user: User | null;
	isAuthenticated: boolean;
	/** True until the initial Supabase session check completes. Use this to
	 *  avoid ProtectedRoute bouncing a logged-in user to /login on refresh. */
	loading: boolean;
	login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
	logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuthContext must be used within an AuthProvider");
	return context;
}
