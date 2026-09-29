import { ArrowDownToLine, Globe, Type, Volume2, VolumeX } from "lucide-react";
import { KIOSK_LANGUAGES, FONT_SCALES, type FontScaleIndex, type KioskLanguage } from "../../lib/kioskAccessibility";
import type { KioskLoginStrings } from "../../i18n/kioskLoginTranslations";

type ToolbarStrings = Pick<
	KioskLoginStrings,
	"a11yBarLabel" | "lowerScreen" | "fontSize" | "language" | "audioToggleOn" | "audioToggleOff"
>;

interface AccessibilityToolbarProps {
	strings: ToolbarStrings;
	language: KioskLanguage;
	onLanguageChange: (language: KioskLanguage) => void;
	lowerScreen: boolean;
	onToggleLowerScreen: () => void;
	fontStep: FontScaleIndex;
	onFontStepChange: (step: FontScaleIndex) => void;
	audioGuidance: boolean;
	onToggleAudioGuidance: () => void;
}

const MAX_FONT_STEP = FONT_SCALES.length - 1;

/**
 * Sticky top accessibility dock, sized for a standing kiosk: 64px pill
 * controls, 18px text, sky-blue fill for the active Audio state.
 */
export default function AccessibilityToolbar({
	strings,
	language,
	onLanguageChange,
	lowerScreen,
	onToggleLowerScreen,
	fontStep,
	onFontStepChange,
	audioGuidance,
	onToggleAudioGuidance,
}: AccessibilityToolbarProps) {
	const fontPercent = Math.round(FONT_SCALES[fontStep] * 100);

	return (
		<div
			role="toolbar"
			aria-label={strings.a11yBarLabel}
			className="sticky top-0 z-50 w-full shrink-0 border-b border-[#E2E8F0] bg-white px-6 py-5 sm:px-8"
		>
			<div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
				<span className="text-[18px] font-bold uppercase tracking-wide text-[#334155]">{strings.a11yBarLabel}</span>

				<div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-3">
					<Pill onClick={onToggleLowerScreen} pressed={lowerScreen}>
						<ArrowDownToLine className="h-6 w-6" aria-hidden="true" />
						<span>{strings.lowerScreen}</span>
					</Pill>

					<div
						role="group"
						aria-label={strings.fontSize}
						className="flex h-16 items-center gap-3 rounded-full border-2 border-[#CBD5E1] bg-white px-5"
					>
						<Type className="h-6 w-6 text-[#334155]" aria-hidden="true" />
						<button
							type="button"
							onClick={() => onFontStepChange(Math.max(0, fontStep - 1) as FontScaleIndex)}
							disabled={fontStep === 0}
							aria-label={`${strings.fontSize} -`}
							className="flex h-12 w-12 items-center justify-center rounded-full text-[26px] font-bold text-[#0F172A] disabled:opacity-40"
						>
							−
						</button>
						<span className="min-w-[4ch] text-center text-[20px] font-semibold text-[#334155]">
							{fontPercent}%
						</span>
						<button
							type="button"
							onClick={() => onFontStepChange(Math.min(MAX_FONT_STEP, fontStep + 1) as FontScaleIndex)}
							disabled={fontStep === MAX_FONT_STEP}
							aria-label={`${strings.fontSize} +`}
							className="flex h-12 w-12 items-center justify-center rounded-full text-[26px] font-bold text-[#0F172A] disabled:opacity-40"
						>
							+
						</button>
					</div>

					<Pill onClick={onToggleAudioGuidance} pressed={audioGuidance}>
						{audioGuidance ? (
							<Volume2 className="h-6 w-6" aria-hidden="true" />
						) : (
							<VolumeX className="h-6 w-6" aria-hidden="true" />
						)}
						<span>{audioGuidance ? strings.audioToggleOn : strings.audioToggleOff}</span>
					</Pill>

					<label className="flex h-16 items-center gap-3 rounded-full border-2 border-[#CBD5E1] bg-white px-5">
						<Globe className="h-6 w-6 text-[#334155]" aria-hidden="true" />
						<span className="sr-only">{strings.language}</span>
						<select
							value={language}
							onChange={(e) => onLanguageChange(e.target.value as KioskLanguage)}
							className="h-full bg-transparent text-[20px] font-semibold text-[#334155] focus:outline-none"
						>
							{KIOSK_LANGUAGES.map((l) => (
								<option key={l.code} value={l.code}>
									{l.label}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>
		</div>
	);
}

function Pill({
	pressed,
	onClick,
	children,
}: {
	pressed: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={pressed}
			className={`flex h-16 items-center gap-3 rounded-full border-2 px-6 text-[20px] font-semibold transition-colors ${
				pressed
					? "border-[#0284C7] bg-[#F0F9FF] text-[#0284C7]"
					: "border-[#CBD5E1] bg-white text-[#334155]"
			}`}
		>
			{children}
		</button>
	);
}