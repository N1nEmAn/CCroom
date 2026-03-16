import type { ActionDescriptor } from "@/lib/core/types";

export function codexActions(): ActionDescriptor[] {
  return [
    {
      kind: "open_workspace",
      label: "Open Workspace",
      hint: "Open cwd in file manager",
    },
    {
      kind: "open_runtime_home",
      label: "Open ~/.codex",
      hint: "Open Codex home directory",
    },
    {
      kind: "open_transcript",
      label: "View Thread Logs",
      hint: "Read thread logs from SQLite",
    },
  ];
}
