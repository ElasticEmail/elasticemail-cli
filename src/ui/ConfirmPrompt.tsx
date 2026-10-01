import { Box, Text, render, useApp, useInput } from 'ink';
import { InterruptedError } from '../lib/error-json.js';

interface ConfirmPromptProps {
  question: string;
  onAnswer: (confirmed: boolean) => void;
}

/**
 * Minimal y/N prompt for destructive commands. Defaults to No: Enter, Esc and
 * anything other than "y" cancel.
 */
function ConfirmPrompt({ question, onAnswer }: ConfirmPromptProps) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      exit();
      onAnswer(true);
    } else if (input === 'n' || input === 'N' || key.return || key.escape) {
      exit();
      onAnswer(false);
    }
  });

  return (
    <Box>
      <Text color="yellow">{question}</Text>
      <Text dimColor> [y/N] </Text>
    </Box>
  );
}

/** Renders the prompt and resolves with the user's answer. */
export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const instance = render(
      <ConfirmPrompt
        question={question}
        onAnswer={(confirmed) => {
          instance.unmount();
          resolve(confirmed);
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

export default ConfirmPrompt;
