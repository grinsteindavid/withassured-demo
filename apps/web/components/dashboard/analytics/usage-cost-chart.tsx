"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface UsageCostChartProps {
  data: Array<{
    month: string;
    credentialing: number;
    licensing: number;
    enrollment: number;
    monitoring: number;
  }>;
}

export function UsageCostChart({ data }: UsageCostChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 100).toLocaleString()}`}
          />
          <Tooltip
            labelFormatter={(label) => label}
            formatter={(value: any) => `$${(Number(value) / 100).toLocaleString()}`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
          />
          <Area
            type="monotone"
            dataKey="credentialing"
            stackId="1"
            stroke="hsl(142, 76%, 36%)"
            fill="hsl(142, 76%, 36%)"
            name="Credentialing"
          />
          <Area
            type="monotone"
            dataKey="licensing"
            stackId="1"
            stroke="hsl(48, 96%, 53%)"
            fill="hsl(48, 96%, 53%)"
            name="Licensing"
          />
          <Area
            type="monotone"
            dataKey="enrollment"
            stackId="1"
            stroke="hsl(217, 91%, 60%)"
            fill="hsl(217, 91%, 60%)"
            name="Enrollment"
          />
          <Area
            type="monotone"
            dataKey="monitoring"
            stackId="1"
            stroke="hsl(280, 65%, 60%)"
            fill="hsl(280, 65%, 60%)"
            name="Monitoring"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
