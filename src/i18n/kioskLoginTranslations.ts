import type { KioskLanguage } from "../lib/kioskAccessibility";

export type KioskLoginStrings = {
	a11yBarLabel: string;
	lowerScreen: string;
	fontSize: string;
	audioGuidance: string;
	audioGuidanceOn: string;
	audioGuidanceOff: string;
	audioToggleOn: string;
	audioToggleOff: string;
	language: string;
	eyebrow: string;
	welcomeTitle: string;
	welcomeSubtitle: string;
	scanTitle: string;
	scanReady: string;
	scanChecking: string;
	scanHint: string;
	orDivider: string;
	phoneCta: string;
	emailToggle: string;
	emailLabel: string;
	passwordLabel: string;
	forgotPassword: string;
	registerPrompt: string;
	registerLink: string;
	signInCta: string;
	signingIn: string;
	showEmail: string;
	hideEmail: string;
	guestCta: string;
	staffCta: string;
	staffNotified: string;
	phoneLabel: string;
	sendCodeCta: string;
	sendingCode: string;
	otpTitle: string;
	otpHint: string;
	verifyCta: string;
	verifying: string;
	backCta: string;
	genericError: string;
	missingCredentials: string;
	sessionResetsIn: string;
};

// NOTE: these are good-faith translations for a first pass. Have clinical
// staff or a professional medical translator review the Spanish, Tagalog
// and Mandarin copy before this ships to a real patient-facing kiosk.
export const KIOSK_LOGIN_STRINGS: Record<KioskLanguage, KioskLoginStrings> = {
	en: {
		a11yBarLabel: "ACCESSIBILITY & ASSISTANCE",
		lowerScreen: "Lower Screen",
		fontSize: "Font Size",
		audioGuidance: "Audio Guidance",
		audioGuidanceOn: "Audio guidance on",
		audioGuidanceOff: "Audio guidance off",
		audioToggleOn: "Audio: ON",
		audioToggleOff: "Audio: OFF",
		language: "Language",
		eyebrow: "PATIENT AUTHENTICATION",
		welcomeTitle: "Welcome",
		welcomeSubtitle: "Sign in to view your health records and recommendations.",
		scanTitle: "Scan Patient ID / QR Code",
		scanReady: "Ready to scan — no need to tap anything",
		scanChecking: "Checking your barcode…",
		scanHint: "Hold QR code 6 inches below screen over the red light scanner",
		orDivider: "or",
		phoneCta: "Sign In with Mobile Number",
		emailToggle: "Use Email & Password",
		emailLabel: "Email",
		passwordLabel: "Password",
		forgotPassword: "Forgot password?",
		registerPrompt: "Don't have an account?",
		registerLink: "Register",
		signInCta: "Sign In",
		signingIn: "Signing in…",
		showEmail: "Show Email",
		hideEmail: "Hide Email",
		guestCta: "Continue as Guest",
		staffCta: "Need Assistance? Ask Staff",
		staffNotified: "A staff member has been notified and will be with you shortly.",
		phoneLabel: "Mobile Number",
		sendCodeCta: "Send Code",
		sendingCode: "Sending…",
		otpTitle: "Enter the 6-digit code",
		otpHint: "We sent a code to",
		verifyCta: "Verify & Sign In",
		verifying: "Verifying…",
		backCta: "Back",
		genericError: "Something went wrong. Please try again.",
		missingCredentials: "Enter both email and password.",
		sessionResetsIn: "Session resets in",
	},
	es: {
		a11yBarLabel: "ACCESIBILIDAD Y ASISTENCIA",
		lowerScreen: "Bajar pantalla",
		fontSize: "Tamaño de letra",
		audioGuidance: "Guía de audio",
		audioGuidanceOn: "Guía de audio activada",
		audioGuidanceOff: "Guía de audio desactivada",
		audioToggleOn: "Audio: Activado",
		audioToggleOff: "Audio: Desactivado",
		language: "Idioma",
		eyebrow: "AUTENTICACIÓN DEL PACIENTE",
		welcomeTitle: "Bienvenido",
		welcomeSubtitle: "Inicie sesión para ver sus registros médicos y recomendaciones.",
		scanTitle: "Escanee su identificación o código QR",
		scanReady: "Listo para escanear — no es necesario tocar nada",
		scanChecking: "Verificando su código…",
		scanHint: "Coloque el código QR a 15 cm debajo de la pantalla, sobre el lector de luz roja",
		orDivider: "o",
		phoneCta: "Iniciar sesión con número de celular",
		emailToggle: "Usar correo y contraseña",
		emailLabel: "Correo electrónico",
		passwordLabel: "Contraseña",
		forgotPassword: "¿Olvidó su contraseña?",
		registerPrompt: "¿No tiene una cuenta?",
		registerLink: "Regístrese",
		signInCta: "Iniciar sesión",
		signingIn: "Iniciando sesión…",
		showEmail: "Mostrar correo",
		hideEmail: "Ocultar correo",
		guestCta: "Continuar como invitado",
		staffCta: "¿Necesita ayuda? Llame al personal",
		staffNotified: "Se ha notificado al personal; alguien le atenderá en breve.",
		phoneLabel: "Número de celular",
		sendCodeCta: "Enviar código",
		sendingCode: "Enviando…",
		otpTitle: "Ingrese el código de 6 dígitos",
		otpHint: "Enviamos un código a",
		verifyCta: "Verificar e iniciar sesión",
		verifying: "Verificando…",
		backCta: "Atrás",
		genericError: "Algo salió mal. Inténtelo de nuevo.",
		missingCredentials: "Ingrese su correo y contraseña.",
		sessionResetsIn: "La sesión se reinicia en",
	},
	tl: {
		a11yBarLabel: "ACCESSIBILITY AT TULONG",
		lowerScreen: "Ibaba ang Screen",
		fontSize: "Laki ng Titik",
		audioGuidance: "Gabay na Audio",
		audioGuidanceOn: "Naka-on ang gabay na audio",
		audioGuidanceOff: "Naka-off ang gabay na audio",
		audioToggleOn: "Audio: NAKA-ON",
		audioToggleOff: "Audio: NAKA-OFF",
		language: "Wika",
		eyebrow: "PAGPAPATUNAY NG PASYENTE",
		welcomeTitle: "Maligayang pagbabalik",
		welcomeSubtitle: "Mag-sign in para tingnan ang iyong medical records at rekomendasyon.",
		scanTitle: "I-scan ang Patient ID / QR Code",
		scanReady: "Handa nang i-scan — hindi na kailangang pindutin",
		scanChecking: "Sinusuri ang iyong barcode…",
		scanHint: "Ilagay ang QR code 6 pulgada sa ibaba ng screen, sa ibabaw ng pulang scanner",
		orDivider: "o",
		phoneCta: "Mag-sign in gamit ang Mobile Number",
		emailToggle: "Gumamit ng Email at Password",
		emailLabel: "Email",
		passwordLabel: "Password",
		forgotPassword: "Nakalimutan ang password?",
		registerPrompt: "Wala ka pang account?",
		registerLink: "Mag-rehistro",
		signInCta: "Mag-sign In",
		signingIn: "Nagsa-sign in…",
		showEmail: "Ipakita ang Email",
		hideEmail: "Itago ang Email",
		guestCta: "Magpatuloy bilang Bisita",
		staffCta: "Kailangan ng Tulong? Tawagin ang Staff",
		staffNotified: "Naabisuhan na ang staff at lalapit sila sa iyo.",
		phoneLabel: "Mobile Number",
		sendCodeCta: "Ipadala ang Code",
		sendingCode: "Ipinapadala…",
		otpTitle: "Ilagay ang 6-digit na code",
		otpHint: "Nagpadala kami ng code sa",
		verifyCta: "I-verify at Mag-sign In",
		verifying: "Vine-verify…",
		backCta: "Bumalik",
		genericError: "May nangyaring mali. Pakisubukang muli.",
		missingCredentials: "Ilagay ang iyong email at password.",
		sessionResetsIn: "Mag-rereset ang session sa loob ng",
	},
	zh: {
		a11yBarLabel: "无障碍与协助",
		lowerScreen: "降低屏幕",
		fontSize: "字体大小",
		audioGuidance: "语音引导",
		audioGuidanceOn: "语音引导已开启",
		audioGuidanceOff: "语音引导已关闭",
		audioToggleOn: "语音：开",
		audioToggleOff: "语音：关",
		language: "语言",
		eyebrow: "患者身份验证",
		welcomeTitle: "欢迎回来",
		welcomeSubtitle: "登录以查看您的健康记录和建议。",
		scanTitle: "扫描患者身份证或二维码",
		scanReady: "准备扫描 — 无需触摸屏幕",
		scanChecking: "正在核对您的条码…",
		scanHint: "请将二维码放在屏幕下方约15厘米处，对准红色扫描光",
		orDivider: "或",
		phoneCta: "使用手机号码登录",
		emailToggle: "使用邮箱和密码",
		emailLabel: "邮箱",
		passwordLabel: "密码",
		forgotPassword: "忘记密码？",
		registerPrompt: "还没有账户？",
		registerLink: "注册",
		signInCta: "登录",
		signingIn: "正在登录…",
		showEmail: "显示邮箱",
		hideEmail: "隐藏邮箱",
		guestCta: "以访客身份继续",
		staffCta: "需要帮助？呼叫工作人员",
		staffNotified: "工作人员已收到通知，会尽快前来协助您。",
		phoneLabel: "手机号码",
		sendCodeCta: "发送验证码",
		sendingCode: "发送中…",
		otpTitle: "请输入6位验证码",
		otpHint: "验证码已发送至",
		verifyCta: "验证并登录",
		verifying: "验证中…",
		backCta: "返回",
		genericError: "出现错误，请重试。",
		missingCredentials: "请输入邮箱和密码。",
		sessionResetsIn: "会话将在以下时间后重置",
	},
};

export function getKioskLoginStrings(language: KioskLanguage): KioskLoginStrings {
	return KIOSK_LOGIN_STRINGS[language] ?? KIOSK_LOGIN_STRINGS.en;
}