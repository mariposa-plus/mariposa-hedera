import { create } from 'zustand';
import { api } from '@/lib/api';
import { HederaNetwork, DeployConfig, HCS10Config, MCPConfig } from '@/types';

const defaultDeployConfig: DeployConfig = {
  network: 'testnet',
  hcs10: {
    enabled: false,
    agentName: '',
    agentDescription: '',
    agentType: 'autonomous',
    autoAcceptConnections: true,
    registerOnBroker: true,
  },
  mcp: {
    enabled: false,
    transport: 'stdio',
    port: 3001,
    registerOnBroker: false,
  },
};

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

  // Deploy config
  deployConfig: DeployConfig;
  setDeployConfig: (config: Partial<DeployConfig>) => void;
  setHCS10Config: (config: Partial<HCS10Config>) => void;
  setMCPConfig: (config: Partial<MCPConfig>) => void;

  // Deploy generation
  isDeploying: boolean;
  deployResult: { generatedFiles: string[]; projectPath: string } | null;
  generateWithDeploy: (pipelineId: string) => Promise<void>;
  resetDeploy: () => void;

  // Deploy runner (Cloud CLI)
  activeDeploymentId: string | null;
  startDeployRun: (pipelineId: string) => Promise<string>;
  stopDeployRun: (deploymentId: string) => Promise<void>;
  resetDeployRun: () => void;
}

export const useHederaStore = create<HederaState>((set, get) => ({
  error: null,
  generatedCode: null,
  isGenerating: false,
  generateWarnings: [],
  hederaNetwork: 'testnet',

  // Deploy state
  deployConfig: { ...defaultDeployConfig },
  isDeploying: false,
  deployResult: null,

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

  setDeployConfig: (config: Partial<DeployConfig>) => {
    set((state) => ({
      deployConfig: { ...state.deployConfig, ...config },
    }));
  },

  setHCS10Config: (config: Partial<HCS10Config>) => {
    set((state) => ({
      deployConfig: {
        ...state.deployConfig,
        hcs10: { ...state.deployConfig.hcs10, ...config },
      },
    }));
  },

  setMCPConfig: (config: Partial<MCPConfig>) => {
    set((state) => ({
      deployConfig: {
        ...state.deployConfig,
        mcp: { ...state.deployConfig.mcp, ...config },
      },
    }));
  },

  generateWithDeploy: async (pipelineId: string) => {
    const { deployConfig } = get();
    set({ isDeploying: true, error: null });
    try {
      const response = await api.post('/hedera/workflows/generate-deploy', {
        pipelineId,
        deployConfig,
      });
      set({
        generatedCode: response.data.workflow.generatedCode,
        generateWarnings: response.data.workflow.validationErrors || [],
        deployResult: {
          generatedFiles: response.data.generatedFiles,
          projectPath: response.data.projectPath,
        },
        isDeploying: false,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message, isDeploying: false });
      throw error;
    }
  },

  resetDeploy: () => {
    set({
      deployResult: null,
      deployConfig: { ...defaultDeployConfig },
    });
  },

  // Deploy runner
  activeDeploymentId: null,

  startDeployRun: async (pipelineId: string) => {
    set({ error: null });
    try {
      const response = await api.post('/hedera/workflows/deploy-run', { pipelineId });
      const deploymentId = response.data.deploymentId;
      set({ activeDeploymentId: deploymentId });
      return deploymentId;
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  stopDeployRun: async (deploymentId: string) => {
    try {
      await api.post(`/hedera/deployments/${deploymentId}/stop`);
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    }
  },

  resetDeployRun: () => {
    set({ activeDeploymentId: null });
  },
}));
