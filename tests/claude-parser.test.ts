import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";

// We mock fs.readFileSync before importing the module under test
vi.mock("fs");

import { parseJsonlFile } from "../lib/runtimes/claude/parser";

const mockReadFileSync = vi.mocked(fs.readFileSync);

function makeLines(entries: object[]): string {
  return entries.map((e) => JSON.stringify(e)).join("\n");
}

describe("parseJsonlFile", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns empty session when file is empty", () => {
    mockReadFileSync.mockReturnValue("");
    const result = parseJsonlFile("/fake/abc123.jsonl");
    expect(result.sessionId).toBe("abc123");
    expect(result.messages).toHaveLength(0);
    expect(result.totalInputTokens).toBe(0);
    expect(result.totalOutputTokens).toBe(0);
  });

  it("skips entries without a role", () => {
    mockReadFileSync.mockReturnValue(
      makeLines([{ type: "tool_use", content: "x" }])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages).toHaveLength(0);
  });

  it("parses a simple string content message", () => {
    mockReadFileSync.mockReturnValue(
      makeLines([{ role: "user", content: "hello" }])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("hello");
    expect(result.firstUserMessage).toBe("hello");
  });

  it("parses array content by joining text parts", () => {
    mockReadFileSync.mockReturnValue(
      makeLines([{ role: "assistant", content: [{ text: "foo" }, { text: " bar" }] }])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages[0].content).toBe("foo bar");
  });

  it("accumulates token counts", () => {
    mockReadFileSync.mockReturnValue(
      makeLines([
        { role: "user", content: "hi", usage: { input_tokens: 10, output_tokens: 0 } },
        { role: "assistant", content: "hey", usage: { input_tokens: 5, output_tokens: 20 } },
      ])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.totalInputTokens).toBe(15);
    expect(result.totalOutputTokens).toBe(20);
  });

  it("reads timestamp from entry.timestamp", () => {
    const ts = 1_700_000_000_000;
    mockReadFileSync.mockReturnValue(
      makeLines([{ role: "user", content: "x", timestamp: ts }])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages[0].timestamp).toBe(ts);
    expect(result.lastActiveAt).toBe(ts);
  });

  it("reads timestamp from message.created_at ISO string", () => {
    const isoDate = "2024-01-15T10:00:00.000Z";
    const expectedMs = new Date(isoDate).getTime();
    mockReadFileSync.mockReturnValue(
      makeLines([{ role: "assistant", content: "ok", message: { created_at: isoDate } }])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages[0].timestamp).toBe(expectedMs);
  });

  it("sets firstUserMessage to the first user content only", () => {
    mockReadFileSync.mockReturnValue(
      makeLines([
        { role: "assistant", content: "hi there" },
        { role: "user", content: "first user" },
        { role: "user", content: "second user" },
      ])
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.firstUserMessage).toBe("first user");
  });

  it("skips malformed JSON lines gracefully", () => {
    mockReadFileSync.mockReturnValue(
      "{ role: bad json }\n" +
      JSON.stringify({ role: "user", content: "good" })
    );
    const result = parseJsonlFile("/fake/sess.jsonl");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe("good");
  });

  it("returns offline session when file does not exist", () => {
    mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    const result = parseJsonlFile("/fake/missing.jsonl");
    expect(result.messages).toHaveLength(0);
    expect(result.sessionId).toBe("missing");
  });
});
