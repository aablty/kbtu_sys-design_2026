MATCH (c:Component)
OPTIONAL MATCH (incoming:Component)-[:DEPENDS_ON]->(c)
WITH c, count(incoming) AS fanIn
OPTIONAL MATCH (c)-[:DEPENDS_ON]->(outgoing:Component)
WITH c, fanIn, count(outgoing) AS fanOut
WITH c, fanIn, fanOut,
     CASE
       WHEN (fanIn + fanOut) = 0 THEN 0.0
       ELSE toFloat(fanOut) / toFloat(fanIn + fanOut)
     END AS instability
SET c.fanIn = fanIn,
    c.fanOut = fanOut,
    c.instability = round(instability * 1000.0) / 1000.0,
    c.updatedAt = datetime()
RETURN c.name AS component, c.fanIn AS fanIn, c.fanOut AS fanOut, c.instability AS instability
ORDER BY component;
