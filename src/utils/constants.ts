import type { UserRole } from "../types/User";

export const APP_NAME = "VitalCheck";

export const VITAL_RANGES = {
  bloodPressureSystolic: { normalMax: 120, monitorMax: 129 },
  bloodPressureDiastolic: { normalMax: 80, monitorMax: 84 },
  heartRate: { normalMin: 60, normalMax: 100 },
  oxygenSaturation: { normalMin: 95 },
  temperatureCelsius: { normalMin: 36.1, normalMax: 37.2 },
  bmi: { normalMin: 18.5, normalMax: 24.9 },
} as const;

export const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  user: "/dashboard",
  clinic_staff: "/staff",
  admin: "/admin",
};