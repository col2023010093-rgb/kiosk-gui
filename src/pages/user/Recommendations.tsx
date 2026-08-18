import { CheckCircle2, Lightbulb, ShieldCheck } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { recommendations, healthInsights } from "../../data/mockHealth";

const PRIORITY_STYLES: Record<string, string> = {
	routine: "bg-good-tint text-good",
	"follow-up": "bg-warn-tint text-warn",
};

export default function Recommendations() {
	return (
		<>
			<Navbar
				eyebrow="Guidance"
				title="Recommendations"
				subtitle="Generic, rule-based tips drawn from your recorded vitals — not a diagnosis."
			/>

			<div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
				<Card title="Suggested next steps">
					<ul className="flex flex-col gap-4">
						{recommendations.map((rec) => (
							<li key={rec.id} className="flex items-start gap-3">
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-ink">{rec.title}</span>
										<span
											className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[rec.priority]}`}
										>
											{rec.priority === "follow-up" ? "Follow-up" : "Routine"}
										</span>
									</div>
									<p className="mt-0.5 text-xs text-muted">{rec.reason}</p>
								</div>
							</li>
						))}
					</ul>
				</Card>

				<Card>
					<div className="flex items-center gap-3">
						<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
							<Lightbulb className="h-5 w-5" />
						</span>
						<h3 className="text-[15px] font-bold text-ink">Health insights</h3>
					</div>
					<ul className="mt-4 flex flex-col gap-3">
						{healthInsights.map((insight) => (
							<li key={insight} className="border-l-2 border-accent pl-3 text-sm leading-6 text-ink">
								{insight}
							</li>
						))}
					</ul>
					<p className="mt-5 flex gap-2 border-t border-line pt-4 text-xs leading-5 text-muted">
						<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" />
						This information supports health awareness and is not medical advice. Consult qualified
						healthcare personnel for concerns.
					</p>
				</Card>
			</div>
		</>
	);
}
