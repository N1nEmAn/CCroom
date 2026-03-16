"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Model {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  input: string[];
}

interface Provider {
  id: string;
  api: string;
  accessMode?: "api_key" | "auth";
  models: Model[];
  usedBy: { id: string; emoji: string; name: string }[];
}

interface ModelStat {
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
  avgResponseMs: number;
}

interface ConfigData {
  providers: Provider[];
  defaults: { model: string; fallbacks: string[] };
}

interface RuntimeModelEntry {
  runtime: string;
  entityId: string;
  entityLabel: string;
  modelId: string;
  provider?: string;
}

interface TestResult {
  ok: boolean;
  text?: string;
  error?: string;
  elapsed: number;
  model?: string;
}

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function formatMs(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
}

const RUNTIME_LABELS: Record<string, string> = {
  openclaw: "OpenClaw",
  claude: "Claude Code",
  codex: "Codex",
};

const RUNTIME_TABS = ["openclaw", "claude", "codex"] as const;
type RuntimeTab = typeof RUNTIME_TABS[number];

export default function ModelsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<RuntimeTab>("openclaw");

  // OpenClaw state
  const [ocData, setOcData] = useState<ConfigData | null>(null);
  const [ocModelStats, setOcModelStats] = useState<Record<string, ModelStat>>({});
  const [ocError, setOcError] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Multi-runtime model state
  const [runtimeModels, setRuntimeModels] = useState<RuntimeModelEntry[]>([]);
  const [runtimeModelsError, setRuntimeModelsError] = useState<string | null>(null);
  const [runtimeModelsLoading, setRuntimeModelsLoading] = useState(true);

  const testModel = async (providerId: string, modelId: string) => {
    const key = `${providerId}/${modelId}`;
    setTesting((prev) => ({ ...prev, [key]: true }));
    setTestResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
    try {
      const resp = await fetch("/api/test-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, modelId }),
      });
      const result = await resp.json();
      setTestResults((prev) => ({ ...prev, [key]: result }));
    } catch (err: unknown) {
      setTestResults((prev) => ({ ...prev, [key]: { ok: false, error: String(err), elapsed: 0 } }));
    } finally {
      setTesting((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/stats-models").then((r) => r.json()),
    ])
      .then(([configData, statsData]) => {
        if (configData.error) setOcError(configData.error);
        else setOcData(configData);
        if (!statsData.error && statsData.models) {
          const map: Record<string, ModelStat> = {};
          for (const m of statsData.models) {
            map[`${m.provider}/${m.modelId}`] = m;
          }
          setOcModelStats(map);
        }
      })
      .catch((e) => setOcError(e.message));

    const saved = localStorage.getItem("modelTestResults");
    if (saved) {
      try { setTestResults(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (Object.keys(testResults).length > 0) {
      localStorage.setItem("modelTestResults", JSON.stringify(testResults));
    }
  }, [testResults]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: Array<{ runtime: string; models: RuntimeModelEntry[] }>) => {
        const entries: RuntimeModelEntry[] = [];
        for (const r of data) {
          if (r.runtime !== "openclaw") {
            entries.push(...(r.models || []));
          }
        }
        setRuntimeModels(entries);
      })
      .catch((e) => setRuntimeModelsError(e.message))
      .finally(() => setRuntimeModelsLoading(false));
  }, []);

  const claudeModels = runtimeModels.filter((m) => m.runtime === "claude");
  const codexModels = runtimeModels.filter((m) => m.runtime === "codex");

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {t("models.title")}
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t("models.totalPrefix")} 3 {t("models.providerCount")}
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm font-medium hover:border-[var(--accent)] transition"
        >
          {t("common.backOverview")}
        </Link>
      </div>

      {/* Runtime tabs */}
      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden mb-6 w-fit">
        {RUNTIME_TABS.map((rt) => (
          <button
            key={rt}
            onClick={() => setTab(rt)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === rt
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : "bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {RUNTIME_LABELS[rt]}
          </button>
        ))}
      </div>

      {/* OpenClaw tab */}
      {tab === "openclaw" && (
        <>
          {ocError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-4">
              {ocError}
            </div>
          )}
          {!ocData && !ocError && (
            <p className="text-[var(--text-muted)]">{t("common.loading")}</p>
          )}
          {ocData && (
            <>
              <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{t("models.defaultModel")}:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-500/30">
                    {ocData.defaults.model}
                  </span>
                </div>
                {ocData.defaults.fallbacks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{t("models.fallbackModels")}:</span>
                    {ocData.defaults.fallbacks.map((f, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-6">
                {ocData.providers.map((provider) => (
                  <div key={provider.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                    <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">{provider.id}</h2>
                        <span className="text-xs text-[var(--text-muted)]">API: {provider.api}</span>
                      </div>
                      {provider.usedBy.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[var(--text-muted)] mr-1">{t("agent.inUse")}</span>
                          {provider.usedBy.map((a) => (
                            <span key={a.id} className="px-2 py-0.5 rounded-full bg-[var(--bg)] text-xs font-medium">
                              {a.emoji} {a.name || a.id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {provider.models.map((m) => {
                        const stat = ocModelStats[`${provider.id}/${m.id}`];
                        const testKey = `${provider.id}/${m.id}`;
                        const isTesting = testing[testKey];
                        const result = testResults[testKey];
                        return (
                          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                            <span className="font-mono text-xs text-[var(--accent)] flex-1 min-w-0 truncate">{m.id}</span>
                            {stat && (
                              <>
                                <span className="text-xs text-blue-400">{formatTokens(stat.inputTokens)} in</span>
                                <span className="text-xs text-emerald-400">{formatTokens(stat.outputTokens)} out</span>
                                <span className="text-xs text-amber-400">{formatMs(stat.avgResponseMs)}</span>
                              </>
                            )}
                            <button
                              onClick={() => testModel(provider.id, m.id)}
                              disabled={isTesting}
                              className="px-2 py-0.5 rounded text-[10px] border border-[var(--border)] hover:border-[var(--accent)] transition disabled:opacity-50"
                            >
                              {isTesting ? "..." : t("models.test") || "Test"}
                            </button>
                            {result && (
                              <span className={`text-[10px] ${result.ok ? "text-green-400" : "text-red-400"}`}>
                                {result.ok ? `OK ${result.elapsed}ms` : result.error?.slice(0, 30)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Claude tab */}
      {tab === "claude" && (
        <div className="space-y-4">
          {runtimeModelsLoading && <p className="text-[var(--text-muted)]">{t("common.loading")}</p>}
          {runtimeModelsError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{runtimeModelsError}</div>
          )}
          {!runtimeModelsLoading && claudeModels.length === 0 && (
            <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center text-[var(--text-muted)] text-sm">
              No Claude model data found. Make sure Claude Code is installed and has session history.
            </div>
          )}
          {claudeModels.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold mb-4">Claude Code — Models in Use</h2>
              <div className="space-y-2">
                {claudeModels.map((m, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <span className="font-mono text-xs text-[var(--accent)] flex-1 min-w-0 truncate">{m.modelId}</span>
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{m.entityLabel}</span>
                    {m.provider && <span className="text-xs text-purple-400">{m.provider}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Codex tab */}
      {tab === "codex" && (
        <div className="space-y-4">
          {runtimeModelsLoading && <p className="text-[var(--text-muted)]">{t("common.loading")}</p>}
          {runtimeModelsError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{runtimeModelsError}</div>
          )}
          {!runtimeModelsLoading && codexModels.length === 0 && (
            <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center text-[var(--text-muted)] text-sm">
              No Codex model data found. Make sure Codex is installed and has thread history.
            </div>
          )}
          {codexModels.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold mb-4">Codex — Models in Use</h2>
              <div className="space-y-2">
                {codexModels.map((m, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <span className="font-mono text-xs text-[var(--accent)] flex-1 min-w-0 truncate">{m.modelId}</span>
                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{m.entityLabel}</span>
                    {m.provider && <span className="text-xs text-orange-400">{m.provider}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
