import { create } from 'zustand';
import { api } from '@/lib/api';
import { HederaNetwork } from '@/types';

interface HederaState {
  error: string | null;

  // Workflow generation
  generatedCode: string | null;
  isGenerating: boolean;
  generateWarnings: string[];
  generateWorkflow: (pipelineId: string) => Promise<void>;

  // Network config
  hederaNetwork: HederaNetwork;
  setNetwork: (network: HederaNetwork) => void;
}

export const useHederaStore = create<HederaState>((set) => ({
  error: null,
  generatedCode: null,
  isGenerating: false,
  generateWarnings: [],
  hederaNetwork: 'testnet',

  generateWorkflow: async (pipelineId: string) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await api.post('/hedera/workflows/generate', { pipelineId });
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

  setNetwork: (network: HederaNetwork) => {
    set({ hederaNetwork: network });
  },
}));
