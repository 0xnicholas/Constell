import type { ConstellClient } from "./client";

function authHeaders(publicKey: string, secretKey: string): Record<string, string> {
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  return { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
}

export class DatasetClient {
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  constructor(client: ConstellClient) {
    this.baseUrl = (client as any).baseUrl;
    this.publicKey = (client as any).publicKey;
    this.secretKey = (client as any).secretKey;
  }

  async create(params: {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    expectedOutputSchema?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    const res = await fetch(`${this.baseUrl}/api/public/datasets`, {
      method: "POST",
      headers: authHeaders(this.publicKey, this.secretKey),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to create dataset: ${res.status}`);
    return res.json();
  }

  async list(params?: { page?: number; limit?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    const url = `${this.baseUrl}/api/public/datasets?${qs}`;
    const res = await fetch(url, {
      headers: authHeaders(this.publicKey, this.secretKey),
    });
    if (!res.ok) throw new Error(`Failed to list datasets: ${res.status}`);
    return res.json();
  }

  async get(name: string) {
    const res = await fetch(`${this.baseUrl}/api/public/datasets/${encodeURIComponent(name)}`, {
      headers: authHeaders(this.publicKey, this.secretKey),
    });
    if (!res.ok) throw new Error(`Failed to get dataset: ${res.status}`);
    return res.json();
  }

  async delete(name: string) {
    const res = await fetch(`${this.baseUrl}/api/public/datasets/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: authHeaders(this.publicKey, this.secretKey),
    });
    if (!res.ok) throw new Error(`Failed to delete dataset: ${res.status}`);
    return res.json();
  }
}

export class DatasetItemClient {
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  constructor(client: ConstellClient) {
    this.baseUrl = (client as any).baseUrl;
    this.publicKey = (client as any).publicKey;
    this.secretKey = (client as any).secretKey;
  }

  async create(params: {
    datasetName: string;
    input?: unknown;
    expectedOutput?: unknown;
    metadata?: Record<string, unknown>;
  }) {
    const res = await fetch(`${this.baseUrl}/api/public/dataset-items`, {
      method: "POST",
      headers: authHeaders(this.publicKey, this.secretKey),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to create dataset item: ${res.status}`);
    return res.json();
  }

  async createMany(params: {
    datasetName: string;
    items: Array<{ input?: unknown; expectedOutput?: unknown; metadata?: Record<string, unknown> }>;
  }) {
    const res = await fetch(`${this.baseUrl}/api/public/dataset-items`, {
      method: "POST",
      headers: authHeaders(this.publicKey, this.secretKey),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to create dataset items: ${res.status}`);
    return res.json();
  }

  async createFromTrace(params: {
    datasetName: string;
    traceId: string;
    observationId?: string;
    input?: unknown;
    expectedOutput?: unknown;
  }) {
    const res = await fetch(`${this.baseUrl}/api/public/dataset-items`, {
      method: "POST",
      headers: authHeaders(this.publicKey, this.secretKey),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to create dataset item from trace: ${res.status}`);
    return res.json();
  }

  async list(params: { datasetName?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params.datasetName) qs.set("datasetName", params.datasetName);
    if (params.page !== undefined) qs.set("page", String(params.page));
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    const res = await fetch(`${this.baseUrl}/api/public/dataset-items?${qs}`, {
      headers: authHeaders(this.publicKey, this.secretKey),
    });
    if (!res.ok) throw new Error(`Failed to list dataset items: ${res.status}`);
    return res.json();
  }
}

export class DatasetRunClient {
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  constructor(client: ConstellClient) {
    this.baseUrl = (client as any).baseUrl;
    this.publicKey = (client as any).publicKey;
    this.secretKey = (client as any).secretKey;
  }

  async create(params: {
    datasetName: string;
    runName: string;
    description?: string;
    presetName?: string;
    promptName?: string;
    promptVersion?: number;
    model?: string;
    modelParams?: Record<string, unknown>;
    evalTemplateNames?: string[];
  }) {
    const res = await fetch(`${this.baseUrl}/api/public/dataset-runs`, {
      method: "POST",
      headers: authHeaders(this.publicKey, this.secretKey),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to create dataset run: ${res.status}`);
    return res.json();
  }

  async list(params: { datasetName: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set("page", String(params.page));
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    const res = await fetch(
      `${this.baseUrl}/api/public/datasets/${encodeURIComponent(params.datasetName)}/runs?${qs}`,
      { headers: authHeaders(this.publicKey, this.secretKey) }
    );
    if (!res.ok) throw new Error(`Failed to list dataset runs: ${res.status}`);
    return res.json();
  }

  async get(params: { datasetName: string; runName: string }) {
    const res = await fetch(
      `${this.baseUrl}/api/public/datasets/${encodeURIComponent(params.datasetName)}/runs/${encodeURIComponent(params.runName)}`,
      { headers: authHeaders(this.publicKey, this.secretKey) }
    );
    if (!res.ok) throw new Error(`Failed to get dataset run: ${res.status}`);
    return res.json();
  }

  async delete(params: { datasetName: string; runName: string }) {
    const res = await fetch(
      `${this.baseUrl}/api/public/datasets/${encodeURIComponent(params.datasetName)}/runs/${encodeURIComponent(params.runName)}`,
      { method: "DELETE", headers: authHeaders(this.publicKey, this.secretKey) }
    );
    if (!res.ok) throw new Error(`Failed to delete dataset run: ${res.status}`);
    return res.json();
  }

  async compare(params: { datasetName: string; runNames: string[] }) {
    const qs = new URLSearchParams();
    for (const name of params.runNames) qs.append("runName", name);
    const res = await fetch(
      `${this.baseUrl}/api/public/datasets/${encodeURIComponent(params.datasetName)}/compare?${qs}`,
      { headers: authHeaders(this.publicKey, this.secretKey) }
    );
    if (!res.ok) throw new Error(`Failed to compare runs: ${res.status}`);
    return res.json();
  }
}
