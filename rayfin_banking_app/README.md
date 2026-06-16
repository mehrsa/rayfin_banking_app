# Rayfin Banking + Analytics App

This project recreates the core banking and analytics experience from
[`Azure-Samples/agentic-app-with-fabric`](https://github.com/Azure-Samples/agentic-app-with-fabric),
but keeps only a single SQL-backed Rayfin data layer.

## What changed from the sample

- Banking accounts, transfers, payments, deposits, and analytics all run on Rayfin SQL entities.
- The deployed LLM-backed coordinator now runs as a **Python Fabric user data function** under `rayfin/functions/`.
- Chat history and AI Module widgets continue to persist directly in the Rayfin SQL entities.
- No event streaming, Eventhouse, notebooks, semantic model, or Power BI report are included here.
- First-run demo data is seeded into the authenticated user's SQL scope automatically.

## Local development

1. Start Rayfin + Vite:

```bash
npm run dev
```

That command applies the Rayfin app locally, runs the Rayfin backend services, and starts Vite. Open
[http://localhost:5173](http://localhost:5173), sign in, and the app will create a demo banking workspace for the current user if no SQL data exists yet.

## Deployment

The agent layer now deploys **with the Rayfin app** through the supported Python functions runtime. There is no separate agent service required for the main experience.

1. Copy `rayfin/.env.example` to `rayfin/.env`.
2. Deploy the full app:

```bash
rayfin up
rayfin up status
```

Rayfin will deploy the static app, data layer, and Python function together.

## Data model

The app keeps all business and agent state in `rayfin/data/`:

- `CustomerProfile` - per-user banking profile and planning targets
- `Account` - SQL-backed deposit / savings / goal accounts
- `BudgetCategory` - expense, income, and transfer categories
- `BankTransaction` - immutable money movements used by both the banking UI and analytics
- `AIWidgetRecord` - persisted AI Module widget definitions
- `AgentChatMessage` - persisted multi-agent chat history by session

## Frontend flow

- `src/pages/HomePage.tsx` renders overview, activity, move-money, analytics, and AI Module views.
- `src/hooks/useBankingData.ts` loads SQL data, seeds first-run demo data, and performs mutations.
- `src/services/bankingAnalytics.ts` derives balances, monthly budget health, merchant trends, and cash flow from the SQL ledger.
- `src/services/agentApi.ts` persists widgets and chat history in Rayfin data, and invokes the deployed Python function for the LLM-backed coordinator workflow.
- `src/components/AIModule.tsx` and `src/components/AgentChat.tsx` deliver the sample-style AI Module plus routed chat experience.

## Rayfin agent workflow

- `rayfin/functions/function_app.py` exposes the deployed `chatWithBankingAgents` Python UDF.
- `rayfin/functions/agents.py`, `multi_agent_banking.py`, and `agent_tools.py` implement the coordinator plus the specialist workflow used by the LLM-backed agent path.
- `src/services/bankingData.ts` and `src/services/bankingAnalytics.ts` provide the current authenticated banking context that is sent to the Python coordinator.
- `rayfin/data/AIWidgetRecord.ts` and `rayfin/data/AgentChatMessage.ts` persist AI Module widgets and chat history in the Rayfin SQL layer.

## Legacy Python backend

The previous Python implementation remains in `backend/` as reference code, but the app no longer depends on it for local or deployed usage.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Apply the Rayfin stack locally and start the app |
| `npm run dev:agent` | Start the legacy Python agent service |
| `npm run dev:web` | Alias for the Rayfin + Vite web app |
| `npm run build` | Production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run unit tests with Vitest |
| `npm run rayfin:up` | Deploy app + schema to Fabric |
