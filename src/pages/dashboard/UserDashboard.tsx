import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, Ruler, Gauge, Activity, Thermometer, ClipboardList, Check } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

type TestType = "bmi" | "blood_pressure" | "heart_rate_spo2" | "temperature" | "complete";

const TEST_OPTIONS: { id: TestType; label: string; icon: typeof Ruler; measures: string[]; span?: boolean }[] = [
	{
		id: "bmi",
		label: "BMI Assessment",
		icon: Ruler,
		measures: ["Height", "Weight", "BMI"],
	},
	{
		id: "blood_pressure",
		label: "Blood Pressure Assessment",
		icon: Gauge,
		measures: ["Systolic BP", "Diastolic BP"],
	},
	{
		id: "heart_rate_spo2",
		label: "Heart Rate and Blood Oxygen Assessment",
		icon: Activity,
		measures: ["Heart Rate (BPM)", "SpO\u2082"],
	},
	{
		id: "temperature",
		label: "Body Temperature Assessment",
		icon: Thermometer,
		measures: ["Body Temperature (\u00b0C)"],
	},
	{
		id: "complete",
		label: "Complete Health Assessment",
		icon: ClipboardList,
		measures: ["Height", "Weight", "BMI", "Blood Pressure", "Heart Rate", "SpO\u2082", "Temperature", "Summary & recommendations"],
		span: true,
	},
];

export default function UserDashboard() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [selectedTest, setSelectedTest] = useState<TestType | null>(null);

	function handleBeginTest() {
		if (!selectedTest) return;
		navigate("/dashboard/measure", { state: { testType: selectedTest } });
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
			className="relative flex h-dvh w-full flex-col overflow-hidden bg-app px-[clamp(0.75rem,2.2vw,2rem)] py-[clamp(0.5rem,1.6vh,1.25rem)] font-body [font-kerning:normal]"
		>
			{/* Faint idle-screen echo: a single restrained radial wash, not a decoration layer */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(20,184,166,0.07),transparent_60%)]"
			/>

			{/* Kiosk top bar: logo left, profile right */}
			<div className="relative flex shrink-0 items-center justify-between gap-3 pb-[clamp(0.4rem,1.2vh,0.9rem)]">
				<div className="flex items-center gap-2">
					<div className="animate-pulse-glow flex h-[clamp(1.6rem,4vh,2rem)] w-[clamp(1.6rem,4vh,2rem)] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-deep shadow-[0_0_10px_-2px_rgba(20,184,166,0.55)]">
						<HeartPulse className="h-[55%] w-[55%] text-white" strokeWidth={2.25} />
					</div>
					<div className="leading-tight">
						<div className="text-[clamp(0.75rem,1.6vw,0.95rem)] font-bold text-ink">GenErick</div>
						<div className="text-[clamp(0.6rem,1vw,0.7rem)] uppercase tracking-[1.5px] text-muted">Health Monitoring Kiosk</div>
					</div>
				</div>

				{user && (
					<div className="flex items-center gap-2">
						<div className="flex h-[clamp(1.5rem,3.5vh,2.1rem)] w-[clamp(1.5rem,3.5vh,2.1rem)] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-[clamp(0.65rem,1.2vw,0.8rem)] font-semibold text-white">
							{user.avatarInitials}
						</div>
						<div className="hidden leading-tight sm:block">
							<div className="text-[clamp(0.75rem,1.3vw,0.85rem)] font-semibold text-ink">{user.fullName}</div>
							<div className="text-[clamp(0.7rem,1vw,0.75rem)] text-muted">{user.email}</div>
						</div>
					</div>
				)}
			</div>

			{/* Patient portal identity — dashboard page title per style guide: 28-32px target */}
			<header className="relative shrink-0 pb-[clamp(0.4rem,1.2vh,0.9rem)] text-center sm:text-left">
				<span
					aria-hidden="true"
					className="mx-auto mb-1.5 block h-1 w-10 rounded-full bg-gradient-to-r from-accent to-accent-deep sm:mx-0"
				/>
				<h1 className="text-[clamp(1.375rem,3vw,2rem)] leading-tight font-bold tracking-tight text-ink text-balance">
					Generic Patient Portal
				</h1>
				<p className="mt-0.5 hidden text-[clamp(0.8rem,1.1vw,0.9rem)] leading-snug text-pretty text-muted sm:block">
					Select the assessment you'd like to take, then begin at the kiosk.
				</p>
			</header>

			{/* Assessment selection: fills remaining viewport height */}
			<section className="relative flex min-h-0 flex-1 flex-col rounded-[1.25rem] border border-accent/15 bg-gradient-to-b from-white to-accent-tint/25 p-[clamp(0.6rem,1.8vh,1.25rem)] shadow-[0_1px_2px_rgba(11,36,48,0.04),0_10px_28px_-16px_rgba(13,148,136,0.35)]">
				<div className="shrink-0 pb-[clamp(0.4rem,1vh,0.7rem)]">
					<h2 className="text-[clamp(1rem,1.8vw,1.375rem)] leading-tight font-bold text-ink text-balance">
						Choose a Physiological Assessment
					</h2>
				</div>

				<div className="grid min-h-0 flex-1 grid-cols-3 auto-rows-fr gap-[clamp(0.4rem,1.2vh,0.9rem)]">
					{TEST_OPTIONS.map((option) => {
						const Icon = option.icon;
						const isSelected = selectedTest === option.id;
						const isHeartbeat = option.id === "heart_rate_spo2";
						return (
							<button
								key={option.id}
								type="button"
								onClick={() => setSelectedTest(option.id)}
								aria-pressed={isSelected}
								className={`flex min-h-0 min-w-0 flex-col items-start gap-[clamp(0.2rem,0.8vh,0.5rem)] overflow-hidden rounded-xl border p-[clamp(0.5rem,1.4vh,1rem)] text-left transition ${
									option.span ? "col-span-2" : "col-span-1"
								} ${
									isSelected
										? "border-accent bg-accent/5 ring-2 ring-accent/25 shadow-[0_0_22px_-8px_rgba(20,184,166,0.55)]"
										: "border-line bg-white hover:border-accent/40 hover:bg-accent/5 hover:shadow-[0_4px_14px_-8px_rgba(13,148,136,0.35)]"
								}`}
							>
								<span
									className={`flex h-[clamp(1.5rem,4vh,2.2rem)] w-[clamp(1.5rem,4vh,2.2rem)] shrink-0 items-center justify-center rounded-lg ${
										isSelected ? "bg-accent text-white" : "bg-accent/10 text-accent"
									} ${isHeartbeat ? "animate-pulse-glow" : ""}`}
								>
									<Icon className="h-[55%] w-[55%]" aria-hidden="true" />
								</span>
								<p className="text-[clamp(0.875rem,1.4vw,1.05rem)] leading-snug font-semibold text-ink text-balance">
									{option.label}
								</p>
								<ul
									className={`min-h-0 gap-x-4 gap-y-0.5 overflow-hidden ${
										option.span ? "grid grid-cols-2" : "flex flex-col"
									}`}
								>
									{option.measures.map((measure) => (
										<li
											key={measure}
											className="flex items-center gap-1 text-[clamp(0.875rem,1vw,0.95rem)] leading-snug text-muted"
										>
											<Check className="h-[0.85em] w-[0.85em] shrink-0 text-accent" aria-hidden="true" />
											{measure}
										</li>
									))}
								</ul>
							</button>
						);
					})}
				</div>

				<div className="flex shrink-0 justify-center pt-[clamp(0.4rem,1.2vh,0.9rem)] sm:justify-end">
					<button
						type="button"
						onClick={handleBeginTest}
						disabled={!selectedTest}
						className="inline-flex h-[clamp(2.75rem,5.5vh,3rem)] items-center gap-2 rounded-xl bg-accent px-[clamp(1rem,3vw,1.5rem)] text-[clamp(0.875rem,1.3vw,1rem)] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(13,148,136,0.4)] transition hover:bg-accent-deep hover:shadow-[0_0_18px_-3px_rgba(20,184,166,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
					>
						Begin Test <ArrowRight className="h-[1em] w-[1em]" aria-hidden="true" />
					</button>
				</div>
			</section>
		</motion.div>
	);
}