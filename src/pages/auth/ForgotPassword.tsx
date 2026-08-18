import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import AuthLayout from "../../layouts/AuthLayout";
import { requestPasswordReset } from "../../services/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.sent) {
      setError(result.error ?? "Could not send reset link.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle={sent ? "" : "We'll email you a reset link"}
    >
      {sent ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <CheckCircle2 size={36} className="text-good" />
          <p className="text-sm text-muted">Check your email for a link to reset your password.</p>
          <Link to="/login" className="text-accent text-sm font-medium mt-2 hover:text-accent-deep">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <Button type="submit" fullWidth loading={loading}>
            Send Reset Link
          </Button>
          <p className="text-center text-xs text-muted mt-1">
            <Link to="/login" className="text-accent font-medium hover:text-accent-deep">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}