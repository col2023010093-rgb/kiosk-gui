import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HeartPulse } from "lucide-react";

function formatClock(date: Date) {
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
}

function formatDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface AuthLayoutProps {
	eyebrow: string;
	title: string;
	subtitle: string;
	children: React.ReactNode;
}

export default function AuthLayout({ eyebrow, title, subtitle, children }: AuthLayoutProps) {
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const [date, setDate] = useState(() => formatDate(new Date()));

	useEffect(() => {
		const tick = () => {
			const now = new Date();
			setClock(formatClock(now));
			setDate(formatDate(now));
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, []);

	return (
		<div className="auth-shell relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-ink font-sans">
			{/* Same ambient grid + glow as the Idle Screen */}
			<div
				className="pointer-events-none absolute inset-0 -z-20"
				style={{
					backgroundImage:
						"linear-gradient(rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.05) 1px, transparent 1px)",
					backgroundSize: "32px 32px",
				}}
			/>
			<div
				className="pointer-events-none absolute -z-10 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full"
				style={{
					top: "34%",
					left: "50%",
					background:
						"radial-gradient(circle, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0.06) 45%, transparent 75%)",
				}}
			/>

			<header className="auth-header w-full shrink-0 px-[clamp(0.75rem,3vw,2.5rem)] pt-[clamp(0.375rem,1.5dvh,2rem)]">
				<div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-[clamp(2rem,5dvh,2.75rem)] w-[clamp(2rem,5dvh,2.75rem)] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-deep shadow-lg shadow-accent/20">
							<HeartPulse className="h-[45%] w-[45%] text-white" strokeWidth={2.25} />
						</div>
						<div>
							<div className="text-[clamp(0.8125rem,2dvh,1.0625rem)] font-bold tracking-tight text-ink">
								LSB Clinic Kiosk
							</div>
							<div className="text-[clamp(0.5625rem,1.3dvh,0.6875rem)] font-medium uppercase tracking-[1.5px] text-muted">
								Health Monitoring System
							</div>
						</div>
					</div>

					<div className="hidden text-right sm:block">
						<div className="font-mono text-[clamp(0.8125rem,2dvh,1.0625rem)] font-semibold tabular-nums tracking-wide text-ink">
							{clock}
						</div>
						<div className="text-[clamp(0.5625rem,1.3dvh,0.6875rem)] uppercase tracking-[1px] text-muted">
							{date}
						</div>
					</div>
				</div>
			</header>

			<main className="mx-auto flex w-full min-h-0 max-w-[1200px] flex-1 flex-col items-center justify-center px-[clamp(0.75rem,3vw,2rem)] py-[clamp(0.375rem,1.5dvh,2.5rem)]">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, ease: "easeOut" }}
					className="flex min-h-0 w-full flex-col items-center"
				>
					<div className="auth-eyebrow-block mb-[clamp(0.375rem,1.6dvh,2rem)] flex shrink-0 flex-col items-center text-center">
						<span className="font-mono text-[clamp(0.625rem,1.4dvh,0.75rem)] font-semibold uppercase tracking-[3px] text-accent">
							{eyebrow}
						</span>
						<h1 className="auth-title mt-[clamp(0.25rem,1dvh,0.75rem)] text-[clamp(1.125rem,4dvh,2.25rem)] font-bold tracking-tight text-ink">
							{title}
						</h1>
						<p className="auth-subtitle mt-[clamp(0.125rem,0.6dvh,0.5rem)] max-w-[380px] text-[clamp(0.75rem,1.6dvh,0.9375rem)] text-muted">
							{subtitle}
						</p>
					</div>

					{children}
				</motion.div>
			</main>
		</div>
	);
}