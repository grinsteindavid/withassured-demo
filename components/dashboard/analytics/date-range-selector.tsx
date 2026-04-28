"use client";

import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";

interface DateRangeSelectorProps {
  currentDays: number;
}

export function DateRangeSelector({ currentDays }: DateRangeSelectorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const setDays = (days: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("days", days.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <Button variant={currentDays === 30 ? "default" : "outline"} size="sm" onClick={() => setDays(30)}>
        30 days
      </Button>
      <Button variant={currentDays === 90 ? "default" : "outline"} size="sm" onClick={() => setDays(90)}>
        90 days
      </Button>
      <Button variant={currentDays === 365 ? "default" : "outline"} size="sm" onClick={() => setDays(365)}>
        1 year
      </Button>
    </div>
  );
}
