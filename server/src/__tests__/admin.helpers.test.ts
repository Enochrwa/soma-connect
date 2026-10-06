import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, escapeRegex, orderQueueFilter } from "../services/admin.helpers.js";

test("escapeRegex neutralises regex metacharacters", () => {
  const re = new RegExp(escapeRegex("a.b(c)+[d]*"));
  assert.ok(re.test("a.b(c)+[d]*"));
  assert.ok(!re.test("aXb(c)+[d]*"));
  assert.equal(escapeRegex("OAS-2026"), "OAS-2026");
});

test("order queues map to the right filters", () => {
  assert.deepEqual(orderQueueFilter("verify"), {
    status: "placed",
    paymentStatus: "manual_review",
  });
  assert.deepEqual(orderQueueFilter("ready"), { status: "payment_confirmed" });
  assert.deepEqual(orderQueueFilter("refund"), { paymentStatus: "refund_pending" });
  assert.deepEqual(orderQueueFilter("all"), {});
  assert.deepEqual(orderQueueFilter(undefined), {});
  assert.deepEqual(orderQueueFilter("nonsense"), {});
});

test("csvCell quotes, escapes and blocks formula injection", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(1500), "1500");
});
