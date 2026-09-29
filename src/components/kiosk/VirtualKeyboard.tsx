import { useState } from "react";
import { ChevronDown, Delete, Eye, EyeOff } from "lucide-react";

type KeyboardMode = "numeric" | "alpha";
type FieldType = "email" | "password" | "text";

interface VirtualKeyboardProps {
	mode: KeyboardMode;
	fieldType?: FieldType;
	value: string;
	onChange: (next: string) => void;
	maxLength?: number;
	ariaLabel: string;
	onClose: () => void;
	primaryActionLabel: string; // "Next" or "Done"
	onPrimaryAction: () => void;
	showPassword?: boolean;
	onToggleShowPassword?: () => void;
}

const ALPHA_ROWS = [
	["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
	["a", "s", "d", "f", "g", "h", "j", "k", "l"],
	["z", "x", "c", "v", "b", "n", "m"],
];

const SYMBOL_ROWS = [
	["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
	["@", ".", "-", "_", "+"],
];

const EMAIL_DOMAINS = ["@gmail.com", "@yahoo.com", "@outlook.com"];

// Key height scales down on short screens (48px min) so the whole board,
// including the bottom Space row, always fits without being clipped.
const KEY_H = "h-[clamp(48px,7dvh,68px)]";

// Letter/symbol keycaps: white, high-contrast text, teal press state.
const KEY_CLASS = `flex ${KEY_H} min-w-[44px] flex-1 items-center justify-center rounded-lg border-2 border-[#CBD5E1] bg-white text-[24px] font-bold text-[#0F172A] shadow-sm transition-colors active:border-[#005C53] active:bg-[#005C53] active:text-white`;

// Modifier keycaps (Shift, 123/ABC, Delete, domain shortcuts): light
// blue-gray fill, text+icon labels, same teal press state.
const MODIFIER_KEY_CLASS = `flex ${KEY_H} min-w-[90px] items-center justify-center gap-2 rounded-lg border-2 border-[#94A3B8] bg-[#E2E8F0] px-3 text-[20px] font-bold text-[#0F172A] shadow-sm transition-colors active:border-[#005C53] active:bg-[#005C53] active:text-white`;

// Shift, when locked/active: solid teal so its state reads at a glance.
const SHIFT_ACTIVE_CLASS = `flex ${KEY_H} min-w-[90px] items-center justify-center gap-2 rounded-lg border-2 border-[#005C53] bg-[#005C53] px-3 text-[20px] font-bold text-white shadow-sm transition-colors`;

// Primary action key (Next / Done): solid dark teal, always visually
// distinct from every other key on the board.
const ACTION_KEY_CLASS = `flex ${KEY_H} min-w-[120px] items-center justify-center gap-2 rounded-lg bg-[#005C53] px-4 text-[20px] font-bold text-white shadow-sm transition-colors hover:bg-[#00473F] active:bg-[#003A33]`;

/**
 * Bottom-docked OSK. The parent renders it as a normal (non-fixed) flex
 * child below the scrollable form, so it takes real layout space: the form
 * area shrinks and scrolls the focused field into view instead of the
 * keyboard covering it. Mounted only while a field is focused.
 *
 * IMPORTANT: the outer group has onMouseDown={preventDefault}. Without it,
 * tapping any key shifts browser focus off the currently-focused (readOnly)
 * input on mousedown, which blurs it, which the parent screen uses to hide
 * this component — so the keyboard unmounts before the click that was
 * supposed to append a character ever fires. Preventing default on
 * mousedown stops that focus shift; the click still fires normally.
 */
export default function VirtualKeyboard({
	mode,
	fieldType = "text",
	value,
	onChange,
	maxLength,
	ariaLabel,
	onClose,
	primaryActionLabel,
	onPrimaryAction,
	showPassword,
	onToggleShowPassword,
}: VirtualKeyboardProps) {
	const [shift, setShift] = useState(false);
	const [symbols, setSymbols] = useState(false);

	function append(char: string) {
		if (maxLength && value.length >= maxLength) return;
		onChange(value + char);
	}

	function backspace() {
		onChange(value.slice(0, -1));
	}

	const preventFocusSteal = (e: React.MouseEvent) => {
		e.preventDefault();
	};

	const TopStrip = (
		<div className="flex items-center justify-between px-4 pb-2 pt-3">
			<span className="w-[200px]" aria-hidden="true" />
			<span className="h-1.5 w-16 rounded-full bg-[#94A3B8]" aria-hidden="true" />
			<button
				type="button"
				onClick={onClose}
				className="flex h-12 items-center gap-2 rounded-full border-2 border-[#94A3B8] bg-white px-5 text-[18px] font-bold text-[#0F172A]"
			>
				<ChevronDown className="h-5 w-5" aria-hidden="true" />
				Close Keyboard
			</button>
		</div>
	);

	if (mode === "numeric") {
		return (
			<div
				role="group"
				aria-label={ariaLabel}
				onMouseDown={preventFocusSteal}
				className="w-full rounded-t-2xl bg-[#CBD5E1] pb-6"
			>
				{TopStrip}
				<div className="mx-auto grid w-full max-w-[480px] grid-cols-3 gap-2 px-4">
					{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
						<button key={d} type="button" className={KEY_CLASS} onClick={() => append(d)}>
							{d}
						</button>
					))}
					<button type="button" className={MODIFIER_KEY_CLASS} onClick={() => onChange("")}>
						Clear
					</button>
					<button type="button" className={KEY_CLASS} onClick={() => append("0")}>
						0
					</button>
					<button type="button" className={ACTION_KEY_CLASS} onClick={onPrimaryAction}>
						{primaryActionLabel}
					</button>
				</div>
			</div>
		);
	}

	const rows = symbols ? SYMBOL_ROWS : ALPHA_ROWS;

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			onMouseDown={preventFocusSteal}
			className="w-full rounded-t-2xl bg-[#CBD5E1] pb-6"
		>
			{TopStrip}

			<div className="mx-auto flex w-full max-w-[1000px] flex-col gap-2 px-4">
				{/* Email-only quick row: @ / .com shortcuts + domain accelerators */}
				{fieldType === "email" && !symbols && (
					<div className="flex justify-center gap-2">
						<button type="button" className={MODIFIER_KEY_CLASS} onClick={() => append("@")}>
							@
						</button>
						<button type="button" className={MODIFIER_KEY_CLASS} onClick={() => append(".com")}>
							.com
						</button>
						{EMAIL_DOMAINS.map((domain) => (
							<button
								key={domain}
								type="button"
								className={`${MODIFIER_KEY_CLASS} min-w-[140px]`}
								onClick={() => append(domain)}
							>
								{domain}
							</button>
						))}
					</div>
				)}

				{rows.map((row, i) => (
					<div key={i} className="flex justify-center gap-2">
						{row.map((k) => {
							const display = shift && !symbols ? k.toUpperCase() : k;
							return (
								<button key={k} type="button" className={KEY_CLASS} onClick={() => append(display)}>
									{display}
								</button>
							);
						})}
					</div>
				))}

				<div className="flex justify-center gap-2">
					{!symbols && (
						<button
							type="button"
							aria-pressed={shift}
							className={shift ? SHIFT_ACTIVE_CLASS : MODIFIER_KEY_CLASS}
							onClick={() => setShift((s) => !s)}
						>
							⬆ Shift
						</button>
					)}
					<button type="button" className={MODIFIER_KEY_CLASS} onClick={() => setSymbols((s) => !s)}>
						{symbols ? "ABC" : "123 #+="}
					</button>

					{/* Password-only: explicit Show/Hide Password key */}
					{fieldType === "password" && onToggleShowPassword && (
						<button type="button" className={MODIFIER_KEY_CLASS} onClick={onToggleShowPassword}>
							{showPassword ? (
								<>
									<EyeOff className="h-5 w-5" aria-hidden="true" /> Hide
								</>
							) : (
								<>
									<Eye className="h-5 w-5" aria-hidden="true" /> Show
								</>
							)}
						</button>
					)}

					<button type="button" className={`${KEY_CLASS} flex-[3]`} onClick={() => append(" ")}>
						Space
					</button>
					<button type="button" aria-label="Backspace" className={`${MODIFIER_KEY_CLASS} min-w-[88px]`} onClick={backspace}>
						<Delete className="h-5 w-5" aria-hidden="true" /> Delete
					</button>
					<button type="button" className={ACTION_KEY_CLASS} onClick={onPrimaryAction}>
						{primaryActionLabel === "Done" ? "Done ✔" : "Next ➔"}
					</button>
				</div>
			</div>
		</div>
	);
}