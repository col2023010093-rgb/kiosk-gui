import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

interface CountUpProps {
	value: number;
	decimals?: number;
	className?: string;
	duration?: number;
}

/**
 * Animates a number counting up from 0 to `value` once it scrolls into view.
 * Respects prefers-reduced-motion by snapping straight to the final value.
 */
export function CountUp({ value, decimals = 0, className, duration = 1.1 }: CountUpProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const inView = useInView(ref, { once: true, margin: "-10% 0px" });
	const [display, setDisplay] = useState(0);
	const prefersReducedMotion = useReducedMotion();

	const motionValue = useMotionValue(0);
	const springValue = useSpring(motionValue, { duration, bounce: 0 });

	useEffect(() => {
		if (inView && !prefersReducedMotion) {
			motionValue.set(value);
		}
	}, [inView, value, motionValue, prefersReducedMotion]);

	useEffect(() => {
		const unsubscribe = springValue.on("change", (latest) => {
			setDisplay(latest);
		});
		return () => unsubscribe();
	}, [springValue]);

	return (
		<span ref={ref} className={className}>
			{(prefersReducedMotion ? value : display).toFixed(decimals)}
		</span>
	);
}
