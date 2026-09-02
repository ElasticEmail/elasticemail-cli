import { Box, Text, render } from 'ink';
import Spinner from 'ink-spinner';

interface SpinnerLineProps {
  label: string;
}

export function SpinnerLine({ label }: SpinnerLineProps) {
  return (
    <Box>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text> {label}</Text>
    </Box>
  );
}

/**
 * Renders an Ink spinner while `task` runs, then unmounts it. Intended for
 * interactive (TTY, non-JSON) mode only — callers must guard before using it so
 * piped/CI output is never polluted.
 */
export async function withSpinner<T>(label: string, task: Promise<T>): Promise<T> {
  const instance = render(<SpinnerLine label={label} />);
  try {
    return await task;
  } finally {
    instance.unmount();
    instance.clear();
  }
}
