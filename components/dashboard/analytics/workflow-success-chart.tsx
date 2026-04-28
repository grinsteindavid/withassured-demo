"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WorkflowSuccessChartProps {
  data: Array<{
    workflowType: string;
    completed: number;
    failed: number;
    inProgress: number;
  }>;
}

export function WorkflowSuccessChart({ data }: WorkflowSuccessChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="workflowType" type="category" width={100} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
          />
          <Bar dataKey="completed" stackId="a" fill="hsl(142, 76%, 36%)" name="Completed" />
          <Bar dataKey="inProgress" stackId="a" fill="hsl(48, 96%, 53%)" name="In Progress" />
          <Bar dataKey="failed" stackId="a" fill="hsl(0, 84%, 60%)" name="Failed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
