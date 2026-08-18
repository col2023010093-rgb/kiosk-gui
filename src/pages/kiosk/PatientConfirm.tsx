import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, User } from "lucide-react";
import { useKioskSession } from "../../hooks/useKioskSession";
import { calculateAge, initialsFromName, patientFullName } from "../../utils/helpers";

export default function PatientConfirm() {
	const navigate = useNavigate();
	const { patient } = useKioskSession();

	useEffect(() => {
		if (!patient) navigate("/kiosk/scan", { replace: true });
	}, [patient, navigate]);

	if (!patient) return null;

	const fullName = patientFullName(patient);
	const initials = initialsFromName(fullName);

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-ink">
			<button
				onClick={() => navigate("/kiosk/scan")}
				className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-ink"
				aria-label="Cancel and rescan"
			>
				<X size={18} />
			</button>

			<div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-tint text-2xl font-bold text-primary-deep">
				{initials || <User size={32} />}
			</div>

			<h1 className="mt-6 text-2xl font-bold text-ink">{fullName}</h1>
			<p className="mt-1 text-sm text-muted">
				{calculateAge(patient.birthdate)} years old · {patient.sex === "male" ? "Male" : "Female"}
			</p>
			<p className="mt-1 font-mono text-xs text-muted">Barcode #{patient.identification_number}</p>

			<div className="mt-10 flex w-full max-w-sm flex-col gap-3">
				<button
					onClick={() => navigate("/kiosk/measure")}
					className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-white transition-colors hover:bg-primary-deep"
				>
					<Check size={18} />
					Yes, this is me — Continue
				</button>
				<button
					onClick={() => navigate("/kiosk/scan")}
					className="rounded-2xl border border-line py-4 text-sm font-medium text-muted hover:border-primary hover:text-primary-deep"
				>
					Not me, scan again
				</button>
			</div>
		</div>
	);
}
