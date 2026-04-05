# CELO Prediction Agent Dashboard

An AI-powered crypto prediction dashboard with real-time market analysis, **Claude LLM-driven** LONG/SHORT signals, automatic Take Profit / Stop Loss execution, **OpenWallet Standard** support, and **Celo MiniPay** wallet integration. This project is designed to bridge the gap between AI agents and on-chain decentralized predictions.

---

## 🌟 Key Features

- **Real AI Analysis Engine** 
  - **Technical Agent:** Fetches live CoinGecko OHLC data and calculates RSI(14), MA20, MA50, and identifies active trends.
  - **Sentiment Agent:** Aggregates top headlines from CryptoCompare News along with CoinGecko community votes and 24h/7d change metrics.
  - **On-chain Agent:** Analyzes volume/market cap ratios and distance from All-Time Highs (ATH).
  - All data is passed to **Claude Haiku** for a structured `LONG/SHORT` decision backed by a dynamically calculated confidence score.
- **Auto TP/SL (Take Profit / Stop Loss)**
  - Set specific % thresholds.
  - Positions are monitored continuously (every 2 seconds) and closed automatically when targets are hit. Results are logged into the History panel.
- **Web3 Integrations**
  - **MiniPay Wallet:** Connect a Celo MiniPay wallet to view USDm/USDC/USDT balances and handle stablecoin transfers.
  - **OpenWallet Standard (OWS):** Local backend integration via `agent-server.js` acting as an interconnection node for hardware signing.
  - **Vault Management:** Direct smart contract interactions utilizing ABI structures.
- **Dynamic Interface**
  - Live TradingView-powered Lightweight Candlestick Charts.
  - Interactive Markets table containing volume, market cap, and live AI signal badges.
  - Beautiful visual aesthetics with a persistent particle background (`Entropy.jsx`).
- **Responsive & Mobile First**
  - Fully responsive, wrapping correctly across varied viewports from 400px (Mobile) to 1440px (Desktop).

---

## 📂 Project Structure

```text
CELO-Prediction-Agent/
├── agent-server.js              # Express backend (OWS integration & signing)
├── package.json                 # Project dependencies & scripts
├── vite.config.js               # Vite bundler configuration
├── eslint.config.js             # Linter rules
├── index.html                   # HTML Entry template
└── src/
    ├── App.jsx                  # Main application structure (Dashboard, Markets, History)
    ├── App.css                  # App specific styles
    ├── main.jsx                 # React root render
    ├── index.css                # Global styles, variables, CSS resets & utilities
    ├── assets/                  # Static assets/images
    ├── components/
    │   ├── Entropy.jsx          # Interactive animated particle background
    │   ├── VaultPanel.jsx       # Component for managing vault & on-chain bets
    │   ├── MiniPayWallet.jsx    # Wallet connection, balances & send flows UI
    │   ├── MiniPayWallet.css    # Scoped styles for the wallet
    │   └── MiniPayPredictionBet.jsx # Handles UI for submitting prediction bets
    ├── context/
    │   └── MiniPayProvider.jsx  # React Context for global MiniPay state
    ├── hooks/
    │   ├── useMiniPay.js        # Custom hook for standard MiniPay functionality
    │   └── useVault.js          # Custom hook for direct vault manipulations
    └── services/
        ├── agentService.js      # Data fetchers for CoinGecko & CryptoCompare
        ├── llmService.js        # Formats prompts & parses Anthropic Claude API responses
        └── vaultAbi.js          # ABI definitions for Vault Smart Contracts
```

---

## ⚙️ Architecture & Working Scheme

The project utilizes a hybrid architecture: A robust React frontend communicating directly with various APIs, alongside a local Node.js Express server to handle secure OpenWallet signing.

### 1. High Level System Architecture

```mermaid
graph LR
    subgraph Frontend [React + Vite App]
        UI[Dashboard & Pages]
        Hooks[Custom Hooks: useMiniPay / useVault]
        Services[Services: agentService / llmService]
    end
    
    subgraph Local Server [Agent Interconnection Node]
        AS[agent-server.js]
        OWS[@open-wallet-standard/core]
    end
    
    subgraph External APIs
        CG[CoinGecko Free API]
        CC[CryptoCompare News API]
        LLM[Anthropic Claude API]
    end
    
    subgraph Blockchain
        Celo[Celo Network / MiniPay Contracts]
    end

    UI --> Hooks
    UI --> Services
    Services --> CG
    Services --> CC
    Services --> LLM
    
    Hooks --> AS
    AS --> OWS
    AS -.->|Sign & Execute| Celo
    Hooks -.->|Direct Read/Write| Celo
```

### 2. AI Decision & Trading Loop

```mermaid
graph TD
    A([User clicks 'Run Analysis']) --> B{Active Modules Match?};
    
    B -->|Technical Data| C[CoinGecko OHLC<br/>RSI(14), MA20, MA50, Trend];
    B -->|Sentiment Data| D[CryptoCompare Headlines<br/>Community Sentiments];
    B -->|On-chain Data| E[Volume/Market Cap<br/>Distance to ATH];
    
    C --> F[Data Aggregator Context];
    D --> F;
    E --> F;
    
    F --> G[Anthropic Claude Haiku LLM<br/>claude-haiku-4-5-20251001];
    
    G --> H{AI Core Decision};
    
    H -->|LONG| I[Prepare Bet Parameters];
    H -->|SHORT| I[Prepare Bet Parameters];
    
    I --> J[Submit to Local Agent Server<br/>OpenWallet Standard Signing];
    
    J --> K[Transaction Executed On-chain];
    
    K --> L[Monitor Active Position<br/>Interval: 2s];
    
    L --> M{Check Price Fluctuations};
    M -->|PnL >= TP Target| N([Auto-Close as Profit<br/>Save to History]);
    M -->|PnL <= -SL Target| O([Auto-Close as Loss<br/>Save to History]);
```

---

## 🚀 Setup & Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create an `.env` file in the project root:

```env
# Required for AI Analysis
VITE_ANTHROPIC_API_KEY=sk-ant-api03...        

# Optional — defaults to free tier
VITE_CRYPTOCOMPARE_API_KEY=                   

# OpenWallet & Network configurations
VITE_USE_TESTNET=true
VITE_PREDICTION_CONTRACT=0x0000000000000000000000000000000000000000

# Server auth
VITE_OWS_API_KEY=your_api_key_here
VITE_OWS_AGENT_TOKEN=your_agent_token_here
```

> **Note:** The Anthropic API key can also be entered dynamically in the UI under `Control Panel → Anthropic API Key`.

### 3. Start Local Services

You need to run both the frontend Vite server and the local Express agent server.

**Terminal 1 (Backend Agent):**
```bash
npm run start-agent
```
*(Runs on port 8080 by default)*

**Terminal 2 (Frontend UI):**
```bash
npm run dev
```
*(Opens at http://localhost:5173)*

### 4. Production Build

To build the project for a statically hostable version (Vercel, Netlify, GH Pages):

```bash
npm run build
```

---

## 📱 Mobile Breakpoints & Responsiveness

| Width Range | Layout Behavior |
|-------------|-----------------|
| **≥ 1200px** | 3-column classic dashboard (200px Control / 1fr Center / 260px Sidebar) |
| **960–1199px** | 3-column compact mode |
| **640–959px** | Single column stack (Left Panel → Center Panel → Right Panel) |
| **< 640px** | Native Mobile Mode: Compact inputs, wrapped buttons, simplified data tables |
| **< 400px** | Extra compact: Full-width spanning for prediction controls |

---
*Built bridging Anthropic Claude Intelligence and Celo ecosystem.*
