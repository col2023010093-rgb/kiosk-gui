import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useKioskSession } from "../../hooks/useKioskSession";

const RETURN_SECONDS = 8;

export default function CompleteScreen() {
	const navigate = useNavigate();
	const { patient, resetSession } = useKioskSession();
	const [countdown, setCountdown] = useState(RETURN_SECONDS);

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown((c) => {
				if (c <= 1) {
					clearInterval(interval);
					resetSession();
					navigate("/kiosk");
					return 0;
				}
				return c - 1;
			});
		}, 1000);
		return () => clearInterval(interval);
	}, [navigate, resetSession]);

	function finishNow() {
		resetSession();
		navigate("/kiosk");
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-good-tint">
				<CheckCircle2 size={40} className="text-good" />
			</div>
			<h1 className="mt-6 text-2xl font-bold text-ink">
				Thank you{patient ? `, ${patient.first_name}` : ""}!
			</h1>
			<p className="mt-2 max-w-sm text-sm text-muted">
				Your measurements have been saved. View your full results anytime in the patient portal.
			</p>

			<button
				onClick={finishNow}
				className="mt-8 rounded-2xl bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
			>
				Done
			</button>
			<p className="mt-4 font-mono text-xs text-muted">Returning to idle screen in {countdown}s</p>
		</div>
	);
}
