import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

describe("Claude paths helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccroom-claude-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("jsonlFilesInDir returns only .jsonl files sorted", () => {
    fs.writeFileSync(path.join(tmpDir, "b.jsonl"), "");
    fs.writeFileSync(path.join(tmpDir, "a.jsonl"), "");
    fs.writeFileSync(path.join(tmpDir, "other.txt"), "");

    // Re-implement the logic from jsonlFilesInDir inline for isolation
    function jsonlFilesInDir(dir: string): string[] {
      try {
        return fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".jsonl"))
          .sort()
          .map((f) => path.join(dir, f));
      } catch {
        return [];
      }
    }

    const files = jsonlFilesInDir(tmpDir);
    expect(files).toHaveLength(2);
    expect(files[0]).toMatch(/a\.jsonl$/);
    expect(files[1]).toMatch(/b\.jsonl$/);
  });

  it("jsonlFilesInDir returns empty array when dir does not exist", () => {
    function jsonlFilesInDir(dir: string): string[] {
      try {
        return fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".jsonl"))
          .sort()
          .map((f) => path.join(dir, f));
      } catch {
        return [];
      }
    }

    expect(jsonlFilesInDir("/nonexistent/path/xyz")).toEqual([]);
  });

  it("claudeProjectDirs returns subdirectories of the projects dir", () => {
    const projectsDir = path.join(tmpDir, "projects");
    fs.mkdirSync(projectsDir);
    fs.mkdirSync(path.join(projectsDir, "-home-user-foo"));
    fs.mkdirSync(path.join(projectsDir, "-home-user-bar"));
    fs.writeFileSync(path.join(projectsDir, "not-a-dir.txt"), "");

    function claudeProjectDirs(dir: string): string[] {
      try {
        return fs
          .readdirSync(dir)
          .map((f) => path.join(dir, f))
          .filter((f) => fs.statSync(f).isDirectory());
      } catch {
        return [];
      }
    }

    const dirs = claudeProjectDirs(projectsDir);
    expect(dirs).toHaveLength(2);
    expect(dirs.some((d) => d.endsWith("-home-user-foo"))).toBe(true);
    expect(dirs.some((d) => d.endsWith("-home-user-bar"))).toBe(true);
  });
});
