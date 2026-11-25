import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, CheckCircle2, Clock, Home, Info, Mail } from "lucide-react";
import { Input, Button, Toast, requestPasswordReset, type ToastMessage } from "@generick/shared";
import VirtualKeyboard from "../../components/kiosk/VirtualKeyboard";
import AccessibilityToolbar from "../../components/kiosk/AccessibilityToolbar";
import { FONT_SCALES, type FontScaleIndex } from "../../lib/kioskAccessibility";

type LanguageCode = "en" | "es" | "tl";

// TODO: confirm these routes exist in this repo's router.
const IDLE_SCREEN_ROUTE = "/idle";
const SIGN_IN_ROUTE = "/login";
const TOAST_AUTO_DISMISS_MS = 5000;

// Same field format as the Register screen: 56px tall, text-lg, text-lg labels,
// 24px icons, default border-line with the accent focus ring.
const FIELD_FORMAT =
	"[&_input:not([type=checkbox])]:h-14 [&_input:not([type=checkbox])]:text-lg [&_label]:text-lg! [&_input:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_white_inset]";
// Shown while the on-screen keyboard is typing into the field
// (same look Register uses for an open dropdown).
const FIELD_ACTIVE = "border-accent! ring-2 ring-accent/15";
const ICON_CLASS = "h-6 w-6";

const STRINGS: Record<LanguageCode, Record<string, string>> = {
	en: {
		a11yBarLabel: "Accessibility & Assistance",
		fontSize: "Text size",
		language: "Language",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		sessionEndsIn: "Session ends in",
		seconds: "s",
		eyebrow: "USER AUTHENTICATION / RECOVERY",
		title: "Reset Your Password",
		subtitle: "Enter your registered email address below to receive a password reset link.",
		emailLabel: "Email Address",
		sendLink: "Send Reset Link",
		sending: "Sending…",
		backToSignIn: "Back to Log In",
		sentTitle: "Check your email",
		sentBody: "If an account exists for that address, a reset link is on its way.",
		needAssistance: "Need Assistance?",
		needAssistanceSub: "Tap here — a staff member will come to help.",
		staffNotified: "A staff member has been notified and will be with you shortly.",
		idleScreen: "Idle Screen",
		backCta: "Back",
		genericError: "Something went wrong. Please try again.",
		invalidEmail: "Enter a valid email address, like you@example.com.",
		quickTypeLabel: "Quick type",
		sayAudioOn: "Audio guidance is on.",
		sayAudioOff: "Audio guidance is off.",
		sayScreen: "Reset your password. Use the on-screen keyboard to type your email address.",
		sayBack: "Going back to log in.",
		sayIdle: "Going to the idle screen.",
		sayTextSize: "Text size",
		sayDeleted: "deleted",
		saySpace: "space",
		sayAt: "at",
		sayDot: "dot",
	},
	es: {
		a11yBarLabel: "Accesibilidad y asistencia",
		fontSize: "Tamaño del texto",
		language: "Idioma",
		audioToggleOn: "Audio: SÍ",
		audioToggleOff: "Audio: NO",
		sessionEndsIn: "La sesión termina en",
		seconds: "s",
		eyebrow: "AUTENTICACIÓN DE USUARIO / RECUPERACIÓN",
		title: "Restablezca su contraseña",
		subtitle: "Ingrese su correo registrado para recibir un enlace de restablecimiento.",
		emailLabel: "Correo electrónico",
		sendLink: "Enviar enlace",
		sending: "Enviando…",
		backToSignIn: "Volver a iniciar sesión",
		sentTitle: "Revise su correo",
		sentBody: "Si existe una cuenta con ese correo, el enlace va en camino.",
		needAssistance: "¿Necesita ayuda?",
		needAssistanceSub: "Toque aquí — un miembro del personal vendrá a ayudar.",
		staffNotified: "Se ha notificado al personal; alguien le atenderá en breve.",
		idleScreen: "Pantalla de inicio",
		backCta: "Atrás",
		genericError: "Algo salió mal. Inténtelo de nuevo.",
		invalidEmail: "Ingrese un correo válido, como usted@ejemplo.com.",
		quickTypeLabel: "Escritura rápida",
		sayAudioOn: "La guía de audio está activada.",
		sayAudioOff: "La guía de audio está desactivada.",
		sayScreen: "Restablezca su contraseña. Use el teclado en pantalla para escribir su correo.",
		sayBack: "Volviendo a iniciar sesión.",
		sayIdle: "Yendo a la pantalla de inicio.",
		sayTextSize: "Tamaño del texto",
		sayDeleted: "borrado",
		saySpace: "espacio",
		sayAt: "arroba",
		sayDot: "punto",
	},
	tl: {
		a11yBarLabel: "Accessibility at Tulong",
		fontSize: "Laki ng teksto",
		language: "Wika",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		sessionEndsIn: "Matatapos ang session sa",
		seconds: "s",
		eyebrow: "PAGPAPATUNAY NG USER / RECOVERY",
		title: "I-reset ang Password",
		subtitle: "Ilagay ang rehistradong email para makatanggap ng reset link.",
		emailLabel: "Email Address",
		sendLink: "Ipadala ang Reset Link",
		sending: "Ipinapadala…",
		backToSignIn: "Bumalik sa Log In",
		sentTitle: "Tingnan ang iyong email",
		sentBody: "Kung may account sa email na iyon, papunta na ang reset link.",
		needAssistance: "Kailangan ng Tulong?",
		needAssistanceSub: "Pindutin dito — lalapitan kayo ng staff.",
		staffNotified: "Naabisuhan na ang staff at lalapit sila sa iyo.",
		idleScreen: "Idle Screen",
		backCta: "Bumalik",
		genericError: "May nangyaring mali. Pakisubukang muli.",
		invalidEmail: "Maglagay ng tamang email, tulad ng you@example.com.",
		quickTypeLabel: "Mabilis na type",
		sayAudioOn: "Naka-on ang audio guidance.",
		sayAudioOff: "Naka-off ang audio guidance.",
		sayScreen: "I-reset ang password. Gamitin ang keyboard sa screen para i-type ang email.",
		sayBack: "Bumabalik sa log in.",
		sayIdle: "Pupunta sa idle screen.",
		sayTextSize: "Laki ng teksto",
		sayDeleted: "binura",
		saySpace: "espasyo",
		sayAt: "at",
		sayDot: "tuldok",
	},
};

const QUICK_KEYS = ["@", ".com", "gmail.com"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
	const navigate = useNavigate();

	// --- Accessibility controls (same as Login / Dashboard) ---
	const [fontStep, setFontStep] = useState<FontScaleIndex>(1);
	const [audioEnabled, setAudioEnabled] = useState(false);
	const [language, setLanguage] = useState<LanguageCode>("en");
	const fontScale = FONT_SCALES[fontStep];
	const zoomStyle: CSSProperties = { zoom: fontScale };
	const t = (key: string) => STRINGS[language][key] ?? STRINGS.en[key] ?? key;

	function speak(text: string, force = false, lang: LanguageCode = language) {
		if (!audioEnabled && !force) return;
		try {
			if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
			window.speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(text);
			u.lang = lang === "es" ? "es-ES" : lang === "tl" ? "fil-PH" : "en-US";
			u.rate = 0.95;
			window.speechSynthesis.speak(u);
		} catch {
			// Speech unavailable — never block the UI.
		}
	}

	// --- Form state ---
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	// Keyboard is closed by default (form centered); tapping the email field opens it.
	const [keyboardOpen, setKeyboardOpen] = useState(false);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastIdRef = useRef(0);
	const toastTimerRef = useRef<number | null>(null);

	function showToast(type: ToastMessage["type"], text: string) {
		toastIdRef.current += 1;
		setToast({ id: toastIdRef.current, type, text });
		speak(text);
		if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
		toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_AUTO_DISMISS_MS);
	}
	useEffect(() => () => {
		if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
	}, []);

	// Announce the screen once on mount (only speaks if audio is already on).
	useEffect(() => {
		speak(t("sayScreen"));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// When the keyboard docks at the bottom the scroll area shrinks; keep the field visible above it.
	useEffect(() => {
		if (!keyboardOpen) return;
		const id = window.setTimeout(() => {
			(document.activeElement as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
		}, 120);
		return () => window.clearTimeout(id);
	}, [keyboardOpen]);

	// --- Session countdown (display-only; wire to the kiosk's real idle logic) ---
	const INACTIVITY_LIMIT_SECONDS = 60;
	const SESSION_WARNING_THRESHOLD = 15;
	const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_LIMIT_SECONDS);
	const [initialActivityTime] = useState(() => Date.now());
	const lastActivityRef = useRef(initialActivityTime);
	useEffect(() => {
		const reset = () => {
			lastActivityRef.current = Date.now();
		};
		const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
		events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
		const interval = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
			setSecondsLeft(Math.max(0, INACTIVITY_LIMIT_SECONDS - elapsed));
		}, 1000);
		return () => {
			events.forEach((e) => window.removeEventListener(e, reset));
			window.clearInterval(interval);
		};
	}, []);
	const isUrgent = secondsLeft <= SESSION_WARNING_THRESHOLD;

	// --- Submit ---
	async function submitReset() {
		setError(null);
		setKeyboardOpen(false);
		const trimmed = email.trim();
		if (!EMAIL_PATTERN.test(trimmed)) {
			setError(t("invalidEmail"));
			speak(t("invalidEmail"));
			return;
		}
		setLoading(true);
		speak(t("sending"));
		try {
			const result = await requestPasswordReset(trimmed);
			if (!result.sent) {
				setError(result.error ?? t("genericError"));
				speak(result.error ?? t("genericError"));
				return;
			}
			setSent(true);
				setEmail("");
			speak(`${t("sentTitle")}. ${t("sentBody")}`);
		} catch {
			setError(t("genericError"));
			speak(t("genericError"));
		} finally {
			setLoading(false);
		}
	}
	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		void submitReset();
	}

	function goBack() {
		speak(t("sayBack"));
		navigate(SIGN_IN_ROUTE);
	}

	// --- Keyboard ---
	function handleKeyboardChange(next: string) {
		const prev = email;
		setEmail(next);
		if (error) setError(null);
		if (next.length < prev.length) return speak(t("sayDeleted"));
		if (next.length > prev.length) {
			const c = next.slice(-1);
			speak(c === " " ? t("saySpace") : c === "@" ? t("sayAt") : c === "." ? t("sayDot") : c);
		}
	}
	function appendQuick(chunk: string) {
		handleKeyboardChange(email + chunk);
	}

	// --- Toolbar handlers ---
	function handleFontStepChange(step: FontScaleIndex) {
		setFontStep(step);
		speak(`${t("sayTextSize")} ${Math.round(FONT_SCALES[step] * 100)} %`);
	}
	function handleToggleAudio() {
		const next = !audioEnabled;
		setAudioEnabled(next);
		speak(t(next ? "sayAudioOn" : "sayAudioOff"), true);
	}

	return (
		<div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F8FAFC] font-body [font-kerning:normal]">
			{/* ===== Row 1: sticky accessibility toolbar ===== */}
			<AccessibilityToolbar
				strings={{
					a11yBarLabel: t("a11yBarLabel"),
					fontSize: t("fontSize"),
					language: t("language"),
					audioToggleOn: t("audioToggleOn"),
					audioToggleOff: t("audioToggleOff"),
				}}
				language={language}
				onLanguageChange={(l) => {
					setLanguage(l as LanguageCode);
					speak(STRINGS[l as LanguageCode].title, false, l as LanguageCode);
				}}
				fontStep={fontStep}
				onFontStepChange={handleFontStepChange}
				audioGuidance={audioEnabled}
				onToggleAudioGuidance={handleToggleAudio}
			/>

			{/* ===== Row 2: branding + session badge ===== */}
			<div style={zoomStyle} className="relative flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
				{/* Logo: identical to the Dashboard's */}
				<div className="flex items-center gap-4">
					<div className="animate-pulse-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00A896] shadow-[0_0_10px_-2px_rgba(0,168,150,0.55)]">
						<Activity className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
					</div>
					<div className="leading-tight">
						<div className="text-xl font-extrabold text-[#17212B]">GenErick</div>
						<div className="text-xs font-semibold uppercase tracking-[2px] text-[#52616B]">
							Health Monitoring Kiosk
						</div>
					</div>
				</div>
				<div
					className={`flex items-center gap-2 rounded-full border-2 px-6 py-3 text-xl font-bold ${
						isUrgent ? "border-[#D97706] bg-[#FFFBEB] text-[#D97706]" : "border-slate-300 bg-[#F8FAFC] text-[#334155]"
					}`}
					role="timer"
					aria-live="polite"
				>
					<Clock className="h-6 w-6" aria-hidden="true" />
					{t("sessionEndsIn")} {secondsLeft}
					{t("seconds")}
				</div>
			</div>

			<Toast toast={toast} onDismiss={() => setToast(null)} />

			{/* ===== Main column (same 960px card as Login) ===== */}
			<main
				style={zoomStyle}
				className={`relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-6 [scrollbar-gutter:stable] sm:px-10 ${
					keyboardOpen ? "py-4" : "py-8"
				}`}
			>
				{/* my-auto centers the card vertically; when the keyboard opens the
				    scroll area shrinks and the card rides up with it. */}
				<div className="mx-auto my-auto flex w-full max-w-[960px] flex-col gap-6 transition-all duration-200">
					{/* Card */}
					<section
						className={`box-border flex w-full flex-col rounded-3xl border border-[#E2E8F0] bg-white px-12 transition-[padding] duration-200 sm:px-14 ${
							keyboardOpen ? "py-6 sm:py-8" : "py-12 sm:py-14"
						}`}
						style={{ boxShadow: "0px 10px 25px rgba(0,0,0,0.08)" }}
						aria-labelledby="reset-title"
					>
						<div className="flex items-center justify-between">
							<button
								type="button"
								onClick={goBack}
								aria-label={t("backCta")}
								className="flex h-16 min-h-[64px] w-16 min-w-[64px] items-center justify-center rounded-full border-2 border-[#E2E8F0] text-[#0F172A] transition hover:border-[#0284C7]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]/40 focus-visible:ring-offset-2"
							>
								<ArrowLeft className="h-7 w-7" aria-hidden="true" />
							</button>
							<p className="text-[22px] font-extrabold tracking-wide text-[#0D9488]">{t("eyebrow")}</p>
						</div>

						<h1 id="reset-title" className={`mt-6 text-[56px] font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance ${keyboardOpen ? "[@media(max-height:1100px)]:hidden" : ""}`}>
							{t("title")}
						</h1>
						<p className={`mt-3 text-[26px] font-medium leading-snug text-pretty text-[#334155] ${keyboardOpen ? "[@media(max-height:1100px)]:hidden" : ""}`}>{t("subtitle")}</p>

						{error && (
							<p role="alert" className="mt-5 text-[20px] font-bold text-[#7F1D1D]">
								{error}
							</p>
						)}

						{sent ? (
							<div className="mt-8 flex flex-col gap-6" role="status">
								<div className="flex items-start gap-4 rounded-2xl border-2 border-[#0D9488] bg-[#F0FDFA] p-6">
									<CheckCircle2 className="h-8 w-8 shrink-0 text-[#0D9488]" aria-hidden="true" />
									<div>
										<p className="text-[26px] font-bold text-[#0F172A]">{t("sentTitle")}</p>
										<p className="mt-1 text-[22px] font-medium text-[#334155]">{t("sentBody")}</p>
									</div>
								</div>
								<div className="flex items-center justify-center">
									<button
										type="button"
										onClick={goBack}
										className="flex h-16 min-h-[64px] items-center gap-2 px-3 text-[24px] font-bold text-[#0F766E] underline underline-offset-4 transition hover:text-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2"
									>
										<ArrowLeft className="h-6 w-6" aria-hidden="true" />
										{t("backToSignIn")}
									</button>
								</div>
							</div>
						) : (
							<form onSubmit={handleSubmit} className={`mt-8 flex flex-col gap-5 ${FIELD_FORMAT}`}>
								<Input
									label={t("emailLabel")}
									type="email"
									placeholder="you@example.com"
									icon={<Mail className={ICON_CLASS} />}
									value={email}
									onChange={(e) => handleKeyboardChange(e.target.value)}
									autoComplete="username"
									// On-screen keyboard or a physical keyboard both work; inputMode="none" blocks the native touch keyboard.
									inputMode="none"
									onFocus={() => setKeyboardOpen(true)}
									onClick={() => setKeyboardOpen(true)}
									aria-invalid={!!error}
									className={keyboardOpen ? FIELD_ACTIVE : ""}
								/>

								<Button
									type="submit"
									fullWidth
									loading={loading}
									style={{ minHeight: 88 }}
									className="rounded-full text-[28px]! font-bold! tracking-wide [&_*]:text-[28px]! [&_*]:font-bold! shadow-[0_2px_10px_-2px_rgba(13,148,136,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-2"
								>
									{loading ? t("sending") : t("sendLink")}
								</Button>

								<div className="flex items-center justify-center">
									<button
										type="button"
										onClick={goBack}
										className="flex h-16 min-h-[64px] items-center gap-2 px-3 text-[24px] font-bold text-[#0F766E] underline underline-offset-4 transition hover:text-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2"
									>
										<ArrowLeft className="h-6 w-6" aria-hidden="true" />
										{t("backToSignIn")}
									</button>
								</div>
							</form>
						)}
					</section>

					{/* Spacer so the fixed dock never covers content */}
					<div className={`shrink-0 ${keyboardOpen ? "h-2" : "h-36"}`} aria-hidden="true" />
				</div>
			</main>

			{/* ===== Full-width bottom-docked keyboard — mounts only while the email field is active ===== */}
			{keyboardOpen && !sent && (
				<div className="z-40 shrink-0 px-6">
					<div className="mb-2 flex items-center gap-3">
						<span className="text-lg font-bold text-[#334155]">{t("quickTypeLabel")}</span>
						{QUICK_KEYS.map((k) => (
							<button
								key={k}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => appendQuick(k)}
								style={{ minHeight: 48 }}
								className="rounded-xl border-2 border-[#94A3B8] bg-[#E2E8F0] px-5 text-xl font-bold text-[#0F172A] transition active:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]/40"
							>
								{k}
							</button>
						))}
					</div>
					<VirtualKeyboard
						mode="alpha"
						fieldType="email"
						ariaLabel={t("emailLabel")}
						value={email}
						onChange={handleKeyboardChange}
						onClose={() => setKeyboardOpen(false)}
						primaryActionLabel="Done"
						onPrimaryAction={() => setKeyboardOpen(false)}
					/>
				</div>
			)}

			{/* ===== Floating assistance (bottom-right) + Idle Screen (bottom-left) — hidden while keyboard is open ===== */}
			{!keyboardOpen && (
				<button
					type="button"
					onClick={() => showToast("success", t("staffNotified"))}
					className="fixed bottom-8 right-6 z-30 flex items-center gap-4 rounded-full border-2 border-[#D97706] bg-[#FFFBEB] py-4 pl-5 pr-7 text-left shadow-[0_8px_20px_-6px_rgba(217,119,6,0.4)] transition hover:bg-[#FEF3C7] sm:right-8"
					style={{ minHeight: 96, zoom: fontScale }}
				>
					<span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D97706] text-white">
						<Info className="h-7 w-7" aria-hidden="true" />
						<span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
							<span className="relative inline-flex h-4 w-4 rounded-full bg-[#EF4444]" />
						</span>
					</span>
					<span className="min-w-0">
						<span className="block text-[26px] font-extrabold leading-snug text-[#0F172A]">{t("needAssistance")}</span>
						<span className="hidden text-[20px] font-medium leading-snug text-[#1E293B] sm:block">{t("needAssistanceSub")}</span>
					</span>
				</button>
			)}

			{!keyboardOpen && (
				<button
					type="button"
					onClick={() => {
						speak(t("sayIdle"));
						navigate(IDLE_SCREEN_ROUTE);
					}}
					style={{ minHeight: 80, zoom: fontScale }}
					className="fixed bottom-8 left-6 z-30 flex items-center gap-3 rounded-full border-2 border-[#E2E8F0] bg-white px-8 text-[24px] font-extrabold text-[#0F172A] shadow-[0_4px_14px_-6px_rgba(15,23,42,0.25)] transition hover:border-[#0284C7]/50 sm:left-8"
				>
					<Home className="h-6 w-6" aria-hidden="true" />
					{t("idleScreen")}
				</button>
			)}
		</div>
	);
}
