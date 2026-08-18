import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { CountUp } from "./CountUp";
import { healthScore, recommendations } from "../data/mockHealth";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HealthStatusCard() {
	const offset = CIRCUMFERENCE - (healthScore.score / 100) * CIRCUMFERENCE;

	return (
		<motion.section
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
			className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8"
		>
			<h3 className="text-lg font-bold text-ink">Screening overview</h3>

			<div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
				<div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
					<svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
						<circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth="10" />
						<motion.circle
							cx="60"
							cy="60"
							r={RADIUS}
							fill="none"
							stroke="#0E9C6C"
							strokeWidth="10"
							strokeLinecap="round"
							strokeDasharray={CIRCUMFERENCE}
							initial={{ strokeDashoffset: CIRCUMFERENCE }}
							animate={{ strokeDashoffset: offset }}
							transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
						/>
					</svg>
					<div className="absolute flex flex-col items-center">
						<span className="text-3xl font-bold text-ink">
							<CountUp value={healthScore.score} className="text-3xl font-bold text-ink" />%
						</span>
						<span className="text-xs font-semibold uppercase tracking-wide text-success">
						{healthScore.label}
						</span>
					</div>
				</div>

				<div className="flex-1">
					<p className="text-xs uppercase tracking-[0.2em] text-muted">Generic next steps</p>
					<ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
						{recommendations.map((rec) => (
							<li key={rec.id} className="flex items-start gap-2 text-sm text-ink">
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} />
							<span>
								<span className="font-medium">{rec.title}</span>
								<span className="block text-muted">{rec.reason}</span>
							</span>
							</li>
						))}
					</ul>

					<p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
						This screening result is for health awareness only and is not a medical diagnosis. Consult qualified
						healthcare personnel for medical advice.
					</p>
				</div>
			</div>
		</motion.section>
	);
}
