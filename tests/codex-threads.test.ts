import { describe, it, expect } from "vitest";

// Test the pure data-mapping logic extracted from listCodexThreads row mapper.
// The mapper is a simple inline function; we replicate it here to test edge cases.
function mapCodexRow(r: Record<string, unknown>) {
  return {
    id: r.id || "",
    cwd: r.cwd || undefined,
    title: r.title || undefined,
    createdAt: r.created_at ? Number(r.created_at) : undefined,
    updatedAt: r.updated_at ? Number(r.updated_at) : undefined,
    archived: r.archived === "1" || r.archived === "true",
    messageCount: r.message_count ? Number(r.message_count) : 0,
  };
}

describe("Codex thread row mapper", () => {
  it("maps a full row correctly", () => {
    const row = {
      id: "thread-abc",
      cwd: "/home/user/project",
      title: "Fix bug",
      created_at: "1700000000000",
      updated_at: "1700001000000",
      archived: "0",
      message_count: "42",
    };
    const result = mapCodexRow(row);
    expect(result.id).toBe("thread-abc");
    expect(result.cwd).toBe("/home/user/project");
    expect(result.title).toBe("Fix bug");
    expect(result.createdAt).toBe(1700000000000);
    expect(result.updatedAt).toBe(1700001000000);
    expect(result.archived).toBe(false);
    expect(result.messageCount).toBe(42);
  });

  it("treats archived='1' as true", () => {
    expect(mapCodexRow({ archived: "1" }).archived).toBe(true);
  });

  it("treats archived='true' as true", () => {
    expect(mapCodexRow({ archived: "true" }).archived).toBe(true);
  });

  it("treats archived='0' as false", () => {
    expect(mapCodexRow({ archived: "0" }).archived).toBe(false);
  });

  it("treats absent archived as false", () => {
    expect(mapCodexRow({}).archived).toBe(false);
  });

  it("returns empty string id when id is missing", () => {
    expect(mapCodexRow({}).id).toBe("");
  });

  it("returns undefined cwd when cwd is missing", () => {
    expect(mapCodexRow({}).cwd).toBeUndefined();
  });

  it("returns undefined title when title is missing", () => {
    expect(mapCodexRow({}).title).toBeUndefined();
  });

  it("returns undefined createdAt when created_at is missing", () => {
    expect(mapCodexRow({}).createdAt).toBeUndefined();
  });

  it("returns 0 messageCount when message_count is missing", () => {
    expect(mapCodexRow({}).messageCount).toBe(0);
  });

  it("coerces numeric created_at to number", () => {
    expect(mapCodexRow({ created_at: 1234567890 }).createdAt).toBe(1234567890);
  });
});
