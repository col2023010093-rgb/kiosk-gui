import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	User,
	Mail,
	Lock,
	Phone,
	MapPin,
	IdCard,
	Calendar,
	GraduationCap,
	Globe,
	Map as MapIcon,
	Building2,
	Home,
	Hash,
	UserRound,
	Users,
	ChevronDown,
} from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { Input } from "@generick/shared";
import { Button } from "@generick/shared";
import Modal from "../../components/Modal";
import { TermsOfUseContent, PrivacyPolicyContent } from "../../components/LegalContent";
import { registerAccount } from "@generick/shared";
import { RAW_PROGRAMS } from "@generick/shared";
import { validateAndNormalizeRegistration } from "@generick/shared";
import {
	regions,
	provinces,
	cities,
	barangays,
	type Region,
	type Province,
	type City,
	type Barangay,
} from "select-philippines-address";

type Sex = "" | "female" | "male";
type PatientType = "student" | "faculty" | "staff";

type SelectOption = { value: string; label: string };

const COURSE_OPTIONS: SelectOption[] = RAW_PROGRAMS.map((p) => ({
	value: p.code,
	label: `${p.code} - ${p.name}`,
}));

const SEX_OPTIONS: SelectOption[] = [
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
];

const PATIENT_TYPE_OPTIONS: SelectOption[] = [
	{ value: "student", label: "Student" },
	{ value: "faculty", label: "Faculty" },
	{ value: "staff", label: "Staff" },
];

// One layout token for every row of fields: one column on narrow screens,
// two from `sm` up, with a single consistent gap.
const ROW = "grid grid-cols-1 gap-5 sm:grid-cols-2";

// Every dropdown in the form goes through this component so it matches the
// text inputs: same height, same font size, same icon position, same chevron.
function FieldSelect({
	label,
	icon,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}: {
	label: string;
	icon?: React.ReactNode;
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	placeholder?: string;
	disabled?: boolean;
}) {
	return (
		<label className="flex flex-col gap-2">
			<span className="text-xl font-medium text-ink">{label}</span>
			<div className="relative">
				{icon && (
					<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
						{icon}
					</span>
				)}
				<select
					value={value}
					disabled={disabled}
					onChange={(e) => onChange(e.target.value)}
					className={`h-16 w-full appearance-none truncate rounded-xl border border-line bg-white ${
						icon ? "pl-14" : "pl-4"
					} pr-14 text-xl text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-accent-tint/20 disabled:text-muted ${
						value === "" ? "text-muted" : ""
					}`}
				>
					{placeholder && (
						<option value="" disabled>
							{placeholder}
						</option>
					)}
					{options.map((opt) => (
						<option key={opt.value} value={opt.value} className="text-ink">
							{opt.label}
						</option>
					))}
				</select>
				<ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted" />
			</div>
		</label>
	);
}

export default function Register() {
	const navigate = useNavigate();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [birthdate, setBirthdate] = useState("");
	const [sex, setSex] = useState<Sex>("");
	const [patientType, setPatientType] = useState<PatientType>("student");
	const [course, setCourse] = useState("");
	const [department, setDepartment] = useState("");
	const [contactNumber, setContactNumber] = useState("");
	const [lsbIdNumber, setLsbIdNumber] = useState("");

	// Address — Country is fixed for now (this kiosk only serves PH
	// addresses), but kept as a real dropdown per the requirement so a
	// second country can be added later without restructuring the form.
	const [country, setCountry] = useState("Philippines");

	const [regionOptions, setRegionOptions] = useState<Region[]>([]);
	const [provinceOptions, setProvinceOptions] = useState<Province[]>([]);
	const [cityOptions, setCityOptions] = useState<City[]>([]);
	const [barangayOptions, setBarangayOptions] = useState<Barangay[]>([]);

	const [regionCode, setRegionCode] = useState("");
	const [regionName, setRegionName] = useState("");
	const [provinceCode, setProvinceCode] = useState("");
	const [provinceName, setProvinceName] = useState("");
	const [cityCode, setCityCode] = useState("");
	const [cityName, setCityName] = useState("");
	const [barangayCode, setBarangayCode] = useState("");
	const [barangayName, setBarangayName] = useState("");
	const [street, setStreet] = useState("");
	const [houseNumber, setHouseNumber] = useState("");

	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [consentedToHealthData, setConsentedToHealthData] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showTerms, setShowTerms] = useState(false);
	const [showPrivacy, setShowPrivacy] = useState(false);

	// Load regions once on mount.
	useEffect(() => {
		regions().then(setRegionOptions).catch(() => setRegionOptions([]));
	}, []);

	// Region -> Province cascade
	useEffect(() => {
		if (!regionCode) return;
		let cancelled = false;
		provinces(regionCode)
			.then((options) => { if (!cancelled) setProvinceOptions(options); })
			.catch(() => { if (!cancelled) setProvinceOptions([]); });
		return () => { cancelled = true; };
	}, [regionCode]);

	// Province -> City/Municipality cascade
	useEffect(() => {
		if (!provinceCode) return;
		let cancelled = false;
		cities(provinceCode)
			.then((options) => { if (!cancelled) setCityOptions(options); })
			.catch(() => { if (!cancelled) setCityOptions([]); });
		return () => { cancelled = true; };
	}, [provinceCode]);

	// City -> Barangay cascade
	useEffect(() => {
		if (!cityCode) return;
		let cancelled = false;
		barangays(cityCode)
			.then((options) => { if (!cancelled) setBarangayOptions(options); })
			.catch(() => { if (!cancelled) setBarangayOptions([]); });
		return () => { cancelled = true; };
	}, [cityCode]);

	function handleRegionChange(code: string) {
		setRegionCode(code);
		setProvinceOptions([]);
		setRegionName(regionOptions.find((r) => r.region_code === code)?.region_name ?? "");
		// Reset everything downstream so a stale province/city/barangay
		// from the previous region can't be submitted.
		setProvinceCode("");
		setProvinceName("");
		setCityCode("");
		setCityName("");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleProvinceChange(code: string) {
		setProvinceCode(code);
		setCityOptions([]);
		setProvinceName(provinceOptions.find((p) => p.province_code === code)?.province_name ?? "");
		setCityCode("");
		setCityName("");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleCityChange(code: string) {
		setCityCode(code);
		setBarangayOptions([]);
		setCityName(cityOptions.find((c) => c.city_code === code)?.city_name ?? "");
		setBarangayCode("");
		setBarangayName("");
	}

	function handleBarangayChange(code: string) {
		const name = barangayOptions.find((b) => b.brgy_code === code)?.brgy_name ?? "";
		setBarangayCode(code);
		setBarangayName(name);
	}

	function handlePatientTypeChange(value: string) {
		if (value !== "student" && value !== "faculty" && value !== "staff") return;
		setPatientType(value);
		setCourse("");
		setDepartment("");
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (loading) return;
		setError(null);
		if (password !== confirmPassword) {
			setError("Passwords don't match.");
			return;
		}
		if (!regionOptions.some((region) => region.region_code === regionCode) ||
			!provinceOptions.some((province) => province.province_code === provinceCode) ||
			!cityOptions.some((city) => city.city_code === cityCode) ||
			!barangayOptions.some((barangay) => barangay.brgy_code === barangayCode)) {
			setError("Please select a valid complete address.");
			return;
		}
		const validation = validateAndNormalizeRegistration({
			firstName, lastName, email, password, birthdate,
			sex: sex as "female" | "male", patientType, course, department, contactNumber,
			identificationNumber: lsbIdNumber,
			address: { country, region: regionName, province: provinceName || undefined, cityMunicipality: cityName, barangay: barangayName, street, houseNumber },
			agreedToTerms, consentedToHealthData,
		});
		if (!validation.value) {
			setError(validation.error ?? "Please review the information entered.");
			return;
		}

		setLoading(true);
		let result;
		try {
			result = await registerAccount(validation.value);
		} catch {
			setError("Could not create account. Please try again.");
			return;
		} finally {
			setLoading(false);
		}

		if (!result.success) {
			setError(result.error ?? "Could not create account.");
			return;
		}

		navigate("/login");
	}

	const iconClass = "h-7 w-7";

	return (
		<AuthLayout
			eyebrow="Patient Authentication"
			title="Create your account"
			subtitle="Register once — use it here and on the web application."
		>
			{/* The [&_...] selectors scale the shared <Input> (whose source lives in
			    @generick/shared) without editing that package. If its labels still look
			    small, change the label class in the shared Input directly. */}
			<div
				className="register-card w-full max-w-[960px] rounded-[1.25rem] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(11,36,48,0.04),0_12px_32px_rgba(11,36,48,0.06)] sm:p-10
					[&_input:not([type=checkbox])]:h-16
					[&_input:not([type=checkbox])]:text-xl
					[&_form>div>label>span:first-child]:text-xl
					[&_div>label>span:first-child]:text-xl"
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					{/* Personal details */}
					<div className={ROW}>
						<Input
							label="First Name"
							placeholder="Juan"
							icon={<User className={iconClass} />}
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							maxLength={80}
						/>
						<Input
							label="Last Name"
							placeholder="Dela Cruz"
							icon={<User className={iconClass} />}
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							maxLength={80}
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Email"
							type="email"
							placeholder="you@example.com"
							icon={<Mail className={iconClass} />}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
							maxLength={254}
						/>
						<Input
							label="Contact Number"
							placeholder="09XXXXXXXXX"
							icon={<Phone className={iconClass} />}
							value={contactNumber}
							onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ""))}
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={20}
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className={iconClass} />}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="new-password"
						/>
						<Input
							label="Confirm Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className={iconClass} />}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
						/>
					</div>

					<div className={ROW}>
						<Input
							label="Birthdate"
							type="date"
							icon={<Calendar className={iconClass} />}
							value={birthdate}
							onChange={(e) => setBirthdate(e.target.value)}
							max={new Date().toISOString().slice(0, 10)}
						/>
						<FieldSelect
							label="Sex"
							icon={<UserRound className={iconClass} />}
							value={sex}
							onChange={(v) => setSex(v as Sex)}
							options={SEX_OPTIONS}
							placeholder="Select sex"
						/>
					</div>

					<div className={ROW}>
						<FieldSelect
							label="I am a..."
							icon={<Users className={iconClass} />}
							value={patientType}
							onChange={handlePatientTypeChange}
							options={PATIENT_TYPE_OPTIONS}
						/>

						{patientType === "student" ? (
							<FieldSelect
								label="Course"
								icon={<GraduationCap className={iconClass} />}
								value={course}
								onChange={setCourse}
								options={COURSE_OPTIONS}
								placeholder="Select course"
							/>
						) : (
							<Input
								label="Department"
								placeholder="Registrar's Office"
								icon={<GraduationCap className={iconClass} />}
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
							/>
						)}
					</div>

					<Input
						label={patientType === "student" ? "LSB ID Number" : "School ID Number"}
						icon={<IdCard className={iconClass} />}
						placeholder={patientType === "student" ? "Type your LSB ID number" : "Type your school ID number"}
						value={lsbIdNumber}
						onChange={(e) => setLsbIdNumber(e.target.value.replace(/\D/g, ""))}
						inputMode="numeric"
						pattern="[0-9]*"
						maxLength={64}
					/>

					{/* Address section */}
					<div className="mt-2 flex flex-col gap-5 border-t border-line pt-8">
						<h2 className="text-3xl font-semibold text-ink">Address</h2>

						<div className={ROW}>
							<FieldSelect
								label="Country"
								icon={<Globe className={iconClass} />}
								value={country}
								onChange={setCountry}
								options={[{ value: "Philippines", label: "Philippines" }]}
								disabled
							/>
							<FieldSelect
								label="Region"
								icon={<MapPin className={iconClass} />}
								value={regionCode}
								onChange={handleRegionChange}
								options={regionOptions.map((r) => ({ value: r.region_code, label: r.region_name }))}
								placeholder="Select region"
							/>
						</div>

						<div className={ROW}>
							<FieldSelect
								label="Province"
								icon={<MapIcon className={iconClass} />}
								value={provinceCode}
								onChange={handleProvinceChange}
								options={provinceOptions.map((p) => ({
									value: p.province_code,
									label: p.province_name,
								}))}
								placeholder={regionCode ? "Select province" : "Select region first"}
								disabled={!regionCode}
							/>
							<FieldSelect
								label="City / Municipality"
								icon={<Building2 className={iconClass} />}
								value={cityCode}
								onChange={handleCityChange}
								options={cityOptions.map((c) => ({ value: c.city_code, label: c.city_name }))}
								placeholder={provinceCode ? "Select city / municipality" : "Select province first"}
								disabled={!provinceCode}
							/>
						</div>

						<div className={ROW}>
							<FieldSelect
								label="Barangay"
								icon={<Home className={iconClass} />}
								value={barangayCode}
								onChange={handleBarangayChange}
								options={barangayOptions.map((b) => ({ value: b.brgy_code, label: b.brgy_name }))}
								placeholder={cityCode ? "Select barangay" : "Select city first"}
								disabled={!cityCode}
							/>
							<Input
								label="House/Building No."
								icon={<Hash className={iconClass} />}
								placeholder="123 / Unit 4B"
								value={houseNumber}
								onChange={(e) => setHouseNumber(e.target.value)}
								maxLength={80}
							/>
						</div>

						<Input
							label="Street"
							icon={<MapPin className={iconClass} />}
							placeholder="Rizal Street"
							value={street}
							onChange={(e) => setStreet(e.target.value)}
							maxLength={160}
						/>
					</div>

					{/* Reserved-height slot so an error appearing doesn't shift the
					    consent box and button below it. */}
					<p role="alert" className="min-h-[1.75rem] text-lg text-red-500">{error}</p>

					<div className="consent-box flex flex-col gap-4 rounded-xl border border-line bg-accent-tint/25 p-5">
						<label className="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								checked={agreedToTerms}
								onChange={(e) => setAgreedToTerms(e.target.checked)}
								required
								className="mt-0.5 h-7 w-7 shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-lg leading-relaxed text-ink">
								I agree to the{" "}
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowTerms(true);
									}}
									className="font-medium text-accent underline underline-offset-2 hover:text-accent-deep"
								>
									Terms of Use
								</button>{" "}
								and{" "}
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setShowPrivacy(true);
									}}
									className="font-medium text-accent underline underline-offset-2 hover:text-accent-deep"
								>
									Privacy Policy
								</button>
								.
							</span>
						</label>

						<label className="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								checked={consentedToHealthData}
								onChange={(e) => setConsentedToHealthData(e.target.checked)}
								required
								className="mt-0.5 h-7 w-7 shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-lg leading-relaxed text-ink">
								I consent to the collection and processing of my health assessment data for this system.
							</span>
						</label>
					</div>

					<Button type="submit" fullWidth loading={loading} disabled={!agreedToTerms || !consentedToHealthData}>
						{loading ? "Creating account…" : "Create Account"}
					</Button>

					<p className="text-center text-lg text-muted">
						Already have an account?{" "}
						<Link to="/login" className="font-medium text-accent hover:text-accent-deep">
							Sign in
						</Link>
					</p>
				</form>
			</div>

			<Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Use">
				<TermsOfUseContent />
			</Modal>
			<Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
				<PrivacyPolicyContent />
			</Modal>
		</AuthLayout>
	);
}