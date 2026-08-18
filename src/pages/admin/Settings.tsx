import Navbar from "../../components/Navbar";
import Card from "../../components/Card";

const SETTINGS = [
	{ label: "Idle screen timeout", value: "45s" },
	{ label: "Staff PIN length", value: "4 digits" },
	{ label: "Barcode scanner", value: "Connected", tone: "good" as const },
	{ label: "Network & sync status", value: "Online", tone: "good" as const },
	{ label: "Display brightness & sleep schedule", value: "80%" },
];

export default function Settings() {
	return (
		<>
			<Navbar eyebrow="Administrator" title="Settings" subtitle="Kiosk-wide configuration." />

			<Card className="max-w-xl">
				<ul className="flex flex-col divide-y divide-line">
					{SETTINGS.map((s) => (
						<li key={s.label} className="flex items-center justify-between py-3.5 text-sm">
							<span className="text-ink">{s.label}</span>
							{s.tone === "good" ? (
								<span className="rounded-full bg-good-tint px-2.5 py-0.5 text-[11.5px] font-medium text-good">
									{s.value}
								</span>
							) : (
								<span className="font-mono text-[12.5px] text-ink">{s.value}</span>
							)}
						</li>
					))}
				</ul>
				<p className="mt-5 border-t border-line pt-4 text-xs text-muted">
					These settings are read-only in this demo. Device-level changes (calibration, overrides) are
					handled in the kiosk&rsquo;s own Staff Console, not here.
				</p>
			</Card>
		</>
	);
}
