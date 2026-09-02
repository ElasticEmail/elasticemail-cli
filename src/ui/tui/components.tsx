import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { formatApiError } from '../../api/errors.js';

/* ------------------------------------------------------------------ Menu */

export interface MenuItem<V extends string = string> {
  label: string;
  value: V;
  hint?: string;
}

interface MenuProps<V extends string> {
  title: string;
  items: MenuItem<V>[];
  onSelect: (value: V) => void;
  onBack?: () => void;
  footer?: string;
  isActive?: boolean;
}

export function Menu<V extends string>({
  title,
  items,
  onSelect,
  onBack,
  footer,
  isActive = true,
}: MenuProps<V>) {
  const [cursor, setCursor] = useState(0);

  useInput(
    (_input, key) => {
      if (key.upArrow) setCursor((c) => (c + items.length - 1) % items.length);
      else if (key.downArrow) setCursor((c) => (c + 1) % items.length);
      else if (key.return) onSelect(items[cursor].value);
      else if (key.escape && onBack) onBack();
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        {title}
      </Text>
      <Box flexDirection="column" marginY={1}>
        {items.map((item, i) => (
          <Box key={item.value}>
            <Text color={i === cursor ? 'cyan' : undefined} bold={i === cursor}>
              {i === cursor ? '❯ ' : '  '}
              {item.label}
            </Text>
            {item.hint && i === cursor && <Text dimColor> — {item.hint}</Text>}
          </Box>
        ))}
      </Box>
      <Text dimColor>{footer ?? '↑/↓ move · Enter select' + (onBack ? ' · Esc back' : '')}</Text>
    </Box>
  );
}

/* ----------------------------------------------------------- KeyValue view */

interface DetailProps {
  title: string;
  data: Record<string, unknown>;
  onBack: () => void;
  isActive?: boolean;
  footer?: string;
}

function formatValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (Array.isArray(value)) {
    const scalars = value.filter((v) => typeof v !== 'object');
    return scalars.length > 0 ? scalars.join(', ') : `${value.length} item(s)`;
  }
  if (typeof value === 'object') return undefined;
  const text = String(value);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

export function Detail({ title, data, onBack, isActive = true, footer = 'Esc back' }: DetailProps) {
  useInput(
    (_input, key) => {
      if (key.escape || key.return) onBack();
    },
    { isActive },
  );

  const entries = Object.entries(data)
    .map(([k, v]) => [k, formatValue(v)] as const)
    .filter(([, v]) => v !== undefined);
  const width = Math.max(...entries.map(([k]) => k.length), 0);

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        {title}
      </Text>
      <Box flexDirection="column" marginY={1}>
        {entries.map(([key, value]) => (
          <Text key={key}>
            <Text dimColor>{key.padEnd(width + 2)}</Text>
            {value}
          </Text>
        ))}
      </Box>
      <Text dimColor>{footer}</Text>
    </Box>
  );
}

/* -------------------------------------------------------------- Browser */

export interface BrowserColumn<T> {
  header: string;
  value: (row: T) => unknown;
  maxWidth?: number;
}

export interface BrowserMultiSelect<T> {
  /** Stable key for an item (also what lands in `selected`). */
  keyOf: (item: T) => string;
  /** Currently selected keys — controlled by the parent, survives paging. */
  selected: ReadonlySet<string>;
  onToggle: (item: T) => void;
  /**
   * Enter confirms the selection. When nothing is selected yet, the
   * highlighted item is passed so Enter still works as a single pick.
   */
  onConfirm: (fallback?: T) => void;
}

interface BrowserProps<T> {
  title: string;
  columns: BrowserColumn<T>[];
  fetchPage: (limit: number, offset: number) => Promise<T[]>;
  onSelect?: (item: T) => void;
  onBack: () => void;
  pageSize?: number;
  selectHint?: string;
  isActive?: boolean;
  /** Enables checkbox-style multi-selection (Space toggles, Enter confirms). */
  multiSelect?: BrowserMultiSelect<T>;
}

function cellText(value: unknown, maxWidth?: number): string {
  const text = value === null || value === undefined || value === '' ? '-' : String(value);
  return maxWidth && text.length > maxWidth ? `${text.slice(0, maxWidth - 1)}…` : text;
}

/**
 * Generic paginated, keyboard-navigable list: ↑/↓ select a row, ←/→ switch
 * pages, Enter opens an item, Esc goes back.
 */
export function Browser<T>({
  title,
  columns,
  fetchPage,
  onSelect,
  onBack,
  pageSize = 15,
  selectHint = 'open',
  isActive = true,
  multiSelect,
}: BrowserProps<T>) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    fetchPage(pageSize, page * pageSize)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setCursor(0);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatApiError(err));
        setItems([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  useInput(
    (input, key) => {
      if (key.escape) return onBack();
      if (loading) return;
      if (key.upArrow && items.length > 0) setCursor((c) => (c + items.length - 1) % items.length);
      else if (key.downArrow && items.length > 0) setCursor((c) => (c + 1) % items.length);
      else if (key.rightArrow && items.length === pageSize) setPage((p) => p + 1);
      else if (key.leftArrow && page > 0) setPage((p) => p - 1);
      else if (multiSelect && input === ' ' && items[cursor]) multiSelect.onToggle(items[cursor]);
      else if (key.return && multiSelect) {
        multiSelect.onConfirm(multiSelect.selected.size === 0 ? items[cursor] : undefined);
      } else if (key.return && onSelect && items[cursor]) onSelect(items[cursor]);
    },
    { isActive },
  );

  const widths = columns.map((col) =>
    Math.max(
      col.header.length,
      ...items.map((row) => cellText(col.value(row), col.maxWidth).length),
      0,
    ),
  );

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        {title} <Text dimColor>(page {page + 1})</Text>
      </Text>
      <Box flexDirection="column" marginY={1}>
        {loading ? (
          <Text color="cyan">
            <Spinner type="dots" /> Loading…
          </Text>
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : items.length === 0 ? (
          <Text dimColor>(no items on this page)</Text>
        ) : (
          <>
            <Text dimColor>
              {'  '}
              {columns.map((c, i) => c.header.toUpperCase().padEnd(widths[i] + 2)).join('')}
            </Text>
            {items.map((row, i) => {
              const checked = multiSelect?.selected.has(multiSelect.keyOf(row));
              const marker = multiSelect ? (checked ? '◉ ' : '○ ') : '';
              return (
                <Text
                  key={i}
                  color={i === cursor ? 'cyan' : checked ? 'green' : undefined}
                  bold={i === cursor}
                >
                  {i === cursor ? '❯ ' : '  '}
                  {marker}
                  {columns
                    .map((c, j) => cellText(c.value(row), c.maxWidth).padEnd(widths[j] + 2))
                    .join('')}
                </Text>
              );
            })}
          </>
        )}
      </Box>
      <Text dimColor>
        {multiSelect
          ? `↑/↓ move · ←/→ page · Space select · Enter confirm (${multiSelect.selected.size} selected) · Esc back`
          : `↑/↓ move · ←/→ page${onSelect ? ` · Enter ${selectHint}` : ''} · Esc back`}
      </Text>
    </Box>
  );
}

/* -------------------------------------------------------------- Loading */

export function LoadingLine({ label }: { label: string }) {
  return (
    <Text color="cyan">
      <Spinner type="dots" /> {label}
    </Text>
  );
}
