import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, friendlyError } from "../api";

export default function Join({ initialMode = "register" }: { initialMode?: "register" | "login" }) {
  const { code = "" } = useParams();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === "login" || modeParam === "login");
  const [joinCode, setJoinCode] = useState(code.toUpperCase());
  const [course, setCourse] = useState<any>();
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const checkbox = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setJoinCode(code.toUpperCase());
    if (code) {
      api.joinInfo(code).then(setCourse).catch(err => setError(friendlyError(err, "That join code is invalid.")));
    }
  }, [code]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (isLogin) {
      if (!email.trim() || !password) {
        setError("Email and password are required.");
        return;
      }
      setBusy(true);
      try {
        const result = await api.loginStudent(email.trim(), password);
        localStorage.setItem("student_token", result.access_token);
        navigate("/student/courses");
      } catch (err: any) {
        setError(friendlyError(err, "Invalid email or password."));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!joinCode.trim()) {
      setError("Enter a course code.");
      return;
    }
    if (!consent) {
      setError("Please accept the notice to continue");
      checkbox.current?.focus();
      return;
    }
    if (email.trim() && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setBusy(true);
    try {
      const result = email.trim()
        ? await api.registerStudent(email.trim(), password, joinCode.trim())
        : await api.join(joinCode.trim());
      localStorage.setItem("student_token", result.access_token);
      navigate("/student/courses");
    } catch (err: any) {
      const msg = friendlyError(err, "We could not join that course. Check the code and try again.");
      if (msg.toLowerCase().includes("already registered")) {
        setError("This email is already registered. Please log in below.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing">
      <form className="panel form" onSubmit={submit}>
        <div className="page-heading" style={{ marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">Student workspace</p>
            <h1>{isLogin ? "Student login" : "Join course"}</h1>
            <p className="lead">
              {isLogin
                ? "Sign in with your email and password to resume your course and research activity."
                : course
                ? `Joining ${course.name}.`
                : "Enter your course code and credentials to begin."}
            </p>
          </div>
        </div>

        {isLogin ? (
          <>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primary btn-block" disabled={busy}>
              {busy ? "Signing in…" : "Log in"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
            >
              Need to join with a code or create an account? Register / Join
            </button>
          </>
        ) : (
          <>
            <label>
              Course code
              <input
                required
                value={joinCode}
                maxLength={6}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDEF"
              />
            </label>
            <label>
              Email (recommended for returning access)
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </label>
            {email && (
              <label>
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
            )}
            <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontWeight: "normal" }}>
              <input
                ref={checkbox}
                type="checkbox"
                checked={consent}
                onChange={e => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setError("");
                }}
              />
              <span>
                I consent to the data use described in the <a href="/consent" target="_blank" rel="noreferrer">consent notice</a>.
              </span>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn primary btn-block" disabled={busy}>
              {busy ? "Joining…" : email.trim() ? "Register and join" : "Join anonymously"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
            >
              Already registered? Log in to your course
            </button>
          </>
        )}
      </form>
    </main>
  );
}
