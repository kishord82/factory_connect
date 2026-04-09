/**
 * Express application factory.
 * Separated from server startup for testability (supertest imports app, not server).
 */

import express from 'express';
import { correlationId } from './middleware/correlation-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { orderRouter } from './routes/orders.js';
import { shipmentRouter } from './routes/shipments.js';
import { invoiceRouter } from './routes/invoices.js';
import { connectionRouter } from './routes/connections.js';
import { resyncRouter } from './routes/resync.js';
import { calendarRouter } from './routes/calendar.js';
import { adminRouter } from './routes/admin/index.js';
import { exportRouter } from './routes/export-import.js';
import { notificationRouter } from './routes/notifications.js';
import { analyticsRouter } from './routes/analytics.js';
import { authRouter } from './routes/auth.js';
import { caRouter } from './routes/ca/index.js';
import { webhookRouter } from './routes/webhooks.js';
import { settingsRouter } from './routes/settings.js';
import { dashboardRouter } from './routes/dashboard.js';
import { mappingsRouter } from './routes/mappings.js';
import { ediRouter } from './routes/edi.js';
import { bridgeRouter } from './routes/bridge.js';
import { rateLimiter } from './middleware/rate-limiter.js';

export function createApp(): express.Express {
  const app = express();

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID on every request
  app.use(correlationId);

  // Rate limiter
  app.use(rateLimiter);

  // Public routes (no auth)
  app.use('/', healthRouter);
  app.use('/api/v1/auth', authRouter);

  // API routes (auth applied per-router)
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/shipments', shipmentRouter);
  app.use('/api/v1/invoices', invoiceRouter);
  app.use('/api/v1/connections', connectionRouter);
  app.use('/api/v1/resync', resyncRouter);
  app.use('/api/v1/calendar', calendarRouter);
  app.use('/api/v1/mappings', mappingsRouter);
  app.use('/api/v1/edi', ediRouter);
  app.use('/api/v1/bridge', bridgeRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/export', exportRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/ca', caRouter);
  app.use('/api/v1/webhooks', webhookRouter);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
