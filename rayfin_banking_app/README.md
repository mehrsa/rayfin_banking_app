# Banking + Analytics App

This project recreates the core banking and analytics experience from
[`Azure-Samples/agentic-app-with-fabric`](https://github.com/Azure-Samples/agentic-app-with-fabric),
but keeps only a single SQL-backed app data layer.

## What changed from the sample

- Banking accounts, transfers, payments, deposits, and analytics all run on SQL entities.
- The chat coordinator now runs directly in the client against the current banking snapshot, so deployment does not depend on a separate functions runtime.
- Chat history and AI Module widgets continue to persist directly in the SQL entities.
- No event streaming, Eventhouse, notebooks, semantic model, or Power BI report are included here.
- First-run demo data is seeded into the authenticated user's SQL scope automatically.

## Local development

1. Start the app stack + Vite:

```bash
npm run dev
```

That command applies the app locally, runs the backend services, and starts Vite. Open
[http://localhost:5173](http://localhost:5173), sign in, and the app will create a demo banking workspace for the current user if no SQL data exists yet.

## Deployment

The agent layer now ships **with the app** itself. There is no separate agent service or functions deployment required for the main experience.

1. Copy `rayfin/.env.example` to `rayfin/.env`.
2. Deploy the full app:

```bash
rayfin up
rayfin up status
```

The deployment will push the static app and data layer together.

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
- `src/services/agentApi.ts` persists widgets and chat history in app data, and runs the local coordinator workflow for chat, widgets, and action suggestions.
- `src/components/AIModule.tsx` and `src/components/AgentChat.tsx` deliver the sample-style AI Module plus routed chat experience.

## Agent workflow

- `src/services/localAgentWorkflow.ts` implements the coordinator plus the specialist workflow used by the chat experience.
- `src/services/bankingData.ts` and `src/services/bankingAnalytics.ts` provide the current authenticated banking context that is sent to the Python coordinator.
- `rayfin/data/AIWidgetRecord.ts` and `rayfin/data/AgentChatMessage.ts` persist AI Module widgets and chat history in the SQL layer.

## Legacy Python backend

The previous Python implementation remains in `backend/` and the older `rayfin/functions/*.py` files as reference code, but the app no longer depends on them for local or deployed usage.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Apply the local stack and start the app |
| `npm run dev:agent` | Start the legacy Python agent service |
| `npm run dev:web` | Alias for the app + Vite web app |
| `npm run build` | Production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run unit tests with Vitest |
| `npm run deploy` | Deploy app + schema to Fabric |
