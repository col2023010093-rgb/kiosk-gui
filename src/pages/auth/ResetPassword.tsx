import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, TriangleAlert } from "lucide-react";
import { Input, Button, Toast, hasRecoverySession, updatePassword, type ToastMessage } from "@generick/shared";

type LanguageCode = "en" | "es" | "tl";

const SIGN_IN_ROUTE = "/login";
const MIN_PASSWORD_LENGTH = 8;
const TOAST_AUTO_DISMISS_MS = 5000;
const SESSION_WAIT_MS = 2500;

const FIELD_FORMAT =
  "[&_input:not([type=checkbox])]:h-14 [&_input:not([type=checkbox])]:text-lg [&_label]:text-lg! [&_input:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_white_inset]";
const ICON_CLASS = "h-6 w-6";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "tl", label: "TL" },
];

const STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    eyebrow: "USER AUTHENTICATION / RECOVERY",
    title: "Choose a New Password",
    subtitle: "Enter a new password for your account.",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    showPasswords: "Show passwords",
    hidePasswords: "Hide passwords",
    hint: "At least 8 characters.",
    save: "Save New Password",
    saving: "Saving…",
    checking: "Checking your reset link…",
    backToSignIn: "Back to Log In",
    successTitle: "Password updated",
    successBody: "You can now log in with your new password.",
    invalidTitle: "This link is no longer valid",
    invalidBody: "The reset link is invalid or has expired. Please request a new one.",
    requestNew: "Request a new link",
    tooShort: "Password must be at least 8 characters.",
    mismatch: "The two passwords do not match.",
    genericError: "Something went wrong. Please try again.",
    language: "Language",
  },
  es: {
    eyebrow: "AUTENTICACIÓN DE USUARIO / RECUPERACIÓN",
    title: "Elija una nueva contraseña",
    subtitle: "Ingrese una nueva contraseña para su cuenta.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    showPasswords: "Mostrar contraseñas",
    hidePasswords: "Ocultar contraseñas",
    hint: "Al menos 8 caracteres.",
    save: "Guardar nueva contraseña",
    saving: "Guardando…",
    checking: "Verificando su enlace…",
    backToSignIn: "Volver a iniciar sesión",
    successTitle: "Contraseña actualizada",
    successBody: "Ya puede iniciar sesión con su nueva contraseña.",
    invalidTitle: "Este enlace ya no es válido",
    invalidBody: "El enlace es inválido o ha caducado. Solicite uno nuevo.",
    requestNew: "Solicitar un nuevo enlace",
    tooShort: "La contraseña debe tener al menos 8 caracteres.",
    mismatch: "Las dos contraseñas no coinciden.",
    genericError: "Algo salió mal. Inténtelo de nuevo.",
    language: "Idioma",
  },
  tl: {
    eyebrow: "PAGPAPATUNAY NG USER / RECOVERY",
    title: "Pumili ng Bagong Password",
    subtitle: "Maglagay ng bagong password para sa iyong account.",
    newPassword: "Bagong Password",
    confirmPassword: "Kumpirmahin ang Password",
    showPasswords: "Ipakita ang password",
    hidePasswords: "Itago ang password",
    hint: "Hindi bababa sa 8 character.",
    save: "I-save ang Bagong Password",
    saving: "Sine-save…",
    checking: "Sinusuri ang iyong reset link…",
    backToSignIn: "Bumalik sa Log In",
    successTitle: "Na-update na ang password",
    successBody: "Maaari ka nang mag-log in gamit ang bagong password.",
    invalidTitle: "Hindi na valid ang link na ito",
    invalidBody: "Hindi valid o expired na ang reset link. Humiling ng bago.",
    requestNew: "Humiling ng bagong link",
    tooShort: "Dapat hindi bababa sa 8 character ang password.",
    mismatch: "Hindi magkatugma ang dalawang password.",
    genericError: "May nangyaring mali. Pakisubukang muli.",
    language: "Wika",
  },
};

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<LanguageCode>("en");
  const t = (key: string) => STRINGS[language][key] ?? STRINGS.en[key] ?? key;

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(type: ToastMessage["type"], text: string) {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, type, text });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_AUTO_DISMISS_MS);
  }
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    async function check() {
      try {
        if (await hasRecoverySession()) {
          if (!cancelled) setPhase("ready");
          return;
        }
      } catch {
        // fall through to retry / invalid
      }
      if (cancelled) return;
      if (Date.now() - started >= SESSION_WAIT_MS) {
        setPhase("invalid");
        return;
      }
      window.setTimeout(check, 400);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitNewPassword() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setLoading(true);
    try {
      const result = await updatePassword(password);
      if (!result.updated) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setPassword("");
      setConfirm("");
      setPhase("done");
      showToast("success", t("successTitle"));
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submitNewPassword();
  }

  const inputType = showPasswords ? "text" : "password";
  const linkButtonClass =
    "flex h-16 min-h-[64px] items-center gap-2 px-3 text-[22px] font-bold text-[#0F766E] underline underline-offset-4 transition hover:text-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2";

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#F8FAFC] font-body [font-kerning:normal]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00A896] shadow-[0_0_10px_-2px_rgba(0,168,150,0.55)]">
            <Activity className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-extrabold text-[#17212B]">GenErick</div>
            <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#52616B]">
              Patient Health Monitoring Kiosk
            </div>
          </div>
        </div>
        <div role="group" aria-label={t("language")} className="flex items-center gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              aria-pressed={language === l.code}
              className={`h-11 min-w-[48px] rounded-full border-2 px-4 text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]/40 ${
                language === l.code
                  ? "border-[#0D9488] bg-[#F0FDFA] text-[#0F766E]"
                  : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#0284C7]/50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
        <section
          className="box-border flex w-full max-w-[640px] flex-col rounded-3xl border border-[#E2E8F0] bg-white px-6 py-8 sm:px-12 sm:py-12"
          style={{ boxShadow: "0px 10px 25px rgba(0,0,0,0.08)" }}
          aria-labelledby="reset-title"
        >
          <p className="text-[16px] font-extrabold tracking-wide text-[#0D9488] sm:text-[18px]">{t("eyebrow")}</p>

          {phase === "checking" && (
            <p role="status" className="mt-8 text-[22px] font-medium text-[#334155]">
              {t("checking")}
            </p>
          )}

          {phase === "invalid" && (
            <div className="mt-6 flex flex-col gap-6" role="alert">
              <div className="flex items-start gap-4 rounded-2xl border-2 border-[#D97706] bg-[#FFFBEB] p-5">
                <TriangleAlert className="h-8 w-8 shrink-0 text-[#D97706]" aria-hidden="true" />
                <div>
                  <h1 id="reset-title" className="text-[26px] font-bold text-[#0F172A]">
                    {t("invalidTitle")}
                  </h1>
                  <p className="mt-1 text-[20px] font-medium text-[#334155]">{t("invalidBody")}</p>
                </div>
              </div>
              <Button
                type="button"
                fullWidth
                onClick={() => navigate("/forgot-password")}
                style={{ minHeight: 72 }}
                className="rounded-full text-[22px]! font-bold!"
              >
                {t("requestNew")}
              </Button>
              <div className="flex items-center justify-center">
                <button type="button" onClick={() => navigate(SIGN_IN_ROUTE)} className={linkButtonClass}>
                  <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                  {t("backToSignIn")}
                </button>
              </div>
            </div>
          )}

          {phase === "ready" && (
            <>
              <h1 id="reset-title" className="mt-4 text-[36px] font-extrabold leading-tight tracking-tight text-[#0F172A] text-balance sm:text-[44px]">
                {t("title")}
              </h1>
              <p className="mt-3 text-[20px] font-medium leading-snug text-pretty text-[#334155] sm:text-[22px]">{t("subtitle")}</p>

              {error && (
                <p role="alert" className="mt-5 text-[20px] font-bold text-[#7F1D1D]">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className={`mt-6 flex flex-col gap-5 ${FIELD_FORMAT}`}>
                <Input
                  label={t("newPassword")}
                  type={inputType}
                  icon={<Lock className={ICON_CLASS} />}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!error}
                />
                <Input
                  label={t("confirmPassword")}
                  type={inputType}
                  icon={<Lock className={ICON_CLASS} />}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!error}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[18px] font-medium text-[#475569]">{t("hint")}</p>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="flex h-12 items-center gap-2 rounded-full px-3 text-[18px] font-bold text-[#0F766E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40"
                  >
                    {showPasswords ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    {showPasswords ? t("hidePasswords") : t("showPasswords")}
                  </button>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  style={{ minHeight: 80 }}
                  className="rounded-full text-[24px]! font-bold! tracking-wide [&_*]:text-[24px]! [&_*]:font-bold! shadow-[0_2px_10px_-2px_rgba(13,148,136,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-2"
                >
                  {loading ? t("saving") : t("save")}
                </Button>
              </form>
            </>
          )}

          {phase === "done" && (
            <div className="mt-6 flex flex-col gap-6" role="status">
              <div className="flex items-start gap-4 rounded-2xl border-2 border-[#0D9488] bg-[#F0FDFA] p-5">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-[#0D9488]" aria-hidden="true" />
                <div>
                  <h1 id="reset-title" className="text-[26px] font-bold text-[#0F172A]">
                    {t("successTitle")}
                  </h1>
                  <p className="mt-1 text-[20px] font-medium text-[#334155]">{t("successBody")}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <button type="button" onClick={() => navigate(SIGN_IN_ROUTE)} className={linkButtonClass}>
                  <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                  {t("backToSignIn")}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
