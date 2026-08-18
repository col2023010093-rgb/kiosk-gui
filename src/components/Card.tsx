import type { ReactNode } from "react";

interface CardProps {
	title?: string;
	action?: ReactNode;
	className?: string;
	children: ReactNode;
}

export default function Card({ title, action, className = "", children }: CardProps) {
	return (
		<div className={`rounded-2xl border border-line bg-white p-6 shadow-sm ${className}`}>
			{(title || action) && (
				<div className="mb-4 flex items-center justify-between">
					{title && <h3 className="text-[15px] font-bold text-ink">{title}</h3>}
					{action}
				</div>
			)}
			{children}
		</div>
	);
}
