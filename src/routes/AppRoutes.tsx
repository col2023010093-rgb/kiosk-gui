import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@generick/shared";
import { KioskSessionProvider } from "../context/KioskSessionContext";
import { ProtectedRoute } from "@generick/shared";
import KioskLayout from "../layouts/KioskLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import type { UserRole } from "@generick/shared";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import IdleScreen from "../pages/kiosk/IdleScreen";
import MeasureVitals from "../pages/kiosk/MeasureVitals";
import Results from "../pages/kiosk/Results";
import CompleteScreen from "../pages/kiosk/CompleteScreen";

import UserDashboard from "../pages/dashboard/UserDashboard";
import StaffDashboard from "../pages/dashboard/StaffDashboard";
import SelfMeasureVitals from "../pages/dashboard/SelfMeasureVitals";

import Profile from "../pages/user/Profile";
import HealthRecords from "../pages/user/HealthRecords";
import Recommendations from "../pages/user/Recommendations";
import History from "../pages/user/History";

import Patients from "../pages/staff/Patients";
import RegisterPatient from "../pages/staff/RegisterPatient";
import Measurements from "../pages/staff/Measurements";
import StaffReports from "../pages/staff/Reports";

import AdminHome from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import StaffAccounts from "../pages/admin/StaffAccounts";
import AdminReports from "../pages/admin/Reports";
import Settings from "../pages/admin/Settings";
import SystemLogs from "../pages/admin/SystemLogs";

import MyBarcode from "../pages/user/MyBarcode";
import PublicBarcodeView from "../pages/PublicBarcodeView";

// Kiosk screening flow (scan -> confirm -> measure -> results -> complete) now
// requires a real login instead of the old unauthenticated 5-tap staff gate.
// Any authenticated role can operate the kiosk device; narrow this to
// ["user"] if self-service should be patient-accounts-only.
const KIOSK_ALLOWED_ROLES: UserRole[] = ["user", "clinic_staff", "admin"];

export default function AppRoutes() {
	return (
		<AuthProvider>
			<Routes>
				{/* Kiosk flow — own session state (staff unlock, current patient/measurement),
				    separate from the main app's AuthContext. */}
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
					{/* IdleScreen stays public — it's the pre-login landing screen. */}
					<Route index element={<IdleScreen />} />
					{/* Everything past the idle screen requires a real login (any role). */}
					<Route
						path="measure"
						element={
							<ProtectedRoute allowedRoles={KIOSK_ALLOWED_ROLES}>
								<MeasureVitals />
							</ProtectedRoute>
						}
					/>
					<Route
						path="results"
						element={
							<ProtectedRoute allowedRoles={KIOSK_ALLOWED_ROLES}>
								<Results />
							</ProtectedRoute>
						}
					/>
					<Route
						path="complete"
						element={
							<ProtectedRoute allowedRoles={KIOSK_ALLOWED_ROLES}>
								<CompleteScreen />
							</ProtectedRoute>
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
						<ProtectedRoute allowedRoles={["user"]}>
							<DashboardLayout>
								<Outlet />
							</DashboardLayout>
						</ProtectedRoute>
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
				    Intentionally outside ProtectedRoute: it is opened on the patient's own
				    phone and reads only the ID + expiry carried in the link. */}
				<Route path="/public-barcode" element={<PublicBarcodeView />} />


				{/* Clinic staff role */}
				<Route
					path="/staff"
					element={
						<ProtectedRoute allowedRoles={["clinic_staff"]}>
							<DashboardLayout>
								<Outlet />
							</DashboardLayout>
						</ProtectedRoute>
					}
				>
					<Route index element={<Patients />} />
					<Route path="patients" element={<Patients />} />
					<Route path="register" element={<RegisterPatient />} />
					<Route path="measurements" element={<Measurements />} />
					<Route path="reports" element={<StaffReports />} />
				</Route>

				{/* Kiosk-side device maintenance console (settings/calibration/override) —
				    a standalone full-screen page, not part of the web staff dashboard. */}
				<Route
					path="/kiosk/maintenance"
					element={
						<ProtectedRoute allowedRoles={["clinic_staff"]}>
							<StaffDashboard />
						</ProtectedRoute>
					}
				/>

				{/* Administrator role */}
				<Route
					path="/admin"
					element={
						<ProtectedRoute allowedRoles={["admin"]}>
							<DashboardLayout>
								<Outlet />
							</DashboardLayout>
						</ProtectedRoute>
					}
				>
					<Route index element={<AdminHome />} />
					<Route path="users" element={<Users />} />
					<Route path="staff-accounts" element={<StaffAccounts />} />
					<Route path="reports" element={<AdminReports />} />
					<Route path="settings" element={<Settings />} />
					<Route path="logs" element={<SystemLogs />} />
				</Route>

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	);
}