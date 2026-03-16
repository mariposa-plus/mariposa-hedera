import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import HederaProject, { IHederaProject } from '../models/HederaProject';

const execAsync = promisify(exec);

interface DeployDeps {
  hcs10?: boolean;
  mcp?: boolean;
}

class HederaProjectManagerService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'hedera-projects');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async createProject(
    userId: string,
    name: string,
    description?: string,
    network: 'mainnet' | 'testnet' = 'testnet',
    deployConfig?: DeployDeps,
  ): Promise<IHederaProject & { _id: any }> {
    const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const projectDir = path.join(this.baseDir, userId, projectId);

    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });

    // Build dependencies
    const dependencies: Record<string, string> = {
      'hedera-agent-kit': '^3.0.0',
      '@hashgraph/sdk': '^2.40.0',
      'dotenv': '^16.3.1',
      'typescript': '^5.3.3',
      'ts-node': '^10.9.2',
      'axios': '^1.6.0',
    };

    if (deployConfig?.hcs10) {
      dependencies['@hashgraphonline/standards-sdk'] = 'latest';
      dependencies['@hashgraphonline/standards-agent-kit'] = 'latest';
    }
    if (deployConfig?.mcp) {
      dependencies['@modelcontextprotocol/sdk'] = 'latest';
    }

    // Build scripts
    const scripts: Record<string, string> = {
      start: 'ts-node src/index.ts',
      build: 'tsc',
    };
    if (deployConfig?.hcs10) {
      scripts['register-agent'] = 'ts-node src/hcs10/register.ts';
    }

    const packageJson = {
      name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      private: true,
      scripts,
      dependencies,
    };

    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Write tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
    };

    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Write .env template
    let envContent = `# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.XXXXX
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...
HEDERA_NETWORK=${network}

# AWS Bedrock (for AI nodes)
AWS_BEDROCK_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=
BEDROCK_MODEL_ID=openai.gpt-oss-120b-1:0

# Notification Keys (if using output nodes)
TELEGRAM_BOT_TOKEN=
`;

    if (deployConfig?.hcs10) {
      envContent += `
# HCS-10 Agent (populated after: npm run register-agent)
AGENT_ACCOUNT_ID=
AGENT_PRIVATE_KEY=
AGENT_INBOUND_TOPIC=
AGENT_OUTBOUND_TOPIC=
`;
    }

    if (deployConfig?.mcp) {
      envContent += `
# MCP Server
MCP_TRANSPORT=stdio
MCP_PORT=3001
`;
    }

    fs.writeFileSync(path.join(projectDir, '.env'), envContent);

    // Write .gitignore
    fs.writeFileSync(path.join(projectDir, '.gitignore'), 'node_modules/\ndist/\n.env\n');

    // Create DB record
    const project = await HederaProject.create({
      userId,
      name,
      description,
      workspacePath: projectDir,
      hederaNetwork: network,
      status: 'created',
    });

    return project;
  }

  async writeWorkflowFiles(projectDir: string, code: string): Promise<void> {
    const srcDir = path.join(projectDir, 'src');
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    fs.writeFileSync(path.join(srcDir, 'index.ts'), code);
  }

  async writeMultipleFiles(
    projectDir: string,
    files: { relativePath: string; content: string }[],
  ): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(projectDir, file.relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content);
    }
  }

  async initProject(projectDir: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync('npm install', { cwd: projectDir, timeout: 120000 });
  }

  async deleteProject(projectId: string, userId?: string): Promise<void> {
    const query: any = { _id: projectId };
    if (userId) query.userId = userId;

    const project = await HederaProject.findOne(query);
    if (project?.workspacePath && fs.existsSync(project.workspacePath)) {
      fs.rmSync(project.workspacePath, { recursive: true, force: true });
    }
    await HederaProject.deleteOne(query);
  }
}

export const hederaProjectManager = new HederaProjectManagerService();
