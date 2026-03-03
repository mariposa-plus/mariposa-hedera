# Mariposa Architecture

Mariposa is a visual pipeline builder for [Chainlink CRE](https://github.com/smartcontractkit/cre-cli) (Chainlink Runtime Environment) workflows. Users design workflows on a drag-and-drop canvas, configure nodes, generate TypeScript code targeting the CRE SDK, simulate execution via the CRE CLI, and compile/deploy Solidity smart contracts — all from a single web interface.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, ReactFlow, Zustand, Axios, Socket.io-client, Monaco Editor |
| Backend | Express.js, TypeScript, Mongoose, Socket.io, BullMQ, Nodemailer, Puppeteer |
| Database | MongoDB (Mongoose ODM) |
| Queue/Cache | Redis (via ioredis + BullMQ) |
| Blockchain | viem (EVM), solc (Solidity compiler), CRE CLI, Bun runtime |
| Process Mgmt | PM2 |
| Reverse Proxy | Nginx |

---

## Project Structure

```
mariposa/
├── ecosystem.config.js              # PM2 process configuration
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── cre-projects/                # Generated CRE project workspaces (per-user/per-project)
│   └── src/
│       ├── server.ts                # Express app entry point
│       ├── config/
│       │   └── database.ts          # MongoDB connection
│       ├── controllers/
│       │   ├── authController.ts
│       │   ├── creController.ts
│       │   ├── executionController.ts
│       │   ├── itemController.ts
│       │   ├── pipelineController.ts
│       │   ├── pipelineLifecycleController.ts
│       │   └── testExecutionController.ts
│       ├── handlers/                # Node execution handlers (per category)
│       │   ├── creCapability.handler.ts
│       │   ├── creConfig.handler.ts
│       │   ├── creContract.handler.ts
│       │   └── creLogic.handler.ts
│       ├── middleware/
│       │   ├── auth.ts              # JWT verification
│       │   ├── admin.ts             # Role-based access (admin only)
│       │   └── errorHandler.ts      # Global error handler
│       ├── models/                  # Mongoose schemas (11 collections)
│       │   ├── User.ts
│       │   ├── Pipeline.ts
│       │   ├── Execution.ts
│       │   ├── TestExecution.ts
│       │   ├── CREProject.ts
│       │   ├── CREWorkflow.ts
│       │   ├── CREContract.ts
│       │   ├── Credential.ts
│       │   ├── OTP.ts
│       │   ├── ScheduledNode.ts
│       │   └── Item.ts
│       ├── queues/
│       │   ├── config.ts            # Redis + BullMQ shared config
│       │   ├── executionQueue.ts    # Pipeline execution jobs
│       │   └── delayQueue.ts        # Delayed node execution jobs
│       ├── routes/
│       │   ├── authRoutes.ts
│       │   ├── creRoutes.ts
│       │   ├── executionRoutes.ts
│       │   ├── itemRoutes.ts
│       │   ├── pipelineRoutes.ts
│       │   └── testExecutionRoutes.ts
│       ├── services/
│       │   ├── creAuth.service.ts
│       │   ├── creCodeGenerator.service.ts
│       │   ├── creHeadlessBrowser.service.ts
│       │   ├── creProjectManager.service.ts
│       │   ├── creSimulator.service.ts
│       │   ├── creWorkflow.service.ts
│       │   ├── email.service.ts
│       │   ├── otp.service.ts
│       │   ├── pipelineExecutor.ts
│       │   ├── scheduler.service.ts
│       │   ├── solidityCompiler.service.ts
│       │   ├── testExecution.service.ts
│       │   └── websocket.service.ts
│       └── workers/
│           ├── executionWorker.ts   # Pipeline/node execution worker
│           └── delayWorker.ts       # Delayed execution worker
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx           # Root layout
        │   ├── page.tsx             # Landing page
        │   ├── globals.css
        │   ├── login/page.tsx
        │   ├── register/page.tsx    # Redirects to /login
        │   ├── verify/page.tsx      # OTP code input
        │   ├── dashboard/page.tsx
        │   ├── admin/page.tsx
        │   └── pipelines/
        │       ├── page.tsx         # Pipeline list + CRUD
        │       └── [id]/page.tsx    # Visual pipeline builder (ReactFlow canvas)
        ├── components/
        │   ├── ProtectedRoute.tsx
        │   ├── Dashboard/
        │   │   ├── StatsCard.tsx
        │   │   └── QuickActions.tsx
        │   ├── Layout/
        │   │   ├── AppLayout.tsx
        │   │   └── Sidebar.tsx
        │   ├── PipelineBuilder/
        │   │   └── NodePaletteV2.tsx      # Drag-and-drop node palette
        │   ├── edges/
        │   │   └── ConditionalEdge.tsx
        │   ├── modals/
        │   │   ├── CRELoginModal.tsx      # CRE OAuth / headless login
        │   │   ├── EdgeConditionModal.tsx  # Edge condition config
        │   │   ├── NodeConfigModal.tsx
        │   │   ├── TestExecutionModal.tsx  # Pipeline test runner
        │   │   ├── UniversalConfigModal.tsx # Input/Config/Output tabs
        │   │   └── config-forms/
        │   │       ├── ConfigFieldRenderer.tsx
        │   │       ├── GenericConfigForm.tsx
        │   │       ├── PromptTemplateField.tsx
        │   │       └── TextTemplateField.tsx
        │   ├── nodes/
        │   │   ├── GenericNode.tsx         # Universal node component
        │   │   └── NodeWrapper.tsx         # Node container with handles
        │   ├── panels/
        │   │   ├── SimulationPanel.tsx     # CRE simulation log output
        │   │   └── WorkflowCodePanel.tsx   # Generated code viewer (Monaco)
        │   └── pipeline/
        │       ├── PipelineActivateButton.tsx
        │       ├── PipelineStatusBadge.tsx
        │       └── Toolbar.tsx
        ├── hooks/
        │   ├── usePipelineLifecycle.ts
        │   ├── useSimulationLogs.ts       # Socket.io simulation streaming
        │   └── useTestExecution.ts
        ├── lib/
        │   └── api.ts                     # Axios instance with interceptors
        ├── registry/                      # Component schema registry
        │   ├── index.ts                   # Aggregates all components
        │   └── components/
        │       ├── index.ts
        │       ├── cre-triggers.ts
        │       ├── cre-capabilities.ts
        │       ├── cre-logic.ts
        │       ├── solidity-contracts.ts
        │       └── chain-config.ts
        ├── services/
        │   ├── authService.ts
        │   ├── itemService.ts
        │   └── pipelineLifecycle.ts
        ├── store/
        │   ├── authStore.ts               # Zustand - auth + JWT
        │   ├── pipelineStore.ts           # Zustand - pipeline CRUD
        │   └── creStore.ts                # Zustand - CRE integration
        ├── types/
        │   └── index.ts                   # Shared TypeScript types
        └── utils/
            ├── configValidator.ts
            ├── node-styles.ts
            ├── nodeOutputHelper.ts
            ├── nodeTypeMapping.ts
            └── pipelineValidation.ts
```

---

## Backend Architecture

### Server Initialization (`server.ts`)

On startup the backend:

1. Loads environment variables from `.env`
2. Connects to MongoDB
3. Verifies SMTP email configuration
4. Creates an Express app with CORS and JSON body parsing (50 MB limit)
5. Registers all route handlers under `/api`
6. Exposes a health check at `GET /api/health`
7. Initializes Socket.io on the HTTP server
8. Checks Redis connectivity
9. Starts BullMQ execution and delay workers
10. Starts the scheduler service

### API Routes

All routes are prefixed with `/api`. Routes marked **(Protected)** require a valid JWT in the `Authorization: Bearer <token>` header.

#### Auth — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Send OTP to email |
| POST | `/auth/verify` | Verify OTP, return JWT + user |
| GET | `/auth/me` | Get current user **(Protected)** |
| POST | `/auth/logout` | Logout **(Protected)** |

#### Pipelines — `/api/pipelines` **(Protected)**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pipelines` | List user's pipelines |
| POST | `/pipelines` | Create pipeline (auto-creates CRE project) |
| GET | `/pipelines/:id` | Get pipeline with nodes/edges |
| PUT | `/pipelines/:id` | Update pipeline |
| DELETE | `/pipelines/:id` | Delete pipeline (cascades to CRE project) |
| POST | `/pipelines/:id/duplicate` | Duplicate pipeline |
| POST | `/pipelines/:pipelineId/activate` | Activate trigger monitoring |
| POST | `/pipelines/:pipelineId/deactivate` | Deactivate triggers |
| GET | `/pipelines/:pipelineId/status` | Get activation status |

#### Executions — `/api/executions` **(Protected)**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/executions/start` | Queue new pipeline execution |
| GET | `/executions/stats/:pipelineId` | Aggregated execution statistics |
| GET | `/executions/pipeline/:pipelineId` | List executions (paginated) |
| GET | `/executions/:executionId` | Get single execution |
| DELETE | `/executions/:executionId` | Cancel execution |
| POST | `/executions/:executionId/approve/:nodeId` | Approve pending node |
| POST | `/executions/:executionId/reject/:nodeId` | Reject pending node |

#### Test Executions — `/api/executions` **(Protected)**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/executions/test` | Start test execution (validation/dry-run/test/live) |
| GET | `/executions/test/:executionId` | Get test status |
| DELETE | `/executions/test/:executionId` | Cancel test |
| GET | `/pipelines/:pipelineId/tests` | Test history with success rate |

#### CRE — `/api/cre` **(Protected unless noted)**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cre/auth/oauth-redirect` | OAuth callback **(Public)** |
| POST | `/cre/auth/login` | Start CRE CLI authentication |
| POST | `/cre/auth/login-headless` | Headless browser CRE login |
| POST | `/cre/auth/submit-code` | Submit email verification code |
| GET | `/cre/auth/status` | Check CRE auth status |
| POST | `/cre/auth/callback` | Relay OAuth callback |
| POST | `/cre/auth/logout` | Logout from CRE |
| POST | `/cre/projects` | Create CRE project |
| GET | `/cre/projects` | List user's CRE projects |
| GET | `/cre/projects/:id` | Get project details |
| DELETE | `/cre/projects/:id` | Delete project |
| POST | `/cre/projects/:id/init` | Install workflow dependencies (`bun install`) |
| PUT | `/cre/projects/:id/config` | Update RPC configuration |
| PUT | `/cre/projects/:id/secrets` | Update project secrets |
| POST | `/cre/projects/:id/simulate` | Run CRE simulation |
| GET | `/cre/projects/:id/logs` | Get simulation logs |
| POST | `/cre/workflows/generate` | Generate workflow from pipeline |
| GET | `/cre/workflows/:id/code` | Get generated code |
| POST | `/cre/pipelines/:pipelineId/simulate` | Simulate via pipeline reference |
| POST | `/cre/contracts` | Save Solidity contract |
| GET | `/cre/contracts/:id` | Get contract details |
| POST | `/cre/contracts/:id/compile` | Compile Solidity contract |
| POST | `/cre/contracts/:id/deploy` | Deploy contract to testnet |

#### Items — `/api/items` **(Protected)**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/items` | List all items |
| POST | `/items` | Create item |
| GET | `/items/:id` | Get item |
| PUT | `/items/:id` | Update item (owner/admin) |
| DELETE | `/items/:id` | Delete item (owner/admin) |

### Controllers

| Controller | Responsibility |
|-----------|---------------|
| `authController` | OTP generation/verification, JWT creation, user upsert |
| `pipelineController` | Pipeline CRUD with auto CRE project creation/cascade deletion |
| `pipelineLifecycleController` | Activate/deactivate trigger monitoring, status tracking |
| `executionController` | Execution lifecycle — start, monitor, approve, reject, stats |
| `testExecutionController` | Test/validation runs with multiple modes |
| `creController` | 27 functions: project mgmt, workflow generation, contract compilation/deployment, simulation, OAuth flow |
| `itemController` | Generic CRUD with ownership checks |

### Services

| Service | Purpose |
|---------|---------|
| `creAuth.service` | Manages CRE CLI authentication, spawns `cre login`, intercepts OAuth URL |
| `creCodeGenerator.service` | Converts pipeline canvas (nodes + edges) to CRE SDK TypeScript code via topological sort |
| `creHeadlessBrowser.service` | Puppeteer-based OAuth automation through Auth0/Chainlink login pages |
| `creProjectManager.service` | CRE project filesystem lifecycle — scaffolding, config files, `bun install`, cleanup |
| `creSimulator.service` | Spawns `cre workflow simulate` and streams stdout/stderr to WebSocket |
| `creWorkflow.service` | Orchestrates code generation → file writing → DB record creation |
| `email.service` | Sends OTP emails via SMTP (Nodemailer); falls back to console in dev |
| `otp.service` | Generates cryptographically random 6-digit OTP codes |
| `pipelineExecutor` | Executes pipelines: traverses nodes in dependency order, maps inputs/outputs, handles edge conditions |
| `scheduler.service` | Cron-based trigger evaluation on 60-second intervals |
| `solidityCompiler.service` | Compiles Solidity via `solc`, deploys via `viem` |
| `testExecution.service` | Runs validation / dry-run / test / live modes with per-node tracking |
| `websocket.service` | Socket.io server — rooms, events, CORS |

### Handlers (Node Execution)

Handlers execute individual pipeline node types during runtime:

| Handler | Node Types |
|---------|-----------|
| `creCapability.handler` | `http-fetch`, `evm-read`, `evm-write`, `node-mode`, `secrets-access` |
| `creConfig.handler` | `chain-selector`, `contract-address`, `wallet-signer`, `rpc-endpoint` |
| `creContract.handler` | All Solidity contract nodes (looks up compilation/deployment status) |
| `creLogic.handler` | `data-transform` (sandboxed VM), `condition`, `abi-encode`, `abi-decode`, `consensus-aggregation` |

### Middleware

| Middleware | Behavior |
|-----------|---------|
| `auth.ts` (`protect`) | Extracts Bearer token, verifies JWT, attaches user to request |
| `admin.ts` | Checks `req.user.role === 'admin'`, returns 403 if not |
| `errorHandler.ts` | Catches all errors, returns JSON `{ success: false, error }` |

---

## Frontend Architecture

### Pages & Routing (Next.js App Router)

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing page — features, pricing, use cases | Public |
| `/login` | Email input → sends OTP | Public |
| `/register` | Redirects to `/login` | Public |
| `/verify?email=` | 6-digit OTP code input | Public |
| `/dashboard` | Stats cards, recent pipelines, quick actions | Protected |
| `/admin` | Admin panel | Protected (admin) |
| `/pipelines` | Pipeline list with create/duplicate/delete | Protected |
| `/pipelines/[id]` | Visual pipeline builder (ReactFlow canvas) | Protected |

### Component Hierarchy

```
RootLayout
├── Landing Page (/)
├── Auth Pages (/login, /verify)
└── AppLayout (sidebar + content)
    ├── Dashboard
    │   ├── StatsCard ×4
    │   └── QuickActions
    ├── Pipelines List
    │   └── Create/Edit/Duplicate/Delete
    └── Pipeline Builder (/pipelines/[id])
        ├── NodePaletteV2 (left sidebar — draggable components)
        ├── ReactFlow Canvas
        │   └── GenericNode → NodeWrapper (all 22 node types)
        ├── Toolbar (save, test, run, generate, simulate, activate)
        ├── UniversalConfigModal (Input / Config / Output tabs)
        │   └── GenericConfigForm → ConfigFieldRenderer
        ├── EdgeConditionModal (immediate / delay / approval / event)
        ├── TestExecutionModal (validation / dry-run / test / live)
        ├── WorkflowCodePanel (Monaco editor, right panel)
        ├── SimulationPanel (log output, bottom panel)
        └── CRELoginModal (OAuth or headless CRE auth)
```

### Zustand Stores

#### `authStore`
- **State:** `user`, `token`, `isAuthenticated`, `isLoading`, `error`, `hasHydrated`
- **Actions:** `sendOTP(email)`, `verifyOTP(email, code)`, `logout()`, `fetchUser()`
- **Persistence:** localStorage key `auth-storage`

#### `pipelineStore`
- **State:** `pipelines` (list summaries), `currentPipeline` (full detail), `isLoading`, `error`
- **Actions:** `fetchPipelines()`, `fetchPipeline(id)`, `createPipeline()`, `updatePipeline()`, `deletePipeline()`, `duplicatePipeline()`, `updateNodes()`, `updateEdges()`, `savePipeline()`

#### `creStore`
- **State:** `generatedCode`, `isGenerating`, `generateWarnings`, `isCreAuthenticated`, `creAuthUrl`, `isLoggingIn`, `authError`
- **Actions:** `generateWorkflow(pipelineId)`, `checkCreAuth()`, `startCreLogin()`, `startCreHeadlessLogin(email, password)`, `submitVerificationCode(code)`, `submitCreCallback(callbackUrl)`, `logoutCre()`

### Component Registry System

All pipeline node types are defined in a central registry (`frontend/src/registry/`). Each component has a `ComponentSchema` with:

- `id` — unique node type identifier
- `name`, `description`, `icon`, `color` — display metadata
- `category` — one of the 5 categories below
- `configSchema` — field definitions for the configuration form
- `inputs` / `outputs` — typed I/O declarations
- `handles` — ReactFlow handle positions

Components are organized into **5 categories**:

| Category | Color | Components |
|----------|-------|-----------|
| CRE Triggers | Purple `#7c3aed` | `cron-trigger`, `http-trigger`, `evm-log-trigger` |
| CRE Capabilities | Blue `#2563eb` | `http-fetch`, `evm-read`, `evm-write`, `node-mode`, `secrets-access` |
| CRE Logic | Green `#16a34a` | `consensus-aggregation`, `data-transform`, `condition`, `abi-encode`, `abi-decode` |
| Solidity Contracts | Orange `#ea580c` | `ireceiver-contract`, `price-feed-consumer`, `custom-data-consumer`, `proof-of-reserve`, `event-emitter` |
| Chain Config | Gray `#6b7280` | `chain-selector`, `contract-address`, `wallet-signer`, `rpc-endpoint` |

The `GenericConfigForm` renders configuration UIs dynamically from `configSchema`, supporting 13+ field types: `text`, `password`, `number`, `select`, `textarea`, `toggle`, `multi-select`, `json`, `code`, `text-template`, `prompt-template`, `monaco-solidity`, `chain-select`.

### Hooks

| Hook | Purpose |
|------|---------|
| `usePipelineLifecycle` | Activation/deactivation with auto-polling status (5s interval) |
| `useSimulationLogs` | Socket.io-based log streaming — joins `sim:{projectId}` room |
| `useTestExecution` | Test execution with 2-second polling for status updates |

### API Layer

`lib/api.ts` creates an Axios instance:
- **Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`)
- **Request interceptor:** Attaches `Authorization: Bearer <token>` from `authStore`
- **Response interceptor:** On 401, calls `logout()` and redirects to `/login`

---

## Pipeline Node Types

### CRE Triggers (start workflow execution)

| Node Type | Description | Key Config Fields |
|-----------|-------------|-------------------|
| `cron-trigger` | Schedule-based execution | `cronExpression`, `timezone`, `maxRetries` |
| `http-trigger` | HTTP webhook endpoint | `path`, `method`, `authentication` |
| `evm-log-trigger` | EVM blockchain event listener | `contractAddress`, `eventSignature`, `chainSelector` |

### CRE Capabilities (SDK operations)

| Node Type | Description | Key Config Fields |
|-----------|-------------|-------------------|
| `http-fetch` | HTTP requests | `url`, `method`, `headers`, `body`, `timeout` |
| `evm-read` | Read from smart contracts | `contractAddress`, `method`, `abi`, `chainSelector` |
| `evm-write` | Write to smart contracts | `contractAddress`, `method`, `abi`, `chainSelector`, `value` |
| `node-mode` | Custom Node.js execution | `code`, `dependencies` |
| `secrets-access` | Access stored secrets | `secretName`, `secretKey` |

### CRE Logic (data processing)

| Node Type | Description | Key Config Fields |
|-----------|-------------|-------------------|
| `consensus-aggregation` | Aggregate values (median/mean/mode) | `method`, `minResponses` |
| `data-transform` | Custom JS expression (sandboxed VM) | `expression`, `outputSchema` |
| `condition` | Boolean branching | `expression`, `trueLabel`, `falseLabel` |
| `abi-encode` | Encode values to ABI format | `types`, `values` |
| `abi-decode` | Decode ABI data | `types`, `data` |

### Solidity Contracts (on-chain consumers)

| Node Type | Description | Key Config Fields |
|-----------|-------------|-------------------|
| `ireceiver-contract` | IReceiver interface implementation | `soliditySource`, `contractName` |
| `price-feed-consumer` | Chainlink price feed consumer | `soliditySource`, `contractName` |
| `custom-data-consumer` | Custom data consumer contract | `soliditySource`, `contractName` |
| `proof-of-reserve` | Proof of Reserve consumer | `soliditySource`, `contractName` |
| `event-emitter` | Event emitting contract | `soliditySource`, `contractName` |

### Chain Config (network settings)

| Node Type | Description | Key Config Fields |
|-----------|-------------|-------------------|
| `chain-selector` | Select target blockchain | `chain` (Ethereum, Arbitrum, Base, Avalanche, Polygon, Optimism + testnets) |
| `contract-address` | Reference deployed contract | `address`, `abi` |
| `wallet-signer` | Wallet/key configuration | `privateKeyEnvVar` |
| `rpc-endpoint` | Custom RPC URL | `url`, `chainId` |

---

## Database Schema

### User

| Field | Type | Description |
|-------|------|-------------|
| `email` | String (unique) | User email address |
| `name` | String | Display name |
| `avatar` | String | Profile picture URL |
| `role` | `'user'` \| `'admin'` | Authorization role (default: `user`) |
| `isVerified` | Boolean | Email verification status |
| `lastLoginAt` | Date | Last authentication timestamp |

### Pipeline

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Pipeline owner |
| `creProjectId` | ObjectId → CREProject | Associated CRE project (optional) |
| `name` | String | Pipeline display name |
| `description` | String | Optional description |
| `nodes` | NodeData[] | Canvas nodes with position, type, config |
| `edges` | EdgeData[] | Canvas connections with conditions |
| `isActive` | Boolean | Whether triggers are being monitored |
| `status` | `'stopped'` \| `'activating'` \| `'active'` \| `'executing'` \| `'error'` | Pipeline state |
| `executionCount` | Number | Total executions |

**NodeData** contains: `id`, `type`, `componentType` (`cre`/`solidity`/`config`), `state` (`draft`/`configured`/`ready`/`error`), `position` (`{x, y}`), `data` (node-specific config).

**EdgeData** contains: `id`, `source`, `target`, `condition` with type (`immediate`/`delay`/`event`/`approval`) and type-specific config.

### Execution

| Field | Type | Description |
|-------|------|-------------|
| `pipelineId` | ObjectId → Pipeline | Source pipeline |
| `userId` | ObjectId → User | Execution requester |
| `status` | `'pending'` \| `'running'` \| `'success'` \| `'failed'` \| `'cancelled'` \| `'waiting_approval'` | Current state |
| `trigger` | String | How execution was triggered |
| `nodeResults` | NodeResult[] | Per-node status, output, error, duration |
| `executionLogs` | String[] | Timestamped log messages |
| `duration` | Number | Total execution time (ms) |

### TestExecution

| Field | Type | Description |
|-------|------|-------------|
| `pipelineId` | ObjectId → Pipeline | Source pipeline |
| `userId` | ObjectId → User | Test requester |
| `testMode` | `'validation'` \| `'dry-run'` \| `'test'` \| `'live'` | Test mode |
| `status` | `'pending'` \| `'running'` \| `'success'` \| `'failed'` \| `'cancelled'` | Current state |
| `nodeResults` | NodeTestResult[] | Per-node results with logs |
| `validationErrors` | ValidationError[] | Configuration/connection issues |
| `progress` | Number | 0–100 completion percentage |
| `totalNodes` / `completedNodes` | Number | Progress counters |

### CREProject

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Project owner |
| `name` | String (unique per user) | Project display name |
| `description` | String | Optional description |
| `workspacePath` | String | Filesystem path to project directory |
| `status` | `'created'` \| `'ready'` \| `'simulating'` \| `'error'` | Project state |
| `simulationLogs` | String[] | Last 500 log lines from simulation |

### CREWorkflow

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | ObjectId → CREProject | Parent project |
| `userId` | ObjectId → User | Creator |
| `pipelineId` | ObjectId → Pipeline | Source pipeline (unique per project) |
| `generatedCode` | String | Full TypeScript code |
| `workflowPath` | String | Path to `main.ts` |
| `status` | `'pending'` \| `'generated'` \| `'valid'` \| `'invalid'` | State |
| `validationErrors` | String[] | Code generation warnings |

### CREContract

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | ObjectId → CREProject | Parent project |
| `userId` | ObjectId → User | Owner |
| `nodeId` | String (unique per project) | Associated pipeline node |
| `contractName` | String | Solidity contract name |
| `soliditySource` | String | Full source code |
| `abi` | Array | Compiled ABI |
| `bytecode` | String | Compiled bytecode |
| `deployedAddress` | String | On-chain address |
| `network` | String | Network/RPC URL |
| `status` | `'draft'` \| `'compiling'` \| `'compiled'` \| `'deploying'` \| `'deployed'` \| `'failed'` | State |

### Credential

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId → User | Owner |
| `name` | String | Display name |
| `type` | `'claude'` \| `'openai'` \| `'together'` \| `'groq'` \| `'smtp'` \| `'evm-wallet'` \| `'rpc-provider'` | Category |
| `encryptedData` | String | AES-256 encrypted credential |

### OTP

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | Recipient email |
| `code` | String | 6-digit OTP |
| `expiresAt` | Date | TTL index — auto-deletes on expiry |
| `attempts` | Number | Failed verification attempts (max 5) |

### ScheduledNode

| Field | Type | Description |
|-------|------|-------------|
| `pipelineId` | ObjectId → Pipeline | Parent pipeline |
| `userId` | ObjectId → User | Owner |
| `nodeId` | String | Pipeline node ID |
| `config.triggerType` | `'once'` \| `'recurring'` \| `'cron'` | Schedule type |
| `config.cronExpression` | String | Cron expression (for `cron` type) |
| `config.timezone` | String | IANA timezone |
| `nextRunTime` / `lastRunTime` | Date | Scheduling state |

### Item (Legacy)

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Item name |
| `description` | String | Description |
| `price` | Number | Price |
| `category` | String | Category |
| `createdBy` | ObjectId → User | Creator |

---

## Authentication

### Main Auth (JWT + OTP Email)

```
User → POST /auth/login {email}
  ← OTP code sent via SMTP

User → POST /auth/verify {email, code}
  ← { token (JWT, 7-day expiry), user }
  ← User created on first verification
```

- OTP codes are 6-digit, cryptographically random, expire in 10 minutes
- Failed attempts tracked (max 5 per OTP)
- MongoDB TTL index auto-cleans expired OTPs
- JWT secret configurable via `JWT_SECRET` env var

### CRE Authentication (Separate System)

CRE CLI requires its own OAuth flow through Auth0/Chainlink:

**Standard OAuth flow:**
1. Backend spawns `cre login`, intercepts the OAuth URL from stdout
2. URL sent to frontend via API response
3. Frontend opens OAuth URL or relays callback
4. Backend handles callback → CRE CLI completes login
5. WebSocket emits `cre:auth:complete`

**Headless browser flow (unattended):**
1. Frontend sends email + password to `/cre/auth/login-headless`
2. Backend uses Puppeteer with stealth plugin to automate Auth0 login
3. Handles multi-step forms, React-controlled inputs, verification codes
4. If email verification code needed, emits `cre:code:needed` via WebSocket
5. Frontend shows code input, submits via `/cre/auth/submit-code`
6. Headless browser enters code, completes flow

---

## CRE Integration

### Code Generation Pipeline

The code generator transforms a visual pipeline canvas into CRE SDK TypeScript:

```
Pipeline (nodes + edges)
  → Topological sort (dependency order)
  → Import generation (based on node types)
  → Config schema extraction (cron schedule, API URLs, EVM config)
  → Per-node code generation
  → Full TypeScript workflow file
```

**Supported code patterns by node type:**
- **Triggers:** CRE SDK trigger initialization (cron schedule, HTTP endpoint, EVM log listener)
- **Capabilities:** SDK client calls (`httpFetch`, `evmRead`, `evmWrite`, `secretsAccess`)
- **Logic:** Transform expressions, condition branching, ABI encode/decode, consensus aggregation
- **Config:** Chain selector mapping, RPC configuration

### Project Filesystem

Each CRE project gets an isolated directory structure:

```
cre-projects/
└── {userId}/
    └── {projectId}/
        ├── project.yaml          # CRE CLI project config
        ├── .env                  # Private keys, target address
        ├── .gitignore
        ├── secrets.yaml
        ├── contracts/
        │   └── abi/
        └── {workflowName}/       # Kebab-case from pipeline name
            ├── main.ts           # Generated TypeScript
            ├── package.json
            ├── tsconfig.json
            ├── workflow.yaml
            ├── config.staging.json
            └── config.production.json
```

### Simulation

1. Backend verifies CRE authentication
2. Ensures project files exist (self-heals missing scaffolding)
3. Spawns `cre workflow simulate` as child process
4. Streams stdout/stderr line-by-line to Socket.io room `sim:{projectId}`
5. Updates project status on completion
6. Stores last 500 log lines in database

### Contract Compilation & Deployment

1. **Compile:** Solidity source → `solc` compiler (optimization: 200 runs) → ABI + bytecode
2. **Deploy:** ABI + bytecode → `viem` wallet client → send transaction → wait for receipt → store deployed address

---

## Real-time Communication

### Socket.io Setup

The WebSocket server is initialized on the same HTTP server as Express. CORS allows the frontend URL and `localhost:3000`.

### Room Structure

| Room Pattern | Purpose |
|-------------|---------|
| `sim:{projectId}` | CRE simulation log streaming |
| `compile:{contractId}` | Contract compilation progress |
| `pipeline:{pipelineId}` | Workflow generation events |

### Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join` | Client → Server | `{ room }` | Join a room |
| `leave` | Client → Server | `{ room }` | Leave a room |
| `simulation:log` | Server → Client | `{ projectId, log, timestamp }` | Individual log line |
| `simulation:complete` | Server → Client | `{ projectId, success, exitCode }` | Simulation finished |
| `compilation:progress` | Server → Client | `{ contractId, event }` | Compilation status update |
| `workflow:generated` | Server → Client | `{ pipelineId, result }` | Code generation complete |
| `cre:auth:complete` | Server → Client | `{ success, email? }` | CRE OAuth flow finished |
| `cre:code:needed` | Server → Client | — | Verification code required |

---

## Job Queue System

### BullMQ + Redis

Two queues handle asynchronous pipeline execution:

**Execution Queue** — primary pipeline/node execution:
- Job types: `execute-pipeline`, `execute-delayed-node`, `execute-approval-pending`
- Worker concurrency: 5
- Rate limit: 10 jobs/second

**Delay Queue** — scheduled delayed node execution:
- Job type: `delayed-execution`
- Worker concurrency: 10

**Shared configuration:**
- Retry: 3 attempts with exponential backoff (2s base delay)
- Completed jobs: keep 100 for 24 hours
- Failed jobs: keep 500 for 7 days

### Scheduler Service

Runs on a 60-second interval, evaluating all active pipelines for trigger nodes:
- Checks cron expressions against current time (1-minute window)
- Evaluates one-time scheduled triggers
- Queues matching executions into the execution queue

### Execution Flow

```
Trigger (cron / HTTP / manual)
  → executionQueue.queuePipelineExecution()
  → executionWorker processes job
  → pipelineExecutor.startExecution()
    → Find trigger nodes (no incoming edges)
    → Execute each node in dependency order
    → For each outgoing edge:
        immediate → execute next node
        delay     → delayQueue.scheduleDelayedExecution(ms)
        approval  → pause (1-year delay, resumed on approve)
    → Collect outputs, map to downstream inputs
  → Execution record updated with results
```

---

## Deployment

### PM2 (`ecosystem.config.js`)

```js
apps: [
  {
    name: 'mariposa-backend',
    cwd: '/opt/mariposa/backend',
    script: 'dist/server.js',        // Compiled TypeScript
    instances: 1,
    max_memory_restart: '1G',
  },
  {
    name: 'mariposa-frontend',
    cwd: '/opt/mariposa/frontend',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 1,
    max_memory_restart: '1G',
  },
]
```

### Nginx Reverse Proxy

```
/ → http://127.0.0.1:3000         (Next.js frontend)
/api/ → http://127.0.0.1:5000/api/ (Express backend)
/socket.io/ → http://127.0.0.1:5000/socket.io/ (WebSocket upgrade)
```

### Service Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 5000 |
| MongoDB | 27017 (or Atlas cloud) |
| Redis | 6379 |

### System Dependencies

- Node.js 20 LTS
- Redis
- Bun (for CRE workflow compilation)
- CRE CLI (`cre` binary)
- PM2 (process manager)
- Nginx (reverse proxy)
- Optional: Certbot for SSL

### Environment Variables

**Backend (`.env`):**

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | Token expiry (default: `7d`) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_SECURE`, `EMAIL_FROM` | SMTP config |
| `CRE_PROJECTS_DIR` | CRE workspace root (default: `./cre-projects`) |
| `BUN_PATH` | Path to Bun runtime (default: `bun`) |
| `CRE_CLI_PATH` | Path to CRE CLI (default: `cre`) |
| `SOLC_VERSION` | Solidity compiler version |
| `DEFAULT_TESTNET_RPC` | Default RPC URL for deployments |

**Frontend (`.env.local`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |

---

## Security

| Mechanism | Implementation |
|-----------|---------------|
| **Authentication** | JWT tokens (7-day expiry) via `jsonwebtoken` |
| **OTP** | Cryptographically random 6-digit codes, 10-min TTL, max 5 attempts |
| **Authorization** | Role-based (`user` / `admin`) via middleware |
| **Credential Storage** | AES-256 encryption at application level |
| **CORS** | Restricted to `FRONTEND_URL` and `localhost:3000` |
| **Secrets Masking** | Secrets masked with `***` in API responses and node outputs |
| **Sandboxed Execution** | `data-transform` nodes run in Node.js VM with 5-second timeout |
| **Input Validation** | JSON parse safeguards, ownership checks on all resources |
| **SSL** | Optional Let's Encrypt via Certbot + Nginx |
