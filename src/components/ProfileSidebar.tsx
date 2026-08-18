import { motion } from "framer-motion";
import { patientProfile } from "../data/mockHealth";

export function ProfileSidebar() {
	return (
		<motion.aside
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
			className="hidden h-fit flex-col gap-4 rounded-3xl border border-line bg-white p-6 shadow-sm xl:flex"
		>
			<div className="flex flex-col items-center text-center">
				<span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
					{patientProfile.avatarInitials}
				</span>
				<p className="mt-3 text-sm font-bold text-ink">{patientProfile.fullName}</p>
				<p className="text-xs text-muted">Personal health overview</p>
			</div>

			<dl className="grid grid-cols-2 gap-y-3 border-t border-line pt-4 text-sm">
				<dt className="text-muted">Age</dt>
				<dd className="text-right text-ink">{patientProfile.age}</dd>
				<dt className="text-muted">Sex</dt>
				<dd className="text-right text-ink">{patientProfile.sex}</dd>
				<dt className="text-muted">Last Visit</dt>
				<dd className="text-right text-ink">{patientProfile.lastVisit}</dd>
			</dl>

			<div className="flex items-center justify-between rounded-2xl border border-line bg-app/60 px-4 py-3">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted">System Status</span>
				<span className="flex items-center gap-1.5 text-xs font-semibold text-success">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
					</span>
					Online
				</span>
			</div>
		</motion.aside>
	);
}
