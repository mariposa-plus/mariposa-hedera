import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import HederaProject, { IHederaProject } from '../models/HederaProject';

const execAsync = promisify(exec);

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
    network: 'mainnet' | 'testnet' = 'testnet'
  ): Promise<IHederaProject & { _id: any }> {
    const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const projectDir = path.join(this.baseDir, userId, projectId);

    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });

    // Write package.json
    const packageJson = {
      name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'ts-node src/index.ts',
        build: 'tsc',
      },
      dependencies: {
        'hedera-agent-kit': '^3.0.0',
        '@hashgraph/sdk': '^2.40.0',
        'dotenv': '^16.3.1',
        'typescript': '^5.3.3',
        'ts-node': '^10.9.2',
      },
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
    const envContent = `# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.XXXXX
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...
HEDERA_NETWORK=${network}

# LLM API Keys (if using AI nodes)
ANTHROPIC_API_KEY=

# Notification Keys (if using output nodes)
TELEGRAM_BOT_TOKEN=
`;

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
