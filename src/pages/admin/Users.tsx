import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import { searchPatients } from "../../services/patient";
import { calculateAge, patientFullName } from "../../utils/helpers";
import type { Patient } from "../../types/Patient";

export default function Users() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Patient[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const handle = setTimeout(() => {
			searchPatients(query)
				.then((data) => {
					if (!cancelled) setResults(data);
				})
				.catch((err) => {
					if (!cancelled) setError(err instanceof Error ? err.message : "Could not load users.");
				});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [query]);

	return (
		<>
			<Navbar eyebrow="Administrator" title="Users" subtitle="All registered patient accounts." />

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

				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<thead>
							<tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
								<th className="px-3 py-2 font-semibold">Name</th>
								<th className="px-3 py-2 font-semibold">Age</th>
								<th className="px-3 py-2 font-semibold">Contact</th>
								<th className="px-3 py-2 font-semibold">Barcode</th>
								<th className="px-3 py-2 font-semibold">Registered</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-line">
							{results.map((p) => (
								<tr key={p.patient_id}>
									<td className="whitespace-nowrap px-3 py-3 font-medium text-ink">{patientFullName(p)}</td>
									<td className="whitespace-nowrap px-3 py-3 text-ink">{calculateAge(p.birthdate)}</td>
									<td className="whitespace-nowrap px-3 py-3 text-muted">{p.contact_number}</td>
									<td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-ink">#{p.identification_number}</td>
									<td className="whitespace-nowrap px-3 py-3 text-muted">
										{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</>
	);
}
