import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { AlertTriangle, Clock, Download, Eye, EyeOff, HeartPulse, ScanLine, ShieldCheck, User } from "lucide-react";
import { maskIdentificationNumber, parsePublicBarcodeParams } from "../utils/publicBarcodeLink";

// Public, phone-friendly page opened by scanning the "Mobile Sync" QR code on
// the dashboard. It shows the person's own check-in pass (their ID as a QR
// code) plus a masked name. It deliberately shows no measurements or results.

const CLOCK_TICK_MS = 15_000;

/** Ask browsers and crawlers not to index this page or leak it via Referer. */
function usePrivateMeta() {
	useEffect(() => {
		const previousTitle = document.title;
		document.title = "Kiosk Check-In Pass";

		const tags = [
			{ name: "robots", content: "noindex, nofollow" },
			{ name: "referrer", content: "no-referrer" },
		].map(({ name, content }) => {
			const tag = document.createElement("meta");
			tag.name = name;
			tag.content = content;
			document.head.appendChild(tag);
			return tag;
		});

		return () => {
			document.title = previousTitle;
			tags.forEach((tag) => tag.remove());
		};
	}, []);
}

interface MessageCardProps {
	icon: typeof AlertTriangle;
	title: string;
	body: string;
}

function MessageCard({ icon: Icon, title, body }: MessageCardProps) {
	return (
		<div role="alert" className="flex flex-col items-center text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
				<Icon className="h-8 w-8" aria-hidden="true" />
			</div>
			<h1 className="text-2xl font-extrabold text-[#0F172A]">{title}</h1>
			<p className="mt-2 text-base leading-relaxed text-[#334155]">{body}</p>
		</div>
	);
}

/** Friendly remaining time: days for long passes, hours for medium, minutes for short. */
function formatTimeLeft(minutes: number): string {
        if (minutes >= 2 * 24 * 60) return `${Math.round(minutes / (24 * 60))} days`;
        if (minutes >= 120) return `${Math.round(minutes / 60)} hours`;
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export default function PublicBarcodeView() {
	usePrivateMeta();

	const [searchParams] = useSearchParams();
	const parsed = useMemo(() => parsePublicBarcodeParams(searchParams), [searchParams]);
	const [now, setNow] = useState(() => Date.now());
	const [idRevealed, setIdRevealed] = useState(false);
	const qrWrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
		return () => window.clearInterval(interval);
	}, []);

	function handleSave() {
		const canvas = qrWrapRef.current?.querySelector("canvas");
		if (!canvas) return;
		const link = document.createElement("a");
		link.href = canvas.toDataURL("image/png");
		// Generic file name on purpose — never put the ID in a filename.
		link.download = "kiosk-pass.png";
		link.click();
	}

	const expired = parsed.status === "ok" && now >= parsed.params.expiresAt;
	const minutesLeft = parsed.status === "ok" ? Math.max(1, Math.ceil((parsed.params.expiresAt - now) / 60_000)) : 0;

	return (
		<div className="flex min-h-dvh w-full flex-col items-center bg-[#F8FAFC] px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] font-body text-[#0F172A]">
			<header className="mb-5 flex w-full max-w-sm items-center gap-3">
				<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white">
					<HeartPulse className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
				</div>
				<div className="leading-tight">
					<p className="text-lg font-extrabold">Health Monitoring Kiosk</p>
					<p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#334155]">Kiosk Check-In Pass</p>
				</div>
			</header>

			<main className="w-full max-w-sm rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
				{parsed.status === "invalid" && (
					<MessageCard
						icon={AlertTriangle}
						title="This link isn't valid"
						body="Please go back to the kiosk and show a new QR code, or ask a staff member for help."
					/>
				)}

				{parsed.status === "ok" && expired && (
					<MessageCard
						icon={Clock}
						title="This pass has expired"
						body="For your privacy, passes expire after a while. Please get a new QR code from your account and try again."
					/>
				)}

				{parsed.status === "ok" && !expired && (
					<div className="flex flex-col gap-5">
						{/* ---- Summary ---- */}
						<section aria-label="Pass details" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-center gap-3">
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#0F766E]">
									<User className="h-5 w-5" aria-hidden="true" />
								</span>
								<div className="min-w-0">
									<p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">User</p>
									<p className="truncate text-lg font-bold">{parsed.params.label ?? "Registered user"}</p>
								</div>
							</div>

							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">ID number</p>
									<p className="truncate font-mono text-lg font-bold" aria-live="polite">
										{idRevealed ? parsed.params.id : maskIdentificationNumber(parsed.params.id)}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setIdRevealed((v) => !v)}
									aria-pressed={idRevealed}
									className="flex h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-semibold text-[#0F766E] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2"
								>
									{idRevealed ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
									{idRevealed ? "Hide" : "Show"}
								</button>
							</div>

							<p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
								<Clock className="h-4 w-4" aria-hidden="true" />
								Valid for about {formatTimeLeft(minutesLeft)} more
							</p>
						</section>

						{/* ---- Barcode ---- */}
						<section aria-label="Your check-in QR code" className="flex flex-col items-center gap-3">
							<div
								ref={qrWrapRef}
								role="img"
								aria-label="QR code for your kiosk check-in pass"
								className="flex w-full max-w-[264px] items-center justify-center rounded-2xl border-2 border-dashed border-[#0F766E] bg-white p-3"
							>
								<QRCodeCanvas
									value={parsed.params.id}
									size={240}
									level="H"
									marginSize={2}
									style={{ width: "100%", height: "auto" }}
								/>
							</div>
							<p className="flex items-start gap-2 text-center text-sm font-medium leading-snug text-[#334155]">
								<ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" aria-hidden="true" />
								Turn your screen brightness up and hold this code about 6 inches (15 cm) below the kiosk's red-light scanner.
							</p>
						</section>

						<button
							type="button"
							onClick={handleSave}
							className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0F766E] text-base font-bold text-white shadow-md transition hover:bg-[#115E59] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2"
						>
							<Download className="h-5 w-5" aria-hidden="true" />
							Save image to phone
						</button>

						<p className="flex items-start gap-2 text-xs leading-snug text-[#475569]">
							<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" aria-hidden="true" />
							This pass contains only your ID number. Please don't share it with others.
						</p>
					</div>
				)}
			</main>
		</div>
	);
}