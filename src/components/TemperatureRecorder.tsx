import { useState, type FormEvent } from "react";
import { Thermometer, Loader2 } from "lucide-react";

interface TemperatureRecorderProps {
	onRecord: (celsius: number) => void;
}

// Adjust if your Flask service runs on a different host/port.
// "localhost" works when the kiosk browser runs on the same Pi as the server;
// use the Pi's LAN IP (e.g. "192.168.1.42") if the browser is on another device.
const SENSOR_ENDPOINT = "http://localhost:5000/api/temperature";

export function TemperatureRecorder({ onRecord }: TemperatureRecorderProps) {
	const [value, setValue] = useState("36.7");
	const [justRecorded, setJustRecorded] = useState(false);
	const [reading, setReading] = useState(false);
	const [sensorError, setSensorError] = useState<string | null>(null);

	async function handleReadSensor() {
		setSensorError(null);
		setReading(true);
		try {
			const res = await fetch(SENSOR_ENDPOINT);
			if (!res.ok) throw new Error(`Sensor server returned ${res.status}`);
			const data = await res.json();
			if (typeof data.celsius !== "number") throw new Error("Unexpected response shape");

			setValue(data.celsius.toFixed(1));
			onRecord(data.celsius); // sensor reading is trusted -> record immediately, no extra click
			setJustRecorded(true);
			setTimeout(() => setJustRecorded(false), 1500);
		} catch (err) {
			setSensorError(err instanceof Error ? err.message : "Couldn't reach sensor");
		} finally {
			setReading(false);
		}
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const parsed = parseFloat(value);
		if (Number.isNaN(parsed)) return;

		onRecord(parsed);
		setJustRecorded(true);
		setTimeout(() => setJustRecorded(false), 1500);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:gap-4"
		>
			<div className="flex items-center gap-3">
				<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Thermometer className="h-5 w-5" strokeWidth={2} />
				</span>
				<div>
					<label htmlFor="temp-input" className="text-xs uppercase tracking-[0.2em] text-muted">
						Take your temperature
					</label>
					<div className="mt-1 flex items-baseline gap-1.5">
						<input
							id="temp-input"
							type="number"
							step="0.1"
							inputMode="decimal"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							className="w-20 border-b border-line bg-transparent text-2xl font-bold text-ink outline-none focus:border-primary"
						/>
						<span className="font-mono text-sm text-muted">°C</span>
					</div>
					{sensorError && <p className="mt-1 text-xs text-danger">{sensorError}</p>}
				</div>
			</div>

			<div className="flex gap-2 sm:ml-auto">
				<button
					type="button"
					onClick={handleReadSensor}
					disabled={reading}
					className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-app disabled:opacity-60"
				>
					{reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Thermometer className="h-4 w-4" />}
					{reading ? "Reading…" : justRecorded ? "Recorded ✓" : "Read & Record"}
				</button>

				<button
					type="submit"
					className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
				>
					Record Manually
				</button>
			</div>
		</form>
	);
}