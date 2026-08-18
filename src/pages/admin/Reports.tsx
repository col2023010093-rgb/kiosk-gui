import { FileText } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { listReports } from "../../services/report";

export default function Reports() {
	const reports = listReports();

	return (
		<>
			<Navbar eyebrow="Administrator" title="Reports" subtitle="System-wide and staff-level summaries." />

			<div className="flex flex-col gap-4">
				{reports.map((report) => (
					<Card key={report.id}>
						<div className="flex items-start gap-4">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
								<FileText className="h-5 w-5" />
							</span>
							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-bold text-ink">{report.title}</h3>
									<span className="rounded-full bg-app px-2 py-0.5 text-[10.5px] font-semibold uppercase text-muted">
										{report.type}
									</span>
								</div>
								<p className="mt-1 text-xs text-muted">{report.summary}</p>
								<p className="mt-2 font-mono text-[11px] text-muted">
									{new Date(report.generatedAt).toLocaleDateString("en-US", {
										month: "long",
										day: "numeric",
										year: "numeric",
									})}
								</p>
							</div>
						</div>
					</Card>
				))}
			</div>
		</>
	);
}
