"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface RuntimeCapability {
  runtime: string;
  canListEntities: boolean;
  canListSessions: boolean;
  canResume: boolean;
  canFork: boolean;
  canViewTranscript: boolean;
}

interface RuntimeHealth {
  runtime: string;
  status: string;
  version?: string;
  error?: string;
  cliPath?: string;
  details?: Record<string, unknown>;
}

interface RuntimeInfo {
  id: string;
  capabilities: RuntimeCapability;
  health: RuntimeHealth;
}

interface DashboardData {
  runtimeCount: number;
  entityCount: number;
  sessionCount: number;
  activeSessionCount: number;
  recentSessionCount: number;
  runtimes: RuntimeInfo[];
  recentSessions: Array<{
    id: string;
    runtime: string;
    entityId?: string;
    title?: string;
    lastActiveAt?: string;
    status?: string;
  }>;
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

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.offline;
  return <span className={`inline-block w-2 h-2 rounded-full ${color.replace("text-", "bg-")} mr-1.5`} />;
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setDashboard({
          runtimeCount: data.summary?.runtimeCount ?? 0,
          entityCount: data.summary?.entityCount ?? 0,
          sessionCount: data.summary?.sessionCount ?? 0,
          activeSessionCount: data.summary?.activeSessionCount ?? 0,
          recentSessionCount: data.summary?.recentMessageCount ?? 0,
          runtimes: (data.runtimes ?? []).map((rt: {runtime: string; status?: string; [key: string]: unknown}) => ({
            id: rt.runtime,
            capabilities: { runtime: rt.runtime },
            health: rt,
          })),
          recentSessions: data.recentSessions ?? [],
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)]">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{t("common.loadError")}: {error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">CCroom</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          本机 AI 运行时统一控制台
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "运行时", value: dashboard.runtimeCount },
          { label: "实体", value: dashboard.entityCount },
          { label: "会话总数", value: dashboard.sessionCount },
          { label: "近期活跃", value: dashboard.recentSessionCount },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
            <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Runtime cards */}
      <h2 className="text-lg font-semibold mb-4">运行时</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {dashboard.runtimes.map((rt) => (
          <div key={rt.id} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">{RUNTIME_LABELS[rt.id] ?? rt.id}</span>
              <span className={`text-xs flex items-center ${STATUS_COLOR[rt.health?.status ?? "offline"] ?? STATUS_COLOR.offline}`}>
                <StatusDot status={rt.health?.status ?? "offline"} />
                {rt.health?.status ?? "offline"}
              </span>
            </div>
            {rt.health?.version && (
              <div className="text-xs text-[var(--text-muted)] mb-2">v{rt.health?.version}</div>
            )}
            {rt.health?.error && (
              <div className="text-xs text-red-400 mb-2 truncate" title={rt.health?.error}>{rt.health?.error}</div>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(rt.capabilities)
                .filter(([k, v]) => k !== "runtime" && v === true)
                .map(([k]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
                    {k.replace("can", "").replace(/([A-Z])/g, " $1").trim().toLowerCase()}
                  </span>
                ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/sessions?runtime=${rt.id}`}
                className="text-xs px-3 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] transition"
              >
                会话
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      {dashboard.recentSessions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近会话</h2>
            <Link href="/sessions" className="text-xs text-[var(--accent)] hover:underline">全部会话</Link>
          </div>
          <div className="space-y-2">
            {dashboard.recentSessions.map((s) => (
              <div key={`${s.runtime}:${s.id}`} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] shrink-0">
                    {RUNTIME_LABELS[s.runtime] ?? s.runtime}
                  </span>
                  <span className="truncate text-[var(--text)]">{s.title || s.id}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] shrink-0 ml-3">{formatTimeAgo(s.lastActiveAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
