import { WorkflowStep } from "@/lib/temporal/types";
import { formatDateTime } from "@/lib/format";

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
}

export function WorkflowTimeline({ steps }: WorkflowTimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.name} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${
                step.status === "COMPLETED"
                  ? "bg-green-500"
                  : step.status === "RUNNING"
                  ? "bg-blue-500 animate-pulse"
                  : step.status === "FAILED"
                  ? "bg-red-500"
                  : "bg-gray-300"
              }`}
            />
            {index < steps.length - 1 && (
              <div className="h-8 w-0.5 bg-gray-200" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{step.name}</p>
            {step.at && <p className="text-sm text-gray-500">{formatDateTime(step.at)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
