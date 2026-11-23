import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	Activity,
	ArrowDown,
	ArrowLeft,
	Clock,
	Home,
	Info,
	Lock,
	Mail,
	ScanLine,
	Smartphone,
} from "lucide-react";
import { Input } from "@generick/shared";
import { Button } from "@generick/shared";
import { Toast, type ToastMessage } from "@generick/shared";
import { useAuth } from "@generick/shared";
import { useUsbScanner } from "@generick/shared";
import { playScanSuccessTone, playScanErrorTone } from "@generick/shared";
import VirtualKeyboard from "../../components/kiosk/VirtualKeyboard";
import AccessibilityToolbar from "../../components/kiosk/AccessibilityToolbar";
import { FONT_SCALES, type FontScaleIndex } from "../../lib/kioskAccessibility";

type Step = "home" | "email";
type ActiveField = "email" | "password" | null;
type LanguageCode = "en" | "es" | "tl";

// TODO: confirm this is the real idle-screen route in this repo's router.
const IDLE_SCREEN_ROUTE = "/idle";
const TOAST_AUTO_DISMISS_MS = 5000;

// Same field format as the Register screen: 56px tall, text-lg, text-lg labels,
// 24px icons, default border-line with the accent focus ring.
const FIELD_FORMAT =
	"[&_input:not([type=checkbox])]:h-14 [&_input:not([type=checkbox])]:text-lg [&_label]:text-lg! [&_input:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_white_inset]";
// Shown on the field the on-screen keyboard is currently typing into
// (same look Register uses for an open dropdown).
const FIELD_ACTIVE = "border-accent! ring-2 ring-accent/15";
const ICON_CLASS = "h-6 w-6";

// Mirrors the Dashboard's STRINGS map, scoped to what this screen needs.
const STRINGS: Record<LanguageCode, Record<string, string>> = {
	en: {
		a11yBarLabel: "Accessibility & Assistance",
		patientsOnly: "This kiosk is for patients only. Staff, please use the staff portal.",
		fontSize: "Text size",
		language: "Language",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		sessionEndsIn: "Session ends in",
		seconds: "s",
		eyebrow: "USER AUTHENTICATION",
		welcomeTitle: "Welcome",
		welcomeSubtitle: "Log in to view your health records and recommendations.",
		scanTitle: "Scan Patient ID / QR Code",
		scanReady: "Ready to scan — no need to tap anything",
		scanChecking: "Checking your barcode…",
		scanHint: "Hold QR code 6 inches below screen over the red light scanner",
		orDivider: "or",
		emailLabel: "Email",
		passwordLabel: "Password",
		forgotPassword: "Forgot password?",
		registerPrompt: "Don't have an account?",
		registerLink: "Register",
		signInCta: "Log In",
		signingIn: "Logging in…",
		needAssistance: "Need Assistance?",
		needAssistanceSub: "Tap here — a staff member will come to help.",
		staffNotified: "A staff member has been notified and will be with you shortly.",
		idleScreen: "Idle Screen",
		backCta: "Back",
		genericError: "Something went wrong. Please try again.",
		sayAudioOn: "Audio guidance is on.",
		sayAudioOff: "Audio guidance is off.",
		sayEmailStep: "Log in with email. Use the on-screen keyboard to type your email.",
		sayEmailField: "Email field. Type your email address.",
		sayPasswordField: "Password field. Type your password. Characters are hidden.",
		sayBack: "Going back.",
		sayIdle: "Going to the idle screen.",
		sayTextSize: "Text size",
		sayCharacter: "character",
		sayDeleted: "deleted",
		saySpace: "space",
		sayAt: "at",
		sayDot: "dot",
		missingCredentials: "Enter both email and password.",
	},
	es: {
		a11yBarLabel: "Accesibilidad y asistencia",
		patientsOnly: "Este quiosco es solo para pacientes. El personal debe usar el portal del personal.",
		fontSize: "Tamaño del texto",
		language: "Idioma",
		audioToggleOn: "Audio: SÍ",
		audioToggleOff: "Audio: NO",
		sessionEndsIn: "La sesión termina en",
		seconds: "s",
		eyebrow: "AUTENTICACIÓN DE USUARIO",
		welcomeTitle: "Bienvenido",
		welcomeSubtitle: "Inicie sesión para ver sus registros médicos y recomendaciones.",
		scanTitle: "Escanee su identificación o código QR",
		scanReady: "Listo para escanear — no es necesario tocar nada",
		scanChecking: "Verificando su código…",
		scanHint: "Coloque el código QR a 15 cm debajo de la pantalla, sobre el lector de luz roja",
		orDivider: "o",
		emailLabel: "Correo electrónico",
		passwordLabel: "Contraseña",
		forgotPassword: "¿Olvidó su contraseña?",
		registerPrompt: "¿No tiene una cuenta?",
		registerLink: "Regístrese",
		signInCta: "Iniciar sesión",
		signingIn: "Iniciando sesión…",
		needAssistance: "¿Necesita ayuda?",
		needAssistanceSub: "Toque aquí — un miembro del personal vendrá a ayudar.",
		staffNotified: "Se ha notificado al personal; alguien le atenderá en breve.",
		idleScreen: "Pantalla de inicio",
		backCta: "Atrás",
		genericError: "Algo salió mal. Inténtelo de nuevo.",
		sayAudioOn: "La guía de audio está activada.",
		sayAudioOff: "La guía de audio está desactivada.",
		sayEmailStep: "Iniciar sesión con correo. Use el teclado en pantalla para escribir su correo.",
		sayEmailField: "Campo de correo. Escriba su correo electrónico.",
		sayPasswordField: "Campo de contraseña. Escriba su contraseña. Los caracteres están ocultos.",
		sayBack: "Volviendo.",
		sayIdle: "Yendo a la pantalla de inicio.",
		sayTextSize: "Tamaño del texto",
		sayCharacter: "carácter",
		sayDeleted: "borrado",
		saySpace: "espacio",
		sayAt: "arroba",
		sayDot: "punto",
		missingCredentials: "Ingrese su correo y contraseña.",
	},
	tl: {
		a11yBarLabel: "Accessibility at Tulong",
		patientsOnly: "Para sa mga pasyente lamang ang kiosk na ito. Staff, gamitin ang staff portal.",
		fontSize: "Laki ng teksto",
		language: "Wika",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		sessionEndsIn: "Matatapos ang session sa",
		seconds: "s",
		eyebrow: "PAGPAPATUNAY NG USER",
		welcomeTitle: "Maligayang pagbabalik",
		welcomeSubtitle: "Mag-log in para tingnan ang iyong medical records at rekomendasyon.",
		scanTitle: "I-scan ang Patient ID / QR Code",
		scanReady: "Handa nang i-scan — hindi na kailangang pindutin",
		scanChecking: "Sinusuri ang iyong barcode…",
		scanHint: "Ilagay ang QR code 6 pulgada sa ibaba ng screen, sa ibabaw ng pulang scanner",
		orDivider: "o",
		emailLabel: "Email",
		passwordLabel: "Password",
		forgotPassword: "Nakalimutan ang password?",
		registerPrompt: "Wala ka pang account?",
		registerLink: "Mag-rehistro",
		signInCta: "Mag-log In",
		signingIn: "Nagla-log in…",
		needAssistance: "Kailangan ng Tulong?",
		needAssistanceSub: "Pindutin dito — lalapitan kayo ng staff.",
		staffNotified: "Naabisuhan na ang staff at lalapit sila sa iyo.",
		idleScreen: "Idle Screen",
		backCta: "Bumalik",
		genericError: "May nangyaring mali. Pakisubukang muli.",
		sayAudioOn: "Naka-on ang audio guidance.",
		sayAudioOff: "Naka-off ang audio guidance.",
		sayEmailStep: "Mag-log in gamit ang email. Gamitin ang keyboard sa screen para i-type ang email.",
		sayEmailField: "Email field. I-type ang iyong email address.",
		sayPasswordField: "Password field. I-type ang iyong password. Nakatago ang mga character.",
		sayBack: "Bumabalik.",
		sayIdle: "Pupunta sa idle screen.",
		sayTextSize: "Laki ng teksto",
		sayCharacter: "character",
		sayDeleted: "binura",
		saySpace: "espasyo",
		sayAt: "at",
		sayDot: "tuldok",
		missingCredentials: "Ilagay ang iyong email at password.",
	},
};

type KioskAuth = ReturnType<typeof useAuth>;

export default function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const notice = (location.state as { notice?: string } | null)?.notice;
	const auth = useAuth() as KioskAuth;
	const { login, loginWithBarcode } = auth;

	// --- Accessibility controls, matching the Dashboard's toolbar ------------
	// Start at 100%: find the step whose scale is exactly 1 instead of hardcoding an index.
	const [fontStep, setFontStep] = useState<FontScaleIndex>(
		() => Math.max(0, FONT_SCALES.findIndex((s) => s === 1)) as FontScaleIndex
	);
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
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = lang === "es" ? "es-ES" : lang === "tl" ? "fil-PH" : "en-US";
			utterance.rate = 0.95;
			window.speechSynthesis.speak(utterance);
		} catch {
			// Speech synthesis unavailable — fail silently, never block the UI.
		}
	}

	// --- Auth flow state -----------------------------------------------------
	const [step, setStep] = useState<Step>("home");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [activeField, setActiveField] = useState<ActiveField>(null);
	const [error, setError] = useState<string | null>(() => (notice === "patients-only" ? t("patientsOnly") : null));
	const [loading, setLoading] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const toastIdRef = useRef(0);
	const toastTimerRef = useRef<number | null>(null);
	const passwordInputRef = useRef<HTMLInputElement>(null);

	// Auto-dismiss any toast after TOAST_AUTO_DISMISS_MS — the assistance
	// notification (and others) previously stayed on screen indefinitely.
	function showToast(type: ToastMessage["type"], text: string) {
		toastIdRef.current += 1;
		setToast({ id: toastIdRef.current, type, text });
		speak(text);
		if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
		toastTimerRef.current = window.setTimeout(() => {
			setToast(null);
		}, TOAST_AUTO_DISMISS_MS);
	}
	useEffect(() => {
		return () => {
			if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
		};
	}, []);

	function resetToHome() {
		setStep("home");
		setError(null);
		setActiveField(null);
	}

	// --- Session countdown, same 60s/15s pattern as the Dashboard, display-only
	// here — wire to the kiosk's real idle-timeout logic before shipping. ------
	const INACTIVITY_LIMIT_SECONDS = 60;
	const SESSION_WARNING_THRESHOLD = 15;
	const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_LIMIT_SECONDS);
	const [initialActivityTime] = useState(() => Date.now());
	const lastActivityRef = useRef(initialActivityTime);
	useEffect(() => {
		const resetActivity = () => {
			lastActivityRef.current = Date.now();
		};
		const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
		events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));
		const interval = window.setInterval(() => {
			const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
			setSecondsLeft(Math.max(0, INACTIVITY_LIMIT_SECONDS - elapsed));
		}, 1000);
		return () => {
			events.forEach((evt) => window.removeEventListener(evt, resetActivity));
			window.clearInterval(interval);
		};
	}, []);
	const isUrgent = secondsLeft <= SESSION_WARNING_THRESHOLD;

	// --- Barcode / QR scan — unchanged behavior from the original screen.
	// Deliberately never stores or displays the scanned code. -----------------
	const handleScan = useCallback(
		async (code: string) => {
			if (scanning || loading) return;
			setScanning(true);
			setError(null);
			speak(t("scanChecking"));
			let result;
			try {
				result = await loginWithBarcode(code);
			} catch {
				playScanErrorTone();
				showToast("error", t("genericError"));
				setScanning(false);
				return;
			}
			if (!result.success) {
				playScanErrorTone();
				showToast("error", result.error ?? t("genericError"));
				setScanning(false);
				return;
			}
			playScanSuccessTone();
			navigate("/dashboard");
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[scanning, loading, loginWithBarcode, navigate, language, audioEnabled]
	);
	useUsbScanner(handleScan, !scanning && !loading);

	// --- Email + password ------------------------------------------------------
	// Pulled out of the form's onSubmit so the keyboard's "Done" action key
	// can call it directly without synthesizing a fake FormEvent.
	async function submitEmailLogin() {
		setError(null);
		if (!email || !password) {
			setError(t("missingCredentials"));
			speak(t("missingCredentials"));
			return;
		}
		setLoading(true);
		speak(t("signingIn"));
		let result;
		try {
			result = await login(email.trim(), password);
		} catch {
			setLoading(false);
			setError(t("genericError"));
			speak(t("genericError"));
			return;
		}
		setLoading(false);
		if (!result.success) {
			setError(result.error ?? t("genericError"));
			speak(result.error ?? t("genericError"));
			return;
		}
		navigate("/dashboard");
	}

	async function handleEmailSubmit(e: FormEvent) {
		e.preventDefault();
		await submitEmailLogin();
	}

	// --- Ask staff (TODO: wire to real staff-paging system) ---------------------
	function handleAskStaff() {
		showToast("success", t("staffNotified"));
	}

	// --- Audio guidance for toolbar + typing ---------------------------------
	function handleFontStepChange(step: FontScaleIndex) {
		setFontStep(step);
		speak(`${t("sayTextSize")} ${Math.round(FONT_SCALES[step] * 100)} %`);
	}
	function handleToggleAudio() {
		const next = !audioEnabled;
		setAudioEnabled(next);
		speak(t(next ? "sayAudioOn" : "sayAudioOff"), true);
	}
	function handleLanguageChange(code: LanguageCode) {
		setLanguage(code);
		speak(STRINGS[code].welcomeTitle, false, code);
	}
	// Reads each typed character aloud. Password characters are never spoken.
	function handleKeyboardChange(next: string) {
		if (!activeField) return;
		const prev = activeField === "password" ? password : email;
		if (activeField === "password") setPassword(next);
		else setEmail(next);
		if (next.length < prev.length) {
			speak(t("sayDeleted"));
			return;
		}
		if (next.length > prev.length) {
			if (activeField === "password") {
				speak(t("sayCharacter"));
				return;
			}
			const c = next.slice(-1);
			speak(c === " " ? t("saySpace") : c === "@" ? t("sayAt") : c === "." ? t("sayDot") : c);
		}
	}
	// Announce which field the keyboard is now typing into.
	useEffect(() => {
		if (activeField) speak(t(activeField === "password" ? "sayPasswordField" : "sayEmailField"));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeField]);
	// The keyboard docks below the form and shrinks the scroll area; bring the
	// focused field into the visible space above it.
	useEffect(() => {
		if (!activeField) return;
		const id = window.setTimeout(() => {
			(document.activeElement as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
		}, 120);
		return () => window.clearTimeout(id);
	}, [activeField]);

	return (
		<div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F8FAFC] font-body [font-kerning:normal]">
			{/* ============ Sticky Accessibility & Assistance toolbar ============ */}
			<AccessibilityToolbar
				strings={{
					a11yBarLabel: t("a11yBarLabel"),
					fontSize: t("fontSize"),
					language: t("language"),
					audioToggleOn: t("audioToggleOn"),
					audioToggleOff: t("audioToggleOff"),
				}}
				language={language}
				onLanguageChange={(l) => handleLanguageChange(l as LanguageCode)}
				fontStep={fontStep}
				onFontStepChange={handleFontStepChange}
				audioGuidance={audioEnabled}
				onToggleAudioGuidance={handleToggleAudio}
			/>

			{/* ============ Branding header: logo left / session timer right ============ */}
			<div style={zoomStyle} className="relative flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
				{/* Logo: identical to the Dashboard's */}
				<div className="flex items-center gap-4">
					<div className="animate-pulse-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00A896] shadow-[0_0_10px_-2px_rgba(0,168,150,0.55)]">
						<Activity className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
					</div>
					<div className="leading-tight">
						<div className="text-xl font-extrabold text-[#17212B]">GenErick</div>
						<div className="text-xs font-semibold uppercase tracking-[2px] text-[#52616B]">
							Patient Health Monitoring Kiosk
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

			{step === "home" && (
				<main
					style={zoomStyle}
					className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 sm:px-10"
				>
					<div
						className="flex w-full max-w-[960px] min-h-[58vh] flex-col justify-center rounded-3xl border border-[#E2E8F0] bg-white p-12 sm:p-14"
						style={{ boxShadow: "0px 10px 25px rgba(0,0,0,0.08)" }}
					>
						<p className="text-[22px] font-extrabold tracking-wide text-[#0D9488]">{t("eyebrow")}</p>
						<h1 className="mt-2 text-[56px] font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance">
							{t("welcomeTitle")}
						</h1>
						<p className="mt-3 text-[26px] font-medium leading-snug text-pretty text-[#334155]">{t("welcomeSubtitle")}</p>

						{error && (
							<p role="alert" className="mt-5 text-[20px] font-bold text-[#7F1D1D]">
								{error}
							</p>
						)}

						<div className="mt-10 flex flex-col gap-8">
							<div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-[#0284C7] bg-[#F0F9FF] px-6 py-12 text-center">
								<div className="flex flex-col items-center gap-2" aria-hidden="true">
									<Smartphone className="h-14 w-14 text-[#0284C7]" />
									<ArrowDown className={`h-8 w-8 text-[#0284C7] ${scanning ? "" : "animate-bounce"}`} />
									<div className="h-2 w-24 rounded-full bg-[#1E40AF]" />
								</div>
								<ScanLine className={`h-14 w-14 text-[#0284C7] ${scanning ? "animate-pulse" : ""}`} aria-hidden="true" />
								<p className="text-[30px] font-bold leading-snug text-[#0F172A]">{t("scanTitle")}</p>
								<p className="text-[22px] font-medium text-[#1E293B]">{scanning ? t("scanChecking") : t("scanReady")}</p>
								<span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#1E40AF] px-7 py-4 text-[24px] font-semibold leading-snug text-white">
									{t("scanHint")} ↓
								</span>
							</div>

							<div className="flex items-center gap-4 text-[20px] font-semibold text-[#1E293B]">
								<span className="h-px flex-1 bg-[#CBD5E1]" />
								{t("orDivider")}
								<span className="h-px flex-1 bg-[#CBD5E1]" />
							</div>

							<button
								type="button"
								onClick={() => {
									setStep("email");
									speak(t("sayEmailStep"));
								}}
								style={{ minHeight: 88 }}
								className="inline-flex items-center justify-center gap-3 rounded-full bg-[#0D9488] px-8 py-4 text-[26px] font-bold text-white shadow-[0_2px_10px_-2px_rgba(13,148,136,0.5)] transition hover:bg-[#0F766E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-2"
							>
								<Mail className="h-7 w-7" aria-hidden="true" />
								{t("signInCta")} with Email &amp; Password
							</button>
						</div>
					</div>

					<div className="h-32 shrink-0" aria-hidden="true" />
				</main>
			)}

			{step === "email" && (
				<main style={zoomStyle} className={`relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-6 [scrollbar-gutter:stable] sm:px-10 ${activeField ? "py-4" : "py-8"}`}>
					<div className="mx-auto flex w-full min-w-0 max-w-[960px] flex-1 flex-col justify-center">
						<div
							className={`box-border flex w-full max-w-[960px] shrink-0 flex-col rounded-3xl border border-[#E2E8F0] bg-white px-12 transition-[padding] duration-200 sm:px-14 ${activeField ? "py-6 sm:py-8" : "py-12 sm:py-14"}`}
							style={{ boxShadow: "0px 10px 25px rgba(0,0,0,0.08)" }}
						>
							<div className="flex items-center justify-between">
								<button
									type="button"
									onClick={() => {
										resetToHome();
										speak(t("sayBack"));
									}}
									aria-label={t("backCta")}
									className="flex h-16 min-h-[64px] w-16 min-w-[64px] items-center justify-center rounded-full border-2 border-[#E2E8F0] text-[#0F172A] transition hover:border-[#0284C7]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]/40 focus-visible:ring-offset-2"
								>
									<ArrowLeft className="h-7 w-7" aria-hidden="true" />
								</button>
								<p className="text-[22px] font-extrabold tracking-wide text-[#0D9488]">{t("eyebrow")}</p>
							</div>

							<h1 className={`mt-6 text-[56px] font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance ${activeField ? "[@media(max-height:1100px)]:hidden" : ""}`}>
								{t("welcomeTitle")}
							</h1>
							<p className={`mt-3 text-[26px] font-medium leading-snug text-pretty text-[#334155] ${activeField ? "[@media(max-height:1100px)]:hidden" : ""}`}>{t("welcomeSubtitle")}</p>

							{error && (
								<p role="alert" className="mt-5 text-[20px] font-bold text-[#7F1D1D]">
									{error}
								</p>
							)}

							<form onSubmit={handleEmailSubmit} className={`mt-8 flex flex-col gap-5 ${FIELD_FORMAT}`}>
								<Input
									label={t("emailLabel")}
									type="email"
									placeholder="you@example.com"
									icon={<Mail className={ICON_CLASS} />}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onFocus={() => setActiveField("email")}
									onBlur={() => setActiveField(null)}
									autoComplete="username"
									inputMode="none"
									className={activeField === "email" ? FIELD_ACTIVE : ""}
								/>

								<Input
									ref={passwordInputRef}
									label={t("passwordLabel")}
									type="password"
									placeholder="••••••••"
									icon={<Lock className={ICON_CLASS} />}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									onFocus={() => setActiveField("password")}
									onBlur={() => setActiveField(null)}
									autoComplete="current-password"
									inputMode="none"
									className={activeField === "password" ? FIELD_ACTIVE : ""}
								/>

								{/* Forgot password: plain underlined link, no border/pill */}
								<div className="flex items-center justify-end">
									<Link
										to="/forgot-password"
										onClick={() => speak(t("forgotPassword"))}
										className="flex h-16 min-h-[64px] items-center px-3 text-[24px] font-bold text-[#059669] underline underline-offset-4 transition hover:text-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]/40 focus-visible:ring-offset-2"
									>
										{t("forgotPassword")}
									</Link>
								</div>

								<Button
									type="submit"
									fullWidth
									loading={loading}
									style={{ minHeight: 88 }}
									className="rounded-full text-[28px]! font-bold! tracking-wide [&_*]:text-[28px]! [&_*]:font-bold! shadow-[0_2px_10px_-2px_rgba(13,148,136,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-2"
								>
									{loading ? t("signingIn") : t("signInCta")}
								</Button>

								{/* Register: plain underlined link, same format as Forgot Password */}
								<div className="flex items-center justify-center gap-3 text-[22px] font-medium text-[#1E293B]">
									<span>{t("registerPrompt")}</span>
									<Link
										to="/register"
										onClick={() => speak(t("registerLink"))}
										className="flex h-16 min-h-[64px] items-center px-3 text-[24px] font-bold text-[#0F766E] underline underline-offset-4 transition hover:text-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2"
									>
										{t("registerLink")}
									</Link>
								</div>
							</form>
						</div>
					</div>

					{/* Keyboard now docks fixed to the viewport bottom instead of
					    reserving scroll space, so this spacer just needs to clear
					    the floating Idle Screen / Need Assistance buttons. */}
					<div className="h-6 shrink-0" aria-hidden="true" />
				</main>
			)}

			{/* ============ Full-width bottom-docked keyboard — mounts only while a field is focused ============ */}
			{activeField && (
				<div className="z-40 shrink-0 px-6">
					<VirtualKeyboard
						mode="alpha"
						fieldType={activeField}
						ariaLabel={activeField === "password" ? t("passwordLabel") : t("emailLabel")}
						value={activeField === "password" ? password : email}
						onChange={handleKeyboardChange}
						onClose={() => setActiveField(null)}
						primaryActionLabel={activeField === "email" ? "Next" : "Done"}
						onPrimaryAction={() => {
							if (activeField === "email") {
								passwordInputRef.current?.focus();
								setActiveField("password");
							} else {
								setActiveField(null);
								void submitEmailLogin();
							}
						}}
					/>
				</div>
			)}

			{/* ============ Floating assistance (bottom-right) + Idle Screen (bottom-left) — hidden while keyboard is open ============ */}
			{!activeField && (
				<button
					type="button"
					onClick={handleAskStaff}
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

			{!activeField && (
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
