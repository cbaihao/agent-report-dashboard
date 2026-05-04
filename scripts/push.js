#!/usr/bin/env node
/**
 * push.js — sync agent-os state to the dashboard API.
 *
 * Usage (from anywhere):
 *   DASHBOARD_URL=https://your-app.vercel.app \
 *   AGENT_API_TOKEN=your-secret \
 *   node /path/to/agent-report-dashboard/scripts/push.js
 *
 * Or add to agent-os after each session:
 *   node ../agent-report-dashboard/scripts/push.js
 *
 * Env vars (also reads from .env.local in script's parent dir):
 *   DASHBOARD_URL      — Vercel deployment URL (no trailing slash)
 *   AGENT_API_TOKEN    — must match AGENT_API_TOKEN in Vercel env vars
 *   AGENT_OS_DIR       — path to agent-os dir (default: ../agent-os relative to this script)
 */

const fs = require("fs");
const path = require("path");

// ── Load .env.local from project root ──────────────────────────────────────

const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const DASHBOARD_URL = (process.env.DASHBOARD_URL || "http://localhost:3000").replace(/\/$/, "");
const API_TOKEN = process.env.AGENT_API_TOKEN;
const AGENT_OS_DIR = process.env.AGENT_OS_DIR || path.resolve(__dirname, "../../agent-os");

if (!API_TOKEN) {
  console.error("[push] ERROR: AGENT_API_TOKEN not set.");
  process.exit(1);
}

// ── Read agent-os state files ─────────────────────────────────────────────

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}

function parseHumanQueue(file) {
  try {
    const blocks = fs.readFileSync(file, "utf-8").split(/\n## /);
    return blocks.flatMap((b) => {
      const p = b.match(/^\[(P[123])\]/);
      const time = b.match(/~(\d+)min/);
      const titleMatch = b.match(/\|\s*(.+)/);
      const why = b.match(/\*\*Why:\*\*\s*(.+)/);
      const dl = b.match(/\*\*Deadline:\*\*\s*(.+)/);
      if (!p || !titleMatch) return [];
      return [{
        priority: p[1],
        time_min: time ? parseInt(time[1]) : null,
        title: titleMatch[1].trim(),
        why: why?.[1]?.trim() || "",
        deadline: dl?.[1]?.trim() || "none",
        status: "pending",
      }];
    });
  } catch { return []; }
}

const system = readJson(path.join(AGENT_OS_DIR, "state/system.json"));
if (!system) {
  console.error("[push] ERROR: Could not read state/system.json from", AGENT_OS_DIR);
  process.exit(1);
}

const humanTodos = parseHumanQueue(path.join(AGENT_OS_DIR, "state/human_queue.md"));

// Flatten team_queues → agent_tasks
const agentTasks = [];
for (const [team, queue] of Object.entries(system.team_queues ?? {})) {
  for (const task of (queue.tasks ?? [])) {
    agentTasks.push({ ...task, team });
  }
}

// Build payload
const payload = {
  theses: system.theses ?? [],
  agent_tasks: agentTasks,
  human_todos: humanTodos,
  meta: {
    session_count: system.session_count ?? 0,
    last_updated: new Date().toISOString(),
    current_focus: system.current_priority ?? "—",
    next_session_instruction: system.next_session_instruction ?? null,
  },
};

// ── POST to dashboard ──────────────────────────────────────────────────────

async function push() {
  const url = `${DASHBOARD_URL}/api/update`;
  console.log(`[push] Posting to ${url} ...`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`[push] OK — updated_at: ${body.updated_at}`);
  } else {
    console.error(`[push] FAILED ${res.status}:`, body);
    process.exit(1);
  }
}

push();
