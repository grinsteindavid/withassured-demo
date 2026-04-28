"use client";

import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface EnrollmentVelocityChartProps {
  data: Array<{
    payer: string;
    approvalRate: number;
    avgDaysToApproval: number;
  }>;
}

export function EnrollmentVelocityChart({ data }: EnrollmentVelocityChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="payer" type="category" width={120} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
          />
          <Bar dataKey="approvalRate" fill="hsl(var(--primary))" name="Approval Rate" />
          <Line
            type="monotone"
            dataKey="avgDaysToApproval"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            name="Avg Days to Approval"
            dot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
