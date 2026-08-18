// Mirrors the `patients` table exactly (see src/types/database.ts).
// Field names are intentionally snake_case to match the DB — see project notes
// on why we adapt the app to the schema rather than the other way around.
export type { PatientRow as Patient, PatientType, Sex } from "./database";
