import type { ActionDescriptor } from "@/lib/core/types";

export function claudeActions(): ActionDescriptor[] {
  return [
    {
      kind: "open_transcript",
      label: "View Transcript",
      hint: "Open JSONL session file",
    },
    {
      kind: "resume",
      label: "Resume Session",
      hint: "claude -r <sessionId>",
    },
    {
      kind: "open_workspace",
      label: "Open Workspace",
      hint: "Open project directory",
    },
    {
      kind: "open_runtime_home",
      label: "Open ~/.claude",
      hint: "Open Claude home directory",
    },
  ];
}
