"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TimeToRevenueChartProps {
  data: Array<{
    month: string;
    completed: number;
    baseline: number;
  }>;
}

export function TimeToRevenueChart({ data }: TimeToRevenueChartProps) {
  // Calculate baseline as 60-day industry standard (2 providers per month baseline)
  const chartData = data.map((d) => ({
    ...d,
    baseline: 2, // Industry baseline: 2 credentialing completions per month
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Completed"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Industry Baseline (60 days)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
