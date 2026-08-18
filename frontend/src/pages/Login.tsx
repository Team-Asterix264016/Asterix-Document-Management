import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, ReceiptText, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export function Login() {
  const { login, token, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid username or password"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ReceiptText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Asterix A-BAJA 2027</p>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Bill Management</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <div className="mb-4">
            <label className="field-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="mb-5">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-sm border border-status-rejected/30 bg-status-rejectedSoft px-3 py-2 text-sm text-status-rejected animate-fade-up">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Signing in…" : "Sign in"}
            {!isLoading && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-400 opacity-80">
          Crafted with <Heart className="h-3 w-3 fill-accent text-accent" /> by Arya & Rithvin
        </div>
      </div>
    </div>
  );
}
