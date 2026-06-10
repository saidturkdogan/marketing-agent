import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";
import { useAuthStore } from "../stores/authStore";

function PlinthLogo({ size = 48 }: { size?: number }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="plogologin" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#plogologin)" />
      <path
        d="M16 12h7v24h-7zM23 12h11v14h-11zM28.5 15.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill="white"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = isRegister
        ? await register(email, password, name)
        : await login(email, password);

      setAuth(result.token, result.email, result.name);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <PlinthLogo size={42} />
          <h1 className="text-xl font-bold text-white">Plinth</h1>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center">
          {isRegister ? "Create account" : "Welcome back"}
        </h2>
        <p className="text-neutral-400 text-sm text-center mb-8">
          {isRegister ? "Start creating AI-powered marketing content" : "Sign in to your account to continue"}
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Email</label>
            <input
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}