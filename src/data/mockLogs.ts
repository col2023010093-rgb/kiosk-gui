// Demo-only data for the Admin > System Logs page. Not real audit records.
export type LogLevel = "info" | "warning" | "error";

export interface SystemLogEntry {
	id: string;
	timestamp: string;
	level: LogLevel;
	message: string;
}

export const mockSystemLogs: SystemLogEntry[] = [
	{ id: "log-1", timestamp: "2026-07-25T05:58:00.000Z", level: "info", message: "Kiosk idle screen resumed after session timeout." },
	{ id: "log-2", timestamp: "2026-07-25T05:41:00.000Z", level: "info", message: "Patient screening session completed and saved." },
	{ id: "log-3", timestamp: "2026-07-24T21:03:00.000Z", level: "warning", message: "Barcode scanner reconnect required — brief USB disconnect detected." },
	{ id: "log-4", timestamp: "2026-07-24T13:22:00.000Z", level: "info", message: "Staff PIN login succeeded." },
	{ id: "log-5", timestamp: "2026-07-23T10:15:00.000Z", level: "error", message: "Temperature sensor read timeout; manual entry used instead." },
];
