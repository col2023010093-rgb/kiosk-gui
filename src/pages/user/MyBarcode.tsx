import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { useAuth } from "../../hooks/useAuth";
import { getMyBarcode } from "../../services/auth";

// Digital membership card — the barcode itself only ever leaves the DB via
// get_my_barcode() (SECURITY DEFINER, hardcoded to auth.uid()), so this page
// always shows the signed-in user's own code and nothing else.
export default function MyBarcode() {
	const { user } = useAuth();
	const [barcodeId, setBarcodeId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		getMyBarcode()
			.then((value) => {
				if (!cancelled) setBarcodeId(value);
			})
			.catch(() => {
				if (!cancelled) setError("Couldn't load your barcode. Please try again.");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<>
			<Navbar eyebrow="Member Card" title="My Barcode" subtitle="Scan this at any kiosk to sign in instantly." />
			<div className="mx-auto max-w-sm">
				<Card className="flex flex-col items-center text-center">
					<span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-xl font-bold text-primary-deep">
						{user?.avatarInitials ?? "?"}
					</span>
					<p className="mt-3 text-base font-bold text-ink">{user?.fullName}</p>
					<p className="text-sm text-muted">{user?.email}</p>

					<div className="mt-6 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white p-6">
						{loading ? (
							<p className="py-10 text-sm text-muted">Loading your barcode…</p>
						) : error || !barcodeId ? (
							<p className="py-10 text-sm text-bad">{error ?? "No barcode is set up for this account yet."}</p>
						) : (
							<>
								<QRCodeSVG value={barcodeId} size={180} level="M" marginSize={0} />
								<p className="font-mono text-[12.5px] tracking-wide text-muted">{barcodeId}</p>
							</>
						)}
					</div>

					<div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-tint/50 px-3 py-2 text-[12.5px] font-medium text-accent-deep">
						<Smartphone className="h-4 w-4 shrink-0" />
						Raise your screen brightness for the fastest scan.
					</div>
				</Card>
			</div>
		</>
	);
}