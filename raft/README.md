# RAFT JSON Cluster (TypeScript)

This project runs 5 independent RAFT services that maintain one replicated shared JSON object.

## Guarantees

- Single leader coordinates writes.
- Leader election is automatic if the leader fails.
- Updates commit only when replicated to a majority (3 of 5 nodes).
- Reads are served by the leader (followers forward to known leader).
- System stays available while a majority of nodes are running.

## Install and Build

```bash
npm install
npm run build
```

## Start Nodes

Start all five services (five separate Node processes):

```bash
npm run start:all
```

Or start each service manually in separate terminals:

```bash
npm run start:1
npm run start:2
npm run start:3
npm run start:4
npm run start:5
```

## Endpoints

Each service listens on:

- Node 1: http://127.0.0.1:5001
- Node 2: http://127.0.0.1:5002
- Node 3: http://127.0.0.1:5003
- Node 4: http://127.0.0.1:5004
- Node 5: http://127.0.0.1:5005

Useful endpoints:

- `GET /status` - role, term, leader, and replicated state
- `POST /client/read` - returns latest committed JSON state
- `POST /client/update` - merge update payload into JSON object

`POST /client/update` request body:

```json
{
  "patch": {
    "course": "sys-design",
    "version": 1
  }
}
```

## Quick Test

1. Send updates to any node (followers forward to leader):

```bash
curl -X POST http://127.0.0.1:5002/client/update \
  -H "Content-Type: application/json" \
  -d '{"patch":{"student":"Alice","credits":21}}'
```

2. Read from any node:

```bash
curl -X POST http://127.0.0.1:5004/client/read -H "Content-Type: application/json" -d '{}'
```

3. Stop the current leader process and repeat read/update; a new leader is elected automatically.
