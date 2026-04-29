"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface LicenseExpirationChartProps {
  data: Array<{
    bucket: string;
    count: number;
  }>;
}

export function LicenseExpirationChart({ data }: LicenseExpirationChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" name="Licenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
