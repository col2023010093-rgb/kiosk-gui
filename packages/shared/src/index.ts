// Lib & Client
export * from "./lib/supabaseClient";

// Types
export * from "./types/database";
export * from "./types/User";
export * from "./types/Patient";
export * from "./types/Measurement";

// Services
export * from "./services/auth";
export * from "./services/patient";
export * from "./services/measurement";



// Context & Hooks
export * from "./context/AuthContext";
export * from "./context/authContextState";
export * from "./hooks/useAuth";
export * from "./hooks/useUsbScanner";
export * from "./hooks/useUsbScanner";

// Components
export { default as ProtectedRoute } from "./components/ProtectedRoute";
export { default as Card } from "./components/Card";
export { default as Button } from "./components/Button";
export { default as Input } from "./components/Input";
export { default as Toast } from "./components/Toast";
export type { ToastMessage } from "./components/Toast";
export { default as Navbar } from "./components/Navbar";

// Data
export * from "./data/programs";

// Utilities
export * from "./utils/scanFeedback";
export * from "./utils/registrationValidation";
export * from "./utils/helpers";
export * from "./utils/constants";
export * from "./services/localRecords";
export { getBloodPressureNotice, subscribeBloodPressureNotice } from "./services/omronBp";
