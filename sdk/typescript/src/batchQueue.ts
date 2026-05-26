export interface QueuedEvent {
  id: string;
  type: "trace-create" | "observation-create";
  timestamp: string;
  body: Record<string, unknown>;
}

export class BatchQueue {
  private buffer: QueuedEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private baseUrl: string,
    private publicKey: string,
    private secretKey: string,
    private flushIntervalMs: number = 5000,
    private maxBatchSize: number = 100
  ) {}

  start() {
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  enqueue(event: QueuedEvent) {
    this.buffer.push(event);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.maxBatchSize);
    const auth =
      typeof Buffer !== "undefined"
        ? Buffer.from(`${this.publicKey}:${this.secretKey}`).toString("base64")
        : btoa(`${this.publicKey}:${this.secretKey}`);
    try {
      const res = await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ batch }),
      });
      if (!res.ok) {
        console.error("[constell] flush failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("[constell] flush error:", err);
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    return this.flush();
  }
}
