// src/utils/csv.js

/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param {Object[]} rows - Array of flat objects.
 * @param {string} filename - Download filename (without extension).
 * @param {string[]} [columns] - Column keys in order. If omitted, uses keys from first row.
 */
export function downloadCSV(rows, filename, columns) {
  if (!rows.length) return;

  const cols = columns || Object.keys(rows[0]);

  const escape = (val) => {
    const s = val == null ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = cols.map(escape).join(',');
  const body = rows.map((row) =>
    cols.map((col) => escape(row[col])).join(',')
  ).join('\n');

  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
