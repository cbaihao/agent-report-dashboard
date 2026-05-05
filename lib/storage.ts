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

// ── Upstash Redis ─────────────────────────────────────────────────────────────

function getRedis() {
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function redisGet(): Promise<DashboardData | null> {
  const redis = getRedis();
  return redis.get<DashboardData>(KV_KEY);
}

async function redisSet(data: DashboardData): Promise<void> {
  const redis = getRedis();
  await redis.set(KV_KEY, data);
}

// ── Local file fallback (dev without Redis) ───────────────────────────────────

function localPath() {
  const path = require("path") as typeof import("path");
  return path.join(process.cwd(), "data", "dashboard.json");
}

function localGet(): DashboardData | null {
  try {
    const fs = require("fs") as typeof import("fs");
    return JSON.parse(fs.readFileSync(localPath(), "utf-8")) as DashboardData;
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

function hasRedis() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function getData(): Promise<DashboardData> {
  if (hasRedis()) return (await redisGet()) ?? defaultData();
  return localGet() ?? defaultData();
}

export async function setData(data: DashboardData): Promise<void> {
  if (hasRedis()) {
    await redisSet(data);
  } else {
    localSet(data);
  }
}
