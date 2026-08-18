export type ReportType = "patient" | "staff" | "system";

export interface Report {
  id: string;
  title: string;
  generatedAt: string;
  type: ReportType;
  summary: string;
}