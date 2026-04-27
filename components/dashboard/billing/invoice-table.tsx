import Link from "next/link";
import { DataTable } from "../data-table";
import { StatusBadge } from "../status-badge";
import { formatDate } from "@/lib/format";

interface InvoiceTableProps {
  invoices: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    subtotalCents: number;
    totalCents: number;
    status: string;
  }>;
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  return (
    <DataTable columns={["ID", "Period", "Subtotal", "Total", "Status"]}>
      {invoices.map((invoice) => (
        <tr key={invoice.id} className="border-b">
          <td className="px-4 py-2">
            <Link
              href={`/dashboard/billing/invoices/${invoice.id}`}
              className="text-blue-600 hover:underline"
            >
              {invoice.id}
            </Link>
          </td>
          <td className="px-4 py-2">
            {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
          </td>
          <td className="px-4 py-2">${invoice.subtotalCents / 100}</td>
          <td className="px-4 py-2">${invoice.totalCents / 100}</td>
          <td className="px-4 py-2">
            <StatusBadge status={invoice.status} />
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
