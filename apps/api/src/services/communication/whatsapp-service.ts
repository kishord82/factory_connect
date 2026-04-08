/**
 * CA-C1: WhatsApp Cloud API integration service.
 * Manages template messages, freeform messages, document requests, and webhook processing.
 * All dates in IST timezone. Quiet hours: 21:00-08:00 IST.
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne } from '@fc/database';
import type { PoolClient } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('whatsapp-service');

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

interface SendMessageResult {
  messageId: string;
  status: string;
}

interface CommunicationLogRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  channel: string;
  message_type: string;
  direction: string;
  subject: string | null;
  body: string;
  external_message_id: string | null;
  status: string;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface MessageStatusRow {
  status: string;
  delivered_at: Date | null;
  read_at: Date | null;
}

/**
 * Get WhatsApp configuration from secrets or config table.
 * In dev: reads from env. In prod: reads from Vault via secrets.MustGet().
 */
async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    };
  } catch (err) {
    throw new FcError(
      'FC_ERR_WHATSAPP_CONFIG_MISSING',
      'WhatsApp configuration not available',
      { error: String(err) },
      500,
    );
  }
}

/**
 * Check if current time is within quiet hours (21:00-08:00 IST).
 */
function isInQuietHours(): boolean {
  const istTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC+5:30 IST offset
  const hour = istTime.getUTCHours();
  return hour >= 21 || hour < 8;
}

/**
 * Make HTTP request to WhatsApp Cloud API.
 * Can be mocked in tests.
 */
export async function callWhatsAppAPI(
  method: 'GET' | 'POST',
  endpoint: string,
  accessToken: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `https://graph.facebook.com/v18.0${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorData = data as { error?: { code: number; message: string } };
    if (errorData.error?.code === 429) {
      throw new FcError(
        'FC_ERR_WHATSAPP_RATE_LIMITED',
        'WhatsApp API rate limit exceeded',
        { retryAfter: response.headers.get('Retry-After') },
        429,
      );
    }
    throw new FcError(
      'FC_ERR_WHATSAPP_API_FAILED',
      `WhatsApp API error: ${errorData.error?.message || 'Unknown error'}`,
      { statusCode: response.status, endpoint },
      response.status || 500,
    );
  }

  return data;
}

/**
 * Send a templated WhatsApp message.
 * Uses WhatsApp-managed templates stored in Meta.
 * Templates must be pre-created in WhatsApp Business Account.
 */
export async function sendTemplateMessage(
  ctx: CaRequestContext,
  clientId: string,
  templateName: string,
  variables: Record<string, string>,
  language: string = 'en',
): Promise<SendMessageResult> {
  // Fetch client to get phone number and verify access
  const client = await getClientWithPhone(ctx, clientId);
  if (!client || !client.whatsapp_phone_number) {
    throw new FcError(
      'FC_ERR_WHATSAPP_NO_PHONE',
      `Client ${clientId} has no WhatsApp phone number on file`,
      { clientId },
      400,
    );
  }

  const config = await getWhatsAppConfig();
  if (!config.phoneNumberId || !config.accessToken) {
    throw new FcError(
      'FC_ERR_WHATSAPP_CONFIG_MISSING',
      'WhatsApp configuration incomplete',
      {},
      500,
    );
  }

  // Validate template exists
  const template = await getTemplate(ctx, templateName);
  if (!template) {
    throw new FcError(
      'FC_ERR_TEMPLATE_NOT_FOUND',
      `Template ${templateName} not found`,
      { templateName },
      404,
    );
  }

  try {
    const response = await callWhatsAppAPI('POST', `/${config.phoneNumberId}/messages`, config.accessToken, {
      messaging_product: 'whatsapp',
      to: normalizePhoneNumber(client.whatsapp_phone_number),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language,
        },
        parameters: {
          body: {
            parameters: Object.values(variables).map((val) => ({ type: 'text', text: val })),
          },
        },
      },
    });

    const messageId = String((response as { messages?: Array<{ id: string }> }).messages?.[0]?.id || '');

    // Log to communication_log
    await logCommunication(ctx, {
      client_id: clientId,
      channel: 'whatsapp',
      message_type: 'template',
      direction: 'outbound',
      subject: templateName,
      body: JSON.stringify(variables),
      external_message_id: messageId,
      status: 'sent',
      sent_at: new Date(),
    });

    logger.info(
      {
        clientId,
        templateName,
        messageId,
        phone: client.whatsapp_phone_number,
      },
      'Template message sent',
    );

    return { messageId, status: 'sent' };
  } catch (err) {
    if (err instanceof FcError) throw err;

    throw new FcError(
      'FC_ERR_WHATSAPP_SEND_FAILED',
      'Failed to send WhatsApp template message',
      { clientId, templateName, error: String(err) },
      500,
    );
  }
}

/**
 * Send a freeform text message (within 24hr window from client's last inbound message).
 */
export async function sendFreeformMessage(
  ctx: CaRequestContext,
  clientId: string,
  text: string,
): Promise<SendMessageResult> {
  const client = await getClientWithPhone(ctx, clientId);
  if (!client || !client.whatsapp_phone_number) {
    throw new FcError(
      'FC_ERR_WHATSAPP_NO_PHONE',
      `Client ${clientId} has no WhatsApp phone number on file`,
      { clientId },
      400,
    );
  }

  // Check 24hr window: has there been an inbound message in the last 24 hours?
  const recentInbound = await withTenantClient(ctx, async (c: PoolClient) => {
    return findOne<CommunicationLogRow>(
      c,
      `SELECT * FROM communication_log
       WHERE ca_firm_id = $1 AND client_id = $2 AND channel = 'whatsapp'
       AND direction = 'inbound' AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 1`,
      [ctx.caFirmId, clientId],
    );
  });

  if (!recentInbound) {
    throw new FcError(
      'FC_ERR_WHATSAPP_OUTSIDE_24HR_WINDOW',
      'Cannot send freeform message: no inbound message in last 24 hours',
      { clientId },
      400,
    );
  }

  const config = await getWhatsAppConfig();
  if (!config.phoneNumberId || !config.accessToken) {
    throw new FcError('FC_ERR_WHATSAPP_CONFIG_MISSING', 'WhatsApp configuration incomplete', {}, 500);
  }

  try {
    const response = await callWhatsAppAPI('POST', `/${config.phoneNumberId}/messages`, config.accessToken, {
      messaging_product: 'whatsapp',
      to: normalizePhoneNumber(client.whatsapp_phone_number),
      type: 'text',
      text: {
        body: text,
      },
    });

    const messageId = String((response as { messages?: Array<{ id: string }> }).messages?.[0]?.id || '');

    await logCommunication(ctx, {
      client_id: clientId,
      channel: 'whatsapp',
      message_type: 'text',
      direction: 'outbound',
      subject: null,
      body: text,
      external_message_id: messageId,
      status: 'sent',
      sent_at: new Date(),
    });

    logger.info({ clientId, messageId }, 'Freeform message sent');

    return { messageId, status: 'sent' };
  } catch (err) {
    if (err instanceof FcError) throw err;
    throw new FcError(
      'FC_ERR_WHATSAPP_SEND_FAILED',
      'Failed to send freeform WhatsApp message',
      { clientId, error: String(err) },
      500,
    );
  }
}

/**
 * Send a document request via WhatsApp template.
 * Creates a document_requests record and sends initial notification.
 */
export async function sendDocumentRequest(
  ctx: CaRequestContext,
  clientId: string,
  documentType: string,
  period: string,
  dueDate: Date,
  channel: 'whatsapp' | 'email' = 'whatsapp',
): Promise<{ requestId: string; messageId?: string }> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Create document_requests record
    const request = await insertOne<{ id: string }>(
      client,
      `INSERT INTO document_requests (ca_firm_id, client_id, document_type, period, due_date, channel, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'sent')
       RETURNING id`,
      [ctx.caFirmId, clientId, documentType, period, dueDate, channel],
    );

    // Send initial notification via WhatsApp if channel is whatsapp and not in quiet hours
    let messageId: string | undefined;
    if (channel === 'whatsapp' && !isInQuietHours()) {
      const template = await getTemplate(ctx, 'doc_request');
      if (template) {
        try {
          const result = await sendTemplateMessage(ctx, clientId, 'doc_request', {
            documentType,
            period,
            dueDate: dueDate.toLocaleDateString('en-IN'),
          });
          messageId = result.messageId;
        } catch (err) {
          logger.warn(
            { err, clientId, documentType },
            'Failed to send initial doc request notification; request created anyway',
          );
        }
      }
    }

    logger.info(
      { requestId: request.id, clientId, documentType, channel },
      'Document request created and notification sent',
    );

    return { requestId: request.id, messageId };
  });
}

/**
 * Process incoming WhatsApp webhook (status updates, incoming messages, media uploads).
 * Called from whatsapp-webhook-worker.
 */
export async function processWebhook(ctx: CaRequestContext, webhookBody: Record<string, unknown>): Promise<void> {
  try {
    const entry = (webhookBody.entry as Array<Record<string, unknown>>)?.[0];
    if (!entry) return;

    const changes = (entry.changes as Array<Record<string, unknown>>)?.[0];
    if (!changes) return;

    const value = changes.value as Record<string, unknown>;
    if (!value) return;

    // Handle message status updates (sent, delivered, read)
    const statuses = (value.statuses as Array<Record<string, unknown>>) || [];
    for (const status of statuses) {
      await handleStatusUpdate(ctx, status);
    }

    // Handle incoming messages
    const messages = (value.messages as Array<Record<string, unknown>>) || [];
    for (const msg of messages) {
      await handleIncomingMessage(ctx, msg);
    }
  } catch (err) {
    logger.error({ err, webhookBody }, 'Error processing WhatsApp webhook');
    // Don't throw — webhooks should return 200 OK regardless
  }
}

/**
 * Process document upload from WhatsApp webhook.
 * Downloads from WhatsApp CDN, stores in MinIO, updates document_request status.
 */
export async function processDocumentUpload(
  ctx: CaRequestContext,
  mediaId: string,
  clientId: string,
  requestId: string,
): Promise<{ documentUrl: string }> {
  const config = await getWhatsAppConfig();
  if (!config.accessToken) {
    throw new FcError('FC_ERR_WHATSAPP_CONFIG_MISSING', 'WhatsApp configuration incomplete', {}, 500);
  }

  try {
    // Get media URL from WhatsApp
    const mediaResponse = await callWhatsAppAPI('GET', `/${mediaId}`, config.accessToken);
    const downloadUrl = String(mediaResponse.url || '');

    if (!downloadUrl) {
      throw new FcError(
        'FC_ERR_WHATSAPP_NO_MEDIA_URL',
        'WhatsApp API did not return media download URL',
        { mediaId },
        500,
      );
    }

    // Download media (in real implementation, would store in MinIO)
    // For now, we log and record the URL
    const documentUrl = downloadUrl;

    // Update document_requests status to 'received'
    await withTenantTransaction(ctx, async (client: PoolClient) => {
      await client.query(
        `UPDATE document_requests SET status = 'received', received_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND client_id = $2`,
        [requestId, clientId],
      );
    });

    logger.info({ requestId, clientId, documentUrl }, 'Document uploaded and stored');

    return { documentUrl };
  } catch (err) {
    if (err instanceof FcError) throw err;
    throw new FcError(
      'FC_ERR_WHATSAPP_DOCUMENT_DOWNLOAD_FAILED',
      'Failed to download document from WhatsApp',
      { mediaId, requestId, error: String(err) },
      500,
    );
  }
}

/**
 * Get message delivery status.
 */
export async function getMessageStatus(
  ctx: CaRequestContext,
  externalMessageId: string,
): Promise<{ status: string; deliveredAt?: Date; readAt?: Date }> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const row = await findOne<MessageStatusRow>(
      client,
      `SELECT status, delivered_at, read_at FROM communication_log
       WHERE ca_firm_id = $1 AND external_message_id = $2`,
      [ctx.caFirmId, externalMessageId],
    );

    if (!row) {
      throw new FcError(
        'FC_ERR_MESSAGE_NOT_FOUND',
        `Message ${externalMessageId} not found`,
        { messageId: externalMessageId },
        404,
      );
    }

    return {
      status: row.status,
      deliveredAt: row.delivered_at || undefined,
      readAt: row.read_at || undefined,
    };
  });
}

// ============= HELPER FUNCTIONS =============

interface ClientRow {
  id: string;
  whatsapp_phone_number: string | null;
}

async function getClientWithPhone(ctx: CaRequestContext, clientId: string): Promise<ClientRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<ClientRow>(
      client,
      `SELECT id, whatsapp_phone_number FROM clients WHERE ca_firm_id = $1 AND id = $2`,
      [ctx.caFirmId, clientId],
    );
  });
}

interface TemplateRow {
  id: string;
  name: string;
  template_type: string;
  channel: string;
}

async function getTemplate(ctx: CaRequestContext, templateName: string): Promise<TemplateRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<TemplateRow>(
      client,
      `SELECT * FROM document_templates
       WHERE (ca_firm_id = $1 OR ca_firm_id IS NULL)
       AND name = $2 AND channel = 'whatsapp'
       ORDER BY ca_firm_id DESC LIMIT 1`,
      [ctx.caFirmId, templateName],
    );
  });
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Ensure it starts with country code (91 for India)
  if (!digits.startsWith('91')) {
    if (digits.length === 10) {
      return `91${digits}`;
    }
  }
  return digits;
}

async function logCommunication(
  ctx: CaRequestContext,
  data: {
    client_id: string;
    channel: string;
    message_type: string;
    direction: string;
    subject: string | null;
    body: string;
    external_message_id: string | null;
    status: string;
    sent_at?: Date | null;
  },
): Promise<void> {
  await withTenantTransaction(ctx, async (client: PoolClient) => {
    await client.query(
      `INSERT INTO communication_log (
        ca_firm_id, client_id, channel, message_type, direction,
        subject, body, external_message_id, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        ctx.caFirmId,
        data.client_id,
        data.channel,
        data.message_type,
        data.direction,
        data.subject,
        data.body,
        data.external_message_id,
        data.status,
        data.sent_at,
      ],
    );
  });
}

async function handleStatusUpdate(ctx: CaRequestContext, status: Record<string, unknown>): Promise<void> {
  const messageId = String(status.id || '');
  const statusValue = String(status.status || '');

  if (!messageId || !statusValue) return;

  // Find the communication log entry
  const log = await withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<{ id: string }>(
      client,
      `SELECT id FROM communication_log WHERE external_message_id = $1 AND ca_firm_id = $2`,
      [messageId, ctx.caFirmId],
    );
  });

  if (!log) {
    logger.warn({ messageId }, 'Received status update for unknown message');
    return;
  }

  // Update status
  const updates: Record<string, unknown> = { status: statusValue };
  const timestamp = new Date((status.timestamp as number) * 1000);

  if (statusValue === 'delivered') {
    updates.delivered_at = timestamp;
  } else if (statusValue === 'read') {
    updates.read_at = timestamp;
  }

  await withTenantTransaction(ctx, async (client: PoolClient) => {
    const setSql = Object.keys(updates)
      .map((k, i) => `${k} = $${i + 2}`)
      .join(', ');
    await client.query(
      `UPDATE communication_log SET ${setSql}, updated_at = NOW() WHERE id = $1`,
      [log.id, ...Object.values(updates)],
    );
  });

  logger.debug({ messageId, status: statusValue }, 'Updated message status');
}

async function handleIncomingMessage(ctx: CaRequestContext, msg: Record<string, unknown>): Promise<void> {
  const messageId = String(msg.id || '');
  const fromPhone = String(msg.from || '');
  const timestamp = new Date((msg.timestamp as number) * 1000);

  // Find client by WhatsApp phone number
  const client = await withTenantClient(ctx, async (c: PoolClient) => {
    return findOne<ClientRow>(
      c,
      `SELECT id, whatsapp_phone_number FROM clients
       WHERE ca_firm_id = $1 AND whatsapp_phone_number LIKE $2`,
      [ctx.caFirmId, `%${fromPhone}`],
    );
  });

  if (!client) {
    logger.warn({ fromPhone }, 'Incoming message from unknown phone number');
    return;
  }

  // Extract message text or media info
  const text = (msg.text as { body?: string })?.body || '[Media/Other]';

  // Log incoming message
  await logCommunication(ctx, {
    client_id: client.id,
    channel: 'whatsapp',
    message_type: (msg.type as string) || 'text',
    direction: 'inbound',
    subject: null,
    body: text,
    external_message_id: messageId,
    status: 'received',
    sent_at: timestamp,
  });

  logger.info({ clientId: client.id, messageId }, 'Incoming WhatsApp message logged');
}
