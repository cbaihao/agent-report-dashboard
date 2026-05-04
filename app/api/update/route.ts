import { NextRequest, NextResponse } from "next/server";
import { getData, setData } from "@/lib/storage";
import type { DashboardData, AgentTask, Thesis, HumanTodo } from "@/lib/types";

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  // Auth
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== process.env.AGENT_API_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Accept either a full DashboardData payload, or an agent-os system.json shaped payload
  const payload = body as Record<string, unknown>;

  // Auto-detect agent-os system.json format (has team_queues)
  let incoming: Partial<DashboardData>;
  if (payload.team_queues) {
    incoming = transformAgentOsPayload(payload);
  } else {
    incoming = payload as Partial<DashboardData>;
  }

  // Merge with existing data (don't wipe fields the payload didn't touch)
  const existing = await getData();
  const updated: DashboardData = {
    theses: incoming.theses ?? existing.theses,
    agent_tasks: incoming.agent_tasks ?? existing.agent_tasks,
    human_todos: incoming.human_todos ?? existing.human_todos,
    meta: {
      ...existing.meta,
      ...incoming.meta,
      last_updated: new Date().toISOString(),
    },
  };

  await setData(updated);
  return NextResponse.json({ ok: true, updated_at: updated.meta.last_updated });
}

// ── Transform agent-os system.json → DashboardData ───────────────────────────

function transformAgentOsPayload(s: Record<string, unknown>): Partial<DashboardData> {
  // Theses
  const theses = ((s.theses as unknown[]) ?? []).map((t) => t as Thesis);

  // Agent tasks: flatten team_queues
  const teamQueues = (s.team_queues ?? {}) as Record<string, { tasks?: AgentTask[] }>;
  const agentTasks: AgentTask[] = Object.entries(teamQueues).flatMap(
    ([team, queue]) =>
      (queue.tasks ?? []).map((task) => ({ ...task, team }))
  );

  // Human todos from human_queue array (if agent already parsed it)
  const humanTodos = ((s.human_queue as HumanTodo[]) ?? []);

  const james = (s.james ?? {}) as Record<string, unknown>;

  return {
    theses,
    agent_tasks: agentTasks,
    human_todos: humanTodos,
    meta: {
      session_count: (s.session_count as number) ?? 0,
      last_updated: new Date().toISOString(),
      current_focus: (s.current_priority as string) ?? "—",
      next_session_instruction: (s.next_session_instruction as string) ?? undefined,
      ...(james.capital_to_deploy
        ? { capital_to_deploy: james.capital_to_deploy as number }
        : {}),
    } as DashboardData["meta"],
  };
}
