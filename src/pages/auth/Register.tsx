import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Phone, MapPin, IdCard, Calendar } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import { TermsOfUseContent, PrivacyPolicyContent } from "../../components/LegalContent";
import { registerAccount } from "../../services/auth";

type Sex = "female" | "male";

export default function Register() {
	const navigate = useNavigate();
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [birthdate, setBirthdate] = useState("");
	const [sex, setSex] = useState<Sex>("female");
	const [contactNumber, setContactNumber] = useState("");
	const [address, setAddress] = useState("");
	const [barcodeNumber, setBarcodeNumber] = useState("");
	const [agreedToTerms, setAgreedToTerms] = useState(false);
	const [consentedToHealthData, setConsentedToHealthData] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showTerms, setShowTerms] = useState(false);
	const [showPrivacy, setShowPrivacy] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!fullName || !email || !password || !birthdate || !contactNumber || !address || !barcodeNumber) {
			setError("Fill in all fields.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords don't match.");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (!agreedToTerms) {
			setError("You must agree to the Terms of Use and Privacy Policy to continue.");
			return;
		}
		if (!consentedToHealthData) {
			setError("You must consent to the collection of your health assessment data to continue.");
			return;
		}

		setLoading(true);
		const result = await registerAccount({
			fullName,
			email,
			password,
			birthdate,
			sex,
			contactNumber,
			address,
			identificationNumber: barcodeNumber,
		});
		setLoading(false);

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
							label="Full Name"
							placeholder="Juan Dela Cruz"
							icon={<User className="h-4.5 w-4.5" />}
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
						/>
						<Input
							label="Email"
							type="email"
							placeholder="you@example.com"
							icon={<Mail className="h-4.5 w-4.5" />}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
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
						/>
						<label className="flex flex-col gap-1">
							<span className="text-[clamp(0.6875rem,1.4dvh,0.8125rem)] font-medium text-ink">Sex</span>
							<select
								value={sex}
								onChange={(e) => setSex(e.target.value as Sex)}
								className="h-[clamp(2.5rem,5.5dvh,3.25rem)] w-full rounded-xl border border-line bg-white px-4 text-[clamp(0.8125rem,1.6dvh,0.9375rem)] text-ink outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
							>
								<option value="female">Female</option>
								<option value="male">Male</option>
							</select>
						</label>
					</div>

					<div className="grid grid-cols-2 gap-[clamp(0.5rem,1.5vw,1rem)]">
						<Input
							label="Contact Number"
							placeholder="09XX XXX XXXX"
							icon={<Phone className="h-4.5 w-4.5" />}
							value={contactNumber}
							onChange={(e) => setContactNumber(e.target.value)}
						/>
						<Input
							label="Address"
							placeholder="Street, Barangay, City"
							icon={<MapPin className="h-4.5 w-4.5" />}
							value={address}
							onChange={(e) => setAddress(e.target.value)}
						/>
					</div>

					<Input
						label="Barcode Number"
						icon={<IdCard className="h-4.5 w-4.5" />}
						placeholder="Type your LSB ID number"
						value={barcodeNumber}
						onChange={(e) => setBarcodeNumber(e.target.value)}
					/>

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