import { useEffect, useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { ElasticEmailClient } from '../../api/client.js';
import { formatApiError } from '../../api/errors.js';
import {
  SENDABLE_TEMPLATE_TYPES,
  type Contact,
  type ContactsList,
  type DomainDetail,
  type EmailValidationResult,
  type RecipientEvent,
  type Segment,
  type Template,
} from '../../api/types.js';
import { clearConfig, getConfigPath } from '../../config/config.js';
import { formatTemplateType } from '../../lib/template-type.js';
import { isValidEmail } from '../../lib/validate.js';
import { Browser, Detail, LoadingLine, Menu } from './components.js';
import { SendWizard } from './SendWizard.js';

type Screen =
  | { kind: 'menu' }
  | { kind: 'send' }
  | { kind: 'templates' }
  | { kind: 'lists' }
  | { kind: 'list-contacts'; list: string }
  | { kind: 'contacts' }
  | { kind: 'segments' }
  | { kind: 'segment-contacts'; name: string; rule?: string }
  | { kind: 'domains' }
  | { kind: 'events' }
  | { kind: 'verifications' }
  | { kind: 'verifications-list' }
  | { kind: 'verify-input' }
  | { kind: 'stats' }
  | { kind: 'account' }
  | { kind: 'detail'; title: string; data: Record<string, unknown> }
  | { kind: 'result'; lines: string[] };

export interface TuiOptions {
  accountEmail?: string;
  /** Sending to a whole list (campaign) is a Marketing-plan feature. */
  allowListSend?: boolean;
}

interface AppProps extends TuiOptions {
  client: ElasticEmailClient;
}

function App({ client, accountEmail, allowListSend }: AppProps) {
  const { exit } = useApp();
  const [stack, setStack] = useState<Screen[]>([{ kind: 'menu' }]);

  const top = stack[stack.length - 1];
  const push = (screen: Screen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  // Unique per stack entry: adjacent screens often render the same component
  // type (two Browsers), and without a key React would keep the previous
  // screen's state (rows, page) instead of remounting and refetching.
  const screenKey = `${stack.length}:${top.kind}`;

  switch (top.kind) {
    case 'menu':
      return (
        <MainMenu
          onSelect={(value) => {
            if (value === 'quit') exit();
            else push({ kind: value } as Screen);
          }}
        />
      );

    case 'send':
      return (
        <SendWizard
          client={client}
          accountEmail={accountEmail}
          allowListSend={allowListSend}
          onDone={(lines) => setStack([{ kind: 'menu' }, { kind: 'result', lines }])}
          onCancel={pop}
        />
      );

    case 'result':
      return <ResultScreen lines={top.lines} onBack={pop} />;

    case 'templates':
      return (
        <Browser<Template>
          key={screenKey}
          title="Templates"
          columns={[
            { header: 'Name', value: (t) => t.Name },
            { header: 'Type', value: (t) => formatTemplateType(t.TemplateType) },
            { header: 'Date added', value: (t) => t.DateAdded },
          ]}
          fetchPage={(limit, offset) =>
            // Only sendable email templates (no landing pages etc.).
            client.listTemplates({ limit, offset, templateTypes: SENDABLE_TEMPLATE_TYPES })
          }
          onSelect={(t) =>
            push({
              kind: 'detail',
              title: `Template: ${t.Name}`,
              data: {
                ...t,
                TemplateType: formatTemplateType(t.TemplateType),
              } as Record<string, unknown>,
            })
          }
          onBack={pop}
        />
      );

    case 'lists':
      return (
        <Browser<ContactsList>
          key={screenKey}
          title="Contact lists"
          columns={[
            { header: 'Name', value: (l) => l.ListName },
            { header: 'Allow unsubscribe', value: (l) => l.AllowUnsubscribe },
            { header: 'Date added', value: (l) => l.DateAdded },
          ]}
          fetchPage={(limit, offset) => client.listLists({ limit, offset })}
          onSelect={(l) => push({ kind: 'list-contacts', list: l.ListName })}
          onBack={pop}
          selectHint="show contacts"
        />
      );

    case 'list-contacts':
      return (
        <Browser<Contact>
          key={screenKey}
          title={`Contacts in "${top.list}"`}
          columns={[
            { header: 'Email', value: (c) => c.Email },
            { header: 'Status', value: (c) => c.Status },
            { header: 'Date added', value: (c) => c.DateAdded },
          ]}
          fetchPage={(limit, offset) => client.getListContacts(top.list, { limit, offset })}
          onSelect={(c) =>
            push({ kind: 'detail', title: `Contact: ${c.Email}`, data: c as Record<string, unknown> })
          }
          onBack={pop}
        />
      );

    case 'contacts':
      return (
        <Browser<Contact>
          key={screenKey}
          title="Contacts"
          columns={[
            { header: 'Email', value: (c) => c.Email },
            { header: 'Status', value: (c) => c.Status },
            { header: 'Date added', value: (c) => c.DateAdded },
          ]}
          fetchPage={(limit, offset) => client.listContacts({ limit, offset })}
          onSelect={(c) =>
            push({ kind: 'detail', title: `Contact: ${c.Email}`, data: c as Record<string, unknown> })
          }
          onBack={pop}
        />
      );

    case 'segments':
      return (
        <Browser<Segment>
          key={screenKey}
          title="Segments"
          columns={[
            { header: 'Name', value: (s) => s.Name },
            { header: 'Rule', value: (s) => s.Rule, maxWidth: 50 },
          ]}
          fetchPage={(limit, offset) => client.listSegments({ limit, offset })}
          onSelect={(s) => push({ kind: 'segment-contacts', name: s.Name, rule: s.Rule })}
          onBack={pop}
          selectHint="show contacts"
        />
      );

    case 'segment-contacts':
      return (
        <Browser<Contact>
          key={screenKey}
          title={`Contacts in segment "${top.name}"`}
          columns={[
            { header: 'Email', value: (c) => c.Email },
            { header: 'Status', value: (c) => c.Status },
            { header: 'Date added', value: (c) => c.DateAdded },
          ]}
          fetchPage={(limit, offset) =>
            // A segment's contacts = /contacts filtered by the segment rule.
            client.listContacts({ limit, offset, rule: top.rule || undefined })
          }
          onSelect={(c) =>
            push({ kind: 'detail', title: `Contact: ${c.Email}`, data: c as Record<string, unknown> })
          }
          onBack={pop}
        />
      );

    case 'domains':
      return (
        <Browser<DomainDetail>
          key={screenKey}
          title="Sender domains"
          columns={[
            { header: 'Domain', value: (d) => d.Domain },
            { header: 'SPF', value: (d) => (d.Spf === true ? '✓' : '✗') },
            { header: 'DKIM', value: (d) => (d.Dkim === true ? '✓' : '✗') },
          ]}
          fetchPage={async (limit, offset) => {
            const all = await client.listDomains();
            return all.slice(offset, offset + limit);
          }}
          onSelect={(d) =>
            push({ kind: 'detail', title: `Domain: ${d.Domain}`, data: d as Record<string, unknown> })
          }
          onBack={pop}
        />
      );

    case 'events':
      return (
        <Browser<RecipientEvent>
          key={screenKey}
          title="Delivery events"
          columns={[
            { header: 'Date', value: (e) => e.EventDate },
            { header: 'Type', value: (e) => e.EventType },
            { header: 'To', value: (e) => e.To },
            { header: 'Subject', value: (e) => e.Subject, maxWidth: 36 },
          ]}
          fetchPage={(limit, offset) =>
            client.listEvents({ limit, offset, orderBy: 'DateDescending' })
          }
          onSelect={(e) =>
            push({
              kind: 'detail',
              title: `Event: ${e.EventType ?? ''} → ${e.To ?? ''}`,
              data: e as Record<string, unknown>,
            })
          }
          onBack={pop}
        />
      );

    case 'verifications':
      return (
        <Menu
          key={screenKey}
          title="Email verification"
          items={[
            { label: 'Verify an email address', value: 'verify-input' },
            { label: 'Browse verification results', value: 'verifications-list' },
          ]}
          onSelect={(value) => push({ kind: value } as Screen)}
          onBack={pop}
        />
      );

    case 'verifications-list':
      return (
        <Browser<EmailValidationResult>
          key={screenKey}
          title="Verification results"
          columns={[
            { header: 'Email', value: (v) => v.Email },
            { header: 'Result', value: (v) => v.Result },
            { header: 'Date', value: (v) => v.DateAdded },
          ]}
          fetchPage={(limit, offset) => client.listVerifications({ limit, offset })}
          onSelect={(v) =>
            push({
              kind: 'detail',
              title: `Verification: ${v.Email ?? ''}`,
              data: v as Record<string, unknown>,
            })
          }
          onBack={pop}
        />
      );

    case 'verify-input':
      return (
        <VerifyScreen
          key={screenKey}
          client={client}
          onDone={(result) =>
            push({
              kind: 'detail',
              title: `Verification: ${result.Email ?? ''}`,
              data: result as Record<string, unknown>,
            })
          }
          onBack={pop}
        />
      );

    case 'stats':
      return <StatsScreen client={client} onBack={pop} />;

    case 'account':
      return <AccountScreen client={client} onBack={pop} />;

    case 'detail':
      return <Detail title={top.title} data={top.data} onBack={pop} />;
  }
}

function MainMenu({ onSelect }: { onSelect: (value: string) => void }) {
  useInput((input) => {
    if (input === 'q') onSelect('quit');
  });
  return (
    <Menu
      title="Elastic Email — interactive mode"
      items={[
        { label: 'Send an email', value: 'send', hint: 'email sending wizard' },
        { label: 'Templates', value: 'templates', hint: 'browse your templates' },
        { label: 'Contact lists', value: 'lists', hint: 'lists and their contacts' },
        { label: 'Contacts', value: 'contacts', hint: 'all contacts' },
        { label: 'Segments', value: 'segments' },
        { label: 'Delivery events', value: 'events', hint: 'recent sends and their status' },
        { label: 'Email verification', value: 'verifications', hint: 'verify and browse results' },
        { label: 'Sender domains', value: 'domains', hint: 'verification status' },
        { label: 'Statistics', value: 'stats', hint: 'last 30 days' },
        { label: 'Account info', value: 'account' },
        { label: 'Quit', value: 'quit' },
      ]}
      onSelect={onSelect}
      footer="↑/↓ move · Enter select · q or Ctrl+C quit"
    />
  );
}

function ResultScreen({ lines, onBack }: { lines: string[]; onBack: () => void }) {
  useInput((_input, key) => {
    if (key.return || key.escape) onBack();
  });
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} color={i === 0 ? 'green' : undefined}>
          {line}
        </Text>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Enter back to menu</Text>
      </Box>
    </Box>
  );
}

function StatsScreen({ client, onBack }: { client: ElasticEmailClient; onBack: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '');
    client
      .getStatistics({ from: fmt(from), to: fmt(to) })
      .then((stats) => setData(stats as Record<string, unknown>))
      .catch((err) => setError(formatApiError(err)));
  }, []);

  if (error) return <ErrorScreen message={error} onBack={onBack} />;
  if (!data) return <LoadingLine label="Loading statistics…" />;
  return <Detail title="Statistics — last 30 days" data={data} onBack={onBack} />;
}

function AccountScreen({ client, onBack }: { client: ElasticEmailClient; onBack: () => void }) {
  const { exit } = useApp();
  const [data, setData] = useState<Record<string, unknown> | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [mode, setMode] = useState<'view' | 'confirm' | 'done'>('view');
  const [removedPath, setRemovedPath] = useState<string | undefined>();

  useEffect(() => {
    client
      .getAccount()
      .then((info) => {
        const general = info.GeneralInfo ?? {};
        const bcc = info.AdvancedOptions?.BccEmail?.trim();
        setData({
          Account: general.UserName,
          'Product type': general.ProductType,
          'Support plan': general.SupportPlan,
          Created: general.DateCreated,
          'Email size limit':
            general.EmailSizeLimit !== undefined ? `${general.EmailSizeLimit} MB` : undefined,
          ...(bcc ? { 'BCC email address(es)': bcc } : {}),
        });
      })
      .catch((err) => setError(formatApiError(err)));
  }, []);

  // 'f' on the view opens the forget-me confirmation.
  useInput(
    (input) => {
      if (input === 'f') setMode('confirm');
    },
    { isActive: mode === 'view' && Boolean(data) },
  );

  // Confirmation: y removes the local config, anything else cancels.
  useInput(
    (input, key) => {
      if (input === 'y' || input === 'Y') {
        const path = getConfigPath();
        clearConfig();
        setRemovedPath(path);
        setMode('done');
      } else if (input === 'n' || input === 'N' || key.escape || key.return) {
        setMode('view');
      }
    },
    { isActive: mode === 'confirm' },
  );

  // Done: the in-memory session still holds the key, so quit the app.
  useInput(
    (_input, key) => {
      if (key.return || key.escape) exit();
    },
    { isActive: mode === 'done' },
  );

  if (error) return <ErrorScreen message={error} onBack={onBack} />;
  if (!data) return <LoadingLine label="Loading account info…" />;

  if (mode === 'confirm') {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">
          Forget me — are you sure?
        </Text>
        <Box flexDirection="column" marginY={1}>
          <Text>This removes the locally stored configuration (API key and defaults)</Text>
          <Text>
            from <Text bold>{getConfigPath()}</Text>.
          </Text>
          <Text dimColor>
            Your Elastic Email account is not touched. The ELASTIC_EMAIL_API_KEY environment
            variable, if set, is not affected.
          </Text>
        </Box>
        <Text dimColor>y confirm · n/Esc cancel</Text>
      </Box>
    );
  }

  if (mode === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Local configuration removed{removedPath ? ` (${removedPath})` : ''}.</Text>
        <Text dimColor>
          This session still holds the key in memory, so the app will close now.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>Enter quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Detail
      title="Account info"
      data={data}
      onBack={onBack}
      footer="f forget me (remove local config) · Esc back"
    />
  );
}

function VerifyScreen({
  client,
  onDone,
  onBack,
}: {
  client: ElasticEmailClient;
  onDone: (result: EmailValidationResult) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);

  useInput(
    (_input, key) => {
      if (key.escape) onBack();
    },
    { isActive: !verifying },
  );

  if (verifying) return <LoadingLine label="Verifying address…" />;

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        Verify an email address
      </Text>
      <Box marginTop={1}>
        <Text>Email: </Text>
        <TextInput
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setError(undefined);
          }}
          onSubmit={(v) => {
            const email = v.trim();
            if (!isValidEmail(email)) {
              setError(`That does not look like an email address: ${email || '(empty)'}`);
              return;
            }
            setVerifying(true);
            client
              .verifyEmail(email)
              .then((result) => onDone(result))
              .catch((err) => {
                setVerifying(false);
                setError(formatApiError(err));
              });
          }}
          placeholder="jane@example.com"
        />
      </Box>
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>Enter verify · Esc back</Text>
    </Box>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  useInput((_input, key) => {
    if (key.escape || key.return) onBack();
  });
  return (
    <Box flexDirection="column">
      <Text color="red">{message}</Text>
      <Text dimColor>Esc back</Text>
    </Box>
  );
}

/** Renders the interactive app and resolves when the user quits. */
export async function runTui(client: ElasticEmailClient, options: TuiOptions = {}): Promise<void> {
  const instance = render(<App client={client} {...options} />, {
    exitOnCtrlC: true,
  });
  await instance.waitUntilExit();
}
