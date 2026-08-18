import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "./Button";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				aria-hidden="true"
				onClick={onClose}
				className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="relative flex max-h-[85dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_-15px_rgba(11,36,48,0.35)]"
			>
				<div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
					<h2 className="text-[1.0625rem] font-bold text-ink">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-tint/40 hover:text-accent-deep"
					>
						<X className="h-4.5 w-4.5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-5 text-[13.5px] leading-relaxed text-ink">
					{children}
				</div>

				<div className="flex shrink-0 justify-end border-t border-line px-6 py-4">
					<Button type="button" onClick={onClose} className="min-w-[100px] px-6">
						Close
					</Button>
				</div>
			</div>
		</div>,
		document.body
	);
}