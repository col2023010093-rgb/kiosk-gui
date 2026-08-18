import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

export default function IdleScreen() {
	const navigate = useNavigate();
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const [date, setDate] = useState(() => formatDate(new Date()));

	useEffect(() => {
		const updateClock = () => {
			const now = new Date();
			setClock(formatClock(now));
			setDate(formatDate(now));
		};

		updateClock();
		const intervalId = window.setInterval(updateClock, 1000);

		return () => window.clearInterval(intervalId);
	}, []);

	const handleTap = () => {
		navigate("/login");
	};

	return (
		<div className="idle-screen relative flex h-dvh w-full flex-col items-center overflow-hidden bg-bg text-ink">
			<div
				className="absolute inset-0 -z-20"
				style={{
					backgroundImage:
						"linear-gradient(rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(rgba(20,184,166,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.09) 1px, transparent 1px)",
					backgroundSize: "16px 16px, 16px 16px, 80px 80px, 80px 80px",
				}}
			/>
			<div
				className="absolute -z-10 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full"
				style={{
					top: "38%",
					left: "50%",
					background: "radial-gradient(circle, rgba(45,212,191,0.16) 0%, rgba(45,212,191,0) 70%)",
				}}
			/>

			<header className="w-full max-w-[1080px] shrink-0 px-[clamp(1rem,3vw,2.5rem)] pt-[clamp(0.5rem,2dvh,2rem)]">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="relative flex h-[clamp(1.75rem,4.5dvh,2.25rem)] w-[clamp(1.75rem,4.5dvh,2.25rem)] shrink-0 items-center justify-center rounded-[9px] bg-linear-to-br from-accent to-accent-deep shadow-[0_2px_8px_rgba(13,148,136,0.35)]">
							<svg viewBox="0 0 24 24" fill="none" className="h-[50%] w-[50%]">
								<path
									d="M3 12h4l2-7 4 14 2-7h6"
									stroke="#fff"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<div>
							<div className="text-[clamp(0.875rem,2.2dvh,1.0625rem)] font-bold tracking-[0.2px]">GenErick</div>
							<div className="mt-px text-[clamp(0.5625rem,1.4dvh,0.6875rem)] uppercase tracking-[1.5px] text-muted">
								Health Monitoring Kiosk
							</div>
						</div>
					</div>

					<div className="text-right">
						<div className="font-mono text-[clamp(0.9375rem,2.4dvh,1.125rem)] font-medium tracking-[0.5px]">{clock}</div>
						<div className="mt-0.5 text-[clamp(0.5625rem,1.4dvh,0.6875rem)] uppercase tracking-[1px] text-muted">{date}</div>
					</div>
				</div>
			</header>

			<main className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-[clamp(1rem,3vw,2rem)] py-[clamp(0.5rem,2dvh,2rem)] text-center">
				<div className="idle-heartbeat mb-[clamp(0.5rem,2dvh,1.75rem)] h-[clamp(48px,9dvh,90px)] w-[min(560px,90%)] overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
					<div
						className="flex h-full w-[1000px] motion-reduce:animate-none"
						style={{ animation: "scrollPulse 3.6s linear infinite" }}
					>
						<svg width="500" height="90" viewBox="0 0 500 90" preserveAspectRatio="none" className="h-full">
							<path
								d="M0,45 L120,45 L142,45 L156,10 L172,80 L188,20 L204,45 L500,45"
								fill="none"
								stroke="#2DD4BF"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
								style={{
									filter: "drop-shadow(0 0 6px rgba(45,212,191,0.55))",
									animation: "glow 1.6s ease-in-out infinite",
								}}
							/>
						</svg>
						<svg width="500" height="90" viewBox="0 0 500 90" preserveAspectRatio="none" className="h-full">
							<path
								d="M0,45 L120,45 L142,45 L156,10 L172,80 L188,20 L204,45 L500,45"
								fill="none"
								stroke="#2DD4BF"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
								style={{
									filter: "drop-shadow(0 0 6px rgba(45,212,191,0.55))",
									animation: "glow 1.6s ease-in-out infinite",
								}}
							/>
						</svg>
					</div>
				</div>

				<div className="idle-eyebrow font-mono text-[clamp(0.65rem,1.6dvh,0.75rem)] font-medium uppercase tracking-[3px] text-accent">
					System ready
				</div>
				<h1 className="idle-title mt-[clamp(0.375rem,1.2dvh,0.75rem)] text-[clamp(1.375rem,5dvh,2.75rem)] font-bold leading-[1.15] tracking-[-0.5px]">
					Tap to begin your
					<br />
					health check
				</h1>
				<p className="idle-description mt-[clamp(0.375rem,1.2dvh,0.75rem)] max-w-[min(420px,88%)] text-[clamp(0.8125rem,1.8dvh,1rem)] text-muted">
					Sign in to your account below to start your measurement.
				</p>

				<div className="idle-cta-wrap mt-[clamp(1rem,3.5dvh,2.75rem)] flex flex-col items-center">
					<button
						type="button"
						aria-label="Tap to sign in and begin health check"
						onClick={handleTap}
						className="idle-button relative flex h-[clamp(5.5rem,14dvh,8.25rem)] w-[clamp(5.5rem,14dvh,8.25rem)] items-center justify-center rounded-full border-0 bg-linear-to-br from-accent to-accent-deep shadow-[0_12px_30px_rgba(13,148,136,0.32)] transition-transform active:scale-[0.96]"
					>
						<span
							aria-hidden="true"
							className="absolute inset-0 rounded-full border border-accent/40"
							style={{ animation: "ripple 2.4s ease-out infinite" }}
						/>
						<span
							aria-hidden="true"
							className="absolute inset-0 rounded-full border border-accent/40"
							style={{ animation: "ripple 2.4s ease-out infinite" }}
						/>
						<svg viewBox="0 0 24 24" fill="none" className="relative z-10 h-[40%] w-[40%]">
							<circle cx="12" cy="8.5" r="3.2" stroke="#fff" strokeWidth="2" />
							<path
								d="M5 19c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"
								stroke="#fff"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>

					<div className="idle-button-label mt-[clamp(0.75rem,2dvh,1.25rem)] font-mono text-[clamp(0.6875rem,1.6dvh,0.8125rem)] font-medium uppercase tracking-[2.5px] text-accent-deep">
						Touch to sign in
					</div>
				</div>
			</main>

			<ol className="idle-steps flex w-full max-w-[820px] shrink-0 list-none flex-row max-[420px]:flex-col px-[clamp(0.75rem,3vw,2rem)] pb-[clamp(0.5rem,2dvh,1.75rem)] pt-[clamp(0.25rem,1dvh,0.5rem)]">
				<li className="flex flex-1 items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] px-0 py-[clamp(0.5rem,1.6dvh,1rem)] text-[clamp(0.75rem,1.6dvh,0.84375rem)] font-medium text-ink sm:px-[clamp(0.75rem,1.5vw,1.125rem)]">
					<span className="flex h-[clamp(1.125rem,3dvh,1.375rem)] w-[clamp(1.125rem,3dvh,1.375rem)] shrink-0 items-center justify-center rounded-[5px] border border-accent font-mono text-[clamp(0.625rem,1.4dvh,0.6875rem)] text-accent">
						01
					</span>
					<span>
						Sign In
						<span className="mt-px block text-[clamp(0.65rem,1.3dvh,0.71875rem)] font-normal text-muted">
							Or create an account
						</span>
					</span>
				</li>
				<li className="flex flex-1 items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] border-l border-line px-0 py-[clamp(0.5rem,1.6dvh,1rem)] text-[clamp(0.75rem,1.6dvh,0.84375rem)] font-medium text-ink max-[420px]:border-l-0 max-[420px]:border-t sm:px-[clamp(0.75rem,1.5vw,1.125rem)]">
					<span className="flex h-[clamp(1.125rem,3dvh,1.375rem)] w-[clamp(1.125rem,3dvh,1.375rem)] shrink-0 items-center justify-center rounded-[5px] border border-accent font-mono text-[clamp(0.625rem,1.4dvh,0.6875rem)] text-accent">
						02
					</span>
					<span>
						Take Measurements
						<span className="mt-px block text-[clamp(0.65rem,1.3dvh,0.71875rem)] font-normal text-muted">
							Vitals recorded automatically
						</span>
					</span>
				</li>
				<li className="flex flex-1 items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] border-l border-line px-0 py-[clamp(0.5rem,1.6dvh,1rem)] text-[clamp(0.75rem,1.6dvh,0.84375rem)] font-medium text-ink max-[420px]:border-l-0 max-[420px]:border-t sm:px-[clamp(0.75rem,1.5vw,1.125rem)]">
					<span className="flex h-[clamp(1.125rem,3dvh,1.375rem)] w-[clamp(1.125rem,3dvh,1.375rem)] shrink-0 items-center justify-center rounded-[5px] border border-accent font-mono text-[clamp(0.625rem,1.4dvh,0.6875rem)] text-accent">
						03
					</span>
					<span>
						Get Recommendations
						<span className="mt-px block text-[clamp(0.65rem,1.3dvh,0.71875rem)] font-normal text-muted">
							Personalized health tips
						</span>
					</span>
				</li>
			</ol>

			<footer className="idle-footer flex w-full max-w-[1080px] shrink-0 items-center justify-between border-t border-line px-[clamp(1rem,3vw,2.5rem)] py-[clamp(0.5rem,1.6dvh,1rem)] pb-[clamp(0.75rem,2.2dvh,1.625rem)] text-[clamp(0.6875rem,1.4dvh,0.75rem)] text-muted">

			</footer>
		</div>
	);
}