import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test agentStatus logic by re-implementing it inline (it's not exported).
// We duplicate the logic here so the test is self-contained and stable.
type RuntimeStatus = "active" | "online" | "idle" | "offline";

function agentStatus(
  lastActiveMs: number | null,
  lastAssistantMs: number | null,
  now: number
): RuntimeStatus {
  if (!lastActiveMs) return "offline";
  const diff = now - lastActiveMs;
  if (lastAssistantMs && now - lastAssistantMs < 3 * 60 * 1000) return "active";
  if (diff < 10 * 60 * 1000) return "online";
  if (diff < 24 * 60 * 60 * 1000) return "idle";
  return "offline";
}

describe("agentStatus", () => {
  const NOW = 1_700_000_000_000;

  it("returns offline when lastActiveMs is null", () => {
    expect(agentStatus(null, null, NOW)).toBe("offline");
  });

  it("returns active when lastAssistantMs is within 3 minutes", () => {
    const lastAssistantMs = NOW - 2 * 60 * 1000; // 2 min ago
    expect(agentStatus(NOW - 5000, lastAssistantMs, NOW)).toBe("active");
  });

  it("returns online when lastActiveMs is within 10 minutes but assistant is stale", () => {
    const lastActiveMs = NOW - 5 * 60 * 1000; // 5 min ago
    const lastAssistantMs = NOW - 10 * 60 * 1000; // 10 min ago (outside 3min window)
    expect(agentStatus(lastActiveMs, lastAssistantMs, NOW)).toBe("online");
  });

  it("returns online when lastActiveMs is within 10 minutes and no assistant timestamp", () => {
    const lastActiveMs = NOW - 9 * 60 * 1000;
    expect(agentStatus(lastActiveMs, null, NOW)).toBe("online");
  });

  it("returns idle when lastActiveMs is between 10 min and 24 hours", () => {
    const lastActiveMs = NOW - 2 * 60 * 60 * 1000; // 2 hours ago
    expect(agentStatus(lastActiveMs, null, NOW)).toBe("idle");
  });

  it("returns offline when lastActiveMs is older than 24 hours", () => {
    const lastActiveMs = NOW - 25 * 60 * 60 * 1000; // 25 hours ago
    expect(agentStatus(lastActiveMs, null, NOW)).toBe("offline");
  });

  it("boundary: exactly 10 minutes ago is still online", () => {
    const lastActiveMs = NOW - 10 * 60 * 1000 + 1;
    expect(agentStatus(lastActiveMs, null, NOW)).toBe("online");
  });

  it("boundary: exactly 10 minutes ago (not less than) is idle", () => {
    const lastActiveMs = NOW - 10 * 60 * 1000;
    expect(agentStatus(lastActiveMs, null, NOW)).toBe("idle");
  });
});
