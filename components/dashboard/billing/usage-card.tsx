interface UsageCardProps {
  title: string;
  count: number;
  unitCents: number;
  subtotalCents: number;
}

export function UsageCard({ title, count, unitCents, subtotalCents }: UsageCardProps) {
  return (
    <div className="rounded border p-4">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm text-gray-600">
        ${subtotalCents / 100} ({count} × ${unitCents / 100})
      </p>
    </div>
  );
}
