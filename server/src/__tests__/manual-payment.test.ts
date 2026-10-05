import { test } from "node:test";
import assert from "node:assert/strict";

// env.ts reads process.env at import time, so configure it before importing.
process.env.MANUAL_PAY_MTN_NUMBER = "+250 788 111 222";
process.env.MANUAL_PAY_AIRTEL_NUMBER = "";
process.env.PAWAPAY_API_TOKEN = "";
const mp = await import("../services/manual-payment.js");

test("only networks with a configured business number are offered", () => {
  const accounts = mp.manualAccounts();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].provider, "mtn_momo");
  assert.equal(accounts[0].number, "+250 788 111 222");
});

test("pawaPay is reported as unavailable without an API token", () => {
  assert.equal(mp.pawapayConfigured(), false);
});

test("transaction references are normalised and validated", () => {
  assert.equal(mp.normalizeReference(" mp260105.1234.a12345 "), "MP260105.1234.A12345");
  assert.equal(mp.normalizeReference("1234 5678 90"), "1234567890");
  assert.equal(mp.normalizeReference("abc"), null);
  assert.equal(mp.normalizeReference("bad ref!"), null);
  assert.equal(mp.normalizeReference("x".repeat(41)), null);
  assert.equal(mp.normalizeReference(12345678), null);
});

test("Rwandan phone numbers are normalised to +2507XXXXXXXX", () => {
  assert.equal(mp.normalizeRwandaPhone("0788 123 456"), "+250788123456");
  assert.equal(mp.normalizeRwandaPhone("+250 733-123-456"), "+250733123456");
  assert.equal(mp.normalizeRwandaPhone("250788123456"), "+250788123456");
  assert.equal(mp.normalizeRwandaPhone("0688123456"), null);
  assert.equal(mp.normalizeRwandaPhone("12345"), null);
});
