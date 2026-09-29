export const columns = [
  "order_id",
  "product_url",
  "size",
  "price",
  "quantity",
  "shipping_address",
  "payment_method",
  "currency",
];
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length) throw Error("Invalid CSV quoting.");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV has an unclosed quote.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function records(rows: unknown[][]) {
  if (rows.length < 2) throw Error("Add at least one order below the header.");
  const headers = rows[0].map((x) =>
    String(x ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
  );
  if (headers.some((h) => !columns.includes(h)))
    throw Error("Use only template columns. Card data must not be uploaded.");
  if (new Set(headers).size !== headers.length)
    throw Error("Duplicate column headings.");
  for (const c of columns.slice(0, 6))
    if (!headers.includes(c)) throw Error(`Missing column: ${c}`);
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
    .map((r) => {
      if (
        r.length > headers.length &&
        r.slice(headers.length).some((x) => x !== null && x !== "")
      )
        throw Error("A row has more values than column headings.");
      return Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]));
    });
}
