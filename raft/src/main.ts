import { parseNodeId } from "./config";
import { RaftNode } from "./raftNode";

function main(): void {
  const nodeId = parseNodeId(process.argv.slice(2));
  const node = new RaftNode(nodeId);
  node.start();
}

main();
