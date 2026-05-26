import React from "react";

interface Observation {
  id: string;
  type: string;
  name?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  model?: string | null;
  input?: string | null;
  output?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  calculatedCost?: unknown;
  level: string;
  statusMessage?: string | null;
  parentObservationId?: string | null;
  metadata?: unknown;
}

type TreeNode = Observation & { children: TreeNode[] };

interface Props {
  observations: Observation[];
}

function buildTree(observations: Observation[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const o of observations) {
    map.set(o.id, { ...o, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const o of map.values()) {
    if (o.parentObservationId && map.has(o.parentObservationId)) {
      map.get(o.parentObservationId)!.children.push(o);
    } else {
      roots.push(o);
    }
  }
  return roots;
}

function SpanNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const latency =
    node.startTime && node.endTime
      ? new Date(node.endTime).getTime() - new Date(node.startTime).getTime()
      : null;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="bg-gray-50 rounded p-3 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase text-gray-500">{node.type}</span>
          <span className="font-medium">{node.name || node.id.slice(0, 8)}</span>
          {node.level !== "DEFAULT" && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                node.level === "ERROR" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {node.level}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 flex gap-3">
          {node.model && <span>model: {node.model}</span>}
          {latency !== null && <span>latency: {latency}ms</span>}
          {node.totalTokens != null && <span>tokens: {node.totalTokens}</span>}
        </div>
        {node.input && (
          <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto">
            {typeof node.input === "string" ? node.input : JSON.stringify(node.input, null, 2)}
          </pre>
        )}
        {node.output && (
          <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto">
            {typeof node.output === "string" ? node.output : JSON.stringify(node.output, null, 2)}
          </pre>
        )}
      </div>
      {node.children.map((child) => (
        <SpanNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function SpanTree({ observations }: Props) {
  const roots = buildTree(observations);
  return (
    <div>
      {roots.map((r) => (
        <SpanNode key={r.id} node={r} />
      ))}
    </div>
  );
}
