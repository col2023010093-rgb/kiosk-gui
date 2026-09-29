import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Check,
    ChevronDown,
    Clock,
    Eye,
    EyeOff,
    Fingerprint,
    Gauge,
    Globe,
    HeartPulse,
    Info,
    MoveVertical,
    QrCode,
    Ruler,
    Scale,
    Thermometer,
    Type,
    Volume2,
    VolumeX,
    Watch,
    X,
    Activity,
    ClipboardList,
    Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getPatientByProfileId, useAuth } from "@generick/shared";
import { buildPublicBarcodeUrl, getPublicBaseUrl, maskDisplayName } from "../../utils/publicBarcodeLink";

type TestType = "bmi" | "blood_pressure" | "heart_rate_spo2" | "temperature" | "complete";
type DeviceStatus = "ready" | "offline";

// The QR destination is built at runtime (see prepareQrLink in the component):
// `${origin}/public-barcode?id=…&n=…&exp=…`, rendered locally with qrcode.react
// so no ID or link is ever sent to a third-party QR service.

const INACTIVITY_LIMIT_SECONDS = 60;
const SESSION_WARNING_THRESHOLD = 15;
const FONT_SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.45];
const DEFAULT_FONT_SCALE_INDEX = 1;

type LanguageCode = "en" | "es" | "tl";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "tl", label: "Tagalog" },
];

const STRINGS: Record<LanguageCode, Record<string, string>> = {
    en: {
        title: "Choose a Physiological Assessment",
        subtitle: "Select the assessment you would like to take, then begin the test.",
        beginTest: "Begin Assessment",
        logOut: "Log Out",
        needAssistance: "Need Assistance?",
        needAssistanceSub: "Tap here — a staff member will come to help.",
        lowerScreen: "Lower Screen",
        fontSize: "Text Size",
        audio: "Audio",
        language: "Language",
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
    },
    es: {
        title: "Elija una evaluación fisiológica",
        subtitle: "Seleccione la evaluación que desea realizar y luego inicie la prueba.",
        beginTest: "Comenzar evaluación",
        logOut: "Cerrar sesión",
        needAssistance: "¿Necesita ayuda?",
        needAssistanceSub: "Toque aquí — un miembro del personal vendrá a ayudar.",
        lowerScreen: "Bajar pantalla",
        fontSize: "Tamaño de texto",
        audio: "Audio",
        language: "Idioma",
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
    },
    tl: {
        title: "Pumili ng Pagsusuri sa Katawan",
        subtitle: "Piliin ang pagsusuring gusto ninyong gawin, pagkatapos ay simulan ang pagsusuri.",
        beginTest: "Simulan ang Pagsusuri",
        logOut: "Mag-log Out",
        needAssistance: "Kailangan ng Tulong?",
        needAssistanceSub: "Pindutin dito — lalapitan kayo ng staff.",
        lowerScreen: "Ibaba ang Screen",
        fontSize: "Laki ng Titik",
        audio: "Audio",
        language: "Wika",
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
    },
};

const GRID_OPTIONS: {
    id: TestType;
    label: string;
    icon: typeof Ruler;
    hardwareIcon: typeof Scale;
    hardwareCue: string;
    measures: string[];
    iconBg: string;
    iconColor: string;
    status: DeviceStatus;
}[] = [
    {
        id: "bmi",
        label: "BMI Assessment",
        icon: Ruler,
        hardwareIcon: Scale,
        hardwareCue: "Stand on the floor scale",
        measures: ["Height", "Weight", "BMI"],
        iconBg: "bg-[#F0FDF4]",
        iconColor: "text-[#15803D]",
        status: "ready",
    },
    {
        id: "blood_pressure",
        label: "Blood Pressure Assessment",
        icon: Gauge,
        hardwareIcon: Watch,
        hardwareCue: "Cuff goes on right arm",
        measures: ["Systolic BP", "Diastolic BP"],
        iconBg: "bg-blue-100",
        iconColor: "text-blue-[#0284C7]",
        status: "ready",
    },
    {
        id: "temperature",
        label: "Body Temperature Assessment",
        icon: Thermometer,
        hardwareIcon: Thermometer,
        hardwareCue: "Scanner rests near forehead",
        measures: ["Body Temperature (°C)"],
        iconBg: "bg-violet-100",
        iconColor: "text-violet-600",
        status: "ready",
    },
    {
        id: "heart_rate_spo2",
        label: "Heart Rate and Blood Oxygen Assessment",
        icon: Activity,
        hardwareIcon: Fingerprint,
        hardwareCue: "Clip goes on one finger",
        measures: ["Heart Rate (BPM)", "SpO₂"],
        iconBg: "bg-pink-100",
        iconColor: "text-pink-600",
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

function maskedIdentity(fullName: string | undefined): string {
    if (!fullName) return "Session ID: #4821";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return `Patient: ${parts[0][0].toUpperCase()}.`;
    const first = parts[0][0]?.toUpperCase() ?? "";
    const last = parts[parts.length - 1];
    return `Patient: ${first}. ${last}`;
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

    // --- Accessibility controls -------------------------------------------------
    const [lowerScreen, setLowerScreen] = useState(false);
    const [fontStepIndex, setFontStepIndex] = useState(DEFAULT_FONT_SCALE_INDEX);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [language, setLanguage] = useState<LanguageCode>("en");
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
    const [showFullName, setShowFullName] = useState(false);
    const fontScale = FONT_SCALE_STEPS[fontStepIndex];
    const t = (key: string) => STRINGS[language][key] ?? STRINGS.en[key] ?? key;
    const scaled = (px: number) => ({ fontSize: `${Math.round(px * fontScale)}px` });

    function speak(text: string) {
        if (!audioEnabled) return;
        try {
            if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        } catch {
            // Speech synthesis unavailable — fail silently, never block the UI.
        }
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
    const lastActivityRef = useRef(Date.now());
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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F8FAFC] font-body [font-kerning:normal]"
        >
            {/* ============ Sticky Accessibility & Assistance toolbar ============ */}
            <div className="relative z-40 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-100 p-3 sm:px-6">
                <span className="text-xs font-bold uppercase tracking-wide text-[#334155]">
                    Accessibility &amp; Assistance
                </span>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setLowerScreen((v) => !v)}
                        aria-pressed={lowerScreen}
                        className={`flex h-12 min-w-[48px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                            lowerScreen
                                ? "border-[#0284C7] bg-[#F0F9FF] text-[#0284C7]"
                                : "border-slate-300 bg-white text-[#1E293B] hover:border-[#0284C7]/50"
                        }`}
                    >
                        <MoveVertical className="h-5 w-5" aria-hidden="true" />
                        {t("lowerScreen")}
                    </button>

                    <div className="flex h-[52px] items-stretch divide-x divide-slate-300 overflow-hidden rounded-full border border-slate-300 bg-white text-[#1E293B]">
                        <button
                            type="button"
                            onClick={() => setFontStepIndex((i) => Math.max(0, i - 1))}
                            disabled={fontStepIndex === 0}
                            aria-label="Decrease text size"
                            className="flex w-[52px] items-center justify-center text-xl font-bold transition hover:bg-[#F0F9FF] disabled:opacity-30"
                        >
                            −
                        </button>
                        <span className="flex min-w-[64px] items-center justify-center gap-1.5 px-2 text-sm font-bold text-[#334155]">
                            <Type className="h-4 w-4" aria-hidden="true" />
                            {Math.round(fontScale * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => setFontStepIndex((i) => Math.min(FONT_SCALE_STEPS.length - 1, i + 1))}
                            disabled={fontStepIndex === FONT_SCALE_STEPS.length - 1}
                            aria-label="Increase text size"
                            className="flex w-[52px] items-center justify-center text-xl font-bold transition hover:bg-[#F0F9FF] disabled:opacity-30"
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAudioEnabled((v) => !v)}
                        aria-pressed={audioEnabled}
                        className={`flex h-12 min-w-[48px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                            audioEnabled
                                ? "border-[#0284C7] bg-[#F0F9FF] text-[#0284C7]"
                                : "border-slate-300 bg-white text-[#1E293B] hover:border-[#0284C7]/50"
                        }`}
                    >
                        {audioEnabled ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
                        {t("audio")}
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setLanguageMenuOpen((v) => !v)}
                            aria-haspopup="listbox"
                            aria-expanded={languageMenuOpen}
                            className="flex h-12 min-w-[48px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#1E293B] transition hover:border-[#0284C7]/50"
                        >
                            <Globe className="h-5 w-5 text-[#334155]" aria-hidden="true" />
                            {LANGUAGES.find((l) => l.code === language)?.label}
                            <ChevronDown className="h-4 w-4 text-[#334155]" aria-hidden="true" />
                        </button>
                        {languageMenuOpen && (
                            <ul
                                role="listbox"
                                className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 overflow-hidden rounded-xl border border-slate-300 bg-white py-1 shadow-lg"
                            >
                                {LANGUAGES.map((l) => (
                                    <li key={l.code}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={language === l.code}
                                            onClick={() => {
                                                setLanguage(l.code);
                                                setLanguageMenuOpen(false);
                                            }}
                                            className={`flex w-full items-center px-4 py-3 text-left text-sm font-medium ${
                                                language === l.code ? "bg-[#F0F9FF] text-[#0284C7]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                                            }`}
                                        >
                                            {l.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* ============ Profile header ============ */}
            <div className="relative grid shrink-0 grid-cols-1 items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:grid-cols-3 sm:px-8">
                <div className="flex items-center gap-4">
                    <div className="animate-pulse-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] shadow-[0_0_10px_-2px_rgba(2,132,199,0.55)]">
                        <HeartPulse className="h-6 w-6 text-white" strokeWidth={2.25} />
                    </div>
                    <div className="leading-tight">
                        <div className="text-xl font-extrabold text-[#0F172A]">GenErick</div>
                        <div className="text-xs font-semibold uppercase tracking-[2px] text-[#334155]">
                            Patient Health Monitoring Kiosk
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <div
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${
                            isUrgent ? "border-[#D97706] bg-[#FFFBEB] text-[#D97706]" : "border-slate-300 bg-[#F8FAFC] text-[#334155]"
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-xs font-bold text-white">
                        {user?.avatarInitials ?? "PT"}
                    </div>
                    <span className="hidden text-sm font-bold text-[#0F172A] md:inline">
                        {showFullName && user?.fullName ? user.fullName : identityLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowFullName((v) => !v)}
                        style={{ minHeight: 44 }}
                        className="flex items-center gap-2 rounded-full border border-[#CBD5E1] bg-white px-4 text-sm font-bold text-[#0F172A] transition hover:border-[#0284C7]/50"
                    >
                        {showFullName ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        {showFullName ? t("hideName") : t("showName")}
                    </button>
                </div>
            </div>

            {/* ============ Main content ============ */}
            <div
                className={`relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 transition-[justify-content] sm:px-8 ${
                    lowerScreen ? "justify-end" : "justify-start"
                }`}
            >
                <header className="shrink-0">
                    <h1 style={scaled(34)} className="font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance">
                        {t("title")}
                    </h1>
                    <p style={scaled(18)} className="mt-2 leading-snug text-pretty text-[#334155]">
                        {t("subtitle")}
                    </p>
                </header>

                {/* 2x2 grid of individual assessments */}
                <div className="grid shrink-0 grid-cols-1 gap-6 sm:grid-cols-2">
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
                                    className={`flex min-w-[320px] flex-col gap-3 rounded-2xl border p-4 text-left transition ${
                                        isOffline
                                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                                            : isSelected
                                                ? "border-[3px] border-[#0284C7] bg-[#F0F9FF] shadow-[0_0_22px_-8px_rgba(2,132,199,0.45)]"
                                                : "border border-[#E2E8F0] bg-white hover:border-[#0284C7]/40 hover:shadow-[0_4px_14px_-8px_rgba(2,132,199,0.2)]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${option.iconBg} ${option.iconColor}`}>
                                            <Icon className="h-7 w-7" aria-hidden="true" />
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                                    isOffline ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#DCFCE7] text-[#15803D]"
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
                                                    isSelected ? "border-[#0284C7] bg-[#0284C7] text-white" : "border-[#CBD5E1] bg-white text-transparent"
                                                }`}
                                            >
                                                <Check className="h-5 w-5" strokeWidth={3} />
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <p style={scaled(20)} className="font-bold leading-snug text-[#0F172A] text-balance">
                                            {option.label}
                                        </p>
                                        <span
                                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1E40AF] px-3 py-1.5 font-bold text-white"
                                            style={scaled(14)}
                                        >
                                            <HardwareIcon className="h-4 w-4" aria-hidden="true" />
                                            {option.hardwareCue}
                                        </span>
                                    </div>

                                    <ul className="flex flex-col gap-y-1.5">
                                        {option.measures.map((measure) => (
                                            <li key={measure} style={scaled(18)} className="flex items-center gap-2 leading-snug text-[#334155]">
                                                <Check className="h-5 w-5 shrink-0 text-[#0284C7]" aria-hidden="true" />
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
                    className={`flex shrink-0 w-full flex-col gap-3 rounded-2xl border p-4 text-left transition ${
                        selectedTest === COMPLETE_OPTION.id
                            ? "border-[3px] border-[#0284C7] bg-[#F0F9FF] shadow-[0_0_22px_-8px_rgba(2,132,199,0.45)]"
                            : "border border-[#E2E8F0] bg-white hover:border-[#0284C7]/40 hover:shadow-[0_4px_14px_-8px_rgba(2,132,199,0.2)]"
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                            <COMPLETE_OPTION.icon className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-bold text-[#15803D]">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("deviceReady")}
                            </span>
                            <span
                                aria-hidden="true"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                    selectedTest === COMPLETE_OPTION.id
                                        ? "border-[#0284C7] bg-[#0284C7] text-white"
                                        : "border-[#CBD5E1] bg-white text-transparent"
                                }`}
                            >
                                <Check className="h-5 w-5" strokeWidth={3} />
                            </span>
                        </div>
                    </div>

                    <div>
                        <p style={scaled(20)} className="font-bold leading-snug text-[#0F172A] text-balance">
                            {COMPLETE_OPTION.label}
                        </p>
                        <span
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1E40AF] px-3 py-1.5 font-bold text-white"
                            style={scaled(14)}
                        >
                            <Scale className="h-4 w-4" aria-hidden="true" />
                            {COMPLETE_OPTION.hardwareCue}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                        {COMPLETE_OPTION.columns.map((col, cIdx) => (
                            <ul key={cIdx} className="flex flex-col gap-y-1.5">
                                {col.map((measure) => (
                                    <li key={measure} style={scaled(18)} className="flex items-center gap-2 leading-snug text-[#334155]">
                                        <Check className="h-5 w-5 shrink-0 text-[#0284C7]" aria-hidden="true" />
                                        {measure}
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </button>
            </div>

            {/* ============ Sticky Bottom Action Bar ============ */}
            <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white p-4 sm:px-8">
                <button
                    type="button"
                    onClick={() => logout()}
                    className="flex h-14 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 font-bold text-[#334155] transition hover:bg-slate-100 hover:text-[#0F172A]"
                    style={scaled(16)}
                >
                    {t("logOut")}
                </button>

                <button
                    type="button"
                    onClick={handleBeginTest}
                    disabled={!selectedTest || (selectedTest !== "complete" && deviceStatus[selectedTest] === "offline")}
                    className={`flex h-14 items-center gap-3 rounded-full px-8 font-extrabold text-white shadow-lg transition ${
                        !selectedTest || (selectedTest !== "complete" && deviceStatus[selectedTest] === "offline")
                            ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                            : "bg-[#0284C7] hover:bg-[#0284C7]/90 active:scale-95"
                    }`}
                    style={scaled(18)}
                >
                    {t("beginTest")}
                    <ArrowRight className="h-6 w-6" aria-hidden="true" />
                </button>
            </div>

            {/* ============ Floating QR Code Trigger Button ============ */}
            <button
                type="button"
                onClick={openQrModal}
                aria-label="Mobile Sync via QR Code"
                className="fixed bottom-20 right-6 z-40 flex h-14 items-center gap-3 rounded-full bg-[#0284C7] px-5 py-3.5 text-white shadow-xl hover:bg-[#0369A1] focus:outline-none focus:ring-4 focus:ring-sky-300 active:scale-95 transition-all"
            >
                <QrCode className="h-6 w-6" aria-hidden="true" />
                <span className="font-bold text-sm sm:text-base">Mobile Sync</span>
            </button>

            {/* ============ QR Modal ============ */}
            <AnimatePresence>
                {qrOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200"
                        >
                            <button
                                type="button"
                                onClick={closeQrModal}
                                className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                                aria-label="Close QR Modal"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {qrStep === "instructions" ? (
                                <div className="flex flex-col items-center text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-[#0284C7] mb-4">
                                        <QrCode className="h-8 w-8" />
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">
                                        Open Your Pass on Your Phone
                                    </h2>
                                    <p className="text-slate-600 mb-6 text-sm sm:text-base leading-relaxed">
                                        Scan the QR code to open your kiosk check-in pass on your personal phone. You can save it and show it to the kiosk scanner next time.
                                    </p>

                                    <div className="w-full space-y-3 text-left mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0284C7] text-xs font-bold text-white">1</span>
                                            <span className="text-slate-700">Open your smartphone camera or QR reader app.</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0284C7] text-xs font-bold text-white">2</span>
                                            <span className="text-slate-700">Point camera at the QR code on the next screen.</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0284C7] text-xs font-bold text-white">3</span>
                                            <span className="text-slate-700">Save the pass to your phone if you want to reuse it.</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setQrStep("code")}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0284C7] font-bold text-white shadow-md hover:bg-[#0369A1] transition"
                                    >
                                        Display QR Code
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <h2 className="text-2xl font-extrabold text-[#0F172A] mb-1">Scan QR Code</h2>
                                    <p className="text-slate-500 text-sm mb-6">Point your phone camera at the code to open your pass</p>

                                    <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-[#0284C7] bg-slate-50 p-4 mb-6 shadow-inner">
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
                                                <span className="text-sm font-semibold text-[#334155]">
                                                    We couldn&apos;t prepare your pass. Please ask a staff member for help.
                                                </span>
                                            </div>
                                        ) : (
                                            <div role="status" className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-12 w-12 text-[#0284C7] motion-safe:animate-spin" aria-hidden="true" />
                                                <span className="text-xs font-semibold">Preparing your QR code…</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex w-full gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setQrStep("instructions")}
                                            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeQrModal}
                                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#0284C7] font-bold text-white hover:bg-[#0369A1] transition"
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

            {/* ============ Inactivity Warning Modal ============ */}
            <AnimatePresence>
                {showTimeoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-amber-200"
                        >
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{t("needMoreTime")}</h3>
                            <p className="text-slate-600 text-sm mb-6">{t("needMoreTimeBody")}</p>
                            <div className="text-3xl font-black text-amber-600 mb-6 font-mono">
                                {secondsLeft}s
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={extendSession}
                                    className="flex h-12 w-full items-center justify-center rounded-full bg-[#0284C7] font-bold text-white hover:bg-[#0369A1] transition shadow-md"
                                >
                                    {t("extendSession")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="flex h-12 w-full items-center justify-center rounded-full border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition"
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