"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface WorkflowHeartbeatProps {
  interval?: number;
}

export function WorkflowHeartbeat({ interval = 5000 }: WorkflowHeartbeatProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(intervalId);
  }, [router, interval]);

  return null;
}
