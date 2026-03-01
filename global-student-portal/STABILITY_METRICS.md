# Global Student Portal — Stability Metrics

Formula from Clean Architecture:

- `Fan-in (Ca)` = count of incoming dependencies
- `Fan-out (Ce)` = count of outgoing dependencies
- `Instability (I)` = `Ce / (Ca + Ce)`

Calculated for the component dependency graph stored in Neo4j.

| Component       | Fan-in (Ca) | Fan-out (Ce) | I (Instability) |
| --------------- | ----------: | -----------: | --------------: |
| APIGateway      |           1 |            2 |           0.667 |
| AcademicRecords |           2 |            2 |           0.500 |
| BillingPayments |           1 |            3 |           0.750 |
| Document        |           3 |            0 |           0.000 |
| EventBus        |           3 |            1 |           0.250 |
| IdentityAccess  |           2 |            1 |           0.333 |
| Notification    |           3 |            1 |           0.250 |
| PortalBFF       |           1 |            9 |           0.900 |
| PortalWeb       |           0 |            1 |           1.000 |
| Registration    |           1 |            2 |           0.667 |
| RequestTicket   |           1 |            1 |           0.500 |
| StudentProfile  |           1 |            0 |           0.000 |
| TenantConfig    |           4 |            0 |           0.000 |

## Interpretation

- Components near `I -> 0` are stable (many depend on them, they depend on few others), e.g. `TenantConfig`, `Document`.
- Components near `I -> 1` are unstable/volatile (depend on many others), e.g. `PortalWeb`, `PortalBFF`.
- Mid-range values indicate balanced coupling, e.g. `AcademicRecords`, `RequestTicket`.
