#!/usr/bin/env node
// Writes data/dashboard.json from agent-os state (local dev seed)
const fs = require("fs");
const path = require("path");

const AGENT_OS_DIR = process.env.AGENT_OS_DIR || path.resolve(__dirname, "../../agent-os");

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
        why: why ? why[1].trim() : "",
        deadline: dl ? dl[1].trim() : "none",
        status: "pending",
      }];
    });
  } catch { return []; }
}

const system = readJson(path.join(AGENT_OS_DIR, "state/system.json"));
if (!system) { console.error("Cannot read system.json"); process.exit(1); }

const humanTodos = parseHumanQueue(path.join(AGENT_OS_DIR, "state/human_queue.md"));

const agentTasks = [];
for (const [team, queue] of Object.entries(system.team_queues || {})) {
  for (const task of (queue.tasks || [])) {
    agentTasks.push(Object.assign({}, task, { team }));
  }
}

const data = {
  theses: system.theses || [],
  agent_tasks: agentTasks,
  human_todos: humanTodos,
  meta: {
    session_count: system.session_count || 0,
    last_updated: new Date().toISOString(),
    current_focus: system.current_priority || "—",
    next_session_instruction: system.next_session_instruction || null,
  },
};

const outPath = path.join(__dirname, "..", "data", "dashboard.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log("[seed] Written", outPath);
console.log("  theses:", data.theses.length);
console.log("  agent_tasks:", data.agent_tasks.length);
console.log("  human_todos:", data.human_todos.length);
