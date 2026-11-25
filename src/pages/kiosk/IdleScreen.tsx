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
        <div className="idle-screen relative flex h-dvh w-full flex-col items-center justify-between overflow-hidden bg-bg text-ink px-8 py-10 sm:px-14 sm:py-16">
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

            {/* Header */}
            <header className="w-full max-w-6xl shrink-0 px-2 sm:px-4 pt-4 sm:pt-6">
                <div className="flex items-center justify-between gap-8">
                    <div className="flex items-center gap-5 sm:gap-6">
                        <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-accent to-accent-deep shadow-[0_2px_8px_rgba(13,148,136,0.35)]">
                            <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 sm:h-11 sm:w-11">
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
                            <div className="text-3xl sm:text-4xl font-bold tracking-tight">Health Monitoring Kiosk</div>
                            <div className="mt-1 text-sm sm:text-lg font-semibold uppercase tracking-widest text-muted">
                                Health Monitoring Kiosk
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-mono text-3xl sm:text-4xl font-bold tracking-wider">{clock}</div>
                        <div className="mt-1 text-sm sm:text-lg font-semibold uppercase tracking-widest text-muted">{date}</div>
                    </div>
                </div>
            </header>

            {/* Main Hero & CTA */}
            <main className="flex w-full min-h-0 flex-1 flex-col items-center justify-evenly gap-8 sm:gap-12 px-4 py-10 sm:py-14 text-center">
                <div className="idle-heartbeat h-28 sm:h-40 w-[min(560px,90%)] overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
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

                <div className="flex flex-col items-center">
                    <div className="idle-eyebrow font-mono text-xl sm:text-2xl font-semibold uppercase tracking-[0.3em] text-accent">
                        System ready
                    </div>
                    <h1 className="idle-title mt-5 text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
                        Tap to begin your
                        <br />
                        health check
                    </h1>
                    <p className="idle-description mt-6 max-w-xl text-xl sm:text-2xl text-muted">
                        Log in to your account below to start your measurement.
                    </p>
                </div>

                <div className="idle-cta-wrap flex flex-col items-center">
                    <button
                        type="button"
                        aria-label="Tap to log in and begin health check"
                        onClick={handleTap}
                        className="idle-button relative flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center rounded-full border-0 bg-linear-to-br from-accent to-accent-deep shadow-[0_12px_30px_rgba(13,148,136,0.32)] transition-transform active:scale-[0.96] cursor-pointer"
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
                        <svg viewBox="0 0 24 24" fill="none" className="relative z-10 h-20 w-20 sm:h-28 sm:w-28">
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

                    <div className="idle-button-label mt-7 font-mono text-lg sm:text-2xl font-semibold uppercase tracking-[0.25em] text-accent-deep">
                        Touch to log in
                    </div>
                </div>
            </main>

            {/* Kiosk Process Steps */}
            <ol className="idle-steps flex w-full max-w-6xl shrink-0 list-none flex-row max-[500px]:flex-col gap-6 px-4 py-6 sm:py-8">
                <li className="flex flex-1 items-center gap-4 px-4 py-4 text-lg sm:text-xl font-medium text-ink">
                    <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border-2 border-accent font-mono text-xl sm:text-2xl font-bold text-accent">
                        01
                    </span>
                    <div>
                        <div className="text-xl sm:text-2xl font-semibold leading-tight">Log In</div>
                        <span className="text-base sm:text-lg font-normal text-muted">
                            Or create an account
                        </span>
                    </div>
                </li>
                <li className="flex flex-1 items-center gap-4 border-l border-line px-4 py-4 text-lg sm:text-xl font-medium text-ink max-[500px]:border-l-0 max-[500px]:border-t">
                    <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border-2 border-accent font-mono text-xl sm:text-2xl font-bold text-accent">
                        02
                    </span>
                    <div>
                        <div className="text-xl sm:text-2xl font-semibold leading-tight">Take Measurements</div>
                        <span className="text-base sm:text-lg font-normal text-muted">
                            Vitals recorded automatically
                        </span>
                    </div>
                </li>
                <li className="flex flex-1 items-center gap-4 border-l border-line px-4 py-4 text-lg sm:text-xl font-medium text-ink max-[500px]:border-l-0 max-[500px]:border-t">
                    <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border-2 border-accent font-mono text-xl sm:text-2xl font-bold text-accent">
                        03
                    </span>
                    <div>
                        <div className="text-xl sm:text-2xl font-semibold leading-tight">Get Recommendations</div>
                        <span className="text-base sm:text-lg font-normal text-muted">
                            Personalized health tips
                        </span>
                    </div>
                </li>
            </ol>

            <footer className="idle-footer flex w-full max-w-6xl shrink-0 items-center justify-between border-t border-line px-4 py-4 text-sm text-muted">
            </footer>
        </div>
    );
}
