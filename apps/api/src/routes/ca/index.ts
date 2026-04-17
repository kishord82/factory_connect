/**
 * CA Index: Mount all CA sub-routers
 */

import { Router } from 'express';

import { analyticsRouter } from './analytics.js';
import { clientRouter } from './clients.js';
import { communicationRouter } from './communication.js';
import { complianceRouter } from './compliance.js';
import { documentRouter } from './documents.js';
import { firmRouter } from './firms.js';
import { noticeRouter } from './notices.js';
import { premiumRouter } from './premium.js';
import { reconciliationRouter } from './reconciliation.js';
import { subscriptionRouter } from './subscription.js';

export const caRouter = Router();

caRouter.use('/firms', firmRouter);
caRouter.use('/clients', clientRouter);
caRouter.use('/compliance', complianceRouter);
caRouter.use('/recon', reconciliationRouter);
caRouter.use('/documents', documentRouter);
caRouter.use('/notices', noticeRouter);
caRouter.use('/analytics', analyticsRouter);
caRouter.use('/communication', communicationRouter);
caRouter.use('/subscription', subscriptionRouter);
caRouter.use('/premium', premiumRouter);
