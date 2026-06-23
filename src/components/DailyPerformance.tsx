import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Snapshot {
  id: string;
  date: string;
  broker: string;
  total_invested: number;
  current_value: number;
  realized_pnl: number;
}

interface Props {
  portfolioId: string;
  activeBroker: string;
}

export default function DailyPerformance({ portfolioId, activeBroker }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    if (!portfolioId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_snapshots")
        .select("*")
        .eq("portfolio_id", portfolioId)
        .eq("broker", activeBroker)
        .order("date", { ascending: false });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (err: unknown) {
      const code = err instanceof Error ? (err as { code?: string }).code : null;
      if (code !== "42P01") {
        // Ignore missing table error if they haven't run SQL yet
        console.error("Error fetching snapshots:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, activeBroker]);

  useEffect(() => {
    fetchSnapshots();
  }, [portfolioId, activeBroker, fetchSnapshots]);

  const handleGenerate = async () => {
    if (!portfolioId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/snapshots?portfolio_id=${portfolioId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }
      await fetchSnapshots();
    } catch (err) {
      console.error(err);
      alert(
        "Gagal menghasilkan report. Pastikan Anda sudah menjalankan SQL di Supabase untuk membuat tabel daily_snapshots!",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  // Pre-process and filter holidays
  const processedSnapshots = useMemo(() => {
    const arr = snapshots.map((snap, index) => {
      const currentUnrealized = snap.current_value - snap.total_invested;
      let dailyUnPnl = currentUnrealized;
      if (index < snapshots.length - 1) {
        const prevSnap = snapshots[index + 1];
        const prevUnrealized = prevSnap.current_value - prevSnap.total_invested;
        dailyUnPnl = currentUnrealized - prevUnrealized;
      }
      return { ...snap, dailyUnPnl };
    });

    // Filter out rows where both Daily Unrealized PnL is 0 AND Realized PnL is 0 (assumed holiday)
    return arr.filter(
      (s) => Math.abs(s.dailyUnPnl) > 0 || Math.abs(s.realized_pnl) > 0,
    );
  }, [snapshots]);

  // Chart data needs to be sorted ascending (oldest to newest)
  const chartData = useMemo(() => {
    return [...processedSnapshots].reverse().map((s) => ({
      date: formatDate(s.date),
      value: s.current_value,
    }));
  }, [processedSnapshots]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm mt-8">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold tracking-tight text-zinc-900">
            Historical Daily Performance
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            End of day portfolio snapshots
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Zap size={14} />
          )}
          Generate Today&apos;s Report
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center text-zinc-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : processedSnapshots.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 text-sm border-t border-zinc-100">
          Belum ada laporan harian. Klik tombol di atas untuk generate laporan
          hari ini!
        </div>
      ) : (
        <>
          <div className="p-6 border-b border-zinc-200 bg-white h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => formatCurrency(value || 0)}
                  labelStyle={{
                    color: "#52525b",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                  itemStyle={{
                    color: "#059669",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs">
                    Date
                  </th>
                  <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">
                    Total Invested
                  </th>
                  <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">
                    Market Value
                  </th>
                  <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">
                    Daily Unrealized PnL
                  </th>
                  <th className="py-3 px-6 font-medium text-zinc-500 uppercase tracking-wider text-xs text-right">
                    Realized PnL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {processedSnapshots.map((snap) => {
                  const unPnl = snap.dailyUnPnl;
                  const unPnlColorClass =
                    unPnl >= 0 ? "text-emerald-600" : "text-rose-600";
                  const rePnlColorClass =
                    snap.realized_pnl >= 0
                      ? "text-emerald-600"
                      : "text-rose-600";

                  return (
                    <tr
                      key={snap.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="py-3 px-6 font-medium text-zinc-900 whitespace-nowrap">
                        {formatDate(snap.date)}
                      </td>
                      <td className="py-3 px-6 text-right tabular-nums text-emerald-600">
                        {formatCurrency(snap.total_invested)}
                      </td>
                      <td className="py-3 px-6 text-right tabular-nums text-zinc-900 font-semibold">
                        {formatCurrency(snap.current_value)}
                      </td>
                      <td
                        className={`py-3 px-6 text-right tabular-nums font-semibold ${unPnlColorClass}`}
                      >
                        {unPnl >= 0 ? "+" : ""}
                        {formatCurrency(unPnl)}
                      </td>
                      <td
                        className={`py-3 px-6 text-right tabular-nums font-semibold ${snap.realized_pnl !== 0 ? rePnlColorClass : "text-zinc-400"}`}
                      >
                        {snap.realized_pnl >= 0 && snap.realized_pnl !== 0
                          ? "+"
                          : ""}
                        {snap.realized_pnl !== 0
                          ? formatCurrency(snap.realized_pnl)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
