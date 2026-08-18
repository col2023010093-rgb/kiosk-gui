import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { KioskSessionProvider } from "../context/KioskSessionContext";
import ProtectedRoute from "../components/ProtectedRoute";
import KioskStaffGate from "../components/KioskStaffGate";
import KioskLayout from "../layouts/KioskLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

import IdleScreen from "../pages/kiosk/IdleScreen";
import ScanBarcode from "../pages/kiosk/ScanBarcode";
import PatientConfirm from "../pages/kiosk/PatientConfirm";
import MeasureVitals from "../pages/kiosk/MeasureVitals";
import Results from "../pages/kiosk/Results";
import CompleteScreen from "../pages/kiosk/CompleteScreen";
import NotRegistered from "../pages/kiosk/NotRegistered";

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
					<Route index element={<IdleScreen />} />
					<Route
						path="scan"
						element={
							<KioskStaffGate>
								<ScanBarcode />
							</KioskStaffGate>
						}
					/>
					<Route
						path="confirm"
						element={
							<KioskStaffGate>
								<PatientConfirm />
							</KioskStaffGate>
						}
					/>
					<Route
						path="measure"
						element={
							<KioskStaffGate>
								<MeasureVitals />
							</KioskStaffGate>
						}
					/>
					<Route
						path="results"
						element={
							<KioskStaffGate>
								<Results />
							</KioskStaffGate>
						}
					/>
					<Route
						path="complete"
						element={
							<KioskStaffGate>
								<CompleteScreen />
							</KioskStaffGate>
						}
					/>
					<Route
						path="not-registered"
						element={
							<KioskStaffGate>
								<NotRegistered />
							</KioskStaffGate>
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
