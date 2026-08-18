import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
	children?: ReactNode;
	loading?: boolean;
	fullWidth?: boolean;
}

export default function Button({
	children,
	loading = false,
	fullWidth = false,
	disabled,
	className = "",
	...props
}: ButtonProps) {
	const isDisabled = disabled || loading;

	return (
		<motion.button
			whileHover={isDisabled ? undefined : { y: -2 }}
			whileTap={isDisabled ? undefined : { scale: 0.98 }}
			disabled={isDisabled}
			className={`flex h-[clamp(2.5rem,5.5dvh,3.25rem)] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-br from-accent to-accent-deep px-5 text-[clamp(0.8125rem,1.6dvh,0.9375rem)] font-semibold text-white shadow-md shadow-accent/20 transition-shadow hover:shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:hover:shadow-md disabled:cursor-not-allowed ${
				fullWidth ? "w-full" : ""
			} ${className}`}
			{...props}
		>
			{loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
			{children}
		</motion.button>
	);
}