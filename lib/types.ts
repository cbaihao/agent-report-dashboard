export type ThesisStatus =
  | "active"
  | "approaching_trigger"
  | "monitoring"
  | "partially_played_out"
  | "background"
  | "vetoed";

export interface Thesis {
  id: string;
  name: string;
  status: ThesisStatus;
  /** 0–10. Higher = stronger opportunity right now. Agents should set this. */
  roi_score?: number;
  thesis?: string;
  status_note?: string;
  action?: string;
  last_checked?: string;
  james_veto?: boolean;
  current_data?: Record<string, unknown>;
}

export type AgentTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partially_complete";

export interface AgentTask {
  id: string;
  team: string;
  task: string;
  status: AgentTaskStatus;
  priority?: number;
  output?: string;
  note?: string;
  completed?: string;
  added?: string;
}

export type TodoPriority = "P1" | "P2" | "P3";

export interface HumanTodo {
  id?: string;
  priority: TodoPriority;
  title: string;
  why?: string;
  time_min?: number;
  deadline?: string;
  status?: "pending" | "done";
}

export interface DashboardMeta {
  session_count: number;
  last_updated: string;
  current_focus: string;
  next_session_instruction?: string;
}

export interface DashboardData {
  theses: Thesis[];
  agent_tasks: AgentTask[];
  human_todos: HumanTodo[];
  meta: DashboardMeta;
}
