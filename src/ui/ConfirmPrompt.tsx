import { Box, Text, render, useApp, useInput } from 'ink';

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
  return new Promise((resolve) => {
    const instance = render(
      <ConfirmPrompt
        question={question}
        onAnswer={(confirmed) => {
          instance.unmount();
          resolve(confirmed);
        }}
      />,
    );
  });
}

export default ConfirmPrompt;
