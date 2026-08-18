import { useState, forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
	icon?: ReactNode;
	error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, icon, error, type = "text", className = "", ...props }, ref) => {
		const [showPassword, setShowPassword] = useState(false);
		const isPassword = type === "password";
		const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

		return (
			<label className="flex flex-col gap-1">
				<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-medium text-ink">{label}</span>
				<div className="relative flex items-center">
					{icon && (
						<span className="pointer-events-none absolute left-4 flex h-5 w-5 items-center justify-center text-muted">
							{icon}
						</span>
					)}
					<input
						ref={ref}
						type={resolvedType}
						className={`h-[clamp(2.5rem,5.5dvh,3.25rem)] w-full rounded-xl border bg-white text-[clamp(0.8125rem,1.6dvh,0.9375rem)] text-ink outline-none transition-all placeholder:text-muted/70 ${
							icon ? "pl-12" : "pl-4"
						} ${isPassword ? "pr-12" : "pr-4"} ${
							error
								? "border-red-400 focus:ring-2 focus:ring-red-100"
								: "border-line focus:border-accent focus:ring-2 focus:ring-accent/15"
						} ${className}`}
						{...props}
					/>
					{isPassword && (
						<button
							type="button"
							onClick={() => setShowPassword((s) => !s)}
							tabIndex={-1}
							aria-label={showPassword ? "Hide password" : "Show password"}
							className="absolute right-4 flex h-5 w-5 items-center justify-center text-muted hover:text-ink transition-colors"
						>
							{showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
						</button>
					)}
				</div>
				{error && <span className="text-[clamp(0.6875rem,1.3dvh,0.78125rem)] text-red-500">{error}</span>}
			</label>
		);
	}
);

Input.displayName = "Input";
export default Input;