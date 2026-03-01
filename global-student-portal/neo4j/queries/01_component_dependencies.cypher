MATCH (a:Component)-[:DEPENDS_ON]->(b:Component)
RETURN a.name AS dependsFrom, b.name AS dependsTo
ORDER BY dependsFrom, dependsTo;
