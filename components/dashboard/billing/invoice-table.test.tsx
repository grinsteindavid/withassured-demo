import { describe, it, expect } from "bun:test";

import { render, screen } from "@testing-library/react";

const { InvoiceTable } = await import("./invoice-table");

describe("<InvoiceTable />", () => {
  it("renders invoice rows with correct data", () => {
    const invoices = [
      {
        id: "inv_1",
        periodStart: "2024-01-01T00:00:00.000Z",
        periodEnd: "2024-01-31T00:00:00.000Z",
        subtotalCents: 5000,
        totalCents: 5500,
        status: "PAID",
      },
    ];

    render(<InvoiceTable invoices={invoices} />);

    const link = screen.getByRole("link", { name: "inv_1" }) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toContain("/dashboard/billing/invoices/inv_1");
    expect(screen.getByText("$50")).toBeTruthy();
    expect(screen.getByText("$55")).toBeTruthy();
  });

  it("renders empty table when no invoices", () => {
    render(<InvoiceTable invoices={[]} />);

    expect(screen.getByText("ID")).toBeTruthy();
  });

  it("renders status badges for each invoice", () => {
    const invoices = [
      {
        id: "inv_1",
        periodStart: "2024-01-01T00:00:00.000Z",
        periodEnd: "2024-01-31T00:00:00.000Z",
        subtotalCents: 5000,
        totalCents: 5500,
        status: "OPEN",
      },
    ];

    render(<InvoiceTable invoices={invoices} />);

    expect(screen.getByText("OPEN")).toBeTruthy();
  });

  it("renders multiple invoice rows", () => {
    const invoices = [
      {
        id: "inv_1",
        periodStart: "2024-01-01T00:00:00.000Z",
        periodEnd: "2024-01-31T00:00:00.000Z",
        subtotalCents: 5000,
        totalCents: 5500,
        status: "PAID",
      },
      {
        id: "inv_2",
        periodStart: "2024-02-01T00:00:00.000Z",
        periodEnd: "2024-02-28T00:00:00.000Z",
        subtotalCents: 6000,
        totalCents: 6500,
        status: "OPEN",
      },
    ];

    render(<InvoiceTable invoices={invoices} />);

    const links = screen.getAllByRole("link");
    expect(links.length).toBe(2);
    expect(links[0]).toHaveTextContent("inv_1");
    expect(links[1]).toHaveTextContent("inv_2");
  });
});
