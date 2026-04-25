import http, { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "./config";
import { postJson } from "./httpClient";
import {
  AppendEntriesRequest,
  AppendEntriesResponse,
  ClientUpdateRequest,
  ClusterConfig,
  LogEntry,
  NodeAddress,
  NodeRole,
  RequestVoteRequest,
  RequestVoteResponse,
} from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export class RaftNode {
  private readonly config: ClusterConfig;
  private readonly self: NodeAddress;
  private readonly peers: NodeAddress[];

  private server: http.Server;
  private role: NodeRole = "follower";
  private currentTerm = 0;
  private votedFor: number | null = null;
  private leaderId: number | null = null;

  private log: LogEntry[] = [];
  private commitIndex = 0;
  private lastApplied = 0;
  private state: Record<string, unknown> = {};

  private electionTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private nextIndex = new Map<number, number>();
  private matchIndex = new Map<number, number>();

  constructor(nodeId: number) {
    this.config = loadConfig();

    const self = this.config.nodes.find((node) => node.id === nodeId);
    if (!self) {
      throw new Error(`Unknown node id ${nodeId}`);
    }

    this.self = self;
    this.peers = this.config.nodes.filter((node) => node.id !== nodeId);

    this.server = http.createServer((req, res) => {
      this.handleHttp(req, res).catch((err) => {
        sendJson(res, 500, { error: "internal_error", message: String(err) });
      });
    });
  }

  public start(): void {
    this.server.listen(this.self.port, this.self.host, () => {
      console.log(
        `[node:${this.self.id}] listening on ${this.self.host}:${this.self.port}`,
      );
      this.resetElectionTimer();
    });
  }

  private majorityCount(): number {
    return Math.floor(this.config.nodes.length / 2) + 1;
  }

  private lastLogIndex(): number {
    return this.log.length;
  }

  private termAt(index: number): number {
    if (index === 0) {
      return 0;
    }
    return this.log[index - 1]?.term ?? 0;
  }

  private randomElectionTimeoutMs(): number {
    const min = this.config.electionTimeoutMinMs;
    const max = this.config.electionTimeoutMaxMs;
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  private resetElectionTimer(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
    }

    this.electionTimer = setTimeout(() => {
      this.onElectionTimeout().catch((err) => {
        console.error(`[node:${this.self.id}] election error`, err);
      });
    }, this.randomElectionTimeoutMs());
  }

  private stopHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private becomeFollower(term: number, leaderId: number | null): void {
    const termChanged = term > this.currentTerm;
    if (termChanged) {
      this.currentTerm = term;
      this.votedFor = null;
    }

    this.role = "follower";
    this.leaderId = leaderId;
    this.stopHeartbeatTimer();
    this.resetElectionTimer();
  }

  private becomeLeader(): void {
    this.role = "leader";
    this.leaderId = this.self.id;

    const next = this.lastLogIndex() + 1;
    for (const peer of this.peers) {
      this.nextIndex.set(peer.id, next);
      this.matchIndex.set(peer.id, 0);
    }

    this.stopHeartbeatTimer();
    this.heartbeatTimer = setInterval(() => {
      this.replicateRound().catch((err) => {
        console.error(`[node:${this.self.id}] heartbeat error`, err);
      });
    }, this.config.heartbeatIntervalMs);

    console.log(
      `[node:${this.self.id}] became leader for term ${this.currentTerm}`,
    );
    this.replicateRound().catch((err) => {
      console.error(`[node:${this.self.id}] initial heartbeat error`, err);
    });
  }

  private async onElectionTimeout(): Promise<void> {
    if (this.role === "leader") {
      this.resetElectionTimer();
      return;
    }

    this.role = "candidate";
    this.currentTerm += 1;
    this.votedFor = this.self.id;
    this.leaderId = null;
    this.resetElectionTimer();

    const voteRequest: RequestVoteRequest = {
      term: this.currentTerm,
      candidateId: this.self.id,
      lastLogIndex: this.lastLogIndex(),
      lastLogTerm: this.termAt(this.lastLogIndex()),
    };

    let votes = 1;

    const requests = this.peers.map(async (peer) => {
      try {
        const response = await postJson<
          RequestVoteRequest,
          RequestVoteResponse
        >(
          peer.host,
          peer.port,
          "/raft/request-vote",
          voteRequest,
          this.config.rpcTimeoutMs,
        );

        if (response.term > this.currentTerm) {
          this.becomeFollower(response.term, null);
          return;
        }

        if (
          this.role === "candidate" &&
          response.voteGranted &&
          this.currentTerm === voteRequest.term
        ) {
          votes += 1;
        }
      } catch {
        // Unreachable peers are expected in partial-failure scenarios.
      }
    });

    await Promise.all(requests);

    if (
      this.role === "candidate" &&
      this.currentTerm === voteRequest.term &&
      votes >= this.majorityCount()
    ) {
      this.becomeLeader();
    }
  }

  private async handleHttp(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (method === "GET" && url === "/status") {
      sendJson(res, 200, this.statusSnapshot());
      return;
    }

    if (method === "POST" && url === "/raft/request-vote") {
      const body = (await readJsonBody(req)) as RequestVoteRequest;
      const result = this.onRequestVote(body);
      sendJson(res, 200, result);
      return;
    }

    if (method === "POST" && url === "/raft/append-entries") {
      const body = (await readJsonBody(req)) as AppendEntriesRequest;
      const result = this.onAppendEntries(body);
      sendJson(res, 200, result);
      return;
    }

    if (method === "POST" && url === "/client/read") {
      const result = await this.handleClientRead();
      sendJson(res, result.status, result.payload);
      return;
    }

    if (method === "POST" && url === "/client/update") {
      const body = (await readJsonBody(req)) as ClientUpdateRequest;
      const result = await this.handleClientUpdate(body);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  }

  private statusSnapshot(): Record<string, unknown> {
    return {
      nodeId: this.self.id,
      role: this.role,
      term: this.currentTerm,
      leaderId: this.leaderId,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      logLength: this.log.length,
      state: this.state,
    };
  }

  private onRequestVote(request: RequestVoteRequest): RequestVoteResponse {
    if (request.term < this.currentTerm) {
      return { term: this.currentTerm, voteGranted: false };
    }

    if (request.term > this.currentTerm) {
      this.becomeFollower(request.term, null);
    }

    const lastIndex = this.lastLogIndex();
    const lastTerm = this.termAt(lastIndex);

    const isCandidateLogUpToDate =
      request.lastLogTerm > lastTerm ||
      (request.lastLogTerm === lastTerm && request.lastLogIndex >= lastIndex);

    const canVoteForCandidate =
      this.votedFor === null || this.votedFor === request.candidateId;

    const voteGranted = canVoteForCandidate && isCandidateLogUpToDate;

    if (voteGranted) {
      this.votedFor = request.candidateId;
      this.resetElectionTimer();
    }

    return { term: this.currentTerm, voteGranted };
  }

  private onAppendEntries(
    request: AppendEntriesRequest,
  ): AppendEntriesResponse {
    if (request.term < this.currentTerm) {
      return {
        term: this.currentTerm,
        success: false,
        matchIndex: this.lastLogIndex(),
      };
    }

    if (request.term > this.currentTerm || this.role !== "follower") {
      this.becomeFollower(request.term, request.leaderId);
    } else {
      this.leaderId = request.leaderId;
      this.resetElectionTimer();
    }

    if (request.prevLogIndex > this.lastLogIndex()) {
      return {
        term: this.currentTerm,
        success: false,
        matchIndex: this.lastLogIndex(),
      };
    }

    if (
      request.prevLogIndex > 0 &&
      this.termAt(request.prevLogIndex) !== request.prevLogTerm
    ) {
      return {
        term: this.currentTerm,
        success: false,
        matchIndex: request.prevLogIndex - 1,
      };
    }

    let insertIndex = request.prevLogIndex + 1;
    for (const incoming of request.entries) {
      const localEntry = this.log[insertIndex - 1];
      if (localEntry && localEntry.term !== incoming.term) {
        this.log.splice(insertIndex - 1);
      }

      if (!localEntry || localEntry.term !== incoming.term) {
        this.log[insertIndex - 1] = {
          index: insertIndex,
          term: incoming.term,
          command: incoming.command,
        };
      }

      insertIndex += 1;
    }

    if (request.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(request.leaderCommit, this.lastLogIndex());
      this.applyCommittedEntries();
    }

    return {
      term: this.currentTerm,
      success: true,
      matchIndex: this.lastLogIndex(),
    };
  }

  private applyCommittedEntries(): void {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied += 1;
      const entry = this.log[this.lastApplied - 1];
      if (entry.command.type === "merge") {
        this.state = { ...this.state, ...entry.command.patch };
      }
    }
  }

  private async replicateRound(): Promise<void> {
    if (this.role !== "leader") {
      return;
    }

    await Promise.all(this.peers.map((peer) => this.replicateToPeer(peer)));
    this.advanceCommitIndex();
    this.applyCommittedEntries();
  }

  private async replicateToPeer(peer: NodeAddress): Promise<void> {
    if (this.role !== "leader") {
      return;
    }

    const nextIndex = this.nextIndex.get(peer.id) ?? 1;
    const prevLogIndex = nextIndex - 1;
    const prevLogTerm = this.termAt(prevLogIndex);
    const entries = this.log.slice(nextIndex - 1);

    const request: AppendEntriesRequest = {
      term: this.currentTerm,
      leaderId: this.self.id,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex,
    };

    try {
      const response = await postJson<
        AppendEntriesRequest,
        AppendEntriesResponse
      >(
        peer.host,
        peer.port,
        "/raft/append-entries",
        request,
        this.config.rpcTimeoutMs,
      );

      if (response.term > this.currentTerm) {
        this.becomeFollower(response.term, null);
        return;
      }

      if (this.role !== "leader") {
        return;
      }

      if (response.success) {
        this.matchIndex.set(peer.id, response.matchIndex);
        this.nextIndex.set(peer.id, response.matchIndex + 1);
      } else {
        const fallback = Math.max(1, nextIndex - 1);
        this.nextIndex.set(peer.id, fallback);
      }
    } catch {
      // Keep current nextIndex and retry on next heartbeat.
    }
  }

  private advanceCommitIndex(): void {
    const lastIndex = this.lastLogIndex();
    for (let index = lastIndex; index > this.commitIndex; index -= 1) {
      const entry = this.log[index - 1];
      if (entry.term !== this.currentTerm) {
        continue;
      }

      let replicas = 1;
      for (const peer of this.peers) {
        if ((this.matchIndex.get(peer.id) ?? 0) >= index) {
          replicas += 1;
        }
      }

      if (replicas >= this.majorityCount()) {
        this.commitIndex = index;
        return;
      }
    }
  }

  private async confirmLeadership(): Promise<boolean> {
    if (this.role !== "leader") {
      return false;
    }

    let positive = 1;

    const confirmations = this.peers.map(async (peer) => {
      const nextIndex = this.nextIndex.get(peer.id) ?? this.lastLogIndex() + 1;
      const prevLogIndex = Math.max(0, nextIndex - 1);
      const request: AppendEntriesRequest = {
        term: this.currentTerm,
        leaderId: this.self.id,
        prevLogIndex,
        prevLogTerm: this.termAt(prevLogIndex),
        entries: [],
        leaderCommit: this.commitIndex,
      };

      try {
        const response = await postJson<
          AppendEntriesRequest,
          AppendEntriesResponse
        >(
          peer.host,
          peer.port,
          "/raft/append-entries",
          request,
          this.config.rpcTimeoutMs,
        );

        if (response.term > this.currentTerm) {
          this.becomeFollower(response.term, null);
          return;
        }

        if (response.success) {
          positive += 1;
        }
      } catch {
        // Ignore failed confirmation from unavailable peers.
      }
    });

    await Promise.all(confirmations);
    return this.role === "leader" && positive >= this.majorityCount();
  }

  private async handleClientRead(): Promise<{
    status: number;
    payload: Record<string, unknown>;
  }> {
    if (this.role !== "leader") {
      return this.proxyToLeader("/client/read", {});
    }

    const hasMajority = await this.confirmLeadership();
    if (!hasMajority) {
      return {
        status: 503,
        payload: {
          error: "majority_unavailable",
          message: "Leader cannot contact majority",
        },
      };
    }

    return {
      status: 200,
      payload: {
        term: this.currentTerm,
        leaderId: this.self.id,
        commitIndex: this.commitIndex,
        state: this.state,
      },
    };
  }

  private async handleClientUpdate(
    request: ClientUpdateRequest,
  ): Promise<{ status: number; payload: Record<string, unknown> }> {
    if (!isRecord(request) || !isRecord(request.patch)) {
      return {
        status: 400,
        payload: {
          error: "invalid_payload",
          message: "Body must be { patch: object }",
        },
      };
    }

    if (this.role !== "leader") {
      return this.proxyToLeader("/client/update", request);
    }

    const entry: LogEntry = {
      index: this.lastLogIndex() + 1,
      term: this.currentTerm,
      command: {
        type: "merge",
        patch: request.patch,
      },
    };
    this.log.push(entry);

    const committed = await this.waitForCommit(entry.index, 5000);
    if (!committed) {
      return {
        status: 503,
        payload: {
          error: "commit_failed",
          message: "Could not replicate update to a majority",
        },
      };
    }

    return {
      status: 200,
      payload: {
        term: this.currentTerm,
        leaderId: this.self.id,
        commitIndex: this.commitIndex,
        state: this.state,
      },
    };
  }

  private async waitForCommit(
    index: number,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (this.role !== "leader") {
        return false;
      }

      await this.replicateRound();

      if (this.commitIndex >= index) {
        return true;
      }

      await sleep(80);
    }

    return false;
  }

  private async proxyToLeader(
    path: "/client/read" | "/client/update",
    body: Record<string, unknown>,
  ): Promise<{ status: number; payload: Record<string, unknown> }> {
    const leader = this.findLeader();
    if (!leader) {
      return {
        status: 503,
        payload: {
          error: "leader_unknown",
          message: "No known leader right now",
        },
      };
    }

    try {
      const payload = await postJson<
        Record<string, unknown>,
        Record<string, unknown>
      >(leader.host, leader.port, path, body, this.config.rpcTimeoutMs);
      return { status: 200, payload };
    } catch {
      return {
        status: 503,
        payload: {
          error: "leader_unreachable",
          leaderId: leader.id,
          message: "Known leader is not reachable",
        },
      };
    }
  }

  private findLeader(): NodeAddress | null {
    if (this.leaderId === null) {
      return null;
    }
    return this.config.nodes.find((node) => node.id === this.leaderId) ?? null;
  }
}
