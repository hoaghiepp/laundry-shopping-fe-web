import { Order } from "@/services/api/orderService";
import { storeService } from "@/services/api/storeService";
import { qrService } from "@/services/api/qrService";
import { jsPDF } from "jspdf";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** 72 pt per inch, 25.4 mm per inch → pt/mm */
const PT_PER_MM = 72 / 25.4;

/** Standard thermal roll width (80 mm — common POS / receipt printers). */
export const RECEIPT_WIDTH_MM = 80;

const PAGE_W = RECEIPT_WIDTH_MM * PT_PER_MM;
const MARGIN = 4 * PT_PER_MM;
const LINE_GAP = 3.2 * PT_PER_MM;
const BODY_SIZE = 2.5 * PT_PER_MM;
const TITLE_SIZE = 3.2 * PT_PER_MM;
const SUBTITLE_SIZE = 2.1 * PT_PER_MM;
const MAX_WRAP = 24;

function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

/** Extra top inset so header text is not clipped on thermal printers / PDF viewers. */
const TOP_PAD = mmToPt(8);

/** QR column (smaller to leave room for product list on the left). */
const QR_SIZE = mmToPt(20);
const COL_GAP = mmToPt(2);
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LEFT_COL_W = CONTENT_W - COL_GAP - QR_SIZE;
const RIGHT_COL_X = PAGE_W - MARGIN - QR_SIZE;
const LEFT_MAX_CHARS = Math.max(12, Math.floor(LEFT_COL_W / (BODY_SIZE * 0.52)));

const MIN_PAGE_H_MM = 80;
const MIN_PAGE_H = MIN_PAGE_H_MM * PT_PER_MM;

export interface OrderReceiptOptions {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

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

function formatProductSummary(it: Record<string, unknown>, index: number): string {
  const name = stripToReceiptAscii(String(it.product_name || it.name || "Mat hang")).toUpperCase();
  const qty = Number(it.adjusted_quantity ?? it.quantity ?? 1) || 1;
  const unit = it.unit ? ` ${stripToReceiptAscii(String(it.unit))}` : "";
  const type = it.product_type ? ` [${stripToReceiptAscii(String(it.product_type))}]` : "";
  return `${index}. ${name}${type} x${qty}${unit}`;
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

export async function resolveOrderReceiptOptions(storeId?: string): Promise<OrderReceiptOptions> {
  const receiptOptions: OrderReceiptOptions = {};
  if (!storeId) return receiptOptions;

  try {
    const storeProfileResponse = await storeService.getStoreProfile(storeId);
    const profile = storeProfileResponse?.data;
    if (profile?.name) receiptOptions.storeName = profile.name;
    const addr = profile?.address;
    if (addr && typeof addr !== "string") {
      receiptOptions.storeAddress = [
        addr.address_detail,
        addr.ward,
        addr.district,
        addr.province,
      ]
        .filter(Boolean)
        .join(", ");
    } else if (typeof addr === "string" && addr) {
      receiptOptions.storeAddress = addr;
    }
    receiptOptions.storePhone = profile?.phone_contact || profile?.phone_number;
  } catch {
    /* optional branding */
  }
  return receiptOptions;
}

type ReceiptCtx = {
  doc: jsPDF;
  y: number;
};

function contentStartY(): number {
  return MARGIN + TOP_PAD;
}

function textLineHeight(size: number, gapFactor = 0.35): number {
  return LINE_GAP + size * gapFactor;
}

function pageH(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function ensureSpace(ctx: ReceiptCtx, needed: number) {
  if (ctx.y + needed > pageH(ctx.doc) - MARGIN) {
    ctx.doc.internal.pageSize.height = Math.ceil(ctx.y + needed + MARGIN + mmToPt(10));
  }
}

function drawDashedRule(ctx: ReceiptCtx, gap = 5) {
  ensureSpace(ctx, gap + 4);
  ctx.y += 3;
  ctx.doc.setDrawColor(90, 90, 90);
  ctx.doc.setLineWidth(0.35);
  const dash = 2.5;
  const space = 2.5;
  for (let x = MARGIN; x < PAGE_W - MARGIN; x += dash + space) {
    const x2 = Math.min(x + dash, PAGE_W - MARGIN);
    ctx.doc.line(x, ctx.y, x2, ctx.y);
  }
  ctx.y += gap;
}

function drawCenter(ctx: ReceiptCtx, text: string, size: number, bold: boolean, gapAfter = LINE_GAP) {
  ctx.doc.setFont("helvetica", bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(28, 28, 32);
  if (ctx.y < contentStartY()) ctx.y = contentStartY();
  for (const line of wordWrap(text, MAX_WRAP)) {
    const lineH = textLineHeight(size, 0.3);
    ensureSpace(ctx, lineH);
    ctx.doc.text(line.toUpperCase(), PAGE_W / 2, ctx.y, {
      align: "center",
      baseline: "top",
    });
    ctx.y += lineH;
  }
  ctx.y += gapAfter * 0.15;
}

function drawLeft(ctx: ReceiptCtx, text: string, size = BODY_SIZE, bold = false) {
  ctx.doc.setFont("helvetica", bold ? "bold" : "normal");
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(28, 28, 32);
  if (ctx.y < contentStartY()) ctx.y = contentStartY();
  for (const line of wordWrap(text, MAX_WRAP + 2)) {
    const lineH = textLineHeight(size);
    ensureSpace(ctx, lineH);
    ctx.doc.text(line, MARGIN, ctx.y, { baseline: "top" });
    ctx.y += lineH;
  }
}

/** Draw left-aligned lines at a fixed x; returns y after last line. */
function drawLeftAt(
  doc: jsPDF,
  x: number,
  startY: number,
  maxChars: number,
  text: string,
  size = BODY_SIZE,
  bold = false
): number {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(28, 28, 32);
  let y = Math.max(startY, contentStartY());
  for (const line of wordWrap(text, maxChars)) {
    const lineH = textLineHeight(size);
    doc.text(line, x, y, { baseline: "top" });
    y += lineH;
  }
  return y;
}

/** Draw centered text in a column; returns y after last line. */
function drawCenterAt(
  doc: jsPDF,
  centerX: number,
  startY: number,
  text: string,
  size: number,
  bold: boolean,
  maxChars: number,
  gapAfter = LINE_GAP * 0.15
): number {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(28, 28, 32);
  let y = Math.max(startY, contentStartY());
  for (const line of wordWrap(text, maxChars)) {
    const lineH = textLineHeight(size, 0.3);
    doc.text(line.toUpperCase(), centerX, y, { align: "center", baseline: "top" });
    y += lineH;
  }
  return y + gapAfter;
}

/**
 * Renders one order receipt into an existing jsPDF doc starting at ctx.y.
 * Returns the y position after this receipt block.
 */
async function renderOrderReceiptIntoDoc(
  ctx: ReceiptCtx,
  order: Order,
  options?: OrderReceiptOptions
): Promise<number> {
  const code = order.code?.trim() || "";
  if (!code) {
    throw new Error("Thieu ma don hang");
  }

  const qrUrl = await qrService.generateQR({ data: code, size: "160x160" });
  const qrRes = await fetch(qrUrl);
  if (!qrRes.ok) {
    throw new Error("Khong tai duoc hinh QR");
  }
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer());
  const qrDataUrl = `data:image/png;base64,${uint8ArrayToBase64(qrBytes)}`;

  const storeName = stripToReceiptAscii(options?.storeName || "LAUNDRY PRO").toUpperCase();
  const items = (order.order_items ?? []) as Record<string, unknown>[];

  ctx.y = Math.max(ctx.y, contentStartY());

  drawCenter(ctx, storeName, TITLE_SIZE, true, 2);
  drawCenter(ctx, `MA DON: ${code}`, BODY_SIZE + 0.3, true, 2);

  const customer = order.shipping_full_name_snapshot;
  const phone = order.shipping_phone_number_snapshot;
  if (customer) drawCenter(ctx, customer, SUBTITLE_SIZE, false, 1);
  if (phone) drawCenter(ctx, `DT: ${phone}`, SUBTITLE_SIZE, false, 2);

  drawDashedRule(ctx);

  const bodyStartY = ctx.y + mmToPt(2);
  const qrCenterX = RIGHT_COL_X + QR_SIZE / 2;
  const qrCaptionMaxChars = Math.max(8, Math.floor(QR_SIZE / (SUBTITLE_SIZE * 0.45)));
  const estLeftH =
    mmToPt(8 + Math.max(1, items.length) * 4.5 + (order.note ? 10 : 0));
  const estRightH = QR_SIZE + mmToPt(12);
  ensureSpace(ctx, bodyStartY - ctx.y + Math.max(estLeftH, estRightH) + mmToPt(4));

  let leftY = drawLeftAt(
    ctx.doc,
    MARGIN,
    bodyStartY,
    LEFT_MAX_CHARS,
    "TOM TAT SAN PHAM",
    BODY_SIZE + 0.2,
    true
  );
  leftY += mmToPt(1.5);

  if (items.length === 0) {
    leftY = drawLeftAt(
      ctx.doc,
      MARGIN,
      leftY,
      LEFT_MAX_CHARS,
      "1. Don hang (chua co chi tiet)"
    );
  } else {
    for (let idx = 0; idx < items.length; idx++) {
      leftY = drawLeftAt(
        ctx.doc,
        MARGIN,
        leftY,
        LEFT_MAX_CHARS,
        formatProductSummary(items[idx], idx + 1)
      );
    }
  }

  if (order.note) {
    leftY += mmToPt(1);
    leftY = drawLeftAt(
      ctx.doc,
      MARGIN,
      leftY,
      LEFT_MAX_CHARS,
      `Ghi chu: ${stripToReceiptAscii(order.note)}`,
      SUBTITLE_SIZE
    );
  }

  let rightY = bodyStartY;
  ctx.doc.addImage(qrDataUrl, "PNG", RIGHT_COL_X, rightY, QR_SIZE, QR_SIZE);
  rightY += QR_SIZE + mmToPt(2);

  rightY = drawCenterAt(
    ctx.doc,
    qrCenterX,
    rightY,
    "QUET MA QR",
    SUBTITLE_SIZE,
    false,
    qrCaptionMaxChars,
    1
  );
  rightY = drawCenterAt(
    ctx.doc,
    qrCenterX,
    rightY,
    code,
    SUBTITLE_SIZE,
    true,
    qrCaptionMaxChars,
    2
  );

  const bodyEndY = Math.max(leftY, rightY);
  ensureSpace(ctx, bodyEndY - ctx.y + mmToPt(4));
  ctx.y = bodyEndY;

  return ctx.y;
}

function estimateReceiptHeightMm(order: Order): number {
  const items = order.order_items?.length ?? 0;
  const topPadMm = 8;
  const headerMm = 34;
  const leftBodyMm = 10 + Math.max(1, items) * 4.5 + (order.note ? 10 : 0);
  const qrBodyMm = 20 + 10;
  return topPadMm + headerMm + Math.max(leftBodyMm, qrBodyMm) + 6;
}

/**
 * Builds an 80 mm thermal tag PDF: store header, product summary (no prices), QR code.
 */
export async function buildOrderReceiptPdf(
  order: Order,
  options?: OrderReceiptOptions
): Promise<Uint8Array> {
  const startPageH = Math.max(MIN_PAGE_H, mmToPt(estimateReceiptHeightMm(order)));
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, startPageH] });
  const ctx: ReceiptCtx = { doc, y: contentStartY() };
  await renderOrderReceiptIntoDoc(ctx, order, options);
  doc.internal.pageSize.height = Math.ceil(ctx.y + MARGIN + mmToPt(4));
  return new Uint8Array(doc.output("arraybuffer"));
}

function trimCurrentPageHeight(doc: jsPDF, contentEndY: number) {
  doc.internal.pageSize.height = Math.ceil(contentEndY + MARGIN + mmToPt(4));
}

/**
 * Builds one PDF with one receipt per page (80 mm width, height per order).
 */
export async function buildCombinedOrderReceiptsPdf(
  orders: Order[],
  options?: OrderReceiptOptions
): Promise<Uint8Array> {
  const valid = orders.filter((o) => o.code?.trim());
  if (valid.length === 0) {
    throw new Error("Khong co don hang hop le de in");
  }
  if (valid.length === 1) {
    return buildOrderReceiptPdf(valid[0], options);
  }

  const firstPageH = Math.max(MIN_PAGE_H, mmToPt(estimateReceiptHeightMm(valid[0])));
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, firstPageH] });
  const ctx: ReceiptCtx = { doc, y: contentStartY() };

  for (let i = 0; i < valid.length; i++) {
    if (i > 0) {
      const pageH = Math.max(MIN_PAGE_H, mmToPt(estimateReceiptHeightMm(valid[i])));
      doc.addPage([PAGE_W, pageH]);
      ctx.y = contentStartY();
    }
    const endY = await renderOrderReceiptIntoDoc(ctx, valid[i], options);
    trimCurrentPageHeight(doc, endY);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function saveOrDownloadReceiptPdf(
  pdfBytes: Uint8Array,
  fileName: string
): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof document === "undefined" || typeof Blob === "undefined") {
      throw new Error("Trinh duyet khong ho tro tai PDF");
    }
    const blob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error("Khong co thu muc cache");
  }
  const path = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(path, uint8ArrayToBase64(pdfBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "application/pdf",
      dialogTitle: fileName,
    });
  }
}
