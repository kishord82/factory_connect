/**
 * CA-C2: Document template management service.
 * Handles listing, creating, updating templates with variable substitution.
 */

import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne } from '@fc/database';
import { createLogger } from '@fc/observability';

const logger = createLogger('template-service');

interface DocumentTemplate {
  id: string;
  ca_firm_id: string | null;
  name: string;
  template_type: string;
  channel: string;
  subject: string | null;
  body_template: string;
  variables: string[];
  is_system_default: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TemplateCreateInput {
  name: string;
  template_type: string;
  channel: 'whatsapp' | 'email';
  subject?: string;
  body_template: string;
  variables: string[];
}

interface TemplateFilters {
  template_type?: string;
  channel?: string;
}

/**
 * List templates for a firm, including system defaults (ca_firm_id IS NULL).
 * Firm-specific templates override system defaults with same name.
 */
export async function listTemplates(
  ctx: RequestContext,
  filters: TemplateFilters = {},
): Promise<DocumentTemplate[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    let sql = `
      SELECT DISTINCT ON (name, channel) *
      FROM document_templates
      WHERE ca_firm_id = $1 OR ca_firm_id IS NULL
    `;
    const params: unknown[] = [(ctx as any).caFirmId];
    let idx = 2;

    if (filters.template_type) {
      sql += ` AND template_type = $${idx}`;
      params.push(filters.template_type);
      idx++;
    }

    if (filters.channel) {
      sql += ` AND channel = $${idx}`;
      params.push(filters.channel);
      idx++;
    }

    sql += ` ORDER BY name, channel, ca_firm_id DESC`;

    const result = await client.query<DocumentTemplate>(sql, params);
    return result.rows;
  });
}

/**
 * Create a firm-specific template.
 */
export async function createTemplate(
  ctx: RequestContext,
  data: TemplateCreateInput,
): Promise<DocumentTemplate> {
  // Validate: no duplicate names for same type+channel
  const existing = await withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<DocumentTemplate>(
      client,
      `SELECT * FROM document_templates
       WHERE ca_firm_id = $1 AND name = $2 AND template_type = $3 AND channel = $4`,
      [(ctx as any).caFirmId, data.name, data.template_type, data.channel],
    );
  });

  if (existing) {
    throw new FcError(
      'FC_ERR_TEMPLATE_DUPLICATE',
      `Template ${data.name} already exists for this firm`,
      { templateName: data.name, templateType: data.template_type },
      409,
    );
  }

  return withTenantTransaction(ctx, async (client: PoolClient) => {
    return insertOne<DocumentTemplate>(
      client,
      `INSERT INTO document_templates (
        ca_firm_id, name, template_type, channel, subject, body_template, variables
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        (ctx as any).caFirmId,
        data.name,
        data.template_type,
        data.channel,
        data.subject ?? null,
        data.body_template,
        JSON.stringify(data.variables),
      ],
    );
  });
}

/**
 * Update an existing template.
 */
export async function updateTemplate(
  ctx: RequestContext,
  templateId: string,
  data: Partial<TemplateCreateInput>,
): Promise<DocumentTemplate> {
  const existing = await withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<DocumentTemplate>(
      client,
      `SELECT * FROM document_templates WHERE id = $1 AND ca_firm_id = $2`,
      [templateId, (ctx as any).caFirmId],
    );
  });

  if (!existing) {
    throw new FcError(
      'FC_ERR_TEMPLATE_NOT_FOUND',
      `Template ${templateId} not found`,
      { templateId },
      404,
    );
  }

  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.body_template !== undefined) {
      updates.push(`body_template = $${idx++}`);
      values.push(data.body_template);
    }
    if (data.subject !== undefined) {
      updates.push(`subject = $${idx++}`);
      values.push(data.subject);
    }
    if (data.variables !== undefined) {
      updates.push(`variables = $${idx++}`);
      values.push(JSON.stringify(data.variables));
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    values.push(templateId);

    const result = await findOne<DocumentTemplate>(
      client,
      `UPDATE document_templates SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!result) {
      throw new FcError(
        'FC_ERR_TEMPLATE_UPDATE_FAILED',
        'Failed to update template',
        { templateId },
        500,
      );
    }

    logger.info({ templateId, updates: updates.length }, 'Template updated');
    return result;
  });
}

/**
 * Render a template by replacing {{variables}} with values.
 * Variables: {{ varName }}
 */
export function renderTemplate(template: DocumentTemplate, variableValues: Record<string, string>): string {
  let rendered = template.body_template;

  for (const variable of template.variables) {
    const value = variableValues[variable];
    if (!value) {
      throw new FcError(
        'FC_ERR_TEMPLATE_MISSING_VARIABLE',
        `Missing required variable: ${variable}`,
        { variable, templateName: template.name },
        400,
      );
    }
    const placeholder = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');
    rendered = rendered.replace(placeholder, value);
  }

  return rendered;
}

/**
 * Get the system default template for a template type + channel.
 * System defaults have ca_firm_id IS NULL.
 */
export async function getDefaultTemplate(
  ctx: RequestContext,
  templateType: string,
  channel: string,
): Promise<DocumentTemplate | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<DocumentTemplate>(
      client,
      `SELECT * FROM document_templates
       WHERE ca_firm_id IS NULL AND template_type = $1 AND channel = $2
       LIMIT 1`,
      [templateType, channel],
    );
  });
}

/**
 * Get template by name (searches firm-specific first, then system defaults).
 */
export async function getTemplateByName(
  ctx: RequestContext,
  templateName: string,
): Promise<DocumentTemplate | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<DocumentTemplate>(
      client,
      `SELECT * FROM document_templates
       WHERE (ca_firm_id = $1 OR ca_firm_id IS NULL) AND name = $2
       ORDER BY ca_firm_id DESC LIMIT 1`,
      [(ctx as any).caFirmId, templateName],
    );
  });
}
