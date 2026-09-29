export type KioskLanguage = "en" | "es" | "tl" | "zh";

export const FONT_SCALES = [1, 1.15, 1.3] as const;
export type FontScaleIndex = 0 | 1 | 2;

export const KIOSK_LANGUAGES: { code: KioskLanguage; label: string }[] = [
	{ code: "en", label: "English" },
	{ code: "es", label: "Español" },
	{ code: "tl", label: "Tagalog" },
	{ code: "zh", label: "中文" },
];

const SPEECH_LOCALES: Record<KioskLanguage, string> = {
	en: "en-US",
	es: "es-US",
	tl: "fil-PH",
	zh: "zh-CN",
};

/**
 * Reads a short string aloud for the Audio Guidance control. Fails silently
 * on kiosks/browsers without speech synthesis support rather than throwing,
 * since audio guidance is an enhancement and should never block the flow.
 */
export function speak(text: string, language: KioskLanguage) {
	if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
	try {
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = SPEECH_LOCALES[language];
		utterance.rate = 0.95;
		window.speechSynthesis.speak(utterance);
	} catch {
		// Non-critical — never block the UI on speech synthesis failing.
	}
}

/**
 * Masks an email address for shoulder-surf protection in a public lobby,
 * e.g. "riley@gmail.com" -> "r***y@gmail.com".
 */
export function maskEmail(email: string): string {
	const [name, domain] = email.split("@");
	if (!domain) return email;
	if (name.length <= 2) return `${name[0] ?? ""}***@${domain}`;
	return `${name[0]}${"*".repeat(Math.max(name.length - 2, 1))}${name[name.length - 1]}@${domain}`;
}