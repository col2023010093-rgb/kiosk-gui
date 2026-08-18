import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME_ROUTE } from "../../utils/constants";

export default function Login() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!email || !password) {
			setError("Enter both email and password.");
			return;
		}

		setLoading(true);
		let result;
		try {
			// Shared login form for all roles — there's no separate staff/admin
			// entry point yet, so we route based on whatever role comes back.
			result = await login(email.trim(), password);
		} catch {
			setError("Could not sign in. Please try again.");
			return;
		} finally {
			setLoading(false);
		}

		if (!result.success) {
			setError(result.error ?? "Sign in failed. Check your email and password.");
			return;
		}

		navigate(ROLE_HOME_ROUTE[result.role ?? "user"]);
	}

	return (
		<AuthLayout
			eyebrow="Patient Authentication"
			title="Welcome back"
			subtitle="Sign in to view your health records and recommendations."
		>
			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<Input
					label="Email"
					type="email"
					placeholder="you@example.com"
					icon={<Mail className="h-4.5 w-4.5" />}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					autoComplete="username"
				/>
				<Input
					label="Password"
					type="password"
					placeholder="••••••••"
					icon={<Lock className="h-4.5 w-4.5" />}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
				/>

				<div className="flex items-center justify-end text-[13px]">
					<Link to="/forgot-password" className="font-medium text-accent hover:text-accent-deep">
						Forgot password?
					</Link>
				</div>

				{error && <p className="text-[13px] text-bad">{error}</p>}

				<Button type="submit" fullWidth loading={loading}>
					{loading ? "Signing in…" : "Sign In"}
				</Button>

				<p className="text-center text-[13px] text-muted">
					Don&rsquo;t have an account?{" "}
					<Link to="/register" className="font-medium text-accent hover:text-accent-deep">
						Register
					</Link>
				</p>
			</form>
		</AuthLayout>
	);
}
