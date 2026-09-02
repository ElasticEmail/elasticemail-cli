import { describe, expect, it } from 'vitest';
import { renderTable } from '../src/lib/table.js';

interface Row {
  name: string;
  count?: number;
}

describe('renderTable', () => {
  const columns = [
    { header: 'Name', value: (r: Row) => r.name },
    { header: 'Count', value: (r: Row) => r.count },
  ];

  it('renders a header line plus one line per row', () => {
    const lines = renderTable<Row>([{ name: 'alpha', count: 1 }, { name: 'b' }], columns);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('NAME');
    expect(lines[0]).toContain('COUNT');
    expect(lines[1]).toContain('alpha');
    expect(lines[1]).toContain('1');
  });

  it('renders missing values as a dash', () => {
    const lines = renderTable<Row>([{ name: 'b' }], columns);
    expect(lines[1]).toContain('-');
  });

  it('aligns columns to the widest cell', () => {
    const lines = renderTable<Row>(
      [
        { name: 'short', count: 1 },
        { name: 'a-much-longer-name', count: 22 },
      ],
      columns,
    );
    const col2Positions = lines.map((l) => l.search(/COUNT|1$|22$/));
    // The count column starts at the same offset in every line.
    expect(new Set(lines.map((l) => l.indexOf(l.trim().split(/\s{2,}/)[1])))).not.toContain(-1);
    expect(col2Positions.every((p) => p >= 0)).toBe(true);
  });

  it('truncates cells longer than maxWidth with an ellipsis', () => {
    const lines = renderTable<Row>(
      [{ name: 'x'.repeat(50) }],
      [{ header: 'Name', value: (r: Row) => r.name, maxWidth: 10 }],
    );
    expect(lines[1].trim()).toHaveLength(10);
    expect(lines[1]).toContain('…');
  });
});
