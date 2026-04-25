export type NodeRole = "follower" | "candidate" | "leader";

export interface NodeAddress {
  id: number;
  host: string;
  port: number;
}

export interface LogCommand {
  type: "merge";
  patch: Record<string, unknown>;
}

export interface LogEntry {
  index: number;
  term: number;
  command: LogCommand;
}

export interface RequestVoteRequest {
  term: number;
  candidateId: number;
  lastLogIndex: number;
  lastLogTerm: number;
}

export interface RequestVoteResponse {
  term: number;
  voteGranted: boolean;
}

export interface AppendEntriesRequest {
  term: number;
  leaderId: number;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry[];
  leaderCommit: number;
}

export interface AppendEntriesResponse {
  term: number;
  success: boolean;
  matchIndex: number;
}

export interface ClientUpdateRequest {
  patch: Record<string, unknown>;
}

export interface ClusterConfig {
  nodes: NodeAddress[];
  electionTimeoutMinMs: number;
  electionTimeoutMaxMs: number;
  heartbeatIntervalMs: number;
  rpcTimeoutMs: number;
}
