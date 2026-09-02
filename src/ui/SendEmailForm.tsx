import { useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { parseRecipients, validateSendInput } from '../lib/validate.js';

export interface SendFormValues {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface FieldDef {
  key: keyof SendFormValues;
  label: string;
  placeholder: string;
  optional?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'from', label: 'From', placeholder: 'sender@yourdomain.com' },
  { key: 'to', label: 'To', placeholder: 'a@example.com, b@example.com' },
  { key: 'subject', label: 'Subject', placeholder: 'Hello from Elastic Email' },
  { key: 'text', label: 'Text body', placeholder: 'Plain text message', optional: true },
  { key: 'html', label: 'HTML body', placeholder: '<p>optional html</p>', optional: true },
];

interface SendEmailFormProps {
  initial: Partial<SendFormValues>;
  onSubmit: (values: SendFormValues) => void;
  onCancel: () => void;
}

function SendEmailForm({ initial, onSubmit, onCancel }: SendEmailFormProps) {
  const { exit } = useApp();
  const [values, setValues] = useState<SendFormValues>({
    from: initial.from ?? '',
    to: initial.to ?? '',
    subject: initial.subject ?? '',
    text: initial.text ?? '',
    html: initial.html ?? '',
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState(() => initial.from ?? '');
  const [error, setError] = useState<string | undefined>();

  const onConfirmStep = stepIndex >= FIELDS.length;

  const errors = validateSendInput({
    from: values.from,
    to: values.to.length > 0 ? [values.to] : [],
    subject: values.subject,
    text: values.text,
    html: values.html,
  });

  useInput(
    (input, key) => {
      if (!onConfirmStep) return;
      if (key.escape) {
        exit();
        onCancel();
        return;
      }
      if (input === 'e') {
        setStepIndex(0);
        setDraft(values.from);
        return;
      }
      if (key.return && errors.length === 0) {
        exit();
        onSubmit(values);
      }
    },
    { isActive: onConfirmStep },
  );

  if (onConfirmStep) {
    const { valid } = parseRecipients([values.to]);
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Review your message
        </Text>
        <Box flexDirection="column" marginY={1} paddingLeft={1}>
          <Text>
            <Text dimColor>From: </Text>
            {values.from}
          </Text>
          <Text>
            <Text dimColor>To: </Text>
            {valid.join(', ') || '(none)'}
          </Text>
          <Text>
            <Text dimColor>Subject: </Text>
            {values.subject}
          </Text>
          {values.text && (
            <Text>
              <Text dimColor>Text: </Text>
              {truncate(values.text)}
            </Text>
          )}
          {values.html && (
            <Text>
              <Text dimColor>HTML: </Text>
              {truncate(values.html)}
            </Text>
          )}
        </Box>
        {errors.length > 0 ? (
          <Box flexDirection="column">
            {errors.map((e, i) => (
              <Text key={i} color="red">
                • {e.message}
              </Text>
            ))}
            <Text dimColor>Press e to edit · Esc to cancel</Text>
          </Box>
        ) : (
          <Text dimColor>Enter to send · e to edit · Esc to cancel</Text>
        )}
      </Box>
    );
  }

  const field = FIELDS[stepIndex];

  const handleSubmit = (submitted: string) => {
    const trimmed = submitted.trim();
    if (!field.optional && trimmed.length === 0) {
      setError(`${field.label} is required.`);
      return;
    }
    const next = { ...values, [field.key]: trimmed };
    setValues(next);
    setError(undefined);
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setDraft(nextIndex < FIELDS.length ? next[FIELDS[nextIndex].key] : '');
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        Compose email ({stepIndex + 1}/{FIELDS.length})
      </Text>
      <Box marginTop={1}>
        <Text>{field.label}: </Text>
        <TextInput
          value={draft}
          onChange={(v) => {
            setDraft(v);
            if (error) setError(undefined);
          }}
          onSubmit={handleSubmit}
          placeholder={field.placeholder}
        />
      </Box>
      {field.optional && <Text dimColor>(optional — press Enter to skip)</Text>}
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}

function truncate(value: string, max = 60): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/**
 * Renders the interactive compose form and resolves with the collected values,
 * or `null` if the user cancelled.
 */
export function promptSendEmail(
  initial: Partial<SendFormValues> = {},
): Promise<SendFormValues | null> {
  return new Promise((resolve) => {
    const instance = render(
      <SendEmailForm
        initial={initial}
        onSubmit={(values) => {
          instance.unmount();
          resolve(values);
        }}
        onCancel={() => {
          instance.unmount();
          resolve(null);
        }}
      />,
    );
  });
}

export default SendEmailForm;
