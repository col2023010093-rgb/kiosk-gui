import Navbar from "../../components/Navbar";
import { RecentMeasurementsTable } from "../../components/RecentMeasurementsTable";

export default function HealthRecords() {
	return (
		<>
			<Navbar eyebrow="Records" title="Health Records" subtitle="Every screening you've completed at the kiosk." />
			<RecentMeasurementsTable />
		</>
	);
}
