import type { Report } from "../types/Report";

/**
 * Static placeholder data — there is no `reports` table or Supabase query
 * backing this yet. `listReports()` is intentionally named generically so
 * that swapping this for a real query later doesn't require touching the
 * page components, only this file.
 */
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

/**
 * Single source of truth for whether `listReports()` is still serving
 * `mockReports` rather than a real query. Pages read this to decide whether
 * to show the "Sample Data" banner, so flipping this one flag once a real
 * report source lands removes the banner everywhere without touching the
 * page components.
 */
export const REPORTS_ARE_MOCK = true;
