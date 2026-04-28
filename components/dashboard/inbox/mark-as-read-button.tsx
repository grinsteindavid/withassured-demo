"use client";

import { useRouter } from "next/navigation";

interface MarkAsReadButtonProps {
  alertId: string;
  entityType: string;
  entityId: string;
}

export function MarkAsReadButton({ alertId, entityType, entityId }: MarkAsReadButtonProps) {
  const router = useRouter();

  const handleClick = async () => {
    try {
      await fetch(`/api/alerts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertIds: [alertId] }),
      });
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }

    const link = getEntityLink(entityType, entityId);
    router.push(link);
  };

  const getEntityLink = (entityType: string, entityId: string) => {
    switch (entityType) {
      case "credentialing":
        return `/dashboard/credentialing?provider=${entityId}`;
      case "license":
        return `/dashboard/licensing?provider=${entityId}`;
      case "enrollment":
        return `/dashboard/enrollment?provider=${entityId}`;
      case "compliance":
        return `/dashboard/compliance?provider=${entityId}`;
      default:
        return "#";
    }
  };

  return (
    <button
      onClick={handleClick}
      className="text-blue-600 hover:text-blue-900"
    >
      View
    </button>
  );
}
