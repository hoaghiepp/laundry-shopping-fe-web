// @ts-nocheck
import assert from "node:assert/strict";
import {
  collectPages,
  groupByOrder,
  selectionKind,
  withOrderSelection,
} from "./transportGroups.ts";

const mixed = [
  { id: "a1", barcode: "BC-A1", order_id: "oA", order_code: "DH-A", status: "TAGGED" },
  { id: "a2", barcode: "BC-A2", order_id: "oA", order_code: "DH-A", status: "TAGGED" },
  {
    id: "a3",
    barcode: "BC-A3",
    order_id: "oA",
    order_code: "DH-A",
    status: "TAGGED",
    current_trip_id: "trip-1",
  },
  {
    id: "a4",
    barcode: "BC-A4",
    order_id: "oA",
    order_code: "DH-A",
    status: "TAGGED",
    item_condition: "MISSING",
  },
  { id: "b1", barcode: "BC-B1", order_id: "oB", order_code: "DH-B", status: "TAGGED" },
  { id: "a1", barcode: "BC-A1", order_id: "oA", order_code: "DH-A", status: "TAGGED" },
  { id: "loose", barcode: "BC-X", status: "TAGGED" },
  {
    id: "c1",
    barcode: "BC-C1",
    order_id: "oC",
    order_code: "DH-C",
    status: "WASHING",
    current_batch_id: "batch-9",
  },
];

const hub = groupByOrder(mixed, "hub");
assert.equal(hub.length, 3);
const orderA = hub.find((group) => group.orderCode === "DH-A");
assert.ok(orderA);
assert.deepEqual(orderA.selectedIds, ["a1", "a2"]);
assert.deepEqual(
  orderA.blocked.map((item) => item.reason).sort(),
  ["MISSING", "ON_TRIP"]
);
assert.equal(selectionKind(orderA), "all");
assert.deepEqual(withOrderSelection(orderA, false).selectedIds, []);
assert.deepEqual(withOrderSelection(orderA, true).selectedIds, ["a1", "a2"]);

const factoryC = groupByOrder(mixed, "factory").find((group) => group.orderCode === "DH-C");
assert.equal(factoryC?.garments.length, 0);
assert.equal(factoryC?.blocked[0]?.reason, "IN_BATCH");
const hubC = hub.find((group) => group.orderCode === "DH-C");
assert.deepEqual(hubC?.selectedIds, ["c1"]);

const paged = await collectPages(async (page) => {
  if (page === 0) {
    return {
      rows: [
        { id: "p1", barcode: "P1", order_id: "oP", order_code: "DH-P" },
        { id: "p2", barcode: "P2", order_id: "oQ", order_code: "DH-Q" },
      ],
      total: 3,
    };
  }
  return {
    rows: [{ id: "p3", barcode: "P3", order_id: "oP", order_code: "DH-P" }],
    total: 3,
  };
}, 2);

const pagedGroups = groupByOrder(paged, "hub");
assert.equal(paged.length, 3);
assert.equal(pagedGroups.length, 2);
assert.deepEqual(
  pagedGroups.find((group) => group.orderCode === "DH-P")?.selectedIds,
  ["p1", "p3"]
);

console.log("transportGroups fixture ok");
