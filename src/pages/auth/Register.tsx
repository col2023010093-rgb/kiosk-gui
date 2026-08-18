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
} from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import { TermsOfUseContent, PrivacyPolicyContent } from "../../components/LegalContent";
import { registerAccount } from "../../services/auth";
import { RAW_PROGRAMS } from "../../data/programs";
import { validateAndNormalizeRegistration } from "../../utils/registrationValidation";
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

const CODE_WIDTH = Math.max(...RAW_PROGRAMS.map((p) => p.code.length));

const COURSE_OPTIONS: SelectOption[] = RAW_PROGRAMS.map((p) => ({
	value: p.code,
	label: `${p.code.padEnd(CODE_WIDTH, "\u00A0")}  ${p.name}`,
}));

// Small styled <select> matching the Sex/Patient-type dropdowns already
// used in this form, so the address section doesn't look bolted on.
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
	placeholder: string;
	disabled?: boolean;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-medium text-ink">{label}</span>
			<div className="relative">
				{icon && (
					<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
						{icon}
					</span>
				)}
				<select
					value={value}
					disabled={disabled}
					onChange={(e) => onChange(e.target.value)}
					className={`h-[clamp(2.5rem,5.5dvh,3.25rem)] w-full rounded-xl border border-line bg-white ${
						icon ? "pl-10" : "px-4"
					} pr-4 font-mono text-[clamp(0.8125rem,1.6dvh,0.9375rem)] text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-accent-tint/20 disabled:text-muted`}
				>
					<option value="">{placeholder}</option>
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
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

	return (
		<AuthLayout
			eyebrow="Patient Authentication"
			title="Create your account"
			subtitle="Register once — use it here and on the web application."
		>
			<div className="register-card w-full max-w-[720px] rounded-[1.25rem] border border-line bg-white p-[clamp(0.875rem,2.4dvh,2rem)] shadow-[0_1px_2px_rgba(11,36,48,0.04),0_12px_32px_rgba(11,36,48,0.06)]">
				<form onSubmit={handleSubmit} className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<Input
							label="First Name"
							placeholder="Juan"
							icon={<User className="h-4.5 w-4.5" />}
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							maxLength={80}
						/>
						<Input
							label="Last Name"
							placeholder="Dela Cruz"
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							maxLength={80}
						/>
					</div>

					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<Input
							label="Email"
							type="email"
							placeholder="you@example.com"
							icon={<Mail className="h-4.5 w-4.5" />}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
							maxLength={254}
						/>
						<Input
							label="Contact Number"
							placeholder="09XXXXXXXXX"
							icon={<Phone className="h-4.5 w-4.5" />}
							value={contactNumber}
							onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ""))}
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={20}
						/>
					</div>

					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<Input
							label="Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className="h-4.5 w-4.5" />}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="new-password"
						/>
						<Input
							label="Confirm Password"
							type="password"
							placeholder="••••••••"
							icon={<Lock className="h-4.5 w-4.5" />}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
						/>
					</div>

					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<Input
							label="Birthdate"
							type="date"
							icon={<Calendar className="h-4.5 w-4.5" />}
							value={birthdate}
							onChange={(e) => setBirthdate(e.target.value)}
							max={new Date().toISOString().slice(0, 10)}
						/>
						<label className="flex flex-col gap-1">
							<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-medium text-ink">Sex</span>
							<select
								value={sex}
								onChange={(e) => setSex(e.target.value as Sex)}
								className="h-[clamp(2.5rem,5.5dvh,3.25rem)] w-full rounded-xl border border-line bg-white px-4 text-[clamp(0.8125rem,1.6dvh,0.9375rem)] text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
							>
								<option value="" disabled>
									Select sex
								</option>
								<option value="female">Female</option>
								<option value="male">Male</option>
							</select>
						</label>
					</div>

					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<label className="flex flex-col gap-1">
							<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-medium text-ink">
								I am a...
							</span>
							<select
								value={patientType}
				onChange={(e) => handlePatientTypeChange(e.target.value)}
								className="h-[clamp(2.5rem,5.5dvh,3.25rem)] w-full rounded-xl border border-line bg-white px-4 text-[clamp(0.8125rem,1.6dvh,0.9375rem)] text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
							>
								<option value="student">Student</option>
								<option value="faculty">Faculty</option>
								<option value="staff">Staff</option>
							</select>
						</label>

						{patientType === "student" ? (
							<FieldSelect
								label="Course"
								icon={<GraduationCap className="h-4.5 w-4.5" />}
								value={course}
								onChange={setCourse}
								options={COURSE_OPTIONS}
								placeholder="Select course"
							/>
						) : (
							<Input
								label="Department"
								placeholder="Registrar's Office"
								icon={<GraduationCap className="h-4.5 w-4.5" />}
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
							/>
						)}
					</div>

					<Input
							label={patientType === "student" ? "LSB ID Number" : "School ID Number"}
							icon={<IdCard className="h-4.5 w-4.5" />}
							placeholder={patientType === "student" ? "Type your LSB ID number" : "Type your school ID number"}
							value={lsbIdNumber}
							onChange={(e) => setLsbIdNumber(e.target.value.replace(/\D/g, ""))}
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={64}
						/>

					{/* Address section */}
					<div className="flex flex-col gap-[clamp(0.5rem,1.4dvh,0.875rem)]">
						<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-semibold text-ink">
							Address
						</span>

						<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
							<FieldSelect
								label="Country"
								icon={<Globe className="h-4.5 w-4.5" />}
								value={country}
								onChange={setCountry}
								options={[{ value: "Philippines", label: "Philippines" }]}
								placeholder="Select country"
								disabled
							/>
							<FieldSelect
								label="Region"
								icon={<MapPin className="h-4.5 w-4.5" />}
								value={regionCode}
								onChange={handleRegionChange}
								options={regionOptions.map((r) => ({ value: r.region_code, label: r.region_name }))}
								placeholder="Select region"
							/>
						</div>

						<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
							<FieldSelect
								label="Province"
								icon={<MapIcon className="h-4.5 w-4.5" />}
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
								icon={<Building2 className="h-4.5 w-4.5" />}
								value={cityCode}
								onChange={handleCityChange}
								options={cityOptions.map((c) => ({ value: c.city_code, label: c.city_name }))}
								placeholder={provinceCode ? "Select city / municipality" : "Select province first"}
								disabled={!provinceCode}
							/>
						</div>

						<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
							<FieldSelect
								label="Barangay"
								icon={<Home className="h-4.5 w-4.5" />}
								value={barangayCode}
								onChange={handleBarangayChange}
								options={barangayOptions.map((b) => ({ value: b.brgy_code, label: b.brgy_name }))}
								placeholder={cityCode ? "Select barangay" : "Select city first"}
								disabled={!cityCode}
							/>
							<Input
								label="House/Building No."
								icon={<Hash className="h-4.5 w-4.5" />}
								placeholder="123 / Unit 4B"
								value={houseNumber}
								onChange={(e) => setHouseNumber(e.target.value)}
								maxLength={80}
							/>
						</div>

						<Input
							label="Street"
							icon={<MapPin className="h-4.5 w-4.5" />}
							placeholder="Rizal Street"
							value={street}
							onChange={(e) => setStreet(e.target.value)}
							maxLength={160}
						/>
					</div>

					{/* Reserved-height slot so an error appearing doesn't push the button
					    out of the viewport on the shortest kiosk screens. */}
					<p className="min-h-[1.1em] text-[clamp(0.6875rem,1.4dvh,0.8125rem)] text-red-500">{error}</p>

					<div className="consent-box flex flex-col gap-[clamp(0.375rem,1dvh,0.75rem)] rounded-xl border border-line bg-accent-tint/25 p-[clamp(0.5rem,1.4dvh,1rem)]">
						<label className="flex cursor-pointer items-start gap-3">
							<input
								type="checkbox"
								checked={agreedToTerms}
								onChange={(e) => setAgreedToTerms(e.target.checked)}
								required
								className="mt-0.5 h-[clamp(1.25rem,3dvh,1.5rem)] w-[clamp(1.25rem,3dvh,1.5rem)] shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-[clamp(0.75rem,1.5dvh,0.84375rem)] leading-snug text-ink">
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

						<label className="flex cursor-pointer items-start gap-3">
							<input
								type="checkbox"
								checked={consentedToHealthData}
								onChange={(e) => setConsentedToHealthData(e.target.checked)}
								required
								className="mt-0.5 h-[clamp(1.25rem,3dvh,1.5rem)] w-[clamp(1.25rem,3dvh,1.5rem)] shrink-0 rounded border-line text-accent focus:ring-2 focus:ring-accent/30"
							/>
							<span className="text-[clamp(0.75rem,1.5dvh,0.84375rem)] leading-snug text-ink">
								I consent to the collection and processing of my health assessment data for this system.
							</span>
						</label>
					</div>

					<Button type="submit" fullWidth loading={loading} disabled={!agreedToTerms || !consentedToHealthData}>
						{loading ? "Creating account…" : "Create Account"}
					</Button>

					<p className="text-center text-[clamp(0.75rem,1.5dvh,0.8125rem)] text-muted">
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
