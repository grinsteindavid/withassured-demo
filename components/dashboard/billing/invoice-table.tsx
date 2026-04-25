import { DataTable } from "../data-table";

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
          <td className="px-4 py-2">{invoice.id}</td>
          <td className="px-4 py-2">
            {new Date(invoice.periodStart).toLocaleDateString()} -{" "}
            {new Date(invoice.periodEnd).toLocaleDateString()}
          </td>
          <td className="px-4 py-2">${invoice.subtotalCents / 100}</td>
          <td className="px-4 py-2">${invoice.totalCents / 100}</td>
          <td className="px-4 py-2">{invoice.status}</td>
        </tr>
      ))}
    </DataTable>
  );
}
