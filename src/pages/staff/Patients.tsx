import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { searchPatients } from "../../services/patient";
import { calculateAge, patientFullName } from "../../utils/helpers";
import type { Patient } from "../../types/Patient";

export default function Patients() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		// Small debounce so we're not firing a query on every keystroke.
		const handle = setTimeout(() => {
			setLoading(true);
			setError(null);
			searchPatients(query)
				.then((data) => {
					if (!cancelled) setResults(data);
				})
				.catch((err) => {
					if (!cancelled) setError(err instanceof Error ? err.message : "Could not search patients.");
				})
				.finally(() => {
					if (!cancelled) setLoading(false);
				});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [query]);

	return (
		<>
			<Navbar
				eyebrow="Clinic Staff"
				title="Patients"
				subtitle="Search registered patients or add a new one."
				actions={
					<Link to="/staff/register">
						<Button><UserPlus className="h-4 w-4" /> Register Patient</Button>
					</Link>
				}
			/>

			<Card>
				<div className="relative mb-5">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by name or barcode number"
						className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
					/>
				</div>

				{error && <p className="pb-4 text-sm text-bad">{error}</p>}

				<div className="flex flex-col divide-y divide-line">
					{results.map((p) => (
						<div key={p.patient_id} className="flex items-center justify-between gap-4 py-4">
							<div>
								<p className="text-sm font-semibold text-ink">{patientFullName(p)}</p>
								<p className="text-xs text-muted">
									{calculateAge(p.birthdate)} yrs · {p.sex === "male" ? "Male" : "Female"} · #{p.identification_number}
								</p>
							</div>
							<button className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep">
								View
								<ChevronRight className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
					{!loading && results.length === 0 && (
						<p className="py-8 text-center text-sm text-muted">No patients match that search.</p>
					)}
				</div>
			</Card>
		</>
	);
}
