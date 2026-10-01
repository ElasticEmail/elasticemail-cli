import { useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { maskApiKey } from '../config/api-key.js';
import { InterruptedError } from '../lib/error-json.js';

interface ApiKeyFormProps {
  initial?: string;
  onSubmit: (key: string) => void;
  onCancel: () => void;
}

function ApiKeyForm({ initial = '', onSubmit, onCancel }: ApiKeyFormProps) {
  const { exit } = useApp();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();

  useInput((_input, key) => {
    if (key.escape) {
      exit();
      onCancel();
    }
  });

  const handleSubmit = (submitted: string) => {
    const trimmed = submitted.trim();
    if (trimmed.length < 8) {
      setError('That does not look like a valid API key (too short).');
      return;
    }
    exit();
    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        Set your Elastic Email API key
      </Text>
      <Text dimColor>Find it in the Elastic Email dashboard → Settings → API.</Text>
      <Box marginTop={1}>
        <Text>API key: </Text>
        <TextInput
          value={value}
          onChange={(v) => {
            setValue(v);
            if (error) setError(undefined);
          }}
          onSubmit={handleSubmit}
          mask="*"
          placeholder="paste here, then press Enter"
        />
      </Box>
      {value.length > 0 && (
        <Text dimColor>Preview: {maskApiKey(value.trim())}</Text>
      )}
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1}>
        <Text dimColor>Enter to save · Esc to cancel</Text>
      </Box>
    </Box>
  );
}

/**
 * Renders the interactive API-key prompt and resolves with the entered key, or
 * `null` if the user cancelled (Esc).
 */
export function promptApiKey(initial = ''): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const instance = render(
      <ApiKeyForm
        initial={initial}
        onSubmit={(key) => {
          instance.unmount();
          resolve(key);
        }}
        onCancel={() => {
          instance.unmount();
          resolve(null);
        }}
      />,
    );
    // Ctrl+C: Ink unmounts on its own without calling our callbacks. Reject
    // with InterruptedError (exit 130) so the promise settles; otherwise Node
    // exits reporting an "unsettled top-level await". A normal answer
    // resolves synchronously first and wins.
    const interrupted = () => reject(new InterruptedError());
    void instance.waitUntilExit().then(interrupted, interrupted);
  });
}

export default ApiKeyForm;
