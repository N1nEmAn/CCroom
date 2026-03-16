"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface SessionSummary {
  id: string;
  runtime: string;
  entityId?: string;
  type: string;
  title?: string;
  lastActiveAt?: string;
  lastActiveMs?: number;
  status?: string;
  usage?: {
    messageCount?: number;
    totalTokens?: number;
  };
}

const RUNTIME_LABELS: Record<string, string> = {
  openclaw: "OpenClaw",
  claude: "Claude Code",
  codex: "Codex",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  idle: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  offline: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  error: "bg-red-500/20 text-red-300 border-red-500/30",
};

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

const RUNTIME_OPTIONS = ["all", "openclaw", "claude", "codex"] as const;

function SessionsContent() {
  const searchParams = useSearchParams();
  const runtimeFilter = searchParams.get("runtime") ?? "all";
  const entityFilter = searchParams.get("entity") ?? "";

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeTab, setRuntimeTab] = useState(runtimeFilter);
  const { t } = useI18n();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (runtimeTab && runtimeTab !== "all") params.set("runtime", runtimeTab);
    if (entityFilter) params.set("entityId", entityFilter);
    const qs = params.toString();
    fetch(`/api/sessions${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [runtimeTab, entityFilter]);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("nav.sessions")}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {loading ? t("common.loading") : `${sessions.length} 条会话`}
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition"
        >
          {t("common.backHome")}
        </Link>
      </div>

      {/* Runtime filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {RUNTIME_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRuntimeTab(r)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              runtimeTab === r
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
            }`}
          >
            {r === "all" ? "全部" : (RUNTIME_LABELS[r] ?? r)}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 mb-4">{t("common.loadError")}: {error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[var(--text-muted)]">{t("common.loading")}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[var(--text-muted)]">暂无会话</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={`${s.runtime}:${s.id}`}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] transition"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] shrink-0">
                    {RUNTIME_LABELS[s.runtime] ?? s.runtime}
                  </span>
                  {s.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[s.status] ?? STATUS_COLOR.offline}`}>
                      {s.status}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-[var(--text)]">
                    {s.title || s.id}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
                  {s.usage?.messageCount != null && (
                    <span>{s.usage.messageCount} 条消息</span>
                  )}
                  {s.usage?.totalTokens != null && (
                    <span>{(s.usage.totalTokens / 1000).toFixed(1)}k tokens</span>
                  )}
                  <span>{formatTimeAgo(s.lastActiveAt)}</span>
                </div>
              </div>
              {s.entityId && (
                <div className="mt-1 text-xs text-[var(--text-muted)] truncate">
                  {decodeURIComponent(s.entityId)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function SessionsPage() {
  return (
    <Suspense>
      <SessionsContent />
    </Suspense>
  );
}
