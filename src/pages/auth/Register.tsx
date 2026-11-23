import { useState, useEffect, useId, useRef, type CSSProperties, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	User,
	Mail,
	Lock,
	Phone,
	MapPin,
	IdCard,
	Calendar,
	GraduationCap,
	Globe,
	Map as MapIcon,
	Building2,
	Home,
	Hash,
	UserRound,
	Users,
	ChevronDown,
	Clock,
	Activity,
} from "lucide-react";
import AccessibilityToolbar from "../../components/kiosk/AccessibilityToolbar";
import { FONT_SCALES, type FontScaleIndex } from "../../lib/kioskAccessibility";
import { Input } from "@generick/shared";
import { Button } from "@generick/shared";
import Modal from "../../components/Modal";
import VirtualKeyboard from "../../components/kiosk/VirtualKeyboard";
import { TermsOfUseContent, PrivacyPolicyContent } from "../../components/LegalContent";
import { registerAccount } from "@generick/shared";
import { RAW_PROGRAMS } from "@generick/shared";
import { validateAndNormalizeRegistration } from "@generick/shared";
import {
	regions,
	provinces,
	cities,
	barangays,
	type Region,
	type Province,
	type City,
	type Barangay,
} from "select-philippines-address";

type Sex = "" | "female" | "male";
type PatientType = "student" | "faculty" | "staff";

type SelectOption = { value: string; label: string };

// Text fields that type through the on-screen keyboard. Birthdate (native date
// picker) and the dropdowns are not part of this list.
type FieldKey =
	| "firstName"
	| "lastName"
	| "email"
	| "contactNumber"
	| "password"
	| "confirmPassword"
	| "department"
	| "lsbIdNumber"
	| "houseNumber"
	| "street";

const FIELD_META: Record<
	FieldKey,
	{ mode: "alpha" | "numeric"; type: "email" | "password" | "text"; maxLength?: number; label: string }
> = {
	firstName: { mode: "alpha", type: "text", maxLength: 80, label: "First Name" },
	lastName: { mode: "alpha", type: "text", maxLength: 80, label: "Last Name" },
	email: { mode: "alpha", type: "email", maxLength: 254, label: "Email" },
	contactNumber: { mode: "numeric", type: "text", maxLength: 20, label: "Contact Number" },
	password: { mode: "alpha", type: "password", label: "Password" },
	confirmPassword: { mode: "alpha", type: "password", label: "Confirm Password" },
	department: { mode: "alpha", type: "text", label: "Department" },
	lsbIdNumber: { mode: "numeric", type: "text", maxLength: 64, label: "ID Number" },
	houseNumber: { mode: "alpha", type: "text", maxLength: 80, label: "House/Building No." },
	street: { mode: "alpha", type: "text", maxLength: 160, label: "Street" },
};

// Highlight for the field the on-screen keyboard is currently typing into.
const FIELD_ACTIVE = "border-accent! ring-2 ring-accent/15";

type LanguageCode = "en" | "es" | "tl";

// Header-only strings (same toolbar + branding header as the Login screen).
// The form labels below are still English.
const STRINGS: Record<LanguageCode, Record<string, string>> = {
	en: {
		a11yBarLabel: "Accessibility & Assistance",
		fontSize: "Text size",
		language: "Language",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		sessionEndsIn: "Session ends in",
		seconds: "s",
		eyebrow: "USER AUTHENTICATION",
		title: "Create your account",
		subtitle: "Register once — use it here and on the web application.",
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
		sessionEndsIn: "La sesión termina en",
		seconds: "s",
		eyebrow: "AUTENTICACIÓN DE USUARIO",
		title: "Cree su cuenta",
		subtitle: "Regístrese una vez: úselo aquí y en la aplicación web.",
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
		sessionEndsIn: "Matatapos ang session sa",
		seconds: "s",
		eyebrow: "PAGPAPATUNAY NG USER",
		title: "Gumawa ng account",
		subtitle: "Mag-rehistro nang isang beses — gamitin dito at sa web application.",
		sayAudioOn: "Naka-on ang audio guidance.",
		sayAudioOff: "Naka-off ang audio guidance.",
		sayTextSize: "Laki ng teksto",
	},
};

const COURSE_OPTIONS: SelectOption[] = RAW_PROGRAMS.map((p) => ({
	value: p.code,
	label: `${p.code} - ${p.name}`,
}));

const SEX_OPTIONS: SelectOption[] = [
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
];

const PATIENT_TYPE_OPTIONS: SelectOption[] = [
	{ value: "student", label: "Student" },
	{ value: "faculty", label: "Faculty" },
	{ value: "staff", label: "Staff" },
];

// One layout token for every row of fields: one column on narrow screens,
// two from `sm` up, with a single consistent gap.
const ROW = "grid grid-cols-1 gap-5 sm:grid-cols-2";

// Custom dropdown that replaces the native <select>. The native popup is drawn
// by the browser/OS (and is oversized in touch/kiosk mode), so it can't be
// sized with CSS. This one renders its own list under the field, so the size,
// width and scrolling are fully controlled and it never spills off-screen.
// Same props as before, so every call site stays unchanged.
function FieldSelect({
	label,
	icon,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}: {
	label: string;
	icon?: React.ReactNode;
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	placeholder?: string;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const labelId = useId();
	const listId = useId();

	const selectedIndex = options.findIndex((o) => o.value === value);
	const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

	// Close when clicking/tapping outside.
	useEffect(() => {
		if (!open) return;
		function handlePointerDown(e: PointerEvent) {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [open]);

	// Close if the field becomes disabled while open (e.g. parent resets).
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- resets local UI state when a prop/timer changes; refactor later
		if (disabled) setOpen(false);
	}, [disabled]);

	// Keep the highlighted option visible while navigating with the keyboard.
	useEffect(() => {
		if (!open || active < 0) return;
		const el = listRef.current?.children[active] as HTMLElement | undefined;
		el?.scrollIntoView({ block: "nearest" });
	}, [open, active]);

	function openList() {
		if (disabled) return;
		setActive(selectedIndex >= 0 ? selectedIndex : 0);
		setOpen(true);
	}

	function choose(index: number) {
		const opt = options[index];
		if (!opt) return;
		onChange(opt.value);
		setOpen(false);
	}

	function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
		if (disabled) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (!open) openList();
				else setActive((i) => Math.min(i + 1, options.length - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				if (!open) openList();
				else setActive((i) => Math.max(i - 1, 0));
				break;
			case "Home":
				if (open) {
					e.preventDefault();
					setActive(0);
				}
				break;
			case "End":
				if (open) {
					e.preventDefault();
					setActive(options.length - 1);
				}
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				if (open && active >= 0) choose(active);
				else openList();
				break;
			case "Escape":
				if (open) {
					e.preventDefault();
					setOpen(false);
				}
				break;
			case "Tab":
				setOpen(false);
				break;
		}
	}

	return (
		<div className="flex flex-col gap-2" ref={rootRef}>
			<span id={labelId} className="text-lg font-medium text-ink">
				{label}
			</span>
			<div className="relative">
				{icon && (
					<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
						{icon}
					</span>
				)}
				<button
					type="button"
					role="combobox"
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={listId}
					aria-labelledby={labelId}
					disabled={disabled}
					onClick={() => (open ? setOpen(false) : openList())}
					onKeyDown={handleKeyDown}
					className={`flex h-14 w-full items-center rounded-xl border border-line bg-white text-left text-lg outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-accent-tint/20 disabled:text-muted ${
						icon ? "pl-12" : "pl-4"
					} pr-12 ${open ? "border-accent ring-2 ring-accent/15" : ""}`}
				>
					<span className={`truncate ${selected ? "text-ink" : "text-muted"}`}>
						{selected ? selected.label : placeholder ?? ""}
					</span>
				</button>
				<ChevronDown
					className={`pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted transition-transform ${
						open ? "rotate-180" : ""
					}`}
				/>

				{open && (
					<ul
						id={listId}
						ref={listRef}
						role="listbox"
						aria-labelledby={labelId}
						className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[0_8px_24px_rgba(11,36,48,0.12)]"
					>
						{options.length === 0 && (
							<li className="px-4 py-3 text-lg text-muted">No options available</li>
						)}
						{options.map((opt, i) => {
							const isSelected = opt.value === value;
							return (
								<li
									key={opt.value}
									role="option"
									aria-selected={isSelected}
									// Keep focus on the button so keyboard nav keeps working.
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => choose(i)}
									onMouseEnter={() => setActive(i)}
									className={`cursor-pointer px-4 py-3 text-lg ${
										i === active ? "bg-accent-tint/40" : ""
									} ${isSelected ? "font-medium text-accent" : "text-ink"}`}
								>
									{opt.label}
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}

export default function Register() {
	const navigate = useNavigate();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [birthdate, setBirthdate] = useState("");
	const [sex, setSex] = useState<Sex>("");
	const [patientType, setPatientType] = useState<PatientType>("student");
	const [course, setCourse] = useState("");
	const [department, setDepartment] = useState("");
	const [contactNumber, setContactNumber] = useState("");
	const [lsbIdNumber, setLsbIdNumber] = useState("");

	// Address — Country is fixed for now (this kiosk only serves PH
	// addresses), but kept as a real dropdown per the requirement so a
	// second country can be added later without restructuring the form.
	const [country, setCountry] = useState("Philippines");

	const [regionOptions, setRegionOptions] = useState<Region[]>([]);
	const [provinceOptions, setProvinceOptions] = useState<Province[]>([]);
	const [cityOptions, setCityOptions] = useState<City[]>([]);
	const [barangayOptions, setBarangayOptions] = useState<Barangay[]>([]);

	const [regionCode, setRegionCode] = useState("");
	const [regionName, setRegionName] = useState("");
	const [provinceCode, setProvinceCode] = useState("");
	const [provinceName, setProvinceName] = useState("");
	const [cityCode, setCityCode] = useState("");
	const [cityName, setCityName] = useState("");
	const [barangayCode, setBarangayCode] = useState("");
	const [barangayName, setBarangayName] = useState("");
	const [street, setStreet] = useState("");
	const [houseNumber, setHouseNumber] = useState("");

	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [consentedToHealthData, setConsentedToHealthData] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showTerms, setShowTerms] = useState(false);
	const [showPrivacy, setShowPrivacy] = useState(false);

	// --- On-screen keyboard ------------------------------------------------------
	const [activeField, setActiveField] = useState<FieldKey | null>(null);
	const keyboardOpen = activeField !== null;

	// --- Accessibility controls + session timer (same as the Login header) ------
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

	// Display-only countdown, same 60s/15s pattern as Login — wire to the
	// kiosk's real idle-timeout logic before shipping.
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

	// Current value + setter for every keyboard-typed field.
	const fieldState: Record<FieldKey, [string, (v: string) => void]> = {
		firstName: [firstName, setFirstName],
		lastName: [lastName, setLastName],
		email: [email, setEmail],
		contactNumber: [contactNumber, setContactNumber],
		password: [password, setPassword],
		confirmPassword: [confirmPassword, setConfirmPassword],
		department: [department, setDepartment],
		lsbIdNumber: [lsbIdNumber, setLsbIdNumber],
		houseNumber: [houseNumber, setHouseNumber],
		street: [street, setStreet],
	};

	// Order the "Next" key walks through (skips dropdowns and the date picker).
	const fieldOrder: FieldKey[] = [
		"firstName",
		"lastName",
		"email",
		"contactNumber",
		"password",
		"confirmPassword",
		...(patientType !== "student" ? (["department"] as FieldKey[]) : []),
		"lsbIdNumber",
		"houseNumber",
		"street",
	];

	// Spread onto each keyboard-typed <Input>: suppresses the native keyboard,
	// opens the on-screen one on focus/tap, and highlights the active field.
	// Blur only closes the keyboard when focus leaves for something that isn't
	// another keyboard field, so "Next" doesn't flicker it closed and open.
	function fieldProps(key: FieldKey) {
		return {
			id: `reg-${key}`,
			"data-kbd": "1",
			inputMode: "none" as const,
			onFocus: () => setActiveField(key),
			onClick: () => setActiveField(key),
			onBlur: (e: FocusEvent<HTMLInputElement>) => {
				const next = e.relatedTarget as HTMLElement | null;
				if (!next?.dataset?.kbd) setActiveField(null);
			},
			className: activeField === key ? FIELD_ACTIVE : "",
		};
	}

	function closeKeyboard() {
		(document.activeElement as HTMLElement | null)?.blur();
		setActiveField(null);
	}

	function handleKeyboardChange(next: string) {
		if (!activeField) return;
		const meta = FIELD_META[activeField];
		const cleaned = meta.mode === "numeric" ? next.replace(/\D/g, "") : next;
		fieldState[activeField][1](cleaned);
	}

	const activeIndex = activeField ? fieldOrder.indexOf(activeField) : -1;
	const isLastField = activeIndex === fieldOrder.length - 1;

	function handleKeyboardPrimary() {
		if (!activeField || isLastField) {
			closeKeyboard();
			return;
		}
		document.getElementById(`reg-${fieldOrder[activeIndex + 1]}`)?.focus();
	}

	// The keyboard docks below the scroll area and shrinks it; bring the focused
	// field into the visible space above it.
	useEffect(() => {
		if (!activeField) return;
		const id = window.setTimeout(() => {
			(document.activeElement as HTMLElement | null)?.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest",
			});
		}, 120);
		return () => window.clearTimeout(id);
	}, [activeField]);

	// Load regions once on mount.
	useEffect(() => {
		regions().then(setRegionOptions).catch(() => setRegionOptions([]));
	}, []);

	// Region -> Province cascade
	useEffect(() => {
		if (!regionCode) return;
		let cancelled = false;
		provinces(regionCode)
			.then((options) => { if (!cancelled) setProvinceOptions(options); })
			.catch(() => { if (!cancelled) setProvinceOptions([]); });
		return () => { cancelled = true; };
	}, [regionCode]);

	// Province -> City/Municipality cascade
	useEffect(() => {
		if (!provinceCode) return;
		let cancelled = false;
		cities(provinceCode)
			.then((options) => { if (!cancelled) setCityOptions(options); })
			.catch(() => { if (!cancelled) setCityOptions([]); });
		return () => { cancelled = true; };
	}, [provinceCode]);

	// City -> Barangay cascade
	useEffect(() => {
		if (!cityCode) return;
		let cancelled = false;
		barangays(cityCode)
			.then((options) => { if (!cancelled) setBarangayOptions(options); })
			.catch(() => { if (!cancelled) setBarangayOptions([]); });
		return () => { cancelled = true; };
	}, [cityCode]);

	function handleRegionChange(code: string) {
		setRegionCode(code);
		setProvinceOptions([]);
		setRegionName(regionOptions.find((r) => r.region_code === code)?.region_name ?? "");
		// Reset everything downstream so a stale province/city/barangay
		// from the previous region can't be submitted.
		setProvinceCode("");
		setProvinceName("");
		setCityCode("");
		setCityName("");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleProvinceChange(code: string) {
		setProvinceCode(code);
		setCityOptions([]);
		setProvinceName(provinceOptions.find((p) => p.province_code === code)?.province_name ?? "");
		setCityCode("");
		setCityName("");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleCityChange(code: string) {
		setCityCode(code);
		setBarangayOptions([]);
		setCityName(cityOptions.find((c) => c.city_code === code)?.city_name ?? "");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleBarangayChange(code: string) {
		const name = barangayOptions.find((b) => b.brgy_code === code)?.brgy_name ?? "";
		setBarangayCode(code);
		setBarangayName(name);
	}

	function handlePatientTypeChange(value: string) {
		if (value !== "student" && value !== "faculty" && value !== "staff") return;
		setPatientType(value);
		setCourse("");
		setDepartment("");
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (loading) return;
		setError(null);
		if (password !== confirmPassword) {
			setError("Passwords don't match.");
			return;
		}
		if (!regionOptions.some((region) => region.region_code === regionCode) ||
			!provinceOptions.some((province) => province.province_code === provinceCode) ||
			!cityOptions.some((city) => city.city_code === cityCode) ||
			!barangayOptions.some((barangay) => barangay.brgy_code === barangayCode)) {
			setError("Please select a valid complete address.");
			return;
		}
		const validation = validateAndNormalizeRegistration({
			firstName, lastName, email, password, birthdate,
			sex: sex as "female" | "male", patientType, course, department, contactNumber,
			identificationNumber: lsbIdNumber,
			address: { country, region: regionName, province: provinceName || undefined, cityMunicipality: cityName, barangay: barangayName, street, houseNumber },
			agreedToTerms, consentedToHealthData,
		});
		if (!validation.value) {
			setError(validation.error ?? "Please review the information entered.");
			return;
		}

		setLoading(true);
		let result;
		try {
			result = await registerAccount(validation.value);
		} catch {
			setError("Could not create account. Please try again.");
			return;
		} finally {
			setLoading(false);
		}

		if (!result.success) {
			setError(result.error ?? "Could not create account.");
			return;
		}

		navigate("/login");
	}

	const iconClass = "h-6 w-6";

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

			<main
				style={zoomStyle}
				className={`relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-6 [scrollbar-gutter:stable] sm:px-10 ${keyboardOpen ? "py-4" : "py-8"}`}
			>
			{/* The [&_...] selectors scale the shared <Input> (whose source lives in
			    @generick/shared) without editing that package. The shared label is a
			    plain <label>, so it is targeted directly. */}
			<div
				className="register-card w-full max-w-[960px] shrink-0 rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10
					[&_input:not([type=checkbox])]:h-14
					[&_input:not([type=checkbox])]:text-lg
					[&_label]:text-lg!"
				style={{ boxShadow: "0px 10px 25px rgba(0,0,0,0.08)" }}
			>
				<div className="mb-8">
					<p className="text-[22px] font-extrabold tracking-wide text-[#0D9488]">{t("eyebrow")}</p>
					<h1 className={`mt-2 text-[56px] font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance ${keyboardOpen ? "[@media(max-height:1100px)]:hidden" : ""}`}>
						{t("title")}
					</h1>
					<p className={`mt-3 text-[26px] font-medium leading-snug text-pretty text-[#334155] ${keyboardOpen ? "[@media(max-height:1100px)]:hidden" : ""}`}>
						{t("subtitle")}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					{/* Personal details */}
					<div className={ROW}>
						<Input
							label="First Name"
							placeholder="Juan"
							icon={<User className={iconClass} />}
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							maxLength={80}
							{...fieldProps("firstName")}
						/>
						<Input
							label="Last Name"
							placeholder="Dela Cruz"
							icon={<User className={iconClass} />}
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							maxLength={80}
							{...fieldProps("lastName")}
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Email"
							type="email"
							placeholder="you@example.com"
							icon={<Mail className={iconClass} />}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
							maxLength={254}
							{...fieldProps("email")}
						/>
						<Input
							label="Contact Number"
							placeholder="09XXXXXXXXX"
							icon={<Phone className={iconClass} />}
							value={contactNumber}
							onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ""))}
							pattern="[0-9]*"
							maxLength={20}
							{...fieldProps("contactNumber")}
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className={iconClass} />}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="new-password"
							{...fieldProps("password")}
						/>
						<Input
							label="Confirm Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className={iconClass} />}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
							{...fieldProps("confirmPassword")}
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Birthdate"
							type="date"
							icon={<Calendar className={iconClass} />}
							value={birthdate}
							onChange={(e) => setBirthdate(e.target.value)}
							max={new Date().toISOString().slice(0, 10)}
						/>
						<FieldSelect
							label="Sex"
							icon={<UserRound className={iconClass} />}
							value={sex}
							onChange={(v) => setSex(v as Sex)}
							options={SEX_OPTIONS}
							placeholder="Select sex"
						/>
					</div>

					<div className={ROW}>
						<FieldSelect
							label="I am a..."
							icon={<Users className={iconClass} />}
							value={patientType}
							onChange={handlePatientTypeChange}
							options={PATIENT_TYPE_OPTIONS}
						/>

						{patientType === "student" ? (
							<FieldSelect
								label="Course"
								icon={<GraduationCap className={iconClass} />}
								value={course}
								onChange={setCourse}
								options={COURSE_OPTIONS}
								placeholder="Select course"
							/>
						) : (
							<Input
								label="Department"
								placeholder="Registrar's Office"
								icon={<GraduationCap className={iconClass} />}
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
								{...fieldProps("department")}
							/>
						)}
					</div>

					<Input
						label={patientType === "student" ? "LSB ID Number" : "School ID Number"}
						icon={<IdCard className={iconClass} />}
						placeholder={patientType === "student" ? "Type your LSB ID number" : "Type your school ID number"}
						value={lsbIdNumber}
						onChange={(e) => setLsbIdNumber(e.target.value.replace(/\D/g, ""))}
						pattern="[0-9]*"
						maxLength={64}
						{...fieldProps("lsbIdNumber")}
					/>

					{/* Address section */}
					<div className="mt-2 flex flex-col gap-5 border-t border-line pt-8">
						<h2 className="text-3xl font-semibold text-ink">Address</h2>

						<div className={ROW}>
							<Input
								label="House/Building No."
								icon={<Hash className={iconClass} />}
								placeholder="123 / Unit 4B"
								value={houseNumber}
								onChange={(e) => setHouseNumber(e.target.value)}
								maxLength={80}
								{...fieldProps("houseNumber")}
							/>
							<Input
								label="Street"
								icon={<MapPin className={iconClass} />}
								placeholder="Rizal Street"
								value={street}
								onChange={(e) => setStreet(e.target.value)}
								maxLength={160}
								{...fieldProps("street")}
							/>
						</div>

						<div className={ROW}>
							<FieldSelect
								label="Barangay"
								icon={<Home className={iconClass} />}
								value={barangayCode}
								onChange={handleBarangayChange}
								options={barangayOptions.map((b) => ({ value: b.brgy_code, label: b.brgy_name }))}
								placeholder={cityCode ? "Select barangay" : "Select city first"}
								disabled={!cityCode}
							/>
							<FieldSelect
								label="City / Municipality"
								icon={<Building2 className={iconClass} />}
								value={cityCode}
								onChange={handleCityChange}
								options={cityOptions.map((c) => ({ value: c.city_code, label: c.city_name }))}
								placeholder={provinceCode ? "Select city / municipality" : "Select province first"}
								disabled={!provinceCode}
							/>
						</div>

						<div className={ROW}>
							<FieldSelect
								label="Province"
								icon={<MapIcon className={iconClass} />}
								value={provinceCode}
								onChange={handleProvinceChange}
								options={provinceOptions.map((p) => ({
									value: p.province_code,
									label: p.province_name,
								}))}
								placeholder={regionCode ? "Select province" : "Select region first"}
								disabled={!regionCode}
							/>
							<FieldSelect
								label="Region"
								icon={<MapPin className={iconClass} />}
								value={regionCode}
								onChange={handleRegionChange}
								options={regionOptions.map((r) => ({ value: r.region_code, label: r.region_name }))}
								placeholder="Select region"
							/>
						</div>

						<FieldSelect
							label="Country"
							icon={<Globe className={iconClass} />}
							value={country}
							onChange={setCountry}
							options={[{ value: "Philippines", label: "Philippines" }]}
							disabled
						/>
					</div>

					{/* Reserved-height slot so an error appearing doesn't shift the
					    consent box and button below it. */}
					<p role="alert" className="min-h-[1.75rem] text-lg text-red-500">{error}</p>

					<div className="consent-box flex flex-col gap-4 rounded-xl border border-line bg-accent-tint/25 p-5">
						<label className="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								checked={agreedToTerms}
								onChange={(e) => setAgreedToTerms(e.target.checked)}
								required
								className="mt-0.5 h-6 w-6 shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-lg leading-relaxed text-ink">
								I agree to the{" "}
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowTerms(true);
									}}
									className="font-medium text-accent underline underline-offset-2 hover:text-accent-deep"
								>
									Terms of Use
								</button>{" "}
								and{" "}
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowPrivacy(true);
									}}
									className="font-medium text-accent underline underline-offset-2 hover:text-accent-deep"
								>
									Privacy Policy
								</button>
								.
							</span>
						</label>

						<label className="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								checked={consentedToHealthData}
								onChange={(e) => setConsentedToHealthData(e.target.checked)}
								required
								className="mt-0.5 h-6 w-6 shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-lg leading-relaxed text-ink">
								I consent to the collection and processing of my health assessment data for this system.
							</span>
						</label>
					</div>

					<Button type="submit" fullWidth loading={loading} disabled={!agreedToTerms || !consentedToHealthData}>
						{loading ? "Creating account…" : "Create Account"}
					</Button>

					<p className="text-center text-lg text-muted">
						Already have an account?{" "}
						<Link to="/login" className="font-medium text-accent hover:text-accent-deep">
							Sign in
						</Link>
					</p>
				</form>
			</div>

			</main>

			{/* ============ Bottom-docked keyboard — mounts only while a text field is active ============ */}
			{activeField && (
				<div className="z-40 shrink-0 px-6">
					<VirtualKeyboard
						mode={FIELD_META[activeField].mode}
						fieldType={FIELD_META[activeField].type}
						ariaLabel={FIELD_META[activeField].label}
						value={fieldState[activeField][0]}
						onChange={handleKeyboardChange}
						maxLength={FIELD_META[activeField].maxLength}
						onClose={closeKeyboard}
						primaryActionLabel={isLastField ? "Done" : "Next"}
						onPrimaryAction={handleKeyboardPrimary}
					/>
				</div>
			)}

			<Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Use">
				<TermsOfUseContent />
			</Modal>
			<Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
				<PrivacyPolicyContent />
			</Modal>
		</div>
	);
}
