import { WifiOff, type LucideIcon } from "lucide-react";

interface DemoModeBannerProps {
	className?: string;
	/** Override the default hardware-offline copy — e.g. for sample/mock data elsewhere in the app. */
	message?: string;
	/** Override the default icon. Defaults to WifiOff (hardware-offline framing). */
	icon?: LucideIcon;
}

/**
 * Generic "this isn't real data" banner. Originally built for measurement
 * screens showing simulated sensor readings (see AssessmentResult.isSimulated
 * in services/measurement.ts), and reused as-is wherever the app surfaces
 * static/mock data that could otherwise be mistaken for a live result —
 * e.g. the admin/staff Reports pages, which still read from
 * services/report.ts's hardcoded mockReports rather than a Supabase query.
 */
export function DemoModeBanner({
	className = "",
	message = "Demo Mode — Hardware Offline. These values are placeholders and are not being saved.",
	icon: Icon = WifiOff,
}: DemoModeBannerProps) {
	return (
		<div
			role="status"
			className={`flex items-center gap-2 rounded-xl border border-warn/40 bg-warn-tint px-4 py-2.5 text-sm font-semibold text-warn ${className}`}
		>
			<Icon size={16} className="shrink-0" aria-hidden="true" />
			<span>{message}</span>
		</div>
	);
}
