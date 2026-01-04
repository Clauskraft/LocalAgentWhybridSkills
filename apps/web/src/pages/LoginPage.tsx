import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { getRememberMe, setRememberMe } from "../lib/tokenStore";

function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-slate-300">{props.label}</div>
      <input
        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMeState] = useState<boolean>(() => getRememberMe());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRememberMe(rememberMe);
    await login(email.trim(), password);
    nav("/", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md card p-6">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-slate-400">SCA-01</div>
          <h1 className="text-2xl font-semibold">Web UI</h1>
          <p className="mt-1 text-sm text-slate-300">Login to your cloud sessions.</p>
        </div>

        {error ? <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          <label className="flex items-center gap-2 text-sm text-slate-300 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMeState(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Husk mig
          </label>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            type="submit"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-300">
          No account?{" "}
          <Link className="text-indigo-300 hover:text-indigo-200 underline" to="/register">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}


