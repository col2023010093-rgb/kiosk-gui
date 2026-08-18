import { Navigate } from "react-router-dom";

// The full admin section lives under /admin/* (see pages/admin/*.tsx and
// routes/AppRoutes.tsx). This route-role landing page just forwards there.
export default function AdminDashboard() {
	return <Navigate to="/admin" replace />;
}
