import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ToastMessage {
	id: number;
	type: "success" | "error";
	text: string;
}

interface ToastProps {
	toast: ToastMessage | null;
	onDismiss: () => void;
	/** Auto-dismiss delay in ms. Default 4000. */
	durationMs?: number;
}

/**
 * Fire-and-forget banner for feedback that isn't tied to a specific form
 * field — e.g. a kiosk barcode scan result, which has no input to show an
 * inline error next to. Callers own the toast's lifecycle via a single
 * `ToastMessage | null` value; bumping `id` (even for the same text) retriggers
 * the auto-dismiss timer.
 */
export default function Toast({ toast, onDismiss, durationMs = 4000 }: ToastProps) {
	useEffect(() => {
		if (!toast) return;
		const id = window.setTimeout(onDismiss, durationMs);
		return () => window.clearTimeout(id);
	}, [toast, durationMs, onDismiss]);

	if (!toast) return null;

	const isError = toast.type === "error";

	return createPortal(
		<div className="pointer-events-none fixed inset-x-0 top-[clamp(0.75rem,3dvh,2rem)] z-[60] flex justify-center px-4">
			<div
				role="status"
				aria-live="polite"
				className={`pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-xl border px-4 py-3 text-[13.5px] font-medium shadow-[0_12px_30px_-10px_rgba(11,36,48,0.35)] ${
					isError ? "border-bad/30 bg-bad-tint text-bad" : "border-good/30 bg-good-tint text-good"
				}`}
			>
				{isError ? (
					<XCircle className="h-4.5 w-4.5 shrink-0" />
				) : (
					<CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
				)}
				<span>{toast.text}</span>
			</div>
		</div>,
		document.body
	);
}