import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings2, SlidersHorizontal, OctagonAlert, HeartPulse, LogOut } from "lucide-react";

type Tab = "settings" | "calibration" | "override";

// Shorter loop for device-maintenance access than a patient dashboard session
// would need, but longer than the patient kiosk dashboard timeout since staff
// tasks (calibration especially) can take a few minutes of hands-on work.
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const WARNING_BEFORE_MS = 20 * 1000;

const TABS: { key: Tab; label: string; icon: typeof Settings2 }[] = [
	{ key: "settings", label: "Settings", icon: Settings2 },
	{ key: "calibration", label: "Calibration", icon: SlidersHorizontal },
	{ key: "override", label: "Override", icon: OctagonAlert },
];

export default function StaffDashboard() {
	const navigate = useNavigate();
	const [tab, setTab] = useState<Tab>("settings");
	const [showWarning, setShowWarning] = useState(false);
	const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	function logout() {
		navigate("/");
	}

	useEffect(() => {
		function resetTimers() {
			setShowWarning(false);
			if (idleTimer.current) clearTimeout(idleTimer.current);
			if (warnTimer.current) clearTimeout(warnTimer.current);
			warnTimer.current = setTimeout(() => setShowWarning(true), IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
			idleTimer.current = setTimeout(logout, IDLE_TIMEOUT_MS);
		}
		resetTimers();
		const events = ["pointerdown", "keydown"];
		events.forEach((ev) => window.addEventListener(ev, resetTimers));
		return () => {
			events.forEach((ev) => window.removeEventListener(ev, resetTimers));
			if (idleTimer.current) clearTimeout(idleTimer.current);
			if (warnTimer.current) clearTimeout(warnTimer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="relative flex min-h-screen w-full flex-col bg-bg text-ink font-sans">
			<div
				className="pointer-events-none absolute inset-0 -z-20"
				style={{
					backgroundImage:
						"linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)",
					backgroundSize: "32px 32px",
				}}
			/>

			<header className="flex items-center justify-between border-b border-line px-6 py-5 sm:px-10">
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-deep shadow-lg shadow-accent/20">
						<HeartPulse className="h-5 w-5 text-white" strokeWidth={2.25} />
					</div>
					<div>
						<div className="text-[17px] font-bold tracking-tight text-ink">Staff Console</div>
						<div className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted">
							Kiosk Device Maintenance
						</div>
					</div>
				</div>

				<button
					onClick={logout}
					className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-red-300 hover:text-red-500"
				>
					<LogOut className="h-4 w-4" />
					Sign out
				</button>
			</header>

			<nav className="flex gap-2 px-6 pt-6 sm:px-10">
				{TABS.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						onClick={() => setTab(key)}
						className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-colors ${
							tab === key
								? "bg-primary text-white shadow-sm shadow-primary/20"
								: "border border-line text-muted hover:border-primary/40 hover:text-ink"
						}`}
					>
						<Icon className="h-4 w-4" />
						{label}
					</button>
				))}
			</nav>

			<main className="flex-1 px-6 py-8 sm:px-10">
				<motion.div
					key={tab}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25 }}
					className="max-w-xl rounded-2xl border border-line bg-white p-7 shadow-sm"
				>
					{tab === "settings" && (
						<>
							<h2 className="text-[17px] font-semibold text-ink">Kiosk settings</h2>
							<ul className="mt-4 space-y-3 text-[14px] text-muted">
								<li className="flex items-center justify-between border-b border-line pb-3">
									Idle screen timeout duration
									<span className="font-mono text-[12.5px] text-ink">45s</span>
								</li>
								<li className="flex items-center justify-between border-b border-line pb-3">
									Barcode scanner test / re-pair
									<span className="rounded-full bg-good-tint px-2.5 py-0.5 text-[11.5px] font-medium text-good">
										Connected
									</span>
								</li>
								<li className="flex items-center justify-between border-b border-line pb-3">
									Network &amp; sync status
									<span className="rounded-full bg-good-tint px-2.5 py-0.5 text-[11.5px] font-medium text-good">
										Online
									</span>
								</li>
								<li className="flex items-center justify-between">
									Display brightness &amp; sleep schedule
									<span className="font-mono text-[12.5px] text-ink">80%</span>
								</li>
							</ul>
						</>
					)}

					{tab === "calibration" && (
						<>
							<h2 className="text-[17px] font-semibold text-ink">Sensor calibration</h2>
							<ul className="mt-4 space-y-3 text-[14px] text-muted">
								<li className="flex items-center justify-between border-b border-line pb-3">
									Weight sensor — tare / zero offset
									<button className="text-[12.5px] font-medium text-primary hover:text-primary-deep">
										Run
									</button>
								</li>
								<li className="flex items-center justify-between border-b border-line pb-3">
									Height module — reference calibration
									<button className="text-[12.5px] font-medium text-primary hover:text-primary-deep">
										Run
									</button>
								</li>
								<li className="flex items-center justify-between border-b border-line pb-3">
									BP cuff — pressure sensor check
									<button className="text-[12.5px] font-medium text-primary hover:text-primary-deep">
										Run
									</button>
								</li>
								<li className="flex items-center justify-between">
									Temperature probe — offset adjustment
									<button className="text-[12.5px] font-medium text-primary hover:text-primary-deep">
										Run
									</button>
								</li>
							</ul>
						</>
					)}

					{tab === "override" && (
						<>
							<h2 className="text-[17px] font-semibold text-ink">Manual override</h2>
							<ul className="mt-4 space-y-3 text-[14px] text-muted">
								<li className="flex items-center justify-between border-b border-line pb-3">
									Force-end a stuck measurement session
									<button className="text-[12.5px] font-medium text-red-500 hover:text-red-600">
										End session
									</button>
								</li>
								<li className="flex items-center justify-between">
									Re-trigger a failed sensor reading
									<button className="text-[12.5px] font-medium text-primary hover:text-primary-deep">
										Retry
									</button>
								</li>
							</ul>
							<p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">
								Patient lookup, registration, and record edits aren&rsquo;t handled here — those
								live in the web application&rsquo;s Clinic Staff dashboard.
							</p>
						</>
					)}
				</motion.div>
			</main>

			{showWarning && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="fixed bottom-8 right-8 rounded-xl border border-red-200 bg-white px-5 py-4 shadow-lg"
				>
					<p className="text-[13.5px] font-medium text-ink">Session ending soon due to inactivity.</p>
					<p className="mt-1 text-[12px] text-muted">Tap anywhere to stay signed in.</p>
				</motion.div>
			)}

			<footer className="border-t border-line px-6 py-4 text-center text-[12px] text-muted sm:px-10">
				<Link to="/" className="hover:text-primary-deep">
					&larr; Back to Idle Screen
				</Link>
			</footer>
		</div>
	);
}
