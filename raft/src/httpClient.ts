import http from "node:http";

export function postJson<TRequest, TResponse>(
  host: string,
  port: number,
  path: string,
  body: TRequest,
  timeoutMs: number,
): Promise<TResponse> {
  const payload = JSON.stringify(body);

  return new Promise<TResponse>((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on("end", () => {
          const status = res.statusCode ?? 500;
          const raw = Buffer.concat(chunks).toString("utf8");

          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}: ${raw || "request failed"}`));
            return;
          }

          if (!raw) {
            resolve({} as TResponse);
            return;
          }

          try {
            resolve(JSON.parse(raw) as TResponse);
          } catch {
            reject(new Error("Failed to parse JSON response"));
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("RPC timeout"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}
