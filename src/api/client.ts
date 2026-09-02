import axios, { type AxiosInstance } from 'axios';
import { toApiError } from './errors.js';
import type {
  AccountInfo,
  AccountStatistics,
  Campaign,
  Contact,
  ContactsQueryParams,
  ContactPayload,
  ContactsList,
  DomainDetail,
  EmailJobStatus,
  EmailMessageData,
  EmailSendResult,
  EmailStatusOptions,
  EmailValidationResult,
  ListEventsParams,
  ListPayload,
  ListSuppressionsParams,
  ListTemplatesParams,
  PaginationParams,
  RecipientEvent,
  Segment,
  StatisticsParams,
  Suppression,
  SuppressionType,
  Template,
  TemplateDetail,
  TemplatePayload,
} from './types.js';

export const DEFAULT_BASE_URL = 'https://api.elasticemail.com/v4';
const API_KEY_HEADER = 'X-ElasticEmail-ApiKey';

export interface ElasticEmailClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Thin, typed wrapper over the Elastic Email REST API v4 using axios.
 *
 * We use axios directly (rather than the generated `@elasticemail/elasticemail-client`)
 * for full control over error normalization and to guarantee that the API key
 * header is never echoed into logs or error output.
 */
export class ElasticEmailClient {
  private readonly http: AxiosInstance;
  /** v3 base, derived from the v4 base — only used by getAccount(). */
  private readonly v3BaseUrl: string;

  constructor(options: ElasticEmailClientOptions) {
    this.v3BaseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/v4\/?$/, '/v3');
    this.http = axios.create({
      baseURL: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeoutMs ?? 30_000,
      headers: {
        [API_KEY_HEADER]: options.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /** Sends a transactional email. POST /emails/transactional */
  async sendTransactional(data: EmailMessageData): Promise<EmailSendResult> {
    try {
      const res = await this.http.post<EmailSendResult>('/emails/transactional', data);
      return res.data ?? {};
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists templates. GET /templates */
  async listTemplates(params: ListTemplatesParams = {}): Promise<Template[]> {
    try {
      const res = await this.http.get<Template[]>('/templates', {
        params: {
          limit: params.limit,
          offset: params.offset,
          // scopeType is a REQUIRED query param on this endpoint — omitting it
          // yields HTTP 400.
          scopeType: params.scopeType ?? 'Personal',
          templateTypes: params.templateTypes,
        },
        // Arrays serialize as repeated params (templateTypes=A&templateTypes=B).
        paramsSerializer: { indexes: null },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Loads basic account information. This is the one v3 call in the CLI —
   * API v4 has no account endpoint. Absolute URL bypasses the v4 baseURL;
   * the same X-ElasticEmail-ApiKey header authenticates v3.
   */
  async getAccount(): Promise<AccountInfo> {
    try {
      const res = await this.http.get<AccountInfo>(`${this.v3BaseUrl}/account`);
      return res.data ?? {};
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads aggregate sending statistics. GET /statistics */
  async getStatistics(params: StatisticsParams): Promise<AccountStatistics> {
    try {
      const res = await this.http.get<AccountStatistics>('/statistics', {
        params: { from: params.from, to: params.to },
      });
      return res.data ?? {};
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads the delivery status of a send job. GET /emails/{transactionid}/status */
  async getEmailStatus(
    transactionId: string,
    options: EmailStatusOptions = {},
  ): Promise<EmailJobStatus> {
    try {
      const res = await this.http.get<EmailJobStatus>(
        `/emails/${encodeURIComponent(transactionId)}/status`,
        { params: options },
      );
      return res.data ?? {};
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Lists contacts. GET /contacts. Pass `rule` (a segment's Rule expression)
   * to list the contacts of a segment — v4 has no /segments/{name}/contacts
   * endpoint, but /contacts accepts the same rule filter.
   */
  async listContacts(params: ContactsQueryParams = {}): Promise<Contact[]> {
    try {
      const res = await this.http.get<Contact[]>('/contacts', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads a single segment (name + rule). GET /segments/{name} */
  async getSegment(name: string): Promise<Segment> {
    try {
      const res = await this.http.get<Segment>(`/segments/${encodeURIComponent(name)}`);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads a single contact. GET /contacts/{email} */
  async getContact(email: string): Promise<Contact> {
    try {
      const res = await this.http.get<Contact>(`/contacts/${encodeURIComponent(email)}`);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Adds contacts, optionally subscribing them to lists. POST /contacts */
  async addContacts(contacts: ContactPayload[], listNames?: string[]): Promise<Contact[]> {
    try {
      const res = await this.http.post<Contact[]>('/contacts', contacts, {
        params: listNames && listNames.length > 0 ? { listnames: listNames } : undefined,
        paramsSerializer: { indexes: null },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Deletes a contact. DELETE /contacts/{email} */
  async deleteContact(email: string): Promise<void> {
    try {
      await this.http.delete(`/contacts/${encodeURIComponent(email)}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists contact lists. GET /lists */
  async listLists(params: PaginationParams = {}): Promise<ContactsList[]> {
    try {
      const res = await this.http.get<ContactsList[]>('/lists', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Creates a contact list. POST /lists */
  async createList(payload: ListPayload): Promise<ContactsList> {
    try {
      const res = await this.http.post<ContactsList>('/lists', payload);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Deletes a contact list. DELETE /lists/{name} */
  async deleteList(name: string): Promise<void> {
    try {
      await this.http.delete(`/lists/${encodeURIComponent(name)}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists sender domains. GET /domains */
  async listDomains(): Promise<DomainDetail[]> {
    try {
      const res = await this.http.get<DomainDetail[]>('/domains');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads a single domain with verification details. GET /domains/{domain} */
  async getDomain(domain: string): Promise<DomainDetail> {
    try {
      const res = await this.http.get<DomainDetail>(`/domains/${encodeURIComponent(domain)}`);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists suppressions, optionally narrowed to one type. GET /suppressions[/...] */
  async listSuppressions(params: ListSuppressionsParams = {}): Promise<Suppression[]> {
    const path = params.type ? `/suppressions/${params.type}` : '/suppressions';
    try {
      const res = await this.http.get<Suppression[]>(path, {
        params: {
          limit: params.limit,
          offset: params.offset,
          // `search` is only supported by the typed sub-lists.
          ...(params.type && params.search ? { search: params.search } : {}),
        },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Adds addresses to a suppression list. POST /suppressions/{type} */
  async addSuppressions(type: SuppressionType, emails: string[]): Promise<Suppression[]> {
    try {
      const res = await this.http.post<Suppression[]>(`/suppressions/${type}`, emails);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Removes an address from suppressions. DELETE /suppressions/{email} */
  async deleteSuppression(email: string): Promise<void> {
    try {
      await this.http.delete(`/suppressions/${encodeURIComponent(email)}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists delivery events. GET /events */
  async listEvents(params: ListEventsParams = {}): Promise<RecipientEvent[]> {
    try {
      const res = await this.http.get<RecipientEvent[]>('/events', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists segments. GET /segments */
  async listSegments(params: PaginationParams = {}): Promise<Segment[]> {
    try {
      const res = await this.http.get<Segment[]>('/segments', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists the contacts belonging to a list. GET /lists/{listname}/contacts */
  async getListContacts(listName: string, params: PaginationParams = {}): Promise<Contact[]> {
    try {
      const res = await this.http.get<Contact[]>(
        `/lists/${encodeURIComponent(listName)}/contacts`,
        { params },
      );
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Creates a template. POST /templates */
  async createTemplate(payload: TemplatePayload): Promise<TemplateDetail> {
    try {
      const res = await this.http.post<TemplateDetail>('/templates', payload);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Creates a campaign. POST /campaigns. With Status 'Active' the campaign
   * starts sending immediately — this is how v4 sends to a list/segment.
   */
  async createCampaign(campaign: Campaign): Promise<Campaign> {
    try {
      const res = await this.http.post<Campaign>('/campaigns', campaign);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Loads a single template with its body. GET /templates/{name} */
  async getTemplate(name: string): Promise<TemplateDetail> {
    try {
      const res = await this.http.get<TemplateDetail>(`/templates/${encodeURIComponent(name)}`);
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Deletes a template. DELETE /templates/{name} */
  async deleteTemplate(name: string): Promise<void> {
    try {
      await this.http.delete(`/templates/${encodeURIComponent(name)}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Lists past single-email verification results. GET /verifications */
  async listVerifications(params: PaginationParams = {}): Promise<EmailValidationResult[]> {
    try {
      const res = await this.http.get<EmailValidationResult[]>('/verifications', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Verifies a single email address (synchronous). POST /verifications/{email} */
  async verifyEmail(email: string): Promise<EmailValidationResult> {
    try {
      const res = await this.http.post<EmailValidationResult>(
        `/verifications/${encodeURIComponent(email)}`,
      );
      return res.data ?? {};
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Cheap connectivity/auth probe used by `auth status`. Requests a single
   * template; any 2xx means the key is valid and the API is reachable.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.http.get('/templates', { params: { scopeType: 'Personal', limit: 1 } });
      return true;
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Convenience factory. */
export function createClient(apiKey: string, baseUrl?: string): ElasticEmailClient {
  return new ElasticEmailClient({ apiKey, baseUrl });
}
