MATCH (c:Component)
OPTIONAL MATCH (incoming:Component)-[:DEPENDS_ON]->(c)
WITH c, count(incoming) AS fanIn
OPTIONAL MATCH (c)-[:DEPENDS_ON]->(outgoing:Component)
WITH c.name AS component, fanIn, count(outgoing) AS fanOut
WITH component, fanIn, fanOut,
     CASE
       WHEN (fanIn + fanOut) = 0 THEN 0.0
       ELSE round((toFloat(fanOut) / toFloat(fanIn + fanOut)) * 1000.0) / 1000.0
     END AS instability
RETURN component, fanIn, fanOut, instability
ORDER BY component;
