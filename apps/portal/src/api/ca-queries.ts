/**
 * TanStack Query hooks for all CA API endpoints
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

// Firms
export function useCaFirmProfile() {
  return useQuery({
    queryKey: ['ca-firm', 'profile'],
    queryFn: () => api.get('/ca/firms/me'),
  });
}

export function useCaFirmDashboard() {
  return useQuery({
    queryKey: ['ca-firm', 'dashboard'],
    queryFn: () => api.get('/ca/firms/me/dashboard'),
  });
}

export function useCaFirmSubscription() {
  return useQuery({
    queryKey: ['ca-firm', 'subscription'],
    queryFn: () => api.get('/ca/firms/me/subscription'),
  });
}

export function useCreateCaFirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/firms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-firm'] });
    },
  });
}

export function useUpdateCaFirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch('/ca/firms/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-firm'] });
    },
  });
}

// Clients
export function useCaClients(page = 1, search = '') {
  return useQuery({
    queryKey: ['ca-clients', page, search],
    queryFn: () => api.get(`/ca/clients?page=${page}&pageSize=20${search ? `&search=${search}` : ''}`),
  });
}

export function useCaClient(id: string) {
  return useQuery({
    queryKey: ['ca-client', id],
    queryFn: () => api.get(`/ca/clients/${id}`),
    enabled: !!id,
  });
}

export function useCaClientHealth(id: string) {
  return useQuery({
    queryKey: ['ca-client', id, 'health'],
    queryFn: () => api.get(`/ca/clients/${id}/health`),
    enabled: !!id,
  });
}

export function useCreateCaClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-clients'] });
    },
  });
}

export function useUpdateCaClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(`/ca/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-client', id] });
      queryClient.invalidateQueries({ queryKey: ['ca-clients'] });
    },
  });
}

// Compliance
export function useCaFilings(page = 1, type = '') {
  return useQuery({
    queryKey: ['ca-filings', page, type],
    queryFn: () => api.get(`/ca/compliance/filings?page=${page}&pageSize=10${type ? `&type=${type}` : ''}`),
  });
}

export function useCaFiling(id: string) {
  return useQuery({
    queryKey: ['ca-filing', id],
    queryFn: () => api.get(`/ca/compliance/filings/${id}`),
    enabled: !!id,
  });
}

export function useCaExceptions(page = 1) {
  return useQuery({
    queryKey: ['ca-exceptions', page],
    queryFn: () => api.get(`/ca/compliance/exceptions?page=${page}&pageSize=10`),
  });
}

export function useComplianceDashboard() {
  return useQuery({
    queryKey: ['ca-compliance', 'dashboard'],
    queryFn: () => api.get('/ca/compliance/dashboard'),
  });
}

export function usePrepareGstFiling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/compliance/gst/prepare', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-filings'] });
    },
  });
}

// Reconciliation
export function useReconSessions(page = 1) {
  return useQuery({
    queryKey: ['ca-recon-sessions', page],
    queryFn: () => api.get(`/ca/recon/sessions?page=${page}&pageSize=10`),
  });
}

export function useReconSession(id: string) {
  return useQuery({
    queryKey: ['ca-recon-session', id],
    queryFn: () => api.get(`/ca/recon/sessions/${id}`),
    enabled: !!id,
  });
}

export function useStartBankRecon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/recon/bank', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-recon-sessions'] });
    },
  });
}

export function useStartGstr2bRecon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/recon/gstr2b', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-recon-sessions'] });
    },
  });
}

// Documents
export function useCaDocumentRequests(page = 1, type = '') {
  return useQuery({
    queryKey: ['ca-document-requests', page, type],
    queryFn: () => api.get(`/ca/documents/requests?page=${page}&pageSize=10${type ? `&type=${type}` : ''}`),
  });
}

export function useDocumentDashboard() {
  return useQuery({
    queryKey: ['ca-documents', 'dashboard'],
    queryFn: () => api.get('/ca/documents/dashboard'),
  });
}

export function useCreateDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/documents/request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ca-documents', 'dashboard'] });
    },
  });
}

export function useCreateBulkDocumentRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/documents/request/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-document-requests'] });
    },
  });
}

// Notices
export function useCaNotices(page = 1) {
  return useQuery({
    queryKey: ['ca-notices', page],
    queryFn: () => api.get(`/ca/notices?page=${page}&pageSize=10`),
  });
}

export function useCaNotice(id: string) {
  return useQuery({
    queryKey: ['ca-notice', id],
    queryFn: () => api.get(`/ca/notices/${id}`),
    enabled: !!id,
  });
}

export function useNoticeDashboard() {
  return useQuery({
    queryKey: ['ca-notices', 'dashboard'],
    queryFn: () => api.get('/ca/notices/dashboard'),
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/notices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-notices'] });
      queryClient.invalidateQueries({ queryKey: ['ca-notices', 'dashboard'] });
    },
  });
}

// Analytics
export function useCaAnalytics() {
  return useQuery({
    queryKey: ['ca-analytics', 'firm'],
    queryFn: () => api.get('/ca/analytics/firm'),
  });
}

export function useCaHealthAnalytics() {
  return useQuery({
    queryKey: ['ca-analytics', 'health'],
    queryFn: () => api.get('/ca/analytics/health'),
  });
}

export function useCaProductivityAnalytics() {
  return useQuery({
    queryKey: ['ca-analytics', 'productivity'],
    queryFn: () => api.get('/ca/analytics/productivity'),
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/analytics/activity', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-analytics'] });
    },
  });
}

// Communication
export function useSendWhatsappMessage() {
  return useMutation({
    mutationFn: (data) => api.post('/ca/communication/whatsapp/send', data),
  });
}

export function useCaCommunicationLog(page = 1) {
  return useQuery({
    queryKey: ['ca-communication-log', page],
    queryFn: () => api.get(`/ca/communication/log?page=${page}&pageSize=20`),
  });
}

export function useCaTemplates() {
  return useQuery({
    queryKey: ['ca-communication-templates'],
    queryFn: () => api.get('/ca/communication/templates'),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/ca/communication/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ca-communication-templates'] });
    },
  });
}

// Subscription
export function useCaSubscriptionTiers() {
  return useQuery({
    queryKey: ['ca-subscription-tiers'],
    queryFn: () => api.get('/ca/subscription/tiers'),
  });
}

export function useCaSubscriptionFeatures() {
  return useQuery({
    queryKey: ['ca-subscription-features'],
    queryFn: () => api.get('/ca/subscription/features'),
  });
}

export function useRequestUpgrade() {
  return useMutation({
    mutationFn: (data) => api.post('/ca/subscription/upgrade', data),
  });
}
