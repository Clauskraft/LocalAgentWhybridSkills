import { memo, useCallback, useEffect, useMemo, useState } from "react";

type RomaHealth = { status: string; version: string; roma_version?: string | null; roma_available?: boolean };
type WidgetDcToolList = { tools?: Array<{ name?: string }>; count?: number };

export const RomaPlanner = memo(function RomaPlanner(props: { onBack?: () => void }) {
  const [health, setHealth] = useState<RomaHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [wdcCount, setWdcCount] = useState<number | null>(null);
  const [wdcError, setWdcError] = useState<string | null>(null);
  const [wdcBusy, setWdcBusy] = useState(false);
  const [wdcPing, setWdcPing] = useState<unknown>(null);
  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState<"react" | "cot" | "code_act">("react");
  const [agentReach, setAgentReach] = useState("local");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const romaApi = useMemo(() => (window as any).electronAPI?.roma ?? (window as any).sca01?.roma, []);
  const widgetdcApi = useMemo(() => (window as any).electronAPI?.widgetdc ?? (window as any).sca01?.widgetdc, []);

  const refreshHealth = useCallback(async () => {
    setHealthError(null);
    try {
      const h = (await romaApi?.health?.()) as RomaHealth;
      setHealth(h);
    } catch (e) {
      setHealth(null);
      setHealthError(e instanceof Error ? e.message : "roma_health_failed");
    }
  }, [romaApi]);

  const refreshWidgetdc = useCallback(async () => {
    setWdcError(null);
    setWdcBusy(true);
    try {
      const res = (await widgetdcApi?.listTools?.()) as WidgetDcToolList;
      const count = typeof res?.count === "number" ? res.count : Array.isArray(res?.tools) ? res.tools.length : 0;
      setWdcCount(count);
    } catch (e) {
      setWdcCount(null);
      setWdcError(e instanceof Error ? e.message : "widgetdc_tools_failed");
    } finally {
      setWdcBusy(false);
    }
  }, [widgetdcApi]);

  useEffect(() => {
    void refreshHealth();
    void refreshWidgetdc();
  }, [refreshHealth]);

  const canPlan = !!health?.roma_available;

  const onPlan = useCallback(async () => {
    setError(null);
    setResult(null);
    const g = goal.trim();
    if (!g) return;
    setBusy(true);
    try {
      const res = await romaApi?.plan?.({
        goal: g,
        strategy,
        context: { agent_reach: agentReach }
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "roma_plan_failed");
    } finally {
      setBusy(false);
    }
  }, [goal, romaApi, strategy]);

  const onWidgetdcPing = useCallback(async () => {
    setWdcError(null);
    setWdcPing(null);
    setWdcBusy(true);
    try {
      const res = await widgetdcApi?.callTool?.({ tool: "ping", payload: {} });
      setWdcPing(res);
    } catch (e) {
      setWdcError(e instanceof Error ? e.message : "widgetdc_call_failed");
    } finally {
      setWdcBusy(false);
    }
  }, [widgetdcApi]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-primary">
      <header className="flex-shrink-0 px-6 py-4 border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {props.onBack ? (
              <button
                onClick={props.onBack}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                title="Tilbage"
              >
                ←
              </button>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-text-primary truncate">🧭 ROMA Planner</h1>
              <p className="text-sm text-text-muted mt-0.5">
                Brug ROMA bridge til hierarkisk planlægning (ReAct/CoT/CodeAct).
              </p>
            </div>
          </div>

          <button onClick={() => void refreshHealth()} className="btn btn-secondary" type="button">
            Opdatér status
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        <section className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">
              <div className="text-text-muted">WidgetDC MCP (HTTP)</div>
              <div className="text-text-primary font-semibold">
                {wdcCount === null ? "unknown" : `${wdcCount} tools`}
              </div>
              {wdcError ? <div className="text-sm text-red-400 mt-1">{wdcError}</div> : null}
            </div>
            <div className="flex gap-2">
              <button onClick={() => void refreshWidgetdc()} className="btn btn-secondary" type="button" disabled={wdcBusy}>
                Opdatér tools
              </button>
              <button onClick={() => void onWidgetdcPing()} className="btn btn-primary" type="button" disabled={wdcBusy}>
                Ping
              </button>
            </div>
          </div>
          {wdcPing ? (
            <pre className="text-xs overflow-auto bg-bg-tertiary/50 border border-border-primary rounded-lg p-3 mt-3 max-h-[220px]">
              {JSON.stringify(wdcPing, null, 2)}
            </pre>
          ) : null}
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="text-text-muted">ROMA bridge status</div>
              {health ? (
                <div className="text-text-primary font-semibold">
                  {health.status} · bridge v{health.version} · roma {health.roma_version ?? "—"} ·{" "}
                  {health.roma_available ? "available" : "NOT available"}
                </div>
              ) : (
                <div className="text-text-primary font-semibold">unknown</div>
              )}
              {healthError ? <div className="text-sm text-red-400 mt-1">{healthError}</div> : null}
            </div>
          </div>

          {!canPlan ? (
            <div className="mt-3 text-sm text-warning">
              ROMA er ikke tilgængelig på din `roma-bridge` lige nu (dependency mangler). Når `roma_available=true`, kan du planlægge herfra.
            </div>
          ) : null}
        </section>

        <section className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <label className="block">
              <div className="mb-1 text-sm text-slate-300">Goal</div>
              <textarea
                className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                rows={3}
                placeholder="Beskriv målet…"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm text-slate-300">Strategy</div>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as "react" | "cot" | "code_act")}
              >
                <option value="react">ReAct</option>
                <option value="cot">CoT</option>
                <option value="code_act">CodeAct</option>
              </select>
            </label>

            <label className="block mt-2">
              <div className="mb-1 text-sm text-slate-300">Context / Agent Reach</div>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={agentReach}
                onChange={(e) => setAgentReach(e.target.value)}
              >
                <option value="local">Local Agent (Default)</option>
                <option value="wdc">WidgetDC Mesh</option>
                <option value="ms_power">Microsoft Power Platform (Dot.Corp)</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => void onPlan()} disabled={busy || !goal.trim() || !canPlan} type="button">
              {busy ? "Planlægger…" : "Plan"}
            </button>
            <button className="btn btn-secondary" onClick={() => { setGoal(""); setResult(null); setError(null); }} type="button">
              Ryd
            </button>
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}
        </section>

        <section className="card p-4">
          <div className="text-sm text-text-muted mb-2">Result</div>
          <pre className="text-xs overflow-auto bg-bg-tertiary/50 border border-border-primary rounded-lg p-3 max-h-[420px]">
            {result ? JSON.stringify(result, null, 2) : "—"}
          </pre>
        </section>
      </main>
    </div>
  );
});

