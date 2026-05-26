import React from "react";
import Link from "next/link";

export interface TraceRow {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  release?: string | null;
  version?: string | null;
  total_tokens?: number;
  total_cost?: string;
  latency_ms?: number;
  observation_count?: number;
  has_error?: number;
  created_at?: string;
}

interface Props {
  traces: TraceRow[];
  projectId: string;
}

export function TraceTable({ traces, projectId }: Props) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2">Name/ID</th>
          <th className="px-4 py-2">User</th>
          <th className="px-4 py-2">Tokens</th>
          <th className="px-4 py-2">Cost</th>
          <th className="px-4 py-2">Latency</th>
          <th className="px-4 py-2">Observations</th>
          <th className="px-4 py-2">Time</th>
        </tr>
      </thead>
      <tbody>
        {traces.map((t) => (
          <tr key={t.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">
              <Link href={`/traces/${t.id}`} className="text-blue-600 hover:underline">
                {t.id.slice(0, 12)}…
              </Link>
              {t.has_error ? <span className="ml-2 text-red-500 text-xs">ERROR</span> : null}
            </td>
            <td className="px-4 py-2">{t.user_id || "—"}</td>
            <td className="px-4 py-2">{t.total_tokens ?? "—"}</td>
            <td className="px-4 py-2">{t.total_cost ?? "—"}</td>
            <td className="px-4 py-2">{t.latency_ms ? `${t.latency_ms}ms` : "—"}</td>
            <td className="px-4 py-2">{t.observation_count ?? "—"}</td>
            <td className="px-4 py-2">
              {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
