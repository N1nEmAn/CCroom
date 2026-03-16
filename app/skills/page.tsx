"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Skill {
  id: string;
  name: string;
  description: string;
  emoji: string;
  source: string;
  usedBy: string[];
}

interface AgentInfo {
  name: string;
  emoji: string;
}

function normalizeSkill(raw: unknown): Skill | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name : id;
  const source = typeof value.source === "string" && value.source.trim() ? value.source : "custom";
  if (!id) return null;
  return {
    id,
    name,
    description: typeof value.description === "string" ? value.description : "",
    emoji: typeof value.emoji === "string" && value.emoji.trim() ? value.emoji : "🧩",
    source,
    usedBy: Array.isArray(value.usedBy)
      ? value.usedBy.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [],
  };
}

function normalizeAgents(raw: unknown): Record<string, AgentInfo> {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .map(([agentId, info]) => {
        if (!info || typeof info !== "object") return null;
        const v = info as Record<string, unknown>;
        return [agentId, {
          name: typeof v.name === "string" && v.name.trim() ? v.name : agentId,
          emoji: typeof v.emoji === "string" && v.emoji.trim() ? v.emoji : "🤖",
        }] as const;
      })
      .filter((e): e is readonly [string, AgentInfo] => Boolean(e))
  );
}

interface CapabilitySummary {
  runtime: string;
  canListEntities: boolean;
  canListSessions: boolean;
  canResume: boolean;
  canFork: boolean;
  canViewTranscript: boolean;
}

const RUNTIME_LABELS: Record<string, string> = {
  openclaw: "OpenClaw",
  claude: "Claude Code",
  codex: "Codex",
};

const CAP_LABELS: Array<{ key: keyof Omit<CapabilitySummary, "runtime">; label: string }> = [
  { key: "canListEntities", label: "List Entities" },
  { key: "canListSessions", label: "List Sessions" },
  { key: "canResume", label: "Resume Session" },
  { key: "canFork", label: "Fork Session" },
  { key: "canViewTranscript", label: "View Transcript" },
];

type Tab = "openclaw" | "capabilities";

export default function SkillsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("openclaw");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "builtin" | "extension" | "custom">("all");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<Record<string, string>>({});
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<CapabilitySummary[]>([]);
  const [capsLoading, setCapsLoading] = useState(true);
  const [capsError, setCapsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/skills")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.error) { setSkillsError(data.error); return; }
        const rawSkills = Array.isArray(data?.skills) ? (data.skills as unknown[]) : [];
        setSkills(rawSkills.map(normalizeSkill).filter((s): s is Skill => s !== null));
        setAgents(normalizeAgents(data?.agents));
      })
      .catch((e) => { if (!cancelled) setSkillsError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setSkillsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((data: CapabilitySummary[]) => setCapabilities(Array.isArray(data) ? data : []))
      .catch((e) => setCapsError(e.message))
      .finally(() => setCapsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSkill) return;
    const cacheKey = `${selectedSkill.source}:${selectedSkill.id}`;
    if (skillContent[cacheKey]) { setContentError(null); setContentLoading(false); return; }
    const controller = new AbortController();
    setContentLoading(true);
    setContentError(null);
    fetch(`/api/skills/content?source=${encodeURIComponent(selectedSkill.source)}&id=${encodeURIComponent(selectedSkill.id)}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        return data;
      })
      .then((data) => {
        const content = typeof data?.content === "string" ? data.content : "";
        setSkillContent((prev) => ({ ...prev, [cacheKey]: content }));
      })
      .catch((err) => { if (!controller.signal.aborted) setContentError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!controller.signal.aborted) setContentLoading(false); });
    return () => controller.abort();
  }, [selectedSkill, skillContent]);

  useEffect(() => {
    if (!selectedSkill) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelectedSkill(null); setContentError(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSkill]);

  const filtered = skills.filter((skill) => {
    if (filter === "builtin" && skill.source !== "builtin") return false;
    if (filter === "extension" && !skill.source.startsWith("extension:")) return false;
    if (filter === "custom" && skill.source !== "custom") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q) || skill.id.toLowerCase().includes(q);
  });

  const sourceLabel = (source: string) => {
    if (source === "builtin") return t("skills.source.builtin");
    if (source.startsWith("extension:")) return source.replace("extension:", `${t("skills.extension")}:`);
    return t("skills.source.custom");
  };

  const sourceBadgeClass = (source: string) => {
    if (source === "builtin") return "bg-blue-500/20 text-blue-400";
    if (source.startsWith("extension:")) return "bg-purple-500/20 text-purple-400";
    return "bg-green-500/20 text-green-400";
  };

  const selectedCacheKey = selectedSkill ? `${selectedSkill.source}:${selectedSkill.id}` : "";

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("skills.title")}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Skills &amp; runtime capabilities</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm font-medium hover:border-[var(--accent)] transition"
        >
          {t("common.backOverview")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden mb-6 w-fit">
        {(["openclaw", "capabilities"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : "bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t === "openclaw" ? "OpenClaw Skills" : "Runtime Capabilities"}
          </button>
        ))}
      </div>

      {/* OpenClaw Skills tab */}
      {tab === "openclaw" && (
        <>
          {skillsLoading && <p className="text-[var(--text-muted)]">{t("common.loading")}</p>}
          {skillsError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-4">{skillsError}</div>
          )}
          {!skillsLoading && !skillsError && (
            <>
              <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center">
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                  {(["all", "builtin", "extension", "custom"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        filter === f
                          ? "bg-[var(--accent)] text-[var(--bg)]"
                          : "bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {f === "all" ? t("skills.all") : f === "builtin" ? t("skills.builtin") : f === "extension" ? t("skills.extension") : t("skills.custom")}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder={t("skills.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm outline-none focus:border-[var(--accent)] transition w-full md:w-64"
                />
                <span className="text-xs text-[var(--text-muted)]">{filtered.length} {t("skills.unit")}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                  <div className="col-span-full p-8 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center text-[var(--text-muted)] text-sm">
                    {t("common.noData")}
                  </div>
                ) : (
                  filtered.map((skill) => (
                    <button
                      key={`${skill.source}-${skill.id}`}
                      type="button"
                      onClick={() => setSelectedSkill(skill)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--accent)]/50 transition text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0">{skill.emoji}</span>
                          <span className="font-semibold text-sm truncate">{skill.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${sourceBadgeClass(skill.source)}`}>
                          {sourceLabel(skill.source)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 min-h-[2.5em]">
                        {skill.description || t("skills.noDesc")}
                      </p>
                      <div className="mb-3 text-[10px] text-[var(--accent)]">{t("skills.viewSource")}</div>
                      {skill.usedBy.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skill.usedBy.map((agentId) => {
                            const agent = agents[agentId];
                            return (
                              <span key={agentId} className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[10px] font-medium">
                                {agent?.emoji || "🤖"} {agent?.name || agentId}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Runtime Capabilities tab */}
      {tab === "capabilities" && (
        <>
          {capsLoading && <p className="text-[var(--text-muted)]">{t("common.loading")}</p>}
          {capsError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-4">{capsError}</div>
          )}
          {!capsLoading && !capsError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Capability</th>
                    {capabilities.map((c) => (
                      <th key={c.runtime} className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">
                        {RUNTIME_LABELS[c.runtime] ?? c.runtime}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAP_LABELS.map(({ key, label }) => (
                    <tr key={key} className="border-b border-[var(--border)] hover:bg-[var(--card)] transition">
                      <td className="py-3 px-4 text-[var(--text)]">{label}</td>
                      {capabilities.map((c) => (
                        <td key={c.runtime} className="py-3 px-4 text-center">
                          {c[key] ? (
                            <span className="text-green-400 text-base">✓</span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-base">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Skill detail modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={t("common.close")}
            onClick={() => { setSelectedSkill(null); setContentError(null); }}
          />
          <div className="absolute inset-x-4 inset-y-6 md:inset-x-10 lg:inset-x-24 xl:inset-x-40 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selectedSkill.emoji} {selectedSkill.name}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{selectedSkill.source}</div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedSkill(null); setContentError(null); }}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:border-[var(--accent)] transition"
              >
                {t("common.close")}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {contentLoading && <p className="text-[var(--text-muted)] text-sm">{t("common.loading")}</p>}
              {contentError && <p className="text-red-400 text-sm">{contentError}</p>}
              {!contentLoading && !contentError && (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-[var(--text)]">
                  {skillContent[selectedCacheKey] || t("common.noData")}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
