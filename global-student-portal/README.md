# Global Student Portal — Neo4j Setup Guide

## 1. contents

- `docker-compose.yml` — starts Neo4j locally
- `neo4j/migrations/001_schema_and_data.cypher` — recreates graph schema + seed data
- `neo4j/migrations/002_compute_stability.cypher` — computes and stores fan-in, fan-out, instability
- `neo4j/queries/01_component_dependencies.cypher` — lists dependency edges
- `neo4j/queries/02_stability_metrics.cypher` — returns stability metrics table

## 2. prerequisites

- docker

## 3. start Neo4j

from `global-student-portal`:

```bash
docker compose up -d
```

Neo4j endpoints:

- browser: `http://localhost:7474`
- credentials: `neo4j / password`

## 4. load exactly the same data (reproducible)

run migrations in order:

```bash
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password < /migrations/001_schema_and_data.cypher
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password < /migrations/002_compute_stability.cypher
```

why this is reproducible:

- `001_schema_and_data.cypher` starts with `MATCH (n) DETACH DELETE n;` to reset graph state
- same components + same `DEPENDS_ON` edges are inserted on every run
- `002_compute_stability.cypher` recomputes metrics from the current graph deterministically

## 5. run analysis queries

```bash
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password < /queries/01_component_dependencies.cypher
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password < /queries/02_stability_metrics.cypher
```

## 6. quick validation checks

check component count:

```bash
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password "MATCH (c:Component) RETURN count(c) AS components;"
```

check dependency edge count:

```bash
docker exec -i gsp-neo4j cypher-shell -u neo4j -p password "MATCH (:Component)-[r:DEPENDS_ON]->(:Component) RETURN count(r) AS dependencies;"
```

expected values for this dataset:

- `components = 13`
- `dependencies = 23`

## 7. reset and rerun

if needed, just rerun migration step 4. it fully rebuilds the graph content.

## 8. stop services

```bash
docker compose down
```

to remove persisted DB volume too:

```bash
docker compose down -v
```
