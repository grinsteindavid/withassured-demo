import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoicePdfData {
  id: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  subtotalCents: number;
  totalCents: number;
  status: string;
  lineItems: Array<{ description: string; amount: number; quantity: number }>;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(input: string | Date): string {
  return new Date(input).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function generateInvoicePdf(
  invoice: InvoicePdfData,
  orgName: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  const margin = 50;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = height - margin;
  const lineHeight = 18;
  const smallLineHeight = 14;

  function drawText(
    text: string,
    x: number,
    opts?: { size?: number; color?: ReturnType<typeof rgb>; font?: typeof font },
  ) {
    const f = opts?.font ?? font;
    const size = opts?.size ?? 12;
    const color = opts?.color ?? rgb(0, 0, 0);
    page.drawText(text, { x, y, size, font: f, color });
  }

  function moveDown(amount = lineHeight) {
    y -= amount;
  }

  // Header
  drawText("Invoice", margin, { size: 24, font: boldFont });
  moveDown(28);
  drawText(`${orgName}`, margin, { size: 14, font: boldFont });
  moveDown(smallLineHeight);
  drawText(`Invoice ID: ${invoice.id}`, margin);
  moveDown(smallLineHeight);
  drawText(
    `Period: ${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`,
    margin,
  );
  moveDown(smallLineHeight);
  drawText(`Status: ${invoice.status}`, margin);
  moveDown(28);

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  moveDown(14);

  // Line items header
  drawText("Description", margin, { font: boldFont });
  drawText("Qty", width - margin - 160, { font: boldFont });
  drawText("Amount", width - margin - 80, { font: boldFont });
  moveDown(lineHeight);

  // Divider
  page.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: width - margin, y: y + 4 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  moveDown(6);

  // Line items
  for (const item of invoice.lineItems) {
    drawText(item.description, margin, { size: 11 });
    drawText(String(item.quantity), width - margin - 160, { size: 11 });
    drawText(formatCents(item.amount), width - margin - 80, { size: 11 });
    moveDown(smallLineHeight);
  }

  moveDown(10);

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  moveDown(14);

  // Totals
  drawText("Subtotal", width - margin - 160, { font: boldFont });
  drawText(formatCents(invoice.subtotalCents), width - margin - 80);
  moveDown(lineHeight);

  drawText("Total", width - margin - 160, { font: boldFont, size: 14 });
  drawText(formatCents(invoice.totalCents), width - margin - 80, {
    font: boldFont,
    size: 14,
  });
  moveDown(28);

  // Footer
  y = margin + 20;
  drawText(
    `Generated on ${new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    margin,
    { size: 10, color: rgb(0.5, 0.5, 0.5) },
  );

  return doc.save();
}
