import assert from "node:assert/strict";
import test from "node:test";
import { money, normalize, quote, demoRows } from "../lib/domain.ts";
import { parseCSV, records } from "../lib/import.ts";
test("exact paise conversion avoids float equality", () => {
  assert.equal(money("0.29"), 29);
  assert.equal(money("6499.00"), 649900);
});
test("invalid precision, negative and blank prices fail closed", () => {
  for (const x of ["1.001", "-2", "", "NaN", "1e3", "0"])
    assert.throws(() => money(x));
});
test("sample match and mismatch", () => {
  assert.equal(quote(demoRows[0]).eligible, true);
  assert.match(quote(demoRows[1]).reason, /do not match/);
});
test("lower marketplace price is also blocked", () => {
  assert.equal(quote({ ...demoRows[0], price: "7000" }).eligible, false);
});
test("variant and product URL must match exactly", () => {
  assert.equal(quote({ ...demoRows[0], size: "3U" }).eligible, false);
  assert.equal(
    quote({
      ...demoRows[0],
      product_url: "https://evil.example/products/aero-pro-racket",
    }).eligible,
    false,
  );
});
test("quantity affects total, not unit comparison", () => {
  const q = quote(demoRows[2]);
  assert.equal(q.eligible, true);
  assert.equal(q.total, 179800);
});
test("stock gate blocks exact price match", () =>
  assert.match(quote(demoRows[3]).reason, /unavailable/));
test("COD availability enforced", () =>
  assert.match(
    quote({
      ...demoRows[0],
      product_url: "https://demo.orderguard.example/products/tour-kitbag",
      size: "One size",
      price: "2499",
    }).reason,
    /Cash on delivery/,
  ));
test("malformed quantity, currency and address rejected", () => {
  for (const patch of [
    { quantity: 1.5 },
    { quantity: 0 },
    { currency: "USD" },
    { shipping_address: "x" },
  ])
    assert.throws(() => normalize({ ...demoRows[0], ...patch }));
});
test("raw payment columns rejected", () =>
  assert.throws(() => normalize({ ...demoRows[0], cvv: "123" })));
test("CSV handles quoted commas, newlines and escaped quotes", () =>
  assert.deepEqual(
    parseCSV('a,b\r\n"hello, there","line1\nline2"\r\n"a""b",c'),
    [
      ["a", "b"],
      ["hello, there", "line1\nline2"],
      ['a"b', "c"],
    ],
  ));
test("import rejects missing headers, duplicate headers and unclosed quotes", () => {
  assert.throws(() => records([["order_id"], ["1"]]));
  assert.throws(() =>
    records([
      ["order_id", "order_id"],
      ["1", "2"],
    ]),
  );
  assert.throws(() => parseCSV('a,"x'));
});
