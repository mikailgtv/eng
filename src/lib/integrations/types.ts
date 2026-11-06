export type IntegrationCategory =
  | "EMAIL"
  | "SMS"
  | "PUSH"
  | "CALENDAR"
  | "IDENTITY_SSO"
  | "HR_DIRECTORY"
  | "LEARNING_RECORD"
  | "WEBHOOK"
  | "STORAGE"
  | "REST_API";

export type IntegrationStatus =
  | "DISCONNECTED"
  | "CONNECTED"
  | "ACTIVE"
  | "DEGRADED"
  | "ERROR"
  | "DISABLED";

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendSmsPayload {
  to: string; // E.164 format
  message: string;
  mediaUrl?: string;
}

export interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface CalendarEventPayload {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  url?: string;
  attendees?: string[];
}

export interface LearningRecordStatement {
  actor: { name: string; mbox: string };
  verb: { id: string; display: Record<string, string> };
  object: { id: string; definition: { name: Record<string, string>; type?: string } };
  result?: { score?: { scaled?: number; raw?: number; min?: number; max?: number }; completion?: boolean; success?: boolean };
  timestamp?: string;
}

export interface ExternalUserData {
  externalId: string;
  email: string;
  name: string;
  role?: string;
  department?: string;
  employeeId?: string;
  status?: string;
}

/**
 * Universal interface for all provider implementations
 */
export interface IIntegrationProvider {
  readonly slug: string;
  readonly name: string;
  readonly category: IntegrationCategory;

  testConnection(config: Record<string, any>, credentials: Record<string, string>): Promise<HealthCheckResult>;
}

export interface IEmailProvider extends IIntegrationProvider {
  sendEmail(payload: SendEmailPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ messageId: string }>;
}

export interface ISmsProvider extends IIntegrationProvider {
  sendSms(payload: SendSmsPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ messageId: string }>;
}

export interface IPushProvider extends IIntegrationProvider {
  sendPush(payload: SendPushPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ delivered: boolean }>;
}

export interface ICalendarProvider extends IIntegrationProvider {
  syncEvent(event: CalendarEventPayload, config: Record<string, any>, credentials: Record<string, string>): Promise<{ externalId: string }>;
  removeEvent(externalId: string, config: Record<string, any>, credentials: Record<string, string>): Promise<boolean>;
}

export interface ILearningRecordProvider extends IIntegrationProvider {
  emitStatement(statement: LearningRecordStatement, config: Record<string, any>, credentials: Record<string, string>): Promise<{ statementId: string }>;
}

/** Adapter contracts only: no SSO/HR/SCIM implementation is enabled until a vetted provider is configured. */
export interface IIdentityProvider extends IIntegrationProvider {
  getAuthorizationUrl(input: { state: string; nonce: string; redirectUri: string }, config: Record<string, any>): Promise<string>;
  exchangeAuthorizationCode(code: string, redirectUri: string, config: Record<string, any>, credentials: Record<string, string>): Promise<{ idToken: string; accessToken?: string }>;
  validateIdentityToken(idToken: string, expected: { issuer: string; audience: string; nonce: string }): Promise<{ subject: string; email?: string; emailVerified?: boolean }>;
}

export interface IHRProvider extends IIntegrationProvider {
  fetchDirectoryPage(cursor: string | null, config: Record<string, any>, credentials: Record<string, string>): Promise<{ users: ExternalUserData[]; nextCursor: string | null }>;
}

export interface IStorageProvider extends IIntegrationProvider {
  putObject(key: string, bytes: Uint8Array, contentType: string, config: Record<string, any>, credentials: Record<string, string>): Promise<{ externalId: string }>;
  deleteObject(key: string, config: Record<string, any>, credentials: Record<string, string>): Promise<void>;
}
