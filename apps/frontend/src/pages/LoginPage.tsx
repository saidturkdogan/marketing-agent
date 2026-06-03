import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";
import { useAuthStore } from "../stores/authStore";
import { Sparkles } from "lucide-react";

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
      navigate("/chat", { replace: true });
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Marketing Agent</h1>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center">
          {isRegister ? "Create account" : "Welcome back"}
        </h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          {isRegister ? "Start creating AI-powered marketing content" : "Sign in to your account to continue"}
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
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
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}