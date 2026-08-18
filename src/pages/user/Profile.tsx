import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { patientProfile } from "../../data/mockHealth";
import { useAuth } from "../../hooks/useAuth";

export default function Profile() {
	const { user } = useAuth();

	return (
		<>
			<Navbar eyebrow="Account" title="Profile" subtitle="Your personal details on file with the clinic." />

			<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
				<Card className="flex flex-col items-center text-center">
					<span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint text-2xl font-bold text-primary-deep">
						{patientProfile.avatarInitials}
					</span>
					<p className="mt-4 text-base font-bold text-ink">{user?.fullName ?? patientProfile.fullName}</p>
					<p className="text-sm text-muted">{user?.email ?? "demo@genErick.local"}</p>
					<span className="mt-4 rounded-full bg-good-tint px-3 py-1 text-xs font-semibold text-good">
						Verified patient
					</span>
				</Card>

				<Card title="Personal Information">
					<dl className="grid grid-cols-2 gap-y-5 text-sm">
						<dt className="text-muted">Full name</dt>
						<dd className="text-right text-ink">{user?.fullName ?? patientProfile.fullName}</dd>

						<dt className="text-muted">Age</dt>
						<dd className="text-right text-ink">{patientProfile.age}</dd>

						<dt className="text-muted">Sex</dt>
						<dd className="text-right text-ink">{patientProfile.sex}</dd>

						<dt className="text-muted">Patient record</dt>
						<dd className="text-right text-ink">{patientProfile.patientId}</dd>

						<dt className="text-muted">Last visit</dt>
						<dd className="text-right text-ink">{patientProfile.lastVisit}</dd>
					</dl>
					<p className="mt-6 border-t border-line pt-4 text-xs text-muted">
						To update these details, please visit the clinic front desk — profile edits aren&rsquo;t available
						from this demo yet.
					</p>
				</Card>
			</div>
		</>
	);
}
