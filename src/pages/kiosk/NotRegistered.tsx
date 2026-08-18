import { useLocation, useNavigate } from "react-router-dom";
import { UserX } from "lucide-react";

export default function NotRegistered() {
	const navigate = useNavigate();
	const location = useLocation();
	const barcode = (location.state as { barcode?: string } | null)?.barcode;

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-warn-tint">
				<UserX size={36} className="text-warn" />
			</div>
			<h1 className="mt-6 text-2xl font-bold text-ink">Patient not registered</h1>
			<p className="mt-2 max-w-sm text-sm text-muted">
				{barcode ? (
					<>
						We couldn&apos;t find a patient for barcode <span className="font-mono text-ink">#{barcode}</span>.
					</>
				) : (
					"We couldn't find a patient for that barcode."
				)}{" "}
				Please register at the front desk to continue.
			</p>

			<div className="mt-8 flex w-full max-w-sm flex-col gap-3">
				<button
					onClick={() => navigate("/staff/register")}
					className="rounded-2xl bg-primary py-4 text-base font-semibold text-white transition-colors hover:bg-primary-deep"
				>
					Register Patient
				</button>
				<button
					onClick={() => navigate("/kiosk/scan")}
					className="rounded-2xl border border-line py-4 text-sm font-medium text-muted hover:border-primary hover:text-primary-deep"
				>
					Scan again
				</button>
				<button onClick={() => navigate("/kiosk")} className="text-xs font-medium text-muted hover:text-primary">
					Return to idle screen
				</button>
			</div>
		</div>
	);
}
