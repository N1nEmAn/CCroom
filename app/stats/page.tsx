"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface DayStat {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
  avgResponseMs: number;
}

interface StatsData {
  agentId: string;
  daily: DayStat[];
  weekly: DayStat[];
  monthly: DayStat[];
}

interface EntitySummary {
  id: string;
  runtime: string;
  label: string;
  workspacePath?: string;
  sessionCount?: number;
  lastActiveAt?: string;
  usage?: { totalTokens?: number; messageCount?: number };
}

type TimeRange = "daily" | "weekly" | "monthly";

const RUNTIME_LABELS: Record<string, string> = {
  openclaw: "OpenClaw",
  claude: "Claude Code",
  codex: "Codex",
};

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

function BarChart({
  data,
  bars,
  height = 220,
  noDataText,
}: {
  data: DayStat[];
  bars: { key: keyof DayStat; color: string; label: string }[];
  height?: number;
  noDataText: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">
        {noDataText}
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const width = Math.max(600, data.length * (bars.length * 24 + 16) + padding.left + padding.right);
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxVal = 0;
  for (const d of data) {
    for (const b of bars) {
      const v = d[b.key] as number;
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxVal / tickCount) * i));
  const groupWidth = chartW / data.length;
  const barWidth = Math.min(20, (groupWidth - 8) / bars.length);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-[var(--text-muted)]">
        {ticks.map((tick, i) => {
          const y = padding.top + chartH - (tick / maxVal) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" opacity={0.15} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor">
                {formatTokens(tick)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const groupX = padding.left + i * groupWidth;
          return (
            <g key={d.date}>
              {bars.map((b, bi) => {
                const v = d[b.key] as number;
                const barH = (v / maxVal) * chartH;
                const x = groupX + (groupWidth - bars.length * barWidth) / 2 + bi * barWidth;
                const y = padding.top + chartH - barH;
                return (
                  <rect key={b.key} x={x} y={y} width={barWidth - 2} height={barH} fill={b.color} rx={2} opacity={0.85}>
                    <title>{`${b.label}: ${formatTokens(v)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                transform={`rotate(-30, ${groupX + groupWidth / 2}, ${height - padding.bottom + 16})`}
              >
                {d.date}
              </text>
            </g>
          );
        })}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="currentColor" opacity={0.3} />
        <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="currentColor" opacity={0.3} />
      </svg>
    </div>
  );
}

/* ── Entity picker for non-openclaw runtimes ── */
function MultiRuntimeStats() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [runtimeFilter, setRuntimeFilter] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/runtimes/entities")
      .then((r) => r.json())
      .then((data: EntitySummary[]) => setEntities(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const runtimes = Array.from(new Set(entities.map((e) => e.runtime)));
  const filtered = runtimeFilter === "all" ? entities : entities.filter((e) => e.runtime === runtimeFilter);

  if (loading) {
    return <p className="text-[var(--text-muted)] text-sm">Loading entities...</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setRuntimeFilter("all")}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
            runtimeFilter === "all"
              ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
              : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          All
        </button>
        {runtimes.map((rt) => (
          <button
            key={rt}
            onClick={() => setRuntimeFilter(rt)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
              runtimeFilter === rt
                ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {RUNTIME_LABELS[rt] ?? rt}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-8 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center text-[var(--text-muted)] text-sm">
            No entities found.
          </div>
        ) : (
          filtered.map((e) => (
            <div
              key={`${e.runtime}:${e.id}`}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm truncate flex-1">{e.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] shrink-0">
                  {RUNTIME_LABELS[e.runtime] ?? e.runtime}
                </span>
              </div>
              {e.workspacePath && (
                <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{e.workspacePath}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                {e.sessionCount !== undefined && <span>{e.sessionCount} sessions</span>}
                {e.usage?.totalTokens ? <span>{formatTokens(e.usage.totalTokens)} tokens</span> : null}
                {e.usage?.messageCount ? <span>{e.usage.messageCount} msgs</span> : null}
                <span>{formatTimeAgo(e.lastActiveAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── OpenClaw agent stats detail ── */
function StatsDetail({ agentId }: { agentId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("daily");
  const { t } = useI18n();

  useEffect(() => {
    fetch(`/api/stats/${agentId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return <p className="text-[var(--text-muted)]">{t("common.loading")}</p>;
  if (error) return <p className="text-red-400">{t("common.loadError")}: {error}</p>;
  if (!stats) return null;

  const rangeData = stats[range];
  const totalTokens = rangeData.reduce((s, d) => s + d.totalTokens, 0);
  const totalMessages = rangeData.reduce((s, d) => s + d.messageCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/stats" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition">Stats</Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-xs">{agentId}</span>
      </div>
      <div className="flex gap-2 mb-4">
        {(["daily", "weekly", "monthly"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
              range === r
                ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
                : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t(`range.${r}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Tokens</p>
          <p className="text-xl font-bold">{formatTokens(totalTokens)}</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Messages</p>
          <p className="text-xl font-bold">{totalMessages}</p>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold mb-3">Token Usage</h3>
        <BarChart
          data={rangeData}
          bars={[
            { key: "inputTokens", color: "#60a5fa", label: "Input" },
            { key: "outputTokens", color: "#34d399", label: "Output" },
          ]}
          noDataText={t("common.noData")}
        />
      </div>
    </div>
  );
}

/* ── OpenClaw agent picker ── */
function OpenClawAgentPicker() {
  const [agents, setAgents] = useState<{ id: string; name: string; emoji: string; session?: { lastActive: number | null; totalTokens: number; sessionCount: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--text-muted)] text-sm">{t("common.loading")}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/stats?tab=openclaw&agent=${agent.id}`}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] transition block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <h3 className="font-semibold text-sm">{agent.name}</h3>
              <span className="text-xs text-[var(--text-muted)]">{agent.id}</span>
            </div>
          </div>
          {agent.session && (
            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
              <span>{agent.session.sessionCount} sessions</span>
              <span>{formatTokens(agent.session.totalTokens)} tokens</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

type StatsTab = "overview" | "openclaw";

function StatsPageInner() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent") ?? "";
  const tabParam = searchParams.get("tab") ?? "overview";
  const [tab, setTab] = useState<StatsTab>(tabParam === "openclaw" ? "openclaw" : "overview");
  const { t } = useI18n();
  const router = useRouter();

  // If deep-linking to an agent, show openclaw tab
  useEffect(() => {
    if (agentId) setTab("openclaw");
  }, [agentId]);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Cross-runtime usage statistics</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition"
        >
          {t("common.backHome")}
        </Link>
      </div>

      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden mb-6 w-fit">
        {(["overview", "openclaw"] as StatsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "overview") router.push("/stats");
            }}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : "bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t === "overview" ? "All Runtimes" : "OpenClaw"}
          </button>
        ))}
      </div>

      {tab === "overview" && <MultiRuntimeStats />}
      {tab === "openclaw" && !agentId && <OpenClawAgentPicker />}
      {tab === "openclaw" && agentId && <StatsDetail agentId={agentId} />}
    </main>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-[var(--text-muted)]">Loading...</p></div>}>
      <StatsPageInner />
    </Suspense>
  );
}
