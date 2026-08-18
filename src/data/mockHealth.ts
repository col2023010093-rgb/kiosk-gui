// Mock health data for UserDashboard — same pattern as mockPatients.ts.
// Swap for services/measurement.ts + services/patient.ts once the API is wired up.

// Demonstration-only data. Real readings must come from an authorized API.
export type VitalStatus = "normal" | "monitor" | "attention";

export interface VitalCard {
	id: string;
	label: string;
	value: number;
	decimals?: number;
	unit: string;
	secondaryValue?: string; // used for BP "120 / 80" style or "BMI 23.5"
	dateMeasured: string;
	status: VitalStatus;
	trend: "up" | "down" | "steady";
	context: string;
	icon: "heart" | "droplet" | "wind" | "thermometer" | "scale" | "ruler";
}

export const vitalCards: VitalCard[] = [
	{
		id: "heart-rate",
		label: "Heart Rate",
		value: 72,
		unit: "BPM",
		dateMeasured: "Jul 19, 2026",
		status: "normal",
		trend: "steady",
		context: "Latest screening reading",
		icon: "heart",
	},
	{
		id: "blood-pressure",
		label: "Blood Pressure",
		value: 120,
		secondaryValue: "120 / 80",
		unit: "mmHg",
		dateMeasured: "Jul 19, 2026",
		status: "normal",
		trend: "steady",
		context: "Latest screening reading",
		icon: "droplet",
	},
	{
		id: "blood-oxygen",
		label: "Blood Oxygen",
		value: 98,
		unit: "%",
		dateMeasured: "Jul 19, 2026",
		status: "normal",
		trend: "up",
		context: "Latest screening reading",
		icon: "wind",
	},
	{
		id: "temperature",
		label: "Temperature",
		value: 36.7,
		decimals: 1,
		unit: "°C",
		dateMeasured: "Jul 19, 2026",
		status: "normal",
		trend: "steady",
		context: "Latest screening reading",
		icon: "thermometer",
	},
	{
		id: "weight",
		label: "Weight",
		value: 68,
		unit: "kg",
		dateMeasured: "Jul 18, 2026",
		status: "normal",
		trend: "steady",
		context: "Latest screening reading",
		icon: "scale",
	},
	{
		id: "height-bmi",
		label: "Height & BMI",
		value: 170,
		secondaryValue: "BMI 23.5",
		unit: "cm",
		dateMeasured: "Jul 18, 2026",
		status: "normal",
		trend: "down",
		context: "Latest screening reading",
		icon: "ruler",
	},
];

export interface Recommendation {
	id: string;
	title: string;
	reason: string;
	priority: "routine" | "follow-up";
}

export const recommendations: Recommendation[] = [
	{ id: "hydrate", title: "Stay hydrated", reason: "Keep water nearby throughout the day.", priority: "routine" },
	{ id: "exercise", title: "Move regularly", reason: "Aim for activity that fits your routine.", priority: "routine" },
	{ id: "sleep", title: "Protect your sleep", reason: "Keep a consistent wind-down routine.", priority: "routine" },
	{ id: "bp", title: "Continue monitoring", reason: "Review future readings for changes over time.", priority: "follow-up" },
];

export interface Measurement {
	id: string;
	date: string;
	time: string;
	heartRate: string;
	bloodPressure: string;
	spo2: string;
	temperature: string;
	bmi: string;
	status: VitalStatus;
}

export const recentMeasurements: Measurement[] = [
	{
		id: "m-1",
		date: "Jul 19, 2026",
		time: "8:42 AM",
		heartRate: "72 BPM",
		bloodPressure: "120/80",
		spo2: "98%",
		temperature: "36.7°C",
		bmi: "23.5",
		status: "normal",
	},
	{
		id: "m-2",
		date: "Jul 18, 2026",
		time: "7:58 AM",
		heartRate: "75 BPM",
		bloodPressure: "122/81",
		spo2: "97%",
		temperature: "36.6°C",
		bmi: "23.5",
		status: "normal",
	},
	{
		id: "m-3",
		date: "Jul 17, 2026",
		time: "9:10 AM",
		heartRate: "70 BPM",
		bloodPressure: "119/79",
		spo2: "98%",
		temperature: "36.8°C",
		bmi: "23.4",
		status: "normal",
	},
	{
		id: "m-4",
		date: "Jul 16, 2026",
		time: "8:15 AM",
		heartRate: "78 BPM",
		bloodPressure: "128/84",
		spo2: "96%",
		temperature: "36.9°C",
		bmi: "23.5",
		status: "monitor",
	},
	{
		id: "m-5",
		date: "Jul 15, 2026",
		time: "8:30 AM",
		heartRate: "73 BPM",
		bloodPressure: "121/80",
		spo2: "98%",
		temperature: "36.7°C",
		bmi: "23.4",
		status: "normal",
	},
];

export const patientProfile = {
	fullName: "Demo Member",
	age: 34,
	sex: "Male",
	patientId: "Demo record",
	lastVisit: "Jul 12, 2026",
	barcodeId: "",
	avatarInitials: "DM",
};

export const healthScore = {
	score: 92,
	label: "Within usual range",
};

export const healthInsights = [
	"Your recent heart-rate readings appear steady across the available demo records.",
	"Your latest screening values are presented for awareness and should be reviewed over time.",
];
