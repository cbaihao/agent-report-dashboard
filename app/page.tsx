import { getData } from "@/lib/storage";
import type { Thesis, AgentTask, HumanTodo, ThesisStatus, AgentTaskStatus, TodoPriority } from "@/lib/types";
import RefreshTicker from "@/components/RefreshTicker";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { ShineBorder } from "@/components/ui/shine-border";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

// Force dynamic rendering so each request reads fresh KV data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── ROI helpers ───────────────────────────────────────────────────────────────

const STATUS_ROI: Record<ThesisStatus, number> = {
  approaching_trigger: 9,
  active: 7,
  monitoring: 5,
  partially_played_out: 4,
  background: 2,
  vetoed: 0,
};

function roiScore(t: Thesis): number {
  if (t.james_veto) return 0;
  if (t.roi_score !== undefined) return Math.max(0, Math.min(10, t.roi_score));
  return STATUS_ROI[t.status] ?? 3;
}

function roiColor(score: number) {
  if (score >= 8) return { badge: "bg-emerald-950 text-emerald-300 border border-emerald-800", bar: "bg-emerald-500", borderL: "border-l-emerald-500", gradient: "#052e16" };
  if (score >= 5) return { badge: "bg-amber-950 text-amber-300 border border-amber-800", bar: "bg-amber-500", borderL: "border-l-amber-500", gradient: "#2d1b00" };
  return { badge: "bg-zinc-800 text-zinc-400 border border-zinc-700", bar: "bg-zinc-600", borderL: "border-l-zinc-700", gradient: "#1a1a1a" };
}

const STATUS_LABEL: Record<ThesisStatus, string> = {
  approaching_trigger: "trigger",
  active: "active",
  monitoring: "watching",
  partially_played_out: "played out",
  background: "background",
  vetoed: "vetoed",
};

const STATUS_STYLE: Record<ThesisStatus, string> = {
  approaching_trigger: "bg-emerald-900/60 text-emerald-300",
  active: "bg-green-900/60 text-green-300",
  monitoring: "bg-blue-900/60 text-blue-300",
  partially_played_out: "bg-orange-900/60 text-orange-300",
  background: "bg-zinc-800 text-zinc-500",
  vetoed: "bg-red-900/40 text-red-400",
};

// ── Task helpers ──────────────────────────────────────────────────────────────

const TASK_DOT: Record<AgentTaskStatus, { symbol: string; color: string }> = {
  in_progress: { symbol: "●", color: "text-emerald-400" },
  pending: { symbol: "○", color: "text-zinc-500" },
  partially_complete: { symbol: "◐", color: "text-amber-400" },
  completed: { symbol: "✓", color: "text-zinc-700" },
};

const TEAM_ORDER = ["research", "engineering", "ideas"];
const TEAM_LABEL: Record<string, string> = {
  research: "Research",
  engineering: "Engineering",
  ideas: "Ideas",
};

// ── Priority helpers ──────────────────────────────────────────────────────────

const P_BADGE: Record<TodoPriority, string> = {
  P1: "bg-red-950 text-red-400 border border-red-800",
  P2: "bg-yellow-950 text-yellow-400 border border-yellow-800",
  P3: "bg-zinc-800 text-zinc-500 border border-zinc-700",
};
const P_BORDER_L: Record<TodoPriority, string> = {
  P1: "border-l-red-500",
  P2: "border-l-yellow-500",
  P3: "border-l-zinc-700",
};

// ── Formatting ────────────────────────────────────────────────────────────────

function shortDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function truncate(s: string | undefined, max = 120) {
  if (!s) return null;
  const clean = s.replace(/\n\[[\d-]+\] Monitor run:.+/g, "").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

// ── Panel: Theses ─────────────────────────────────────────────────────────────

function ThesesPanel({ theses }: { theses: Thesis[] }) {
  const sorted = [...theses].sort((a, b) => roiScore(b) - roiScore(a));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Theses
        </h2>
        <span className="text-[10px] text-zinc-600">ranked by ROI</span>
      </div>

      {sorted.length === 0 && (
        <p className="text-zinc-600 text-xs">No theses yet.</p>
      )}

      {sorted.map((t, idx) => {
        const score = roiScore(t);
        const c = roiColor(score);
        const isTop = idx === 0 && score >= 5;
        return (
          <MagicCard
            key={t.id}
            className={`border-l-2 ${c.borderL} p-4 ${t.james_veto ? "opacity-30" : ""}`}
            gradientColor={c.gradient}
          >
            {isTop && (
              <BorderBeam
                size={60}
                duration={8}
                colorFrom="#10b981"
                colorTo="#6366f1"
              />
            )}
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${c.badge}`}>
                  {score.toFixed(1)}
                </span>
                <span className="text-white text-sm font-medium truncate">{t.name}</span>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${STATUS_STYLE[t.status] ?? ""}`}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>

            {/* ROI bar */}
            <div className="h-0.5 bg-zinc-800 rounded mb-3">
              <div className={`h-full rounded ${c.bar}`} style={{ width: `${score * 10}%` }} />
            </div>

            {/* Note */}
            {truncate(t.status_note) && (
              <p className="text-zinc-400 text-xs leading-relaxed mb-2">
                {truncate(t.status_note)}
              </p>
            )}

            {/* Action */}
            {t.action && (
              <p className="text-zinc-500 text-xs">
                <span className="text-zinc-600">→ </span>{t.action}
              </p>
            )}

            {/* Footer */}
            {t.last_checked && (
              <p className="text-zinc-700 text-[10px] mt-2">
                checked {shortDate(t.last_checked)}
              </p>
            )}
          </MagicCard>
        );
      })}
    </section>
  );
}

// ── Panel: Agent Tasks ────────────────────────────────────────────────────────

function AgentTasksPanel({ tasks }: { tasks: AgentTask[] }) {
  const grouped: Record<string, AgentTask[]> = {};
  for (const t of tasks) {
    const key = t.team ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const teamKeys = [
    ...TEAM_ORDER.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !TEAM_ORDER.includes(k)),
  ];

  const active = tasks.filter((t) => t.status === "in_progress" || t.status === "pending").length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Agent Queue
        </h2>
        <span className="text-[10px] text-zinc-600">{active} active / pending</span>
      </div>

      {tasks.length === 0 && (
        <p className="text-zinc-600 text-xs">No tasks yet.</p>
      )}

      {teamKeys.map((team) => {
        const teamTasks = grouped[team];
        const activeTasks = teamTasks.filter((t) => t.status !== "completed");
        const done = teamTasks.filter((t) => t.status === "completed");
        const display = [...activeTasks, ...done];

        return (
          <MagicCard key={team} className="overflow-hidden" gradientColor="#161616">
            {/* Team header */}
            <div className="px-4 py-2 border-b border-[#1a1a1a] bg-[#0d0d0d]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {TEAM_LABEL[team] ?? team}
              </span>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-[#1a1a1a]">
              {display.map((task) => {
                const dot = TASK_DOT[task.status] ?? TASK_DOT.pending;
                const isDone = task.status === "completed";
                return (
                  <div key={task.id} className={`px-4 py-3 ${isDone ? "opacity-30" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-xs mt-0.5 shrink-0 ${dot.color}`}>{dot.symbol}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-500 text-[10px] font-mono shrink-0">{task.id}</span>
                          <span className={`text-xs leading-relaxed ${isDone ? "text-zinc-500" : "text-zinc-200"}`}>
                            {task.task}
                          </span>
                        </div>
                        {!isDone && task.note && (
                          <p className="text-zinc-600 text-[11px] mt-1 leading-snug">
                            {truncate(task.note, 100)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </MagicCard>
        );
      })}
    </section>
  );
}

// ── Panel: Human TODOs ────────────────────────────────────────────────────────

function HumanTodosPanel({ todos }: { todos: HumanTodo[] }) {
  const order: Record<TodoPriority, number> = { P1: 0, P2: 1, P3: 2 };
  const sorted = [...todos].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });

  const pending = todos.filter((t) => t.status !== "done");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Your Queue
        </h2>
        <span className="text-[10px] text-zinc-600">{pending.length} pending</span>
      </div>

      {sorted.length === 0 && (
        <p className="text-zinc-600 text-xs">Nothing for you right now.</p>
      )}

      {sorted.map((todo, i) => {
        const isDone = todo.status === "done";
        const key = todo.id ?? `${todo.priority}-${i}`;
        const isP1 = todo.priority === "P1" && !isDone;
        return (
          <MagicCard
            key={key}
            className={`border-l-2 ${P_BORDER_L[todo.priority]} p-4 ${isDone ? "opacity-30" : ""}`}
            gradientColor={isP1 ? "#200a0a" : "#111111"}
          >
            {isP1 && (
              <ShineBorder
                borderWidth={1}
                duration={10}
                shineColor={["#ef4444", "#f97316"]}
              />
            )}
            <div className="flex items-start gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${P_BADGE[todo.priority]}`}>
                {todo.priority}
              </span>
              <span className="text-white text-sm font-medium leading-snug">{todo.title}</span>
              {todo.time_min && (
                <span className="text-zinc-600 text-[10px] ml-auto shrink-0">~{todo.time_min}min</span>
              )}
            </div>
            {todo.why && (
              <p className="text-zinc-400 text-xs leading-relaxed mt-1">{todo.why}</p>
            )}
            {todo.deadline && todo.deadline !== "none" && (
              <p className="text-zinc-600 text-[10px] mt-2">
                deadline: {todo.deadline}
              </p>
            )}
          </MagicCard>
        );
      })}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Dashboard() {
  const data = await getData();
  const { theses, agent_tasks, human_todos, meta } = data;

  const updatedAt = meta.last_updated
    ? new Date(meta.last_updated).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <main className="min-h-screen px-5 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <AnimatedGradientText colorFrom="#a78bfa" colorTo="#38bdf8" speed={0.5}>
              Agent OS
            </AnimatedGradientText>
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-zinc-600 text-xs">
              {meta.session_count} sessions · {updatedAt}
            </p>
            <RefreshTicker />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Focus</p>
          <p className="text-white font-semibold text-sm capitalize">{meta.current_focus}</p>
        </div>
      </header>

      {/* Next session banner */}
      {meta.next_session_instruction && (
        <div className="mb-6 bg-[#111111] border border-[#1e1e1e] border-l-2 border-l-blue-600 rounded-xl px-4 py-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Next session</p>
          <p className="text-zinc-300 text-xs leading-relaxed">{meta.next_session_instruction}</p>
        </div>
      )}

      {/* Three panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ThesesPanel theses={theses} />
        <AgentTasksPanel tasks={agent_tasks} />
        <HumanTodosPanel todos={human_todos} />
      </div>

      <p className="text-zinc-800 text-[10px] text-center mt-10">
        agent-os · agents post · humans act
      </p>
    </main>
  );
}
