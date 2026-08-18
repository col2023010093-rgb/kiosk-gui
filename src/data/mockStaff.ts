// Demo-only data for the Admin > Staff Accounts page. Not real accounts.
export interface StaffAccount {
	id: string;
	fullName: string;
	email: string;
	position: string;
	status: "active" | "suspended";
	lastLogin: string;
}

export const mockStaffAccounts: StaffAccount[] = [
	{
		id: "s-0001",
		fullName: "Clinic Staff",
		email: "staff@genErick.demo",
		position: "Nurse Aide",
		status: "active",
		lastLogin: "2026-07-24T09:12:00.000Z",
	},
	{
		id: "s-0002",
		fullName: "Rosa Dizon",
		email: "rdizon@genErick.demo",
		position: "Barangay Health Worker",
		status: "active",
		lastLogin: "2026-07-23T14:05:00.000Z",
	},
	{
		id: "s-0003",
		fullName: "Noel Fernandez",
		email: "nfernandez@genErick.demo",
		position: "Nurse Aide",
		status: "suspended",
		lastLogin: "2026-06-30T08:40:00.000Z",
	},
];
