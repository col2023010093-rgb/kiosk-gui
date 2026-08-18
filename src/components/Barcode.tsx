interface BarcodeProps {
	value: string;
	className?: string;
}

/**
 * Purely decorative barcode rendering (not a real Code-128/39 encoding).
 * Bar widths are derived deterministically from the character codes of `value`
 * so the same ID always renders the same pattern.
 */
export function Barcode({ value, className }: BarcodeProps) {
	const chars = value.split("");
	const bars = chars.map((char, i) => {
		const code = char.charCodeAt(0);
		const width = 2 + (code % 3);
		const gap = 2 + ((code + i) % 3);
		return { width, gap };
	});

	const { rects, width } = bars.reduce(
		(accumulator, bar, key) => ({
			rects: [...accumulator.rects, { x: accumulator.width, width: bar.width, key }],
			width: accumulator.width + bar.width + bar.gap,
		}),
		{ rects: [] as Array<{ x: number; width: number; key: number }>, width: 0 },
	);

	return (
		<svg
			viewBox={`0 0 ${width} 40`}
			className={className}
			preserveAspectRatio="none"
			role="img"
			aria-label={`Barcode ${value}`}
		>
			{rects.map((rect) => (
				<rect key={rect.key} x={rect.x} y={0} width={rect.width} height={32} fill="#0B2430" />
			))}
		</svg>
	);
}
