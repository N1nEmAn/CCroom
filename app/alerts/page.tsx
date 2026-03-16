"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  threshold?: number;
  targetAgents?: string[];
}

interface AlertConfig {
  enabled: boolean;
  receiveAgent: string;
  rules: AlertRule[];
  checkInterval?: number;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
}

interface RuntimeHealth {
  runtime: string;
  status: string;
  version?: string;
  error?: string;
}

const RUNTIME_LABELS: Record<string, string> = {
  openclaw: "OpenClaw",
  claude: "Claude Code",
  codex: "Codex",
};

const STATUS_COLOR: Record<string, string> = {
  online: "text-green-400",
  active: "text-green-400",
  idle: "text-yellow-400",
  offline: "text-[var(--text-muted)]",
  error: "text-red-400",
};

export default function AlertsPage() {
  const { t, locale } = useI18n();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<string[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [checkInterval, setCheckInterval] = useState(10);

  const isEnglish = locale === "en";
  const isTraditionalChinese = locale === "zh-TW";
  const timeLocale = isEnglish ? "en-US" : isTraditionalChinese ? "zh-TW" : "zh-CN";

  useEffect(() => {
    if (config?.checkInterval) setCheckInterval(config.checkInterval);
  }, [config?.checkInterval]);

  useEffect(() => {
    Promise.all([
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/runtimes/health").then((r) => r.json()),
    ])
      .then(([alertData, configData, healthData]) => {
        setConfig(alertData);
        setAgents(configData.agents || []);
        setRuntimeHealth(Array.isArray(healthData) ? healthData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!config?.enabled) return;
    const timer = setInterval(() => {
      fetch("/api/alerts/check", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          if (data.results?.length > 0) {
            setCheckResults(data.results);
            setLastCheckTime(new Date().toLocaleTimeString(timeLocale));
          }
        })
        .catch(console.error);
    }, checkInterval * 60 * 1000);
    return () => clearInterval(timer);
  }, [config?.enabled, checkInterval, timeLocale]);

  const handleManualCheck = () => {
    setChecking(true);
    fetch("/api/alerts/check", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.results?.length > 0) {
          setCheckResults(data.results);
          setLastCheckTime(new Date().toLocaleTimeString(timeLocale));
        }
      })
      .catch(console.error)
      .finally(() => setChecking(false));
  };

  const patchAlert = (patch: Partial<AlertConfig>) => {
    setSaving(true);
    fetch("/api/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((r) => r.json())
      .then((newConfig) => {
        setConfig(newConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)]">{t("common.loading")}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{t("common.loadError")}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("alerts.title") || "Alert Center"}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t("alerts.subtitle") || "Configure system alerts and notifications"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {config.enabled && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{t("alerts.checkInterval") || "Interval"}:</span>
                <select
                  value={checkInterval}
                  onChange={(e) => { setCheckInterval(Number(e.target.value)); patchAlert({ checkInterval: Number(e.target.value) }); }}
                  className="px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                >
                  <option value={5}>5m</option>
                  <option value={10}>10m</option>
                  <option value={30}>30m</option>
                  <option value={60}>1h</option>
                  <option value={120}>2h</option>
                </select>
              </div>
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition disabled:opacity-50"
              >
                {checking ? (isEnglish ? "Checking..." : "检查中...") : (isEnglish ? "Check Now" : "立即检查")}
              </button>
            </>
          )}
          <Link href="/" className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition">
            {t("common.backHome") || "Back"}
          </Link>
        </div>
      </div>

      {/* Runtime health status */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] mb-6">
        <h2 className="text-base font-semibold mb-3">{isEnglish ? "Runtime Health" : "运行时健康状态"}</h2>
        <div className="space-y-2">
          {runtimeHealth.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">{isEnglish ? "No runtime data" : "暂无运行时数据"}</p>
          ) : (
            runtimeHealth.map((h) => (
              <div key={h.runtime} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[h.status]?.replace("text-", "bg-") ?? "bg-gray-400"}`} />
                  <span className="text-sm font-medium">{RUNTIME_LABELS[h.runtime] ?? h.runtime}</span>
                  {h.version && <span className="text-xs text-[var(--text-muted)]">{h.version}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${STATUS_COLOR[h.status] ?? "text-[var(--text-muted)]"}`}>{h.status}</span>
                  {h.error && <span className="text-xs text-red-400 max-w-[200px] truncate" title={h.error}>{h.error}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Check results */}
      {config.enabled && checkResults.length > 0 && (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-yellow-400">
              {isEnglish ? "Alerts Triggered" : "告警触发"} ({checkResults.length})
            </h3>
            {lastCheckTime && <span className="text-xs text-[var(--text-muted)]">{lastCheckTime}</span>}
          </div>
          <ul className="space-y-1">
            {checkResults.map((result, i) => (
              <li key={i} className="text-sm text-yellow-300">• {result}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Master toggle */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("alerts.enableAlerts") || "Enable Alerts"}</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {t("alerts.enableDesc") || "Turn on/off all alert notifications"}
            </p>
          </div>
          <button
            onClick={() => patchAlert({ enabled: !config.enabled })}
            disabled={saving}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              config.enabled ? "bg-green-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                config.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Receive agent */}
      {agents.length > 0 && (
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] mb-6">
          <h2 className="text-base font-semibold mb-3">{isEnglish ? "Receive Alerts Via" : "接收告警的机器人"}</h2>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => patchAlert({ receiveAgent: agent.id })}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  config.receiveAgent === agent.id
                    ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {agent.emoji} {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alert rules */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{isEnglish ? "Alert Rules" : "告警规则"}</h2>
          {saved && <span className="text-xs text-green-400">{isEnglish ? "Saved" : "已保存"}</span>}
        </div>
        <div className="space-y-3">
          {config.rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{rule.name}</div>
              </div>
              <button
                onClick={() => {
                  const rules = config.rules.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r);
                  patchAlert({ rules });
                }}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                  rule.enabled ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
