// Types that model workflow execution and the UI step list.

export type WorkflowExecutionStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "TERMINATED"
  | "TIMED_OUT";

export type WorkflowType =
  | "credentialing"
  | "license"
  | "enrollment"
  | "compliance";

export type WorkflowExecutionDescription = {
  workflowId: string;
  runId: string;
  type: WorkflowType;
  status: { name: WorkflowExecutionStatus };
  startTime: Date;
  closeTime?: Date;
  historyLength: number;
  taskQueue: string;
};

export type HistoryEventType =
  | "WorkflowExecutionStarted"
  | "WorkflowExecutionCompleted"
  | "WorkflowExecutionFailed"
  | "ActivityTaskScheduled"
  | "ActivityTaskStarted"
  | "ActivityTaskCompleted"
  | "ActivityTaskFailed";

export type HistoryEvent = {
  eventId: number;
  eventTime: Date;
  eventType: HistoryEventType;
  activityType?: string;
  attempt?: number;
  failure?: { message: string };
};

export type WorkflowHistory = {
  events: HistoryEvent[];
};

// UI-derived shape (output of the reducer, consumed by <WorkflowTimeline>).
export type WorkflowStep = {
  name: string;
  status: "COMPLETED" | "RUNNING" | "PENDING" | "FAILED";
  at?: string;
  attempt?: number;
};
