import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";
import { useAuthStore } from "../stores/authStore";
import { PlinthLogo } from "../components/PlinthLogo";
import { Loader2 } from "lucide-react";

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
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 overflow-hidden font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <PlinthLogo size={32} />
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Plinth</h1>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">
          {isRegister ? "Create account" : "Welcome back"}
        </h2>
        <p className="text-slate-500 text-xs text-center mb-8">
          {isRegister ? "Start creating AI-powered marketing content" : "Sign in to your account to continue"}
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-semibold animate-fadeIn text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Name</label>
              <input
                type="text"
                className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder-slate-400"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder-slate-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder-slate-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md mt-6"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin text-white" /> Please wait...</>
            ) : isRegister ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
          >
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}