import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, User, Phone, MapPin, ScanLine, Calendar, Mail } from "lucide-react";
import Navbar from "../../components/Navbar";
import Card from "../../components/Card";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { registerPatient } from "../../services/patient";
import { patientFullName } from "../../utils/helpers";
import type { PatientType, Sex } from "../../types/Patient";

interface RegisterPatientFormValues {
	firstName: string;
	lastName: string;
	patientType: PatientType;
	birthdate: string;
	sex: Sex;
	contactNumber: string;
	address: string;
	identificationNumber: string;
	email: string;
}

export default function RegisterPatient() {
	const [justRegistered, setJustRegistered] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<RegisterPatientFormValues>({ defaultValues: { sex: "female", patientType: "student" } });

	async function onSubmit(values: RegisterPatientFormValues) {
		setError(null);
		try {
			const patient = await registerPatient({
				firstName: values.firstName,
				lastName: values.lastName,
				email: values.email.trim().toLowerCase(),
				patientType: values.patientType,
				sex: values.sex,
				birthdate: values.birthdate,
				contactNumber: values.contactNumber,
				address: values.address,
				identificationNumber: values.identificationNumber,
			});
			setJustRegistered(patientFullName(patient));
			reset();
			setTimeout(() => setJustRegistered(null), 4000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not register patient.");
		}
	}

	return (
		<>
			<Navbar eyebrow="Clinic Staff" title="Register Patient" subtitle="Add a new patient to the kiosk system." />

			{justRegistered && (
				<div className="mb-5 flex items-center gap-2 rounded-xl border border-good-tint bg-good-tint px-4 py-3 text-sm font-medium text-good">
					<CheckCircle2 className="h-4 w-4" />
					{justRegistered} was registered successfully.
				</div>
			)}
			{error && (
				<div className="mb-5 rounded-xl border border-bad/20 bg-bad-tint px-4 py-3 text-sm font-medium text-bad">
					{error}
				</div>
			)}

			<Card className="max-w-2xl">
				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-3">
						<Input
							label="First Name"
							icon={<User className="h-4 w-4" />}
							error={errors.firstName?.message}
							{...register("firstName", { required: "First name is required" })}
						/>
						<Input
							label="Last Name"
							icon={<User className="h-4 w-4" />}
							error={errors.lastName?.message}
							{...register("lastName", { required: "Last name is required" })}
						/>
					</div>

					<Input
						label="Email"
						type="email"
						icon={<Mail className="h-4 w-4" />}
						error={errors.email?.message}
						{...register("email", { required: "Email is required" })}
					/>

					<div className="grid grid-cols-2 gap-3">
						<Input
							label="Birthdate"
							type="date"
							icon={<Calendar className="h-4 w-4" />}
							error={errors.birthdate?.message}
							{...register("birthdate", { required: "Required" })}
						/>
						<label className="flex flex-col gap-1.5">
							<span className="text-[13px] font-medium text-ink">Sex</span>
							<select
								className="h-[52px] w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
								{...register("sex", { required: true })}
							>
								<option value="female">Female</option>
								<option value="male">Male</option>
							</select>
						</label>
					</div>

					<label className="flex flex-col gap-1.5">
						<span className="text-[13px] font-medium text-ink">Patient Type</span>
						<select
							className="h-[52px] w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
							{...register("patientType", { required: true })}
						>
							<option value="student">Student</option>
							<option value="faculty">Faculty</option>
							<option value="staff">Staff</option>
						</select>
					</label>

					<Input
						label="Contact Number"
						icon={<Phone className="h-4 w-4" />}
						error={errors.contactNumber?.message}
						{...register("contactNumber", { required: "Required" })}
					/>
					<Input
						label="Address"
						icon={<MapPin className="h-4 w-4" />}
						error={errors.address?.message}
						{...register("address", { required: "Required" })}
					/>
					<Input
						label="Barcode / ID Number"
						icon={<ScanLine className="h-4 w-4" />}
						error={errors.identificationNumber?.message}
						{...register("identificationNumber", { required: "Required" })}
					/>

					<Button type="submit" fullWidth loading={isSubmitting}>
						{isSubmitting ? "Registering..." : "Register Patient"}
					</Button>
				</form>
			</Card>
		</>
	);
}
