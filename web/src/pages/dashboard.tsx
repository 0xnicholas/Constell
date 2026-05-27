import { useState } from "react";
import { api } from "../utils/api";
import { useDateRange } from "../features/dashboard/hooks/useDateRange";
import { KpiCard } from "../features/dashboard/components/KpiCard";
import { TrendChart } from "../features/dashboard/components/TrendChart";
import { ModelTable } from "../features/dashboard/components/ModelTable";
import { EmptyState } from "../features/dashboard/components/EmptyState";
import { ScoreKpiCard } from "../features/dashboard/components/ScoreKpiCard";
import { ScoreTrendChart } from "../features/dashboard/components/ScoreTrendChart";

export default function DashboardPage() {
  const { preset, setPreset, from, to } = useDateRange();
  const [granularity, setGranularity] = useState<"hour" | "day" | undefined>(undefined);
  const [selectedScoreName, setSelectedScoreName] = useState<string | undefined>(undefined);

  const summaryQuery = api.metrics.summary.useQuery({ from, to });
  const trendsQuery = api.metrics.trends.useQuery({ from, to, granularity });
  const modelQuery = api.metrics.modelBreakdown.useQuery({ from, to });

  const configsQuery = api.scores.configList.useQuery({});
  const scoreAnalyticsQuery = api.scores.analytics.useQuery(
    { name: selectedScoreName ?? "" },
    { enabled: !!selectedScoreName }
  );
  const scoreTrendsQuery = api.scores.trends.useQuery(
    { name: selectedScoreName ?? "" },
    { enabled: !!selectedScoreName }
  );

  const numericConfigs = configsQuery.data?.filter((c) => c.dataType === "NUMERIC") ?? [];

  const hasData = summaryQuery.data && summaryQuery.data.traceCount > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                preset === p ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!hasData && !summaryQuery.isLoading ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Traces" value={summaryQuery.data?.traceCount.toLocaleString() ?? "-"} />
            <KpiCard
              label="Tokens"
              value={summaryQuery.data?.totalTokens.toLocaleString() ?? "-"}
            />
            <KpiCard label="Cost" value={`$${summaryQuery.data?.totalCost ?? "-"}`} />
            <KpiCard label="Avg Latency" value={`${summaryQuery.data?.avgLatencyMs ?? "-"}ms`} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <KpiCard label="P95 Latency" value={`${summaryQuery.data?.p95LatencyMs ?? "-"}ms`} />
            <KpiCard label="Error Rate" value={`${summaryQuery.data?.errorRate ?? "-"}%`} />
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Errors</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {summaryQuery.data?.errorCount ?? "-"}
              </div>
            </div>
          </div>

          {numericConfigs.length > 0 && (
            <>
              <div className="mb-2 text-sm font-medium text-gray-700">Score Metrics</div>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreKpiCard
                  label={`Avg ${numericConfigs[0]?.name ?? ""}`}
                  value={
                    scoreAnalyticsQuery.data?.average !== null
                      ? (scoreAnalyticsQuery.data?.average ?? 0).toFixed(2)
                      : "—"
                  }
                />
                <ScoreKpiCard
                  label="Score Count"
                  value={scoreAnalyticsQuery.data?.count.toLocaleString() ?? "—"}
                />
              </div>

              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Score Trend:</span>
                  <select
                    value={selectedScoreName ?? ""}
                    onChange={(e) => setSelectedScoreName(e.target.value || undefined)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="">Select dimension…</option>
                    {numericConfigs.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedScoreName && (
                  <ScoreTrendChart
                    data={scoreTrendsQuery.data ?? []}
                    label={`${selectedScoreName} (7d)`}
                  />
                )}
              </div>
            </>
          )}

          <div className="mb-6">
            <TrendChart
              data={trendsQuery.data?.data ?? []}
              label={`Cost Trend (${trendsQuery.data?.actualGranularity ?? "day"})`}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Model Breakdown</h2>
            <ModelTable models={modelQuery.data?.models ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
