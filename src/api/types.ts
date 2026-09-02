/**
 * Minimal typings for the subset of the Elastic Email REST API v4 used by this
 * CLI. See https://elasticemail.com/developers/api-documentation/rest-api
 */

export type BodyContentType = 'HTML' | 'PlainText';

export interface BodyPart {
  ContentType: BodyContentType;
  Content: string;
  Charset?: string;
}

export interface EmailContent {
  Body: BodyPart[];
  From?: string;
  Subject?: string;
  ReplyTo?: string;
  /** Name of a saved template to use as the message content. */
  TemplateName?: string;
}

export interface EmailRecipients {
  To: string[];
  CC?: string[];
  BCC?: string[];
}

/** Request body for POST /v4/emails/transactional. */
export interface EmailMessageData {
  Recipients: EmailRecipients;
  Content: EmailContent;
}

/** Response body for a successful send. */
export interface EmailSendResult {
  MessageID?: string;
  TransactionID?: string;
}

export type TemplateScope = 'Personal' | 'Global';

/** A single template as returned by GET /v4/templates. */
export interface Template {
  Name: string;
  Subject?: string;
  DateAdded?: string;
  TemplateType?: string;
  TemplateScope?: TemplateScope;
  [key: string]: unknown;
}

export interface ListTemplatesParams {
  limit?: number;
  offset?: number;
  scopeType?: TemplateScope;
  templateTypes?: string[];
}

/**
 * Template types that can be used as email content (`emails send --template`,
 * campaigns). Landing pages and other special types are not sendable.
 */
export const SENDABLE_TEMPLATE_TYPES = ['RawHTML', 'DragDropEditor', 'TemplateEditor'];

/**
 * Basic account information from GET /v3/account (API v4 has no account
 * endpoint). The response is much larger; we only type the fields we use.
 */
export interface AccountInfo {
  GeneralInfo?: {
    UserName?: string;
    ProductType?: string;
    SupportPlan?: string;
    DateCreated?: string;
    /** Maximum email size, in MB. */
    EmailSizeLimit?: number;
    [key: string]: unknown;
  };
  AdvancedOptions?: {
    /**
     * Account-wide BCC: the API silently BCCs every sent email to these
     * comma-separated address(es). Surfaced in `account info` so users know.
     */
    BccEmail?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Aggregate sending statistics from GET /v4/statistics. */
export interface AccountStatistics {
  Recipients?: number;
  EmailTotal?: number;
  SmsTotal?: number;
  Delivered?: number;
  Bounced?: number;
  InProgress?: number;
  Opened?: number;
  Clicked?: number;
  Unsubscribed?: number;
  Complaints?: number;
  Inbound?: number;
  ManualCancel?: number;
  NotDelivered?: number;
  [key: string]: number | undefined;
}

export interface StatisticsParams {
  from: string;
  to?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Query for GET /contacts; `rule` filters by a segment-style rule expression. */
export interface ContactsQueryParams extends PaginationParams {
  rule?: string;
}

/** A contact as returned by GET /v4/contacts. */
export interface Contact {
  Email: string;
  Status?: string;
  FirstName?: string;
  LastName?: string;
  DateAdded?: string;
  DateUpdated?: string;
  StatusChangeDate?: string;
  Source?: string;
  CustomFields?: Record<string, string>;
  [key: string]: unknown;
}

/** Request body item for POST /v4/contacts. */
export interface ContactPayload {
  Email: string;
  FirstName?: string;
  LastName?: string;
  CustomFields?: Record<string, string>;
}

/** A contact list as returned by GET /v4/lists. */
export interface ContactsList {
  ListName: string;
  PublicListID?: string;
  DateAdded?: string;
  AllowUnsubscribe?: boolean;
  [key: string]: unknown;
}

/** Request body for POST /v4/lists. */
export interface ListPayload {
  ListName: string;
  AllowUnsubscribe?: boolean;
  Emails?: string[];
}

/** A sender domain as returned by GET /v4/domains. */
export interface DomainDetail {
  Domain: string;
  DefaultDomain?: boolean;
  Spf?: boolean;
  Dkim?: boolean;
  MX?: boolean;
  DMARC?: boolean;
  TrackingStatus?: string;
  VerificationStatus?: string;
  TrackingType?: string;
  [key: string]: unknown;
}

export type SuppressionType = 'bounces' | 'complaints' | 'unsubscribes';

/** A suppression entry as returned by the GET /v4/suppressions endpoints. */
export interface Suppression {
  Email?: string;
  FriendlyErrorMessage?: string;
  ErrorCode?: number;
  DateUpdated?: string;
  [key: string]: unknown;
}

export interface ListSuppressionsParams extends PaginationParams {
  /** Narrow to a specific suppression list; omit for all suppressions. */
  type?: SuppressionType;
  /** Substring filter (only supported by the typed sub-lists). */
  search?: string;
}

/** A delivery event as returned by GET /v4/events. */
export interface RecipientEvent {
  TransactionID?: string;
  MsgID?: string;
  FromAddress?: string;
  To?: string;
  Subject?: string;
  EventType?: string;
  EventDate?: string;
  ChannelName?: string;
  MessageCategory?: string;
  [key: string]: unknown;
}

export interface ListEventsParams extends PaginationParams {
  from?: string;
  to?: string;
  orderBy?: 'DateDescending' | 'DateAscending';
}

/** A segment as returned by GET /v4/segments. */
export interface Segment {
  Name: string;
  Rule?: string;
  [key: string]: unknown;
}

/** Request body for POST /v4/templates. */
export interface TemplatePayload {
  Name: string;
  Subject?: string;
  Body?: BodyPart[];
  TemplateScope?: TemplateScope;
}

/** Recipient targeting for a campaign. */
export interface CampaignRecipientRef {
  ListNames?: string[];
  SegmentNames?: string[];
}

/** One content variant of a campaign (A/X split when multiple). */
export interface CampaignTemplate {
  From: string;
  ReplyTo?: string;
  TemplateName?: string;
  Subject?: string;
}

/**
 * Request body for POST /v4/campaigns. Creating a campaign with
 * Status 'Active' starts sending it immediately.
 */
export interface Campaign {
  Name: string;
  Status?: 'Draft' | 'Active';
  Recipients: CampaignRecipientRef;
  Content?: CampaignTemplate[];
}

/** Full template detail from GET /v4/templates/{name}. */
export interface TemplateDetail extends Template {
  Body?: BodyPart[];
  [key: string]: unknown;
}

/** Delivery status of a send job, from GET /v4/emails/{transactionid}/status. */
export interface EmailJobStatus {
  ID?: string;
  Status?: string;
  RecipientsCount?: number;
  FailedCount?: number;
  SentCount?: number;
  DeliveredCount?: number;
  PendingCount?: number;
  OpenedCount?: number;
  ClickedCount?: number;
  UnsubscribedCount?: number;
  AbuseReportsCount?: number;
  MessageIDs?: string[];
  [key: string]: unknown;
}

export interface EmailStatusOptions {
  showFailed?: boolean;
  showSent?: boolean;
  showDelivered?: boolean;
  showPending?: boolean;
  showOpened?: boolean;
  showClicked?: boolean;
  showAbuse?: boolean;
  showUnsubscribed?: boolean;
  showErrors?: boolean;
  showMessageIDs?: boolean;
}

/** Result of a single email verification, POST /v4/verifications/{email}. */
export interface EmailValidationResult {
  Account?: string;
  Domain?: string;
  Email?: string;
  Suggested?: string;
  Result?: string;
  Reason?: string;
  DateAdded?: string;
  [key: string]: unknown;
}
