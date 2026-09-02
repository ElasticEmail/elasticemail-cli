import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { ElasticEmailClient } from '../../api/client.js';
import { formatApiError } from '../../api/errors.js';
import {
  SENDABLE_TEMPLATE_TYPES,
  type Campaign,
  type ContactsList,
  type Segment,
  type Template,
} from '../../api/types.js';
import { loadConfig } from '../../config/config.js';
import { senderHint, verifiedSenderDomains } from '../../lib/senders.js';
import { formatTemplateType } from '../../lib/template-type.js';
import { isValidEmail, extractEmail, parseRecipients } from '../../lib/validate.js';
import { Browser, LoadingLine, Menu } from './components.js';

type Step =
  | 'init'
  | 'from'
  | 'recipient-mode'
  | 'to-input'
  | 'pick-lists'
  | 'pick-segments'
  | 'content-mode'
  | 'text-input'
  | 'html-input'
  | 'pick-template'
  | 'subject'
  | 'review'
  | 'sending';

type RecipientMode = 'to' | 'lists' | 'segments';

interface WizardState {
  from: string;
  to: string;
  recipientMode: RecipientMode;
  listNames: string[];
  segmentNames: string[];
  contentMode?: 'text' | 'html' | 'template';
  text: string;
  html: string;
  template?: string;
  subject: string;
}

interface SendWizardProps {
  client: ElasticEmailClient;
  accountEmail?: string;
  /** Campaign sending (to lists/segments) is only available on Marketing-plan accounts. */
  allowListSend?: boolean;
  onDone: (lines: string[]) => void;
  onCancel: () => void;
}

/**
 * Fully keyboard-driven send flow: sender (with verified-domain hints),
 * recipients (addresses, or multi-selected lists/segments on Marketing
 * accounts), content (text / HTML / saved template), subject, review, send.
 */
export function SendWizard({
  client,
  accountEmail,
  allowListSend = false,
  onDone,
  onCancel,
}: SendWizardProps) {
  const [step, setStep] = useState<Step>('init');
  const [state, setState] = useState<WizardState>({
    from: '',
    to: '',
    recipientMode: 'to',
    listNames: [],
    segmentNames: [],
    text: '',
    html: '',
    subject: '',
  });
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [hint, setHint] = useState<string>('');
  // Multi-select state survives paging and going back and forth.
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());

  const isCampaign = state.recipientMode !== 'to';
  const titlePrefix = isCampaign ? 'Send a campaign' : 'Send an email';

  // Load sender hints (verified domains) once, then start at the From step.
  useEffect(() => {
    let cancelled = false;
    client
      .listDomains()
      .then((domains) => {
        if (cancelled) return;
        setHint(senderHint(accountEmail, verifiedSenderDomains(domains)));
      })
      .catch(() => {
        if (cancelled) return;
        setHint(senderHint(accountEmail));
      })
      .finally(() => {
        if (cancelled) return;
        const initialFrom = loadConfig().defaultFrom ?? accountEmail ?? '';
        setState((s) => ({ ...s, from: initialFrom }));
        setDraft(initialFrom);
        setStep('from');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Esc steps back through the wizard (Browser steps handle their own Esc).
  useInput(
    (_input, key) => {
      if (!key.escape) return;
      setError(undefined);
      switch (step) {
        case 'from':
          onCancel();
          break;
        case 'recipient-mode':
          setStep('from');
          setDraft(state.from);
          break;
        case 'to-input':
          if (allowListSend) setStep('recipient-mode');
          else {
            setStep('from');
            setDraft(state.from);
          }
          break;
        case 'content-mode':
          if (allowListSend) setStep('recipient-mode');
          else {
            setStep('to-input');
            setDraft(state.to);
          }
          break;
        case 'text-input':
        case 'html-input':
          setStep('content-mode');
          break;
        case 'subject':
          // Campaign content is always a template, so back = template picker.
          if (isCampaign) setStep('pick-template');
          else setStep('content-mode');
          break;
        case 'review':
          setStep('subject');
          setDraft(state.subject);
          break;
        default:
          break;
      }
    },
    {
      isActive:
        step !== 'init' &&
        step !== 'sending' &&
        step !== 'pick-lists' &&
        step !== 'pick-segments' &&
        step !== 'pick-template',
    },
  );

  /* ------------------------------------------------------------ actions */

  const send = async () => {
    setStep('sending');
    try {
      if (isCampaign) {
        const campaign: Campaign = {
          Name: `cli-${new Date().toISOString().replace(/[:.]/g, '-')}`,
          Status: 'Active',
          Recipients: {
            ...(state.listNames.length > 0 ? { ListNames: state.listNames } : {}),
            ...(state.segmentNames.length > 0 ? { SegmentNames: state.segmentNames } : {}),
          },
          Content: [
            {
              From: state.from,
              TemplateName: state.template,
              ...(state.subject ? { Subject: state.subject } : {}),
            },
          ],
        };
        const created = await client.createCampaign(campaign);
        const target =
          state.listNames.length > 0
            ? `list${state.listNames.length > 1 ? 's' : ''} ${state.listNames.join(', ')}`
            : `segment${state.segmentNames.length > 1 ? 's' : ''} ${state.segmentNames.join(', ')}`;
        onDone([`✓ Campaign "${created?.Name ?? campaign.Name}" is sending to ${target}.`]);
        return;
      }

      const { valid } = parseRecipients([state.to]);
      const body = [];
      if (state.contentMode === 'html' && state.html) {
        body.push({ ContentType: 'HTML' as const, Charset: 'utf-8', Content: state.html });
      }
      if (state.contentMode === 'text' && state.text) {
        body.push({ ContentType: 'PlainText' as const, Charset: 'utf-8', Content: state.text });
      }
      const result = await client.sendTransactional({
        Recipients: { To: valid },
        Content: {
          Body: body,
          From: state.from,
          ...(state.subject ? { Subject: state.subject } : {}),
          ...(state.template ? { TemplateName: state.template } : {}),
        },
      });
      const lines = [`✓ Email sent to ${valid.join(', ')}.`];
      if (result.TransactionID) lines.push(`TransactionID: ${result.TransactionID}`);
      onDone(lines);
    } catch (err) {
      setError(formatApiError(err));
      setStep('review');
    }
  };

  const confirmCampaignTargets = (mode: 'lists' | 'segments', names: string[]) => {
    if (names.length === 0) return;
    setState((s) => ({
      ...s,
      recipientMode: mode,
      listNames: mode === 'lists' ? names : [],
      segmentNames: mode === 'segments' ? names : [],
      to: '',
      contentMode: 'template',
    }));
    setStep('pick-template');
  };

  /* ------------------------------------------------------------- render */

  if (step === 'init') return <LoadingLine label="Preparing…" />;
  if (step === 'sending') return <LoadingLine label="Sending…" />;

  if (step === 'from') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Send an email — sender
        </Text>
        <Text dimColor>{hint}</Text>
        <Box marginTop={1}>
          <Text>From: </Text>
          <TextInput
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setError(undefined);
            }}
            onSubmit={(v) => {
              const from = v.trim();
              if (!isValidEmail(extractEmail(from))) {
                setError(`Invalid sender address: ${from || '(empty)'}`);
                return;
              }
              setState((s) => ({ ...s, from }));
              // Campaign targets (lists/segments) are a Marketing-plan
              // feature; other accounts go straight to entering addresses.
              if (allowListSend) {
                setStep('recipient-mode');
              } else {
                setDraft(state.to);
                setStep('to-input');
              }
            }}
            placeholder="sender@yourdomain.com"
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>Enter continue · Esc cancel</Text>
      </Box>
    );
  }

  if (step === 'recipient-mode') {
    return (
      <Menu
        title="Send an email — recipients"
        items={[
          { label: 'Enter email address(es)', value: 'to', hint: 'comma-separated' },
          { label: 'Send to lists', value: 'lists', hint: 'campaign · multi-select' },
          { label: 'Send to segments', value: 'segments', hint: 'campaign · multi-select' },
        ]}
        onSelect={(value) => {
          if (value === 'to') {
            setDraft(state.to);
            setStep('to-input');
          } else if (value === 'lists') {
            setStep('pick-lists');
          } else {
            setStep('pick-segments');
          }
        }}
      />
    );
  }

  if (step === 'to-input') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Send an email — recipients
        </Text>
        <Box marginTop={1}>
          <Text>To: </Text>
          <TextInput
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setError(undefined);
            }}
            onSubmit={(v) => {
              const { valid, invalid } = parseRecipients([v]);
              if (invalid.length > 0) {
                setError(`Invalid address(es): ${invalid.join(', ')}`);
                return;
              }
              if (valid.length === 0) {
                setError('At least one recipient is required.');
                return;
              }
              setState((s) => ({
                ...s,
                to: valid.join(', '),
                recipientMode: 'to',
                listNames: [],
                segmentNames: [],
              }));
              setStep('content-mode');
            }}
            placeholder="a@example.com, b@example.com"
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>Enter continue · Esc back</Text>
      </Box>
    );
  }

  if (step === 'pick-lists') {
    return (
      <Browser<ContactsList>
        key="pick-lists"
        title={`Send a campaign — pick lists (${selectedLists.size} selected)`}
        columns={[
          { header: 'Name', value: (l) => l.ListName },
          { header: 'Date added', value: (l) => l.DateAdded },
        ]}
        fetchPage={(limit, offset) => client.listLists({ limit, offset })}
        multiSelect={{
          keyOf: (l) => l.ListName,
          selected: selectedLists,
          onToggle: (l) =>
            setSelectedLists((prev) => {
              const next = new Set(prev);
              if (next.has(l.ListName)) next.delete(l.ListName);
              else next.add(l.ListName);
              return next;
            }),
          onConfirm: (fallback) => {
            const names = new Set(selectedLists);
            if (fallback) names.add(fallback.ListName);
            confirmCampaignTargets('lists', [...names]);
          },
        }}
        onBack={() => setStep('recipient-mode')}
      />
    );
  }

  if (step === 'pick-segments') {
    return (
      <Browser<Segment>
        key="pick-segments"
        title={`Send a campaign — pick segments (${selectedSegments.size} selected)`}
        columns={[
          { header: 'Name', value: (s) => s.Name },
          { header: 'Rule', value: (s) => s.Rule, maxWidth: 40 },
        ]}
        fetchPage={(limit, offset) => client.listSegments({ limit, offset })}
        multiSelect={{
          keyOf: (s) => s.Name,
          selected: selectedSegments,
          onToggle: (s) =>
            setSelectedSegments((prev) => {
              const next = new Set(prev);
              if (next.has(s.Name)) next.delete(s.Name);
              else next.add(s.Name);
              return next;
            }),
          onConfirm: (fallback) => {
            const names = new Set(selectedSegments);
            if (fallback) names.add(fallback.Name);
            confirmCampaignTargets('segments', [...names]);
          },
        }}
        onBack={() => setStep('recipient-mode')}
      />
    );
  }

  if (step === 'content-mode') {
    return (
      <Menu
        title={`${titlePrefix} — content`}
        items={[
          { label: 'Plain text', value: 'text' },
          { label: 'HTML', value: 'html' },
          { label: 'Saved template', value: 'template' },
        ]}
        onSelect={(value) => {
          setState((s) => ({ ...s, contentMode: value as WizardState['contentMode'] }));
          if (value === 'text') {
            setDraft(state.text);
            setStep('text-input');
          } else if (value === 'html') {
            setDraft(state.html);
            setStep('html-input');
          } else {
            setStep('pick-template');
          }
        }}
      />
    );
  }

  if (step === 'text-input' || step === 'html-input') {
    const isHtml = step === 'html-input';
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          {titlePrefix} — {isHtml ? 'HTML' : 'text'} body
        </Text>
        <Box marginTop={1}>
          <Text>{isHtml ? 'HTML: ' : 'Text: '}</Text>
          <TextInput
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setError(undefined);
            }}
            onSubmit={(v) => {
              if (v.trim().length === 0) {
                setError('The body cannot be empty.');
                return;
              }
              setState((s) => ({
                ...s,
                text: isHtml ? s.text : v,
                html: isHtml ? v : s.html,
                template: undefined,
              }));
              setDraft(state.subject);
              setStep('subject');
            }}
            placeholder={isHtml ? '<p>Hello!</p>' : 'Hello!'}
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>Enter continue · Esc back</Text>
      </Box>
    );
  }

  if (step === 'pick-template') {
    return (
      <Browser<Template>
        key="pick-template"
        title={`${titlePrefix} — pick a template`}
        columns={[
          { header: 'Name', value: (t) => t.Name },
          { header: 'Type', value: (t) => formatTemplateType(t.TemplateType) },
          { header: 'Date added', value: (t) => t.DateAdded },
        ]}
        fetchPage={(limit, offset) =>
          client.listTemplates({ limit, offset, templateTypes: SENDABLE_TEMPLATE_TYPES })
        }
        onSelect={(template) => {
          setState((s) => ({ ...s, template: template.Name }));
          setDraft(state.subject);
          setStep('subject');
        }}
        onBack={() => {
          if (state.recipientMode === 'lists') setStep('pick-lists');
          else if (state.recipientMode === 'segments') setStep('pick-segments');
          else setStep('content-mode');
        }}
        selectHint="choose"
      />
    );
  }

  if (step === 'subject') {
    const optional = Boolean(state.template);
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          {titlePrefix} — subject
        </Text>
        {optional && <Text dimColor>(optional — the template has its own subject)</Text>}
        <Box marginTop={1}>
          <Text>Subject: </Text>
          <TextInput
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setError(undefined);
            }}
            onSubmit={(v) => {
              if (v.trim().length === 0 && !optional) {
                setError('A subject is required.');
                return;
              }
              setState((s) => ({ ...s, subject: v.trim() }));
              setStep('review');
            }}
            placeholder="Hello from Elastic Email"
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>Enter continue · Esc back</Text>
      </Box>
    );
  }

  // review
  return (
    <ReviewScreen
      state={state}
      title={`${titlePrefix} — review`}
      error={error}
      onSend={send}
      onCancel={onCancel}
    />
  );
}

function ReviewScreen({
  state,
  title,
  error,
  onSend,
  onCancel,
}: {
  state: WizardState;
  title: string;
  error?: string;
  onSend: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.return) onSend();
    else if (input === 'q') onCancel();
  });

  const toLine =
    state.recipientMode === 'lists'
      ? `lists: ${state.listNames.join(', ')} (campaign)`
      : state.recipientMode === 'segments'
        ? `segments: ${state.segmentNames.join(', ')} (campaign)`
        : state.to;

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        {title}
      </Text>
      <Box flexDirection="column" marginY={1} paddingLeft={1}>
        <Text>
          <Text dimColor>From: </Text>
          {state.from}
        </Text>
        <Text>
          <Text dimColor>To: </Text>
          {toLine}
        </Text>
        {state.subject && (
          <Text>
            <Text dimColor>Subject: </Text>
            {state.subject}
          </Text>
        )}
        {state.template ? (
          <Text>
            <Text dimColor>Content: </Text>template "{state.template}"
          </Text>
        ) : (
          <Text>
            <Text dimColor>Content: </Text>
            {state.contentMode === 'html' ? truncate(state.html) : truncate(state.text)}
          </Text>
        )}
      </Box>
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>Enter send · Esc back · q cancel</Text>
    </Box>
  );
}

function truncate(value: string, max = 60): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
