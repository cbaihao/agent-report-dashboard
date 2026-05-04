import type { DashboardData } from "./types";

const KV_KEY = "agent-report:data";

function defaultData(): DashboardData {
  return {
    theses: [],
    agent_tasks: [],
    human_todos: [],
    meta: {
      session_count: 0,
      last_updated: new Date().toISOString(),
      current_focus: "—",
    },
  };
}

// ── Vercel KV ────────────────────────────────────────────────────────────────

async function kvGet(): Promise<DashboardData | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<DashboardData>(KV_KEY);
}

async function kvSet(data: DashboardData): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(KV_KEY, data);
}

// ── Local file fallback (dev only) ───────────────────────────────────────────

function localPath() {
  const path = require("path") as typeof import("path");
  return path.join(process.cwd(), "data", "dashboard.json");
}

function localGet(): DashboardData | null {
  try {
    const fs = require("fs") as typeof import("fs");
    const raw = fs.readFileSync(localPath(), "utf-8");
    return JSON.parse(raw) as DashboardData;
  } catch {
    return null;
  }
}

function localSet(data: DashboardData): void {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  fs.mkdirSync(path.dirname(localPath()), { recursive: true });
  fs.writeFileSync(localPath(), JSON.stringify(data, null, 2));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getData(): Promise<DashboardData> {
  if (process.env.KV_REST_API_URL) {
    return (await kvGet()) ?? defaultData();
  }
  return localGet() ?? defaultData();
}

export async function setData(data: DashboardData): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    await kvSet(data);
  } else {
    localSet(data);
  }
}
