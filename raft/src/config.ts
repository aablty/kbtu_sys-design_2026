import { ClusterConfig, NodeAddress } from "./types";

const DEFAULT_NODES: NodeAddress[] = [
  { id: 1, host: "127.0.0.1", port: 5001 },
  { id: 2, host: "127.0.0.1", port: 5002 },
  { id: 3, host: "127.0.0.1", port: 5003 },
  { id: 4, host: "127.0.0.1", port: 5004 },
  { id: 5, host: "127.0.0.1", port: 5005 },
];

export function loadConfig(): ClusterConfig {
  return {
    nodes: DEFAULT_NODES,
    electionTimeoutMinMs: 1200,
    electionTimeoutMaxMs: 2600,
    heartbeatIntervalMs: 350,
    rpcTimeoutMs: 800,
  };
}

export function parseNodeId(args: string[]): number {
  const idIndex = args.findIndex((value) => value === "--id");
  if (idIndex >= 0 && args[idIndex + 1]) {
    return Number(args[idIndex + 1]);
  }

  const envValue = process.env.NODE_ID;
  if (envValue) {
    return Number(envValue);
  }

  throw new Error("Missing node id. Use --id <1..5> or set NODE_ID.");
}
