import { useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, supabase, useAuth } from "@generick/shared";
import { KioskSessionProvider } from "../context/KioskSessionContext";
import KioskLayout from "../layouts/KioskLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import IdleScreen from "../pages/kiosk/IdleScreen";
import MeasureVitals from "../pages/kiosk/MeasureVitals";
import Results from "../pages/kiosk/Results";
import CompleteScreen from "../pages/kiosk/CompleteScreen";

import UserDashboard from "../pages/dashboard/UserDashboard";
import SelfMeasureVitals from "../pages/dashboard/SelfMeasureVitals";

import Profile from "../pages/user/Profile";
import HealthRecords from "../pages/user/HealthRecords";
import Recommendations from "../pages/user/Recommendations";
import History from "../pages/user/History";

import MyBarcode from "../pages/user/MyBarcode";
import PublicBarcodeView from "../pages/PublicBarcodeView";

/**
 * This kiosk is for patients only. Staff and admin accounts use the separate staff portal,
 * so if one signs in here it is signed out again and the login screen explains why.
 */
function PatientsOnlyNotice() {
	useEffect(() => {
		void supabase.auth.signOut();
	}, []);
	return <Navigate to="/login" replace state={{ notice: "patients-only" }} />;
}

function UserOnlyRoute({ children }: { children: ReactNode }) {
	const { user, isAuthenticated, loading } = useAuth();

	// Still restoring the session (for example right after a refresh): do not redirect yet.
	if (loading) return null;
	if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
	if (user.role !== "user") return <PatientsOnlyNotice />;
	return <>{children}</>;
}

export default function AppRoutes() {
	return (
		<AuthProvider>
			<Routes>
				{/* Kiosk flow: own session state (current patient/measurement),
					separate from the main app AuthContext. */}
				<Route
					path="/kiosk"
					element={
						<KioskSessionProvider>
							<KioskLayout>
								<Outlet />
							</KioskLayout>
						</KioskSessionProvider>
					}
				>
					{/* IdleScreen stays public: it is the pre-login landing screen. */}
					<Route index element={<IdleScreen />} />
					{/* Everything past the idle screen requires a real patient login. */}
					<Route
						path="measure"
						element={
							<UserOnlyRoute>
								<MeasureVitals />
							</UserOnlyRoute>
						}
					/>
					<Route
						path="results"
						element={
							<UserOnlyRoute>
								<Results />
							</UserOnlyRoute>
						}
					/>
					<Route
						path="complete"
						element={
							<UserOnlyRoute>
								<CompleteScreen />
							</UserOnlyRoute>
						}
					/>
				</Route>

				{/* IdleScreen also acts as the site root and legacy /kiosk/idle path. */}
				<Route
					path="/"
					element={
						<KioskSessionProvider>
							<KioskLayout>
								<IdleScreen />
							</KioskLayout>
						</KioskSessionProvider>
					}
				/>

				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/forgot-password" element={<ForgotPassword />} />
				<Route path="/reset-password" element={<ResetPassword />} />

				{/* Patient / user role */}
				<Route
					path="/dashboard"
					element={
						<UserOnlyRoute>
							<DashboardLayout>
								<Outlet />
							</DashboardLayout>
						</UserOnlyRoute>
					}
				>
					<Route index element={<UserDashboard />} />
					<Route path="measure" element={<SelfMeasureVitals />} />
					<Route path="records" element={<HealthRecords />} />
					<Route path="recommendations" element={<Recommendations />} />
					<Route path="history" element={<History />} />
					<Route path="profile" element={<Profile />} />
				</Route>

				<Route path="my-barcode" element={<MyBarcode />} />

				{/* Public, phone-facing check-in pass opened from the dashboard QR code.
					Intentionally outside the route guard: it is opened on the patient's own
					phone and reads only the ID + expiry carried in the link. */}
				<Route path="/public-barcode" element={<PublicBarcodeView />} />

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	);
}
