import { Order } from "@/services/api/orderService";
import { qrService } from "@/services/api/qrService";
import { jsPDF } from "jspdf";

const PAGE_W = 260;
const PAGE_H = 820;
const MARGIN = 16;
const LINE_GAP = 11;
const BODY_SIZE = 8;
const TITLE_SIZE = 10;
const MAX_CHARS = 32;

/** ASCII-safe copy for standard PDF fonts (Helvetica has no Vietnamese glyphs). */
export function stripToReceiptAscii(input: string | null | undefined): string {
  if (input == null || input === "") return "";
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, "?");
}

function moneyPlain(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return "0 VND";
  return `${Number(n).toLocaleString("en-US")} VND`;
}

function chunkLines(text: string, maxChars: number): string[] {
  const t = text.trim();
  if (!t) return [""];
  const lines: string[] = [];
  for (let i = 0; i < t.length; i += maxChars) {
    lines.push(t.slice(i, i + maxChars));
  }
  return lines;
}

function wordWrap(text: string, maxChars: number): string[] {
  const words = stripToReceiptAscii(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      if (w.length > maxChars) {
        lines.push(...chunkLines(w, maxChars));
        cur = "";
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const globalBtoa =
    typeof globalThis !== "undefined" && typeof (globalThis as { btoa?: (s: string) => string }).btoa === "function"
      ? (globalThis as { btoa: (s: string) => string }).btoa
      : typeof btoa === "function"
        ? btoa
        : null;
  if (globalBtoa) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
    }
    return globalBtoa(binary);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Buf = (globalThis as any).Buffer;
  if (Buf?.from) {
    return Buf.from(bytes).toString("base64");
  }
  throw new Error("Khong ma hoa base64 duoc (btoa/Buffer)");
}

/**
 * Builds a narrow receipt-style PDF for a store order.
 * QR image encodes the order `code` (same external QR API as before).
 * Uses jsPDF (Metro-friendly) instead of pdf-lib (nested tslib breaks Expo web).
 */
export async function buildOrderReceiptPdf(order: Order): Promise<Uint8Array> {
  const code = order.code?.trim() || "";
  if (!code) {
    throw new Error("Thieu ma don hang");
  }

  const qrUrl = await qrService.generateQR({ data: code, size: "240x240" });
  const qrRes = await fetch(qrUrl);
  if (!qrRes.ok) {
    throw new Error("Khong tai duoc hinh QR");
  }
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer());
  const qrDataUrl = `data:image/png;base64,${uint8ArrayToBase64(qrBytes)}`;

  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H] });
  /** Vertical position from top of page (baseline for text, top edge for images). */
  let y = MARGIN + TITLE_SIZE * 0.85;

  const pageH = () => doc.internal.pageSize.getHeight();

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH() - MARGIN) {
      doc.addPage([PAGE_W, PAGE_H], "portrait");
      y = MARGIN + TITLE_SIZE * 0.85;
    }
  };

  const drawLines = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? BODY_SIZE;
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(30, 30, 36);
    const lineH = LINE_GAP + size * 0.35;
    for (const line of wordWrap(text, MAX_CHARS)) {
      ensureSpace(lineH);
      doc.text(line, MARGIN, y);
      y += lineH;
    }
  };

  const drawCenter = (text: string, size: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    const t = stripToReceiptAscii(text);
    ensureSpace(size + LINE_GAP);
    doc.text(t, PAGE_W / 2, y, { align: "center" });
    y += LINE_GAP + size * 0.35;
  };

  drawCenter("BIEN NHAN DON HANG", TITLE_SIZE, true);
  drawCenter(`Ma: ${code}`, 11, true);
  y += 12;

  const qrSize = 100;
  ensureSpace(qrSize + 8);
  doc.addImage(qrDataUrl, "PNG", (PAGE_W - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + 10;

  drawCenter("(Quet QR = ma don)", BODY_SIZE, false);
  y += 4;

  const addr = [
    order.shipping_address_detail_snapshot,
    [order.shipping_ward_snapshot, order.shipping_district_snapshot, order.shipping_province_snapshot]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(" — ");

  drawLines(`Trang thai: ${String(order.status)}`);
  drawLines(`Ngay tao: ${order.created_date || "-"}`);
  drawLines(`Khach: ${order.shipping_full_name_snapshot || "-"}`);
  drawLines(`DT: ${order.shipping_phone_number_snapshot || "-"}`);
  drawLines(`Dia chi: ${addr || "-"}`);
  if (order.note) {
    drawLines(`Ghi chu: ${order.note}`);
  }
  y += 4;
  drawLines("--- Hang / Dich vu ---", { bold: true });
  const items = order.order_items ?? [];
  if (items.length === 0) {
    drawLines("(Khong co dong hang)");
  } else {
    for (const it of items) {
      const name = it.product_name || it.name || "Mat hang";
      const qty = it.quantity ?? it.adjusted_quantity ?? it.adjust_quantity ?? "";
      const type = it.product_type ? ` [${it.product_type}]` : "";
      drawLines(`* ${name}${type}`);
      drawLines(`  SL: ${qty}`);
    }
  }
  y += 4;
  drawLines(`Tong tien hang: ${moneyPlain(order.sub_total)}`);
  if (order.discount_amount) drawLines(`Giam gia: ${moneyPlain(order.discount_amount)}`);
  if (order.shipping_fee) drawLines(`Phi ship: ${moneyPlain(order.shipping_fee)}`);
  if (order.service_fee) drawLines(`Phi dich vu: ${moneyPlain(order.service_fee)}`);
  drawLines(`THANH TOAN: ${moneyPlain(order.final_total)}`, { bold: true, size: 9 });
  y += 6;
  drawCenter("Cam on quy khach!", BODY_SIZE, false);
  drawCenter("Laundry Pro Store", BODY_SIZE, false);

  const out = doc.output("arraybuffer");
  return new Uint8Array(out);
}
