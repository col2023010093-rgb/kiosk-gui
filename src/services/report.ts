import type { Report } from "../types/Report";

// Mock report list only — replace with a real API call later.
export const mockReports: Report[] = [
	{
		id: "r-0001",
		title: "Weekly Screening Summary",
		generatedAt: "2026-07-14T08:00:00.000Z",
		type: "system",
		summary: "42 patients screened this week; 3 flagged for follow-up blood pressure monitoring.",
	},
	{
		id: "r-0002",
		title: "Clinic Staff Activity",
		generatedAt: "2026-07-10T08:00:00.000Z",
		type: "staff",
		summary: "Patient registrations and kiosk sessions handled by clinic staff this month.",
	},
];

export function listReports(): Report[] {
	return mockReports;
}
