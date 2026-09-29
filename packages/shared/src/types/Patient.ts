import type { PatientRow, PatientType, Sex } from "./database";

/** Patient row projected with its one-to-one profile for display. */
export interface Patient extends PatientRow {
	first_name: string;
	middle_name: string | null;
	last_name: string;
	email: string;
}

export type { PatientType, Sex };
