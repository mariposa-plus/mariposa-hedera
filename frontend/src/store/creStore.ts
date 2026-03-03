import { create } from 'zustand';
import { api } from '@/lib/api';

interface CREState {
  error: string | null;

  // Workflow generation
  generatedCode: string | null;
  isGenerating: boolean;
  generateWarnings: string[];
  generateWorkflow: (pipelineId: string) => Promise<void>;

  // Auth state
  isCreAuthenticated: boolean;
  creAuthUrl: string | null;
  creOriginalAuthUrl: string | null;
  creAuthEmail: string | null;
  isLoggingIn: boolean;
  authError: string | null;

  // Auth actions
  checkCreAuth: () => Promise<boolean>;
  startCreLogin: (pipelineId?: string) => Promise<string>;
  startCreHeadlessLogin: (email: string, password: string, pipelineId?: string) => Promise<{ email?: string }>;
  submitVerificationCode: (code: string) => Promise<void>;
  submitCreCallback: (callbackUrl: string) => Promise<void>;
  logoutCre: () => Promise<void>;
}

export const useCREStore = create<CREState>((set, get) => ({
  error: null,
  generatedCode: null,
  isGenerating: false,
  generateWarnings: [],

  // Auth state
  isCreAuthenticated: false,
  creAuthUrl: null,
  creOriginalAuthUrl: null,
  creAuthEmail: null,
  isLoggingIn: false,
  authError: null,

  generateWorkflow: async (pipelineId: string) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await api.post('/cre/workflows/generate', { pipelineId });
      const workflow = response.data.workflow;
      set({
        generatedCode: workflow.generatedCode,
        generateWarnings: workflow.validationErrors || [],
        isGenerating: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, isGenerating: false });
      throw error;
    }
  },

  checkCreAuth: async () => {
    try {
      const response = await api.get('/cre/auth/status');
      const { authenticated, email } = response.data;
      set({ isCreAuthenticated: authenticated, creAuthEmail: email || null });
      return authenticated;
    } catch {
      set({ isCreAuthenticated: false, creAuthEmail: null });
      return false;
    }
  },

  startCreLogin: async (pipelineId?: string) => {
    set({ isLoggingIn: true, authError: null, creAuthUrl: null, creOriginalAuthUrl: null });
    try {
      const response = await api.post('/cre/auth/login', { pipelineId });
      const { authUrl, originalAuthUrl } = response.data;
      set({
        creAuthUrl: authUrl,
        creOriginalAuthUrl: originalAuthUrl,
        isLoggingIn: false,
      });
      return authUrl;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      set({ authError: msg, isLoggingIn: false });
      throw error;
    }
  },

  startCreHeadlessLogin: async (email: string, password: string, pipelineId?: string) => {
    set({ isLoggingIn: true, authError: null });
    try {
      const response = await api.post('/cre/auth/login-headless', { email, password, pipelineId });
      set({
        isCreAuthenticated: true,
        creAuthEmail: response.data.email || null,
        isLoggingIn: false,
      });
      return { email: response.data.email };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      set({ authError: msg, isLoggingIn: false });
      throw error;
    }
  },

  submitVerificationCode: async (code: string) => {
    await api.post('/cre/auth/submit-code', { code });
  },

  submitCreCallback: async (callbackUrl: string) => {
    set({ authError: null });
    try {
      await api.post('/cre/auth/callback', { callbackUrl });
      // After relay, check auth status
      const response = await api.get('/cre/auth/status');
      const { authenticated, email } = response.data;
      set({
        isCreAuthenticated: authenticated,
        creAuthEmail: email || null,
        creAuthUrl: null,
        creOriginalAuthUrl: null,
      });
      if (!authenticated) {
        set({ authError: 'Authentication callback completed but login not confirmed. Please try again.' });
      }
    } catch (error: any) {
      set({ authError: error.response?.data?.message || error.message });
      throw error;
    }
  },

  logoutCre: async () => {
    try {
      await api.post('/cre/auth/logout');
    } catch {
      // ignore
    }
    set({ isCreAuthenticated: false, creAuthEmail: null, creAuthUrl: null, creOriginalAuthUrl: null });
  },
}));
