import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Check,
    Clock,
    Fingerprint,
    Gauge,
    QrCode,
    Ruler,
    Scale,
    Thermometer,
    Watch,
    X,
    Activity,
    ClipboardList,
    Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getPatientByProfileId, useAuth } from "@generick/shared";
import { buildPublicBarcodeUrl, getPublicBaseUrl, maskDisplayName } from "../../utils/publicBarcodeLink";
import AccessibilityToolbar from "../../components/kiosk/AccessibilityToolbar";
import { FONT_SCALES, type FontScaleIndex } from "../../lib/kioskAccessibility";

/*
 * Brand tokens (mirrors brand-tokens.css):
 *   primary  #00A896   buttons, active borders, check marks
 *   dark     #0B6E64   instruction pills, text on light tint, hover
 *   light    #E6F7F5   icon tiles, selected-card tint
 *   canvas   #F5F8FA   page background
 *   text     #17212B / #52616B
 *   border   #E2E8F0
 *   success  bg #E6F4EA / text #197A55
 */

type TestType = "bmi" | "blood_pressure" | "heart_rate_spo2" | "temperature" | "complete";
type DeviceStatus = "ready" | "offline";

// The QR destination is built at runtime (see prepareQrLink in the component):
// `${origin}/public-barcode?id=…&n=…&exp=…`, rendered locally with qrcode.react
// so no ID or link is ever sent to a third-party QR service.

const INACTIVITY_LIMIT_SECONDS = 60;
const SESSION_WARNING_THRESHOLD = 15;

type LanguageCode = "en" | "es" | "tl";

const STRINGS: Record<LanguageCode, Record<string, string>> = {
    en: {
        a11yBarLabel: "Accessibility & Assistance",
        fontSize: "Text size",
        language: "Language",
        audioToggleOn: "Audio: ON",
        audioToggleOff: "Audio: OFF",
        title: "Choose a Physiological Assessment",
        subtitle: "Select the assessment you would like to take, then begin the test.",
        beginTest: "Begin Assessment",
        logOut: "Log Out",
        needAssistance: "Need Assistance?",
        needAssistanceSub: "Tap here — a staff member will come to help.",
        showName: "Show Name",
        hideName: "Hide Name",
        sessionEndsIn: "Session ends in",
        seconds: "s",
        deviceReady: "Ready",
        deviceOffline: "Offline",
        needMoreTime: "Need more time?",
        needMoreTimeBody: "Your session is about to end for privacy. Extend it to keep working, or log out now.",
        extendSession: "Extend Session",
        logOutNow: "Log Out Now",
        sensorErrorTitle: "Sensor placement issue",
        dismiss: "Dismiss",
        sayAudioOn: "Audio guidance is on.",
        sayAudioOff: "Audio guidance is off.",
        sayTextSize: "Text size",
    },
    es: {
        a11yBarLabel: "Accesibilidad y asistencia",
        fontSize: "Tamaño del texto",
        language: "Idioma",
        audioToggleOn: "Audio: SÍ",
        audioToggleOff: "Audio: NO",
        title: "Elija una evaluación fisiológica",
        subtitle: "Seleccione la evaluación que desea realizar y luego inicie la prueba.",
        beginTest: "Comenzar evaluación",
        logOut: "Cerrar sesión",
        needAssistance: "¿Necesita ayuda?",
        needAssistanceSub: "Toque aquí — un miembro del personal vendrá a ayudar.",
        showName: "Mostrar nombre",
        hideName: "Ocultar nombre",
        sessionEndsIn: "La sesión termina en",
        seconds: "s",
        deviceReady: "Listo",
        deviceOffline: "Sin conexión",
        needMoreTime: "¿Necesita más tiempo?",
        needMoreTimeBody: "Su sesión está por finalizar por privacidad. Extiéndala o cierre sesión ahora.",
        extendSession: "Extender sesión",
        logOutNow: "Cerrar sesión ahora",
        sensorErrorTitle: "Problema de colocación del sensor",
        dismiss: "Cerrar",
        sayAudioOn: "La guía de audio está activada.",
        sayAudioOff: "La guía de audio está desactivada.",
        sayTextSize: "Tamaño del texto",
    },
    tl: {
        a11yBarLabel: "Accessibility at Tulong",
        fontSize: "Laki ng teksto",
        language: "Wika",
        audioToggleOn: "Audio: ON",
        audioToggleOff: "Audio: OFF",
        title: "Pumili ng Pagsusuri sa Katawan",
        subtitle: "Piliin ang pagsusuring gusto ninyong gawin, pagkatapos ay simulan ang pagsusuri.",
        beginTest: "Simulan ang Pagsusuri",
        logOut: "Mag-log Out",
        needAssistance: "Kailangan ng Tulong?",
        needAssistanceSub: "Pindutin dito — lalapitan kayo ng staff.",
        showName: "Ipakita ang Pangalan",
        hideName: "Itago ang Pangalan",
        sessionEndsIn: "Matatapos ang session sa",
        seconds: "s",
        deviceReady: "Handa na",
        deviceOffline: "Offline",
        needMoreTime: "Kailangan pa ba ng oras?",
        needMoreTimeBody: "Matatapos na ang inyong session para sa privacy. Palawigin ito o mag-log out na.",
        extendSession: "Palawigin ang Session",
        logOutNow: "Mag-log Out Na",
        sensorErrorTitle: "Isyu sa paglagay ng sensor",
        dismiss: "Isara",
        sayAudioOn: "Naka-on ang audio guidance.",
        sayAudioOff: "Naka-off ang audio guidance.",
        sayTextSize: "Laki ng teksto",
    },
};

// All category icon tiles share one teal tint (brand-light) per the Idle screen.
const ICON_TILE = "bg-[#E6F7F5] text-[#0B6E64]";

const GRID_OPTIONS: {
    id: TestType;
    label: string;
    icon: typeof Ruler;
    hardwareIcon: typeof Scale;
    hardwareCue: string;
    measures: string[];
    status: DeviceStatus;
}[] = [
    {
        id: "bmi",
        label: "BMI Assessment",
        icon: Ruler,
        hardwareIcon: Scale,
        hardwareCue: "Stand on the floor scale",
        measures: ["Height", "Weight", "BMI"],
        status: "ready",
    },
    {
        id: "blood_pressure",
        label: "Blood Pressure Assessment",
        icon: Gauge,
        hardwareIcon: Watch,
        hardwareCue: "Cuff goes on right arm",
        measures: ["Systolic BP", "Diastolic BP"],
        status: "ready",
    },
    {
        id: "temperature",
        label: "Body Temperature Assessment",
        icon: Thermometer,
        hardwareIcon: Thermometer,
        hardwareCue: "Scanner rests near forehead",
        measures: ["Body Temperature (°C)"],
        status: "ready",
    },
    {
        id: "heart_rate_spo2",
        label: "Heart Rate and Blood Oxygen Assessment",
        icon: Activity,
        hardwareIcon: Fingerprint,
        hardwareCue: "Clip goes on one finger",
        measures: ["Heart Rate (BPM)", "SpO₂"],
        status: "ready",
    },
];

const COMPLETE_OPTION = {
    id: "complete" as const,
    label: "Complete Health Assessment",
    icon: ClipboardList,
    hardwareIcon: Scale,
    hardwareCue: "Uses all stations in sequence",
    columns: [
        ["Height", "Weight", "BMI", "Body Temperature"],
        ["Blood Pressure", "Heart Rate", "SpO₂", "Health Summary"],
    ],
};

type QrStep = "instructions" | "code";
type QrStatus = "idle" | "loading" | "ready" | "error";

type SensorErrorState = { testType: TestType; message?: string } | null;

// Shared class fragments so every interactive surface uses the same teal states.
const CARD_SELECTED = "border-[3px] border-[#00A896] bg-[#E6F7F5] shadow-[0_0_22px_-8px_rgba(0,168,150,0.45)]";
const CARD_IDLE =
    "border border-[#E2E8F0] bg-white hover:border-[#00A896]/40 hover:shadow-[0_4px_14px_-8px_rgba(0,168,150,0.2)]";
const FOCUS_RING = "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00A896]/40";

function maskedIdentity(fullName: string | undefined): string {
    if (!fullName) return "Session ID: #4821";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return `${parts[0][0].toUpperCase()}.`;
    const first = parts[0][0]?.toUpperCase() ?? "";
    const last = parts[parts.length - 1];
    return `${first}. ${last}`;
}

export default function UserDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [qrStep, setQrStep] = useState<QrStep>("instructions");
    const [qrStatus, setQrStatus] = useState<QrStatus>("idle");
    const [qrUrl, setQrUrl] = useState("");
    const qrRequestRef = useRef(0);
    // Dynamic destination: points at the /public-barcode route on the current origin.
    const QR_DESTINATION_URL = qrUrl;

    // --- Accessibility controls (same shared toolbar as Login / Register) --------
    // Start at 100%: find the step whose scale is exactly 1 instead of hardcoding an index.
    const [fontStep, setFontStep] = useState<FontScaleIndex>(
        () => Math.max(0, FONT_SCALES.findIndex((s) => s === 1)) as FontScaleIndex
    );
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [language, setLanguage] = useState<LanguageCode>("en");
    const reduceMotion = useReducedMotion();
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
        speak(STRINGS[code].title, false, code);
    }

    // --- Live hardware status ----------------------------------------------------
    const [deviceStatus] = useState<Record<TestType, DeviceStatus>>(() => {
        const seed = {} as Record<TestType, DeviceStatus>;
        GRID_OPTIONS.forEach((o) => (seed[o.id] = o.status));
        seed.complete = "ready";
        return seed;
    });

    // --- Inline sensor-placement error -------------------------------------------
    const [sensorError, setSensorError] = useState<SensorErrorState>(
        (location.state as { sensorError?: SensorErrorState } | null)?.sensorError ?? null,
    );

    // --- 60-second inactivity countdown -----------------------------------------
    const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_LIMIT_SECONDS);
    const [initialActivityTime] = useState(() => Date.now());
    const lastActivityRef = useRef(initialActivityTime);
    const [warningAcknowledged, setWarningAcknowledged] = useState(false);

    useEffect(() => {
        const resetActivity = () => {
            lastActivityRef.current = Date.now();
        };
        const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
        events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

        const interval = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
            const remaining = Math.max(0, INACTIVITY_LIMIT_SECONDS - elapsed);
            setSecondsLeft(remaining);
            if (remaining === 0) {
                lastActivityRef.current = Date.now();
                void logout();
            }
        }, 1000);

        return () => {
            events.forEach((evt) => window.removeEventListener(evt, resetActivity));
            window.clearInterval(interval);
        };
    }, [logout]);

    function extendSession() {
        lastActivityRef.current = Date.now();
        setSecondsLeft(INACTIVITY_LIMIT_SECONDS);
        setWarningAcknowledged(false);
    }

    const isUrgent = secondsLeft <= SESSION_WARNING_THRESHOLD;
    const showTimeoutModal = isUrgent && secondsLeft > 0 && !warningAcknowledged;

    useEffect(() => {
        if (secondsLeft > SESSION_WARNING_THRESHOLD && warningAcknowledged) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local UI state when the timer changes; refactor later
            setWarningAcknowledged(false);
        }
    }, [secondsLeft, warningAcknowledged]);

    function handleBeginTest() {
        if (!selectedTest) return;
        if (selectedTest !== "complete" && deviceStatus[selectedTest] === "offline") return;
        navigate("/dashboard/measure", { state: { testType: selectedTest } });
    }

    // Looks up the signed-in patient's ID number and builds the /public-barcode link.
    // Never logs the ID or URL, and never falls back to a made-up ID on failure.
    async function prepareQrLink() {
        const requestId = ++qrRequestRef.current;
        const profileId = user?.id;
        const fullName = user?.fullName;
        setQrUrl("");
        if (!profileId) {
            setQrStatus("error");
            return;
        }
        setQrStatus("loading");
        try {
            const patient = await getPatientByProfileId(profileId);
            if (requestId !== qrRequestRef.current) return; // modal was closed or reopened
            const idNumber = patient?.identification_number?.trim();
            if (!idNumber) {
                setQrStatus("error");
                return;
            }
            setQrUrl(
                buildPublicBarcodeUrl({
                    baseUrl: getPublicBaseUrl(),
                    id: idNumber,
                    label: maskDisplayName(fullName),
                    now: Date.now(),
                }),
            );
            setQrStatus("ready");
        } catch {
            if (requestId === qrRequestRef.current) setQrStatus("error");
        }
    }

    function openQrModal() {
        setQrStep("instructions");
        setQrOpen(true);
        void prepareQrLink();
    }

    function closeQrModal() {
        qrRequestRef.current += 1; // ignore any lookup still in flight
        setQrOpen(false);
        setQrUrl("");
        setQrStatus("idle");
    }

    const identityLabel = useMemo(() => maskedIdentity(user?.fullName), [user?.fullName]);
    const beginDisabled = !selectedTest || (selectedTest !== "complete" && deviceStatus[selectedTest] === "offline");

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F5F8FA] font-body [font-kerning:normal]"
        >
            {/* ============ Sticky Accessibility & Assistance toolbar (shared) ============ */}
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

            {/* ============ Profile header ============ */}
            <div
                style={zoomStyle}
                className="relative grid shrink-0 grid-cols-1 items-center gap-3 border-b border-[#E2E8F0] bg-white px-6 py-4 sm:grid-cols-3 sm:px-8"
            >
                <div className="flex items-center gap-4">
                    {/* Teal rounded-square logo with white pulse waveform (matches Idle screen) */}
                    <div className="animate-pulse-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00A896] shadow-[0_0_10px_-2px_rgba(0,168,150,0.55)]">
                        <Activity className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-xl font-extrabold text-[#17212B]">Health Monitoring Kiosk</div>
                        <div className="text-xs font-semibold uppercase tracking-[2px] text-[#52616B]">
                            Self-Service Health Screening
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <div
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${
                            isUrgent ? "border-[#D97706] bg-[#FFFBEB] text-[#D97706]" : "border-slate-300 bg-[#F5F8FA] text-[#52616B]"
                        }`}
                        role="timer"
                        aria-live="polite"
                    >
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {t("sessionEndsIn")} {secondsLeft}
                        {t("seconds")}
                    </div>
                </div>

                <div className="flex items-center justify-start gap-3 sm:justify-end">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00A896] text-xs font-bold text-white">
                        {user?.avatarInitials ?? "PT"}
                    </div>
                    <span className="hidden text-sm font-bold text-[#17212B] md:inline">{identityLabel}</span>
                </div>
            </div>

            {/* ============ Main content ============ */}
            <div
                style={zoomStyle}
                className="relative flex min-h-0 flex-1 flex-col justify-start gap-5 overflow-y-auto px-6 py-6 sm:px-8"
            >
                <header className="shrink-0">
                    <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-[#17212B] text-balance">
                        {t("title")}
                    </h1>
                    <p className="mt-2 text-[18px] leading-snug text-pretty text-[#52616B]">
                        {t("subtitle")}
                    </p>
                </header>

                {/* 2x2 grid of individual assessments */}
                <div className="grid shrink-0 auto-rows-fr grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
                    {GRID_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const HardwareIcon = option.hardwareIcon;
                        const isSelected = selectedTest === option.id;
                        const isOffline = deviceStatus[option.id] === "offline";
                        const cardHasError = sensorError?.testType === option.id;
                        return (
                            <div key={option.id} className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => !isOffline && setSelectedTest(option.id)}
                                    onFocus={() => speak(`${option.label}. ${option.hardwareCue}. ${isOffline ? "Device offline." : "Device ready."}`)}
                                    onMouseEnter={() => speak(`${option.label}. ${option.hardwareCue}.`)}
                                    aria-pressed={isSelected}
                                    aria-disabled={isOffline}
                                    disabled={isOffline}
                                    style={{ minHeight: 140 }}
                                    className={`flex min-w-[320px] flex-1 flex-col gap-3 rounded-2xl border p-4 text-left transition ${FOCUS_RING} ${
                                        isOffline
                                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                                            : isSelected
                                                ? CARD_SELECTED
                                                : CARD_IDLE
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${ICON_TILE}`}>
                                            <Icon className="h-7 w-7" aria-hidden="true" />
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                                    isOffline ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#E6F4EA] text-[#197A55]"
                                                }`}
                                            >
                                                {isOffline ? (
                                                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                                ) : (
                                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                )}
                                                {isOffline ? t("deviceOffline") : t("deviceReady")}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                                    isSelected ? "border-[#00A896] bg-[#00A896] text-white" : "border-[#CBD5E1] bg-white text-transparent"
                                                }`}
                                            >
                                                <Check className="h-5 w-5" strokeWidth={3} />
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[20px] font-bold leading-snug text-[#17212B] text-balance">
                                            {option.label}
                                        </p>
                                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B6E64] px-3 py-1.5 text-[14px] font-bold text-white">
                                            <HardwareIcon className="h-4 w-4" aria-hidden="true" />
                                            {option.hardwareCue}
                                        </span>
                                    </div>

                                    <ul className="flex flex-col gap-y-1.5">
                                        {option.measures.map((measure) => (
                                            <li key={measure} className="flex items-center gap-2 text-[18px] leading-snug text-[#52616B]">
                                                <Check className="h-5 w-5 shrink-0 text-[#00A896]" aria-hidden="true" />
                                                {measure}
                                            </li>
                                        ))}
                                    </ul>
                                </button>

                                {cardHasError && (
                                    <div className="flex items-start gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-[#B91C1C]">{t("sensorErrorTitle")}</p>
                                            <p className="text-sm text-[#7F1D1D]">
                                                {sensorError?.message ?? "Reposition the sensor as shown and try again."}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSensorError(null)}
                                            aria-label={t("dismiss")}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#B91C1C] transition hover:bg-[#FEE2E2]"
                                        >
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Full-width Complete Health Assessment card */}
                <button
                    type="button"
                    onClick={() => setSelectedTest(COMPLETE_OPTION.id)}
                    onFocus={() => speak(`${COMPLETE_OPTION.label}. ${COMPLETE_OPTION.hardwareCue}.`)}
                    onMouseEnter={() => speak(`${COMPLETE_OPTION.label}. ${COMPLETE_OPTION.hardwareCue}.`)}
                    aria-pressed={selectedTest === COMPLETE_OPTION.id}
                    style={{ minHeight: 140 }}
                    className={`flex w-full shrink-0 flex-col gap-3 rounded-2xl border p-4 text-left transition ${FOCUS_RING} ${
                        selectedTest === COMPLETE_OPTION.id ? CARD_SELECTED : CARD_IDLE
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${ICON_TILE}`}>
                            <COMPLETE_OPTION.icon className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-2.5 py-1 text-xs font-bold text-[#197A55]">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("deviceReady")}
                            </span>
                            <span
                                aria-hidden="true"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                    selectedTest === COMPLETE_OPTION.id
                                        ? "border-[#00A896] bg-[#00A896] text-white"
                                        : "border-[#CBD5E1] bg-white text-transparent"
                                }`}
                            >
                                <Check className="h-5 w-5" strokeWidth={3} />
                            </span>
                        </div>
                    </div>

                    <div>
                        <p className="text-[20px] font-bold leading-snug text-[#17212B] text-balance">
                            {COMPLETE_OPTION.label}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B6E64] px-3 py-1.5 text-[14px] font-bold text-white">
                            <Scale className="h-4 w-4" aria-hidden="true" />
                            {COMPLETE_OPTION.hardwareCue}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                        {COMPLETE_OPTION.columns.map((col, cIdx) => (
                            <ul key={cIdx} className="flex flex-col gap-y-1.5">
                                {col.map((measure) => (
                                    <li key={measure} className="flex items-center gap-2 text-[18px] leading-snug text-[#52616B]">
                                        <Check className="h-5 w-5 shrink-0 text-[#00A896]" aria-hidden="true" />
                                        {measure}
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </button>
            </div>

            {/* ============ Sticky Bottom Action Bar ============ */}
            <div
                style={zoomStyle}
                className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] bg-white p-4 sm:px-8"
            >
                <button
                    type="button"
                    onClick={() => logout()}
                    className={`flex h-14 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-[16px] font-bold text-[#52616B] transition hover:bg-slate-100 hover:text-[#17212B] ${FOCUS_RING}`}
                >
                    {t("logOut")}
                </button>

                <button
                    type="button"
                    onClick={handleBeginTest}
                    disabled={beginDisabled}
                    className={`flex h-14 items-center gap-3 rounded-full px-8 text-[18px] font-extrabold shadow-lg transition ${FOCUS_RING} ${
                        beginDisabled
                            ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                            : "bg-gradient-to-br from-[#00A896] to-[#0B6E64] text-white shadow-[0_8px_20px_-8px_rgba(0,168,150,0.6)] hover:brightness-95 active:scale-95"
                    }`}
                >
                    {t("beginTest")}
                    <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </button>
            </div>

            {/* ============ Floating QR box (gently moving to draw the eye) ============ */}
            <motion.button
                type="button"
                onClick={openQrModal}
                aria-label="Open QR code to view your pass on your phone"
                animate={reduceMotion ? undefined : { y: [0, -14, 0], rotate: [0, -3, 3, 0] }}
                transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                whileTap={{ scale: 0.94 }}
                className="fixed bottom-24 right-6 z-40 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-[#00A896] text-white shadow-[0_12px_28px_-8px_rgba(0,168,150,0.7)] focus:outline-none focus:ring-4 focus:ring-[#00A896]/40"
            >
                {!reduceMotion && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 animate-ping rounded-3xl bg-[#00A896]/40"
                    />
                )}
                <QrCode className="h-14 w-14" strokeWidth={1.75} aria-hidden="true" />
            </motion.button>

            {/* ============ QR Modal ============ */}
            <AnimatePresence>
                {qrOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl sm:p-8"
                        >
                            <button
                                type="button"
                                onClick={closeQrModal}
                                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                                aria-label="Close QR Modal"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {qrStep === "instructions" ? (
                                <div className="flex flex-col items-center text-center">
                                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${ICON_TILE}`}>
                                        <QrCode className="h-8 w-8" />
                                    </div>
                                    <h2 className="mb-2 text-2xl font-extrabold text-[#17212B]">
                                        Open Your Pass on Your Phone
                                    </h2>
                                    <p className="mb-6 text-sm leading-relaxed text-[#52616B] sm:text-base">
                                        Scan the QR code to open your kiosk check-in pass on your personal phone. You can save it and show it to the kiosk scanner next time.
                                    </p>

                                    <div className="mb-6 w-full space-y-3 rounded-2xl border border-[#E2E8F0] bg-[#F5F8FA] p-4 text-left text-sm">
                                        {[
                                            "Open your smartphone camera or QR reader app.",
                                            "Point camera at the QR code on the next screen.",
                                            "Save the pass to your phone if you want to reuse it.",
                                        ].map((step, i) => (
                                            <div key={step} className="flex items-start gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B6E64] text-xs font-bold text-white">
                                                    {i + 1}
                                                </span>
                                                <span className="text-[#17212B]">{step}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setQrStep("code")}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#00A896] font-bold text-white shadow-md transition hover:bg-[#0B6E64]"
                                    >
                                        Display QR Code
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <h2 className="mb-1 text-2xl font-extrabold text-[#17212B]">Scan QR Code</h2>
                                    <p className="mb-6 text-sm text-[#52616B]">Point your phone camera at the code to open your pass</p>

                                    <div className="relative mb-6 flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-[#00A896] bg-[#E6F7F5] p-4 shadow-inner">
                                        {QR_DESTINATION_URL ? (
                                            <div
                                                role="img"
                                                aria-label="QR code that opens your check-in pass on your phone"
                                                className="rounded-lg bg-white p-1"
                                            >
                                                <QRCodeSVG value={QR_DESTINATION_URL} size={208} level="M" marginSize={2} />
                                            </div>
                                        ) : qrStatus === "error" ? (
                                            <div role="alert" className="flex flex-col items-center justify-center gap-2 px-2 text-center">
                                                <AlertTriangle className="h-12 w-12 text-[#D97706]" aria-hidden="true" />
                                                <span className="text-sm font-semibold text-[#52616B]">
                                                    We couldn&apos;t prepare your pass. Please ask a staff member for help.
                                                </span>
                                            </div>
                                        ) : (
                                            <div role="status" className="flex flex-col items-center justify-center gap-2 text-[#52616B]">
                                                <Loader2 className="h-12 w-12 text-[#00A896] motion-safe:animate-spin" aria-hidden="true" />
                                                <span className="text-xs font-semibold">Preparing your QR code…</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex w-full gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setQrStep("instructions")}
                                            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 font-bold text-[#17212B] transition hover:bg-slate-100"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeQrModal}
                                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#00A896] font-bold text-white transition hover:bg-[#0B6E64]"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============ Inactivity Warning Modal (amber = warning status, intentionally not brand) ============ */}
            <AnimatePresence>
                {showTimeoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-2xl sm:p-8"
                        >
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <h3 className="mb-2 text-2xl font-bold text-[#17212B]">{t("needMoreTime")}</h3>
                            <p className="mb-6 text-sm text-[#52616B]">{t("needMoreTimeBody")}</p>
                            <div className="mb-6 font-mono text-3xl font-black text-amber-600">{secondsLeft}s</div>
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={extendSession}
                                    className="flex h-12 w-full items-center justify-center rounded-full bg-[#00A896] font-bold text-white shadow-md transition hover:bg-[#0B6E64]"
                                >
                                    {t("extendSession")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="flex h-12 w-full items-center justify-center rounded-full border border-slate-300 font-bold text-[#17212B] transition hover:bg-slate-100"
                                >
                                    {t("logOutNow")}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
