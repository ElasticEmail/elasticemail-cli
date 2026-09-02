/**
 * User-friendly labels for Elastic Email template types. Raw API values are
 * developer jargon; every place that displays a template type (CLI tables,
 * TUI browsers/pickers, detail views) should go through this mapping.
 */
const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  RawHTML: 'Raw HTML',
  TemplateEditor: 'New email designer',
  DragDropEditor: 'Classic email designer',
};

/** Maps an API template type to its display label; unknown types pass through. */
export function formatTemplateType(type?: string | null): string | undefined {
  if (!type) return undefined;
  return TEMPLATE_TYPE_LABELS[type] ?? type;
}
