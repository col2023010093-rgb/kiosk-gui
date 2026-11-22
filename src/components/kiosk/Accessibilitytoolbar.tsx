import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Type, Volume2, VolumeX } from "lucide-react";
import { KIOSK_LANGUAGES, FONT_SCALES, type FontScaleIndex, type KioskLanguage } from "../../lib/kioskAccessibility";
import type { KioskLoginStrings } from "../../i18n/kioskLoginTranslations";

type ToolbarStrings = Pick<
	KioskLoginStrings,
	"a11yBarLabel" | "fontSize" | "language" | "audioToggleOn" | "audioToggleOff"
>;

interface AccessibilityToolbarProps {
	strings: ToolbarStrings;
	language: KioskLanguage;
	onLanguageChange: (language: KioskLanguage) => void;
	fontStep: FontScaleIndex;
	onFontStepChange: (step: FontScaleIndex) => void;
	audioGuidance: boolean;
	onToggleAudioGuidance: () => void;
}

const MAX_FONT_STEP = FONT_SCALES.length - 1;

/**
 * Sticky top accessibility bar. Uses the same compact format as the
 * Dashboard's toolbar: slate bar, label on the left, pill controls on the right.
 */
export default function AccessibilityToolbar({
	strings,
	language,
	onLanguageChange,
	fontStep,
	onFontStepChange,
	audioGuidance,
	onToggleAudioGuidance,
}: AccessibilityToolbarProps) {
	const fontPercent = Math.round(FONT_SCALES[fontStep] * 100);
	const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
	const languageMenuRef = useRef<HTMLDivElement>(null);

	// Close the language menu when tapping anywhere outside it.
	useEffect(() => {
		if (!languageMenuOpen) return;
		const handler = (e: PointerEvent) => {
			if (!languageMenuRef.current?.contains(e.target as Node)) setLanguageMenuOpen(false);
		};
		window.addEventListener("pointerdown", handler);
		return () => window.removeEventListener("pointerdown", handler);
	}, [languageMenuOpen]);

	return (
		<div
			role="toolbar"
			aria-label={strings.a11yBarLabel}
			className="sticky top-0 z-50 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-100 p-3 sm:px-6"
		>
			<span className="text-xs font-bold uppercase tracking-wide text-[#334155]">{strings.a11yBarLabel}</span>

			<div className="flex flex-wrap items-center gap-4">
				<div
					role="group"
					aria-label={strings.fontSize}
					className="flex h-[52px] items-stretch divide-x divide-slate-300 overflow-hidden rounded-full border border-slate-300 bg-white text-[#1E293B]"
				>
					<button
						type="button"
						onClick={() => onFontStepChange(Math.max(0, fontStep - 1) as FontScaleIndex)}
						disabled={fontStep === 0}
						aria-label={`${strings.fontSize} -`}
						className="flex w-[52px] items-center justify-center text-xl font-bold transition hover:bg-[#F0F9FF] disabled:opacity-30"
					>
						−
					</button>
					<span className="flex min-w-[64px] items-center justify-center gap-1.5 px-2 text-sm font-bold text-[#334155]">
						<Type className="h-4 w-4" aria-hidden="true" />
						{fontPercent}%
					</span>
					<button
						type="button"
						onClick={() => onFontStepChange(Math.min(MAX_FONT_STEP, fontStep + 1) as FontScaleIndex)}
						disabled={fontStep === MAX_FONT_STEP}
						aria-label={`${strings.fontSize} +`}
						className="flex w-[52px] items-center justify-center text-xl font-bold transition hover:bg-[#F0F9FF] disabled:opacity-30"
					>
						+
					</button>
				</div>

				<button
					type="button"
					onClick={onToggleAudioGuidance}
					aria-pressed={audioGuidance}
					className={`flex h-12 min-w-[48px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
						audioGuidance
							? "border-[#0284C7] bg-[#F0F9FF] text-[#0284C7]"
							: "border-slate-300 bg-white text-[#1E293B] hover:border-[#0284C7]/50"
					}`}
				>
					{audioGuidance ? (
						<Volume2 className="h-5 w-5" aria-hidden="true" />
					) : (
						<VolumeX className="h-5 w-5" aria-hidden="true" />
					)}
					{audioGuidance ? strings.audioToggleOn : strings.audioToggleOff}
				</button>

				<div className="relative" ref={languageMenuRef}>
					<button
						type="button"
						onClick={() => setLanguageMenuOpen((v) => !v)}
						aria-label={strings.language}
						aria-haspopup="listbox"
						aria-expanded={languageMenuOpen}
						className="flex h-12 min-w-[48px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#1E293B] transition hover:border-[#0284C7]/50"
					>
						<Globe className="h-5 w-5 text-[#334155]" aria-hidden="true" />
						{KIOSK_LANGUAGES.find((l) => l.code === language)?.label}
						<ChevronDown className="h-4 w-4 text-[#334155]" aria-hidden="true" />
					</button>
					{languageMenuOpen && (
						<ul
							role="listbox"
							aria-label={strings.language}
							className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 overflow-hidden rounded-xl border border-slate-300 bg-white py-1 shadow-lg"
						>
							{KIOSK_LANGUAGES.map((l) => (
								<li key={l.code}>
									<button
										type="button"
										role="option"
										aria-selected={language === l.code}
										onClick={() => {
											onLanguageChange(l.code);
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
	);
}