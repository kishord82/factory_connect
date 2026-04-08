/**
 * CA Index: Mount all CA sub-routers
 */

import { Router } from 'express';
import { firmRouter } from './firms.js';
import { clientRouter } from './clients.js';
import { complianceRouter } from './compliance.js';
import { reconciliationRouter } from './reconciliation.js';
import { documentRouter } from './documents.js';
import { noticeRouter } from './notices.js';
import { analyticsRouter } from './analytics.js';
import { communicationRouter } from './communication.js';
import { subscriptionRouter } from './subscription.js';
import { premiumRouter } from './premium.js';

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
