import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types/User";
import { AuthContext } from "./authContextState";
import { supabase } from "../lib/supabaseClient";
import { fetchProfileForAuthId, loginRequest, logoutRequest } from "../services/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		// Restore whatever session Supabase already has (e.g. after a page refresh).
		void supabase.auth
			.getSession()
			.then(async ({ data }) => {
				const authId = data.session?.user.id;
				const profile = authId ? await fetchProfileForAuthId(authId).catch(() => null) : null;
				if (!cancelled) setUser(profile);
			})
			.catch(() => {
				if (!cancelled) setUser(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		// Keep in sync with sign-in/sign-out happening elsewhere (other tabs, token refresh, etc.).
		const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
			if (!session?.user) {
				setUser(null);
				return;
			}
			const profile = await fetchProfileForAuthId(session.user.id).catch(() => null);
			setUser(profile);
			setLoading(false);
		});

		return () => {
			cancelled = true;
			subscription.subscription.unsubscribe();
		};
	}, []);

	async function login(email: string, password: string) {
		const result = await loginRequest(email, password);
		if (result.success && result.user) {
			setUser(result.user);
			return { success: true, role: result.user.role };
		}
		return { success: false, error: result.error };
	}

	async function logout() {
		await logoutRequest();
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}
