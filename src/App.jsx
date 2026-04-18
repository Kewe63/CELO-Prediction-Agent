import { useState, useEffect, useRef } from 'react';
import { MiniPayProvider, useMiniPayContext } from './context/MiniPayProvider';
import { VaultPanel } from './components/VaultPanel';
import { MiniPayWallet } from './components/MiniPayWallet';
import { MiniPayPredictionBet } from './components/MiniPayPredictionBet';
import './components/MiniPayWallet.css';
import { Entropy } from './components/Entropy';
import {
  Terminal, BrainCircuit, Wallet, Activity, ArrowRight,
  Clock, BarChart as ChartIcon, Shield,
  Settings, Zap, BarChart3, Users, Plus, Loader2, TrendingUp, TrendingDown,
  Globe, History, ExternalLink, CheckCircle2, XCircle, Clock3, KeyRound
} from 'lucide-react';
import { createChart, ColorType } from 'lightweight-charts';
import {
  fetchCryptoNews,
  fetchCoinGeckoSentiment,
  fetchTechnicalData,
  fetchOnchainProxy,
} from './services/agentService';
import { analyzeWithClaude, formatReasoning, validateApiKey } from './services/llmService';

// ─── Candlestick Chart ────────────────────────────────────────────────────────
const CandlestickChart = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const getWidth = () => chartContainerRef.current?.clientWidth > 0 ? chartContainerRef.current.clientWidth : 800;
    const getHeight = () => chartContainerRef.current?.clientHeight > 0 ? chartContainerRef.current.clientHeight : 250;
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: getWidth(), height: getHeight() });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#64748b' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      width: getWidth(),
      height: getHeight(),
      autoSize: false,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.06)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      crosshair: { vertLine: { color: 'rgba(99,235,167,0.3)' }, horzLine: { color: 'rgba(99,235,167,0.3)' } },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });
    seriesRef.current = candleSeries;
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const unique = Array.from(new Map(data.map(d => [d.time, d])).values()).sort((a, b) => a.time - b.time);
      seriesRef.current.setData(unique);
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

// ─── AI Reasoning Generator ───────────────────────────────────────────────────
const generateAiReasoning = (asset, type) => {
  const isLong = type === 'Long';
  const tech = isLong
    ? [`RSI divergence detected on the 1H timeframe for ${asset}.`, `${asset} broke through key moving average resistance.`, `MACD histogram showing expanding bullish momentum.`]
    : [`Overbought conditions on stochastic RSI for ${asset}.`, `Bearish engulfing candle on the 4H chart for ${asset}.`, `Price rejected at key Fibonacci retracement level.`];
  const sentiment = isLong
    ? [`Social sentiment spiked 40%, indicating strong retail interest.`, `Positive regulatory news in the ${asset} ecosystem.`]
    : [`Negative macro data dragging crypto sentiment lower.`, `Social volume stagnant despite broader market rally.`];
  const onchain = isLong
    ? [`Whale wallet accumulation detected on-chain.`, `Exchange outflows for ${asset} hit a 30-day high.`]
    : [`Significant exchange inflows detected, hinting at a sell-off.`, `Large inactive wallets moved ${asset} to exchanges today.`];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  return `▶ TECHNICAL ANALYSIS:\n${pick(tech)} AI model confidence: 87%.\n\n` +
    `▶ MARKET SENTIMENT:\n${pick(sentiment)} NLP parsers scanned 12,000+ sources.\n\n` +
    `▶ ON-CHAIN DATA:\n${pick(onchain)} Network heuristics confirm directional bias.`;
};

// ─── Main App Inner ───────────────────────────────────────────────────────────
function AppInner() {
  const [targetAsset, setTargetAsset] = useState('ETH');
  const [prediction, setPrediction] = useState('up');
  const [amount, setAmount] = useState('0.1');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [timeframe, setTimeframe] = useState('1H');
  const [selectedAgents, setSelectedAgents] = useState({ technical: true, sentiment: true, onchain: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [hasCustomAgent, setHasCustomAgent] = useState(false);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [aiReasoning, setAiReasoning] = useState('');
  const [activeTrades, setActiveTrades] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal');
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'markets' | 'history'
  const [betHistory, setBetHistory] = useState([]);
  const [takeProfitPct, setTakeProfitPct] = useState('5');
  const [stopLossPct, setStopLossPct] = useState('3');
  const [anthropicKey, setAnthropicKey] = useState(
    import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  );
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState('idle'); // 'idle' | 'checking' | 'valid' | 'invalid'
  const [keyError, setKeyError] = useState('');

  const activeTradesRef = useRef([]);
  const logsEndRef = useRef(null);
  const mockDataRef = useRef({});
  const prevPriceRef = useRef(0);

  useEffect(() => { activeTradesRef.current = activeTrades; }, [activeTrades]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = (message, type = 'info') =>
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message, type }]);

  // Init logs
  useEffect(() => {
    addLog('system_init() — Prediction Agent v2.0', 'info');
    setTimeout(() => addLog('modules loaded: [technical] [sentiment] [on-chain]', 'success'), 600);
    setTimeout(() => addLog('MiniPay wallet interface ready', 'info'), 1200);
  }, []);

  // Agent loader
  const handleAddAgent = () => {
    if (isAddingAgent || hasCustomAgent) return;
    setIsAddingAgent(true);
    addLog('downloading module: ArbitrageScanner_v1.2…', 'info');
    setTimeout(() => {
      setIsAddingAgent(false);
      setHasCustomAgent(true);
      addLog('module_ready: ArbitrageScanner_v1.2', 'success');
      setSelectedAgents(prev => ({ ...prev, arbitrage: true }));
    }, 2500);
  };

  const toggleAgent = agent => setSelectedAgents(prev => ({ ...prev, [agent]: !prev[agent] }));

  // Auto agent
  useEffect(() => {
    if (!autoMode) return;
    const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK'];
    const tp = parseFloat(takeProfitPct) || 5;
    const sl = parseFloat(stopLossPct) || 3;

    const openInterval = setInterval(() => {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const type = Math.random() > 0.5 ? 'Long' : 'Short';
      const amt = (Math.random() * 2).toFixed(2);
      const entryPrice = Math.random() * 10000 + 100;
      const entry = entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setTargetAsset(asset);
      setPrediction(type === 'Long' ? 'up' : 'down');
      setAmount(amt);
      addLog(`[AUTO] ${type} signal on ${asset} — size: ${amt}`, 'info');
      setAiReasoning(generateAiReasoning(asset, type));
      setActiveTrades(prev => [{ id: Date.now(), asset, type, amount: amt, entry, entryPrice, pnl: '+0.00%', pnlNum: 0, tp, sl, status: 'Active' }, ...prev]);
    }, 8000);

    const pnlInterval = setInterval(() => {
      setActiveTrades(prev => {
        const toClose = [];
        const updated = prev.map(t => {
          const delta = (Math.random() * 1.5 - 0.7);
          const newPnlNum = ((t.pnlNum || 0) + delta);
          const pnlStr = `${newPnlNum >= 0 ? '+' : ''}${newPnlNum.toFixed(2)}%`;

          if (t.tp && newPnlNum >= t.tp) {
            toClose.push({ ...t, pnl: pnlStr, pnlNum: newPnlNum, reason: 'TP' });
            return null;
          }
          if (t.sl && newPnlNum <= -t.sl) {
            toClose.push({ ...t, pnl: pnlStr, pnlNum: newPnlNum, reason: 'SL' });
            return null;
          }
          return { ...t, pnl: pnlStr, pnlNum: newPnlNum };
        }).filter(Boolean);

        toClose.forEach(t => {
          const label = t.reason === 'TP' ? `[TP] ${t.asset} reached +${t.tp}% target` : `[SL] ${t.asset} hit -${t.sl}% stop loss`;
          addLog(label + ', closing', t.reason === 'TP' ? 'success' : 'error');
          setBetHistory(prev2 => [{
            id: Date.now() + Math.random(),
            asset: t.asset,
            type: t.type,
            amount: t.amount,
            entry: t.entry,
            pnl: t.pnl,
            date: new Date().toLocaleString('tr-TR', { hour12: false }),
            status: t.reason === 'TP' ? 'profit' : 'loss',
          }, ...prev2]);
        });

        return updated;
      });
    }, 2000);

    const closeInterval = setInterval(() => {
      const trades = activeTradesRef.current;
      if (!trades.length) return;
      const last = trades[trades.length - 1];
      addLog(`[AUTO] Closed ${last.asset} — PnL: ${last.pnl}`, 'warning');
      setActiveTrades(p => p.slice(0, -1));
    }, 15000);

    return () => { clearInterval(openInterval); clearInterval(pnlInterval); clearInterval(closeInterval); };
  }, [autoMode]);

  // Price feed
  useEffect(() => {
    const coinMap = {
      BTC: { id: 'bitcoin', base: 64200 }, ETH: { id: 'ethereum', base: 3450 },
      SOL: { id: 'solana', base: 145 }, XRP: { id: 'ripple', base: 0.6 },
      DOGE: { id: 'dogecoin', base: 0.16 }, LINK: { id: 'chainlink', base: 18 },
    };

    const generateMock = (basePrice, asset) => {
      const now = Math.floor(Date.now() / 1000 / 900) * 900;
      if (!mockDataRef.current[asset]) {
        let price = basePrice;
        const data = [];
        for (let i = 100; i >= 0; i--) {
          const open = price;
          const change = (Math.random() - 0.5) * basePrice * 0.005;
          const close = open + change;
          data.push({ time: now - i * 900, open, high: Math.max(open, close) + Math.random() * basePrice * 0.002, low: Math.min(open, close) - Math.random() * basePrice * 0.002, close });
          price = close;
        }
        mockDataRef.current[asset] = data;
      } else {
        const data = mockDataRef.current[asset];
        const last = data[data.length - 1];
        if (last.time === now) {
          last.close += (Math.random() - 0.5) * basePrice * 0.002;
          last.high = Math.max(last.high, last.close);
          last.low = Math.min(last.low, last.close);
        } else {
          const open = last.close;
          const close = open + (Math.random() - 0.5) * basePrice * 0.005;
          data.push({ time: now, open, high: Math.max(open, close) + Math.random() * basePrice * 0.002, low: Math.min(open, close) - Math.random() * basePrice * 0.002, close });
          if (data.length > 100) data.shift();
        }
      }
      return [...mockDataRef.current[asset]];
    };

    const fetchData = async () => {
      const target = coinMap[targetAsset.toUpperCase()] || { id: 'bitcoin', base: 64000 };
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${target.id}/ohlc?vs_currency=usd&days=1`);
        if (!res.ok) throw new Error('rate limited');
        const json = await res.json();
        if (!Array.isArray(json) || !json.length) throw new Error('empty');
        const ohlc = json.map(p => ({ time: Math.floor(p[0] / 1000), open: p[1], high: p[2], low: p[3], close: p[4] }));
        const newPrice = ohlc[ohlc.length - 1].close;
        setPriceChange(prevPriceRef.current ? ((newPrice - prevPriceRef.current) / prevPriceRef.current) * 100 : 0);
        prevPriceRef.current = newPrice;
        setChartData(ohlc);
        setCurrentPrice(newPrice);
      } catch {
        const mock = generateMock(target.base, targetAsset);
        const newPrice = mock[mock.length - 1].close;
        setPriceChange(prevPriceRef.current ? ((newPrice - prevPriceRef.current) / prevPriceRef.current) * 100 : 0);
        prevPriceRef.current = newPrice;
        setChartData(mock);
        setCurrentPrice(newPrice);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [targetAsset]);

  // Execute
  const handleExecute = async () => {
    if (isProcessing) return;
    const count = Object.values(selectedAgents).filter(Boolean).length;
    if (!count) { addLog('error: no agents selected', 'error'); return; }
    setIsProcessing(true);

    addLog(`initiating consensus: ${targetAsset} | ${riskLevel} | ${timeframe}`, 'info');
    addLog(`agents active: ${Object.entries(selectedAgents).filter(([,v]) => v).map(([k]) => k).join(', ')}`, 'info');

    try {
      // Parallel data fetch based on active agents
      const [newsItems, sentimentData, technicalData, onchainData] = await Promise.all([
        selectedAgents.sentiment ? fetchCryptoNews(targetAsset) : Promise.resolve([]),
        selectedAgents.sentiment ? fetchCoinGeckoSentiment(targetAsset) : Promise.resolve(null),
        selectedAgents.technical ? fetchTechnicalData(targetAsset) : Promise.resolve(null),
        selectedAgents.onchain   ? fetchOnchainProxy(targetAsset)  : Promise.resolve(null),
      ]);

      addLog('data collected, Claude is analyzing…', 'info');

      const { decision, confidence, reasoningTech, reasoningSentiment, reasoningOnchain } =
        await analyzeWithClaude({
          asset: targetAsset,
          newsItems,
          technicalData,
          sentimentData,
          onchainData,
          activeAgents: selectedAgents,
          apiKey: anthropicKey,
        });

      const reasoningText = formatReasoning({ decision, confidence, reasoningTech, reasoningSentiment, reasoningOnchain });
      setAiReasoning(reasoningText);
      setPrediction(decision === 'Long' ? 'up' : 'down');

      const tp = parseFloat(takeProfitPct) || 5;
      const sl = parseFloat(stopLossPct) || 3;
      const fake = `0x${Math.random().toString(16).slice(2, 18)}`;
      addLog(`decision: ${decision} | confidence: ${confidence}% [${fake}]`, 'success');

      setActiveTrades(prev => [{
        id: Date.now(),
        asset: targetAsset,
        type: decision,
        amount,
        entry: currentPrice.toLocaleString(),
        entryPrice: currentPrice,
        pnl: '0.00%',
        pnlNum: 0,
        tp,
        sl,
        status: 'Active',
      }, ...prev]);

    } catch (err) {
      addLog(`error: ${err.message}`, 'error');
    }

    setIsProcessing(false);
  };

  const handleKeyBlur = async () => {
    if (!anthropicKey || anthropicKey.trim() === '' || anthropicKey === 'NOT_SET') {
      setKeyStatus('idle');
      return;
    }
    setKeyStatus('checking');
    const result = await validateApiKey(anthropicKey);
    if (result.valid) {
      setKeyStatus('valid');
      addLog('Anthropic API key verified ✓', 'success');
    } else {
      setKeyStatus('invalid');
      setKeyError(result.error || 'Key could not be verified');
      addLog(`API key error: ${result.error}`, 'error');
    }
  };

  const handleClose = (id, asset) => {
    const trade = activeTradesRef.current.find(t => t.id === id);
    setActiveTrades(prev => prev.filter(t => t.id !== id));
    addLog(`position closed: ${asset} | final PnL: ${trade?.pnl || '—'}`, 'warning');
    setBetHistory(prev => [{
      id: Date.now(),
      asset,
      type: trade?.type || '—',
      amount: trade?.amount || '—',
      entry: trade?.entry || '—',
      pnl: trade?.pnl || '0.00%',
      date: new Date().toLocaleString('tr-TR', { hour12: false }),
      status: parseFloat(trade?.pnl) >= 0 ? 'profit' : 'loss',
    }, ...prev]);
  };

  const isUp = priceChange >= 0;

  return (
    <>
      <Entropy />
      <div className="container">
        {/* ── Header ── */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <BrainCircuit size={18} color="white" />
            </div>
            <span>Prediction <span className="logo-accent">Agent</span></span>
          </div>

          <nav className="header-nav">
            <span className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}>Dashboard</span>
            <span className={`nav-item ${activePage === 'markets' ? 'active' : ''}`} onClick={() => setActivePage('markets')}>Markets</span>
            <span className={`nav-item ${activePage === 'history' ? 'active' : ''}`} onClick={() => setActivePage('history')}>History</span>
          </nav>

          <MiniPayHeaderStatus />
        </header>

        {/* ── Dashboard Grid ── */}
        {activePage === 'dashboard' && (
        <main className="dashboard-grid">

          {/* LEFT — Control Panel */}
          <div className="column left-col">
            <div className="glass-card">
              <h2 className="card-title">
                <Settings size={16} color="#63eba7" /> Control Panel
              </h2>

              <div className="input-group">
                <label>Asset</label>
                <select className="custom-input uppercase" value={targetAsset} onChange={e => setTargetAsset(e.target.value)}>
                  <option value="ETH">ETH — Ethereum</option>
                  <option value="BTC">BTC — Bitcoin</option>
                  <option value="SOL">SOL — Solana</option>
                  <option value="XRP">XRP — Ripple</option>
                  <option value="DOGE">DOGE — Dogecoin</option>
                  <option value="LINK">LINK — Chainlink</option>
                </select>
              </div>

              <div className="input-row">
                <div className="input-group half">
                  <label>Risk</label>
                  <select className="custom-input" value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="input-group half">
                  <label>Timeframe</label>
                  <select className="custom-input" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
                    <option value="15m">15m</option>
                    <option value="1H">1H</option>
                    <option value="1D">1D</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Allocation (ETH)</label>
                <input type="number" className="custom-input" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
              </div>

              <div className="separator" />

              <h3 className="section-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={13} /> Agents</span>
                <button onClick={handleAddAgent} disabled={isAddingAgent || hasCustomAgent} className="icon-btn" title="Load module">
                  {isAddingAgent ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                </button>
              </h3>

              <div className="agent-selectors">
                {[
                  { key: 'technical', icon: <ChartIcon size={13} />, label: 'Technical' },
                  { key: 'sentiment', icon: <Activity size={13} />, label: 'Sentiment' },
                  { key: 'onchain', icon: <Shield size={13} />, label: 'On-chain' },
                ].map(({ key, icon, label }) => (
                  <button key={key} className={`agent-btn ${selectedAgents[key] ? 'active' : ''}`} onClick={() => toggleAgent(key)}>
                    {icon} {label}
                    {selectedAgents[key] && <span className="agent-dot" />}
                  </button>
                ))}
                {hasCustomAgent && (
                  <button className={`agent-btn ${selectedAgents.arbitrage ? 'active' : ''}`} onClick={() => toggleAgent('arbitrage')} style={{ animation: 'fadeIn 0.4s ease' }}>
                    <Zap size={13} /> Arbitrage
                    {selectedAgents.arbitrage && <span className="agent-dot" />}
                  </button>
                )}
              </div>

              <div className="separator" />

              {/* Risk Controls — TP/SL */}
              <h3 className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={13} /> Risk Controls
              </h3>
              <div className="input-row">
                <div className="input-group half">
                  <label style={{ color: 'rgba(16,185,129,0.7)' }}>Take Profit %</label>
                  <input
                    type="number"
                    className="custom-input tp-input"
                    value={takeProfitPct}
                    onChange={e => setTakeProfitPct(e.target.value)}
                    step="0.5"
                    min="0.1"
                    placeholder="5"
                  />
                </div>
                <div className="input-group half">
                  <label style={{ color: 'rgba(239,68,68,0.7)' }}>Stop Loss %</label>
                  <input
                    type="number"
                    className="custom-input sl-input"
                    value={stopLossPct}
                    onChange={e => setStopLossPct(e.target.value)}
                    step="0.5"
                    min="0.1"
                    placeholder="3"
                  />
                </div>
              </div>

              {/* LLM API Key */}
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <KeyRound size={11} /> Anthropic API Key
                  {keyStatus === 'valid' && (
                    <span style={{ color: '#10b981', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', fontWeight: 600 }}>
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="custom-input"
                    value={anthropicKey}
                    onChange={e => { setAnthropicKey(e.target.value); setKeyStatus('idle'); setKeyError(''); }}
                    onBlur={handleKeyBlur}
                    placeholder="sk-ant-…"
                    style={{
                      flex: 1, minWidth: 0,
                      borderColor: keyStatus === 'valid'
                        ? 'rgba(16,185,129,0.5)'
                        : keyStatus === 'invalid'
                          ? 'rgba(239,68,68,0.5)'
                          : keyStatus === 'checking'
                            ? 'rgba(245,158,11,0.5)'
                            : undefined,
                    }}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => setShowKey(s => !s)}
                    title={showKey ? 'Hide' : 'Show'}
                    style={{ flexShrink: 0 }}
                  >
                    {keyStatus === 'checking'
                      ? <Loader2 size={12} className="spin" style={{ color: '#f59e0b' }} />
                      : keyStatus === 'valid'
                        ? <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                        : keyStatus === 'invalid'
                          ? <XCircle size={12} style={{ color: '#ef4444' }} />
                          : showKey ? '🙈' : '👁'}
                  </button>
                </div>
                {keyStatus === 'invalid' && keyError && (
                  <p style={{ color: '#ef4444', fontSize: '0.62rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    {keyError}
                  </p>
                )}
              </div>

              <div className="separator" style={{ margin: '0.15rem 0' }} />

              <div className="prediction-toggle">
                <button className={`pred-btn long ${prediction === 'up' ? 'active' : ''}`} onClick={() => setPrediction('up')}>
                  <TrendingUp size={14} /> Long
                </button>
                <button className={`pred-btn short ${prediction === 'down' ? 'active' : ''}`} onClick={() => setPrediction('down')}>
                  <TrendingDown size={14} /> Short
                </button>
              </div>

              <button className="action-btn" onClick={handleExecute} disabled={isProcessing}>
                {isProcessing
                  ? <><Clock size={16} className="spin" /> Computing…</>
                  : <><BrainCircuit size={16} /> Run Analysis <ArrowRight size={16} /></>}
              </button>

              <button
                className="action-btn auto-btn"
                onClick={() => setAutoMode(m => !m)}
                style={{ background: autoMode ? 'rgba(239,68,68,0.12)' : 'rgba(99,235,167,0.08)', borderColor: autoMode ? 'rgba(239,68,68,0.5)' : 'rgba(99,235,167,0.3)', color: autoMode ? '#ef4444' : '#63eba7' }}
              >
                <Zap size={16} /> {autoMode ? 'Stop Auto Agent' : 'Activate Auto Agent'}
              </button>
            </div>

            {/* Celo Banner */}
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <img src="/celo-banner.png" alt="Built for Celo" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
            </div>
          </div>

          {/* CENTER — Chart + Reasoning */}
          <div className="column center-col">
            <div className="glass-card chart-card">
              <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="chart-pair"><BarChart3 size={16} color="#63eba7" style={{ marginRight: 4 }} />{targetAsset}/USD</span>
                  <span className={`chart-change ${isUp ? 'up' : 'down'}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
                <span className="chart-price">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="chart-container">
                {chartData.length > 0
                  ? <CandlestickChart data={chartData} />
                  : <div className="chart-placeholder">Awaiting price stream…</div>}
              </div>
            </div>

            <div className="glass-card reasoning-card mt-g">
              <h2 className="card-title"><Zap size={15} color="#f59e0b" /> Consensus Logic</h2>
              <div className="reasoning-box">
                {aiReasoning
                  ? aiReasoning.split('\n\n').map((block, i) => {
                      const m = block.match(/^((?:▶\s.+?:|\[.+?\]))\s*([\s\S]*)$/);
                      if (!m) return <p key={i} className="reasoning-p">{block}</p>;
                      const colors = { TECHNICAL: '#0dc9f0', SENTIMENT: '#ec4899', 'ON-CHAIN': '#8b5cf6', AUTO: '#63eba7', ERROR: '#ef4444' };
                      const color = Object.entries(colors).find(([k]) => m[1].includes(k))?.[1] || '#f59e0b';
                      return (
                        <p key={i} className="reasoning-p">
                          <span style={{ color, fontWeight: 700, display: 'block', marginBottom: 5, fontSize: '0.72rem', letterSpacing: '0.5px' }}>{m[1]}</span>
                          {m[2]}
                        </p>
                      );
                    })
                  : <div className="idle-state">Awaiting signal…</div>}
              </div>
            </div>
          </div>

          {/* RIGHT — Tabs: Terminal / Workers / MiniPay */}
          <div className="column right-col">
            <div className="glass-card right-tab-card">
              <div className="right-tabs">
                {[
                  { id: 'terminal', icon: <Terminal size={13} />, label: 'Terminal' },
                  { id: 'workers', icon: <Activity size={13} />, label: 'Workers' },
                  { id: 'vault', icon: <Shield size={13} />, label: 'Vault' },
                  { id: 'minipay', icon: <Wallet size={13} />, label: 'MiniPay' },
                ].map(tab => (
                  <button key={tab.id} className={`right-tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Terminal */}
              {activeTab === 'terminal' && (
                <div className="logs-container">
                  {logs.map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      <span className="log-time">{log.time}</span>
                      {log.message}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {/* Workers */}
              {activeTab === 'workers' && (
                <div className="trades-list">
                  {activeTrades.map(trade => (
                    <div key={trade.id} className="trade-item">
                      <div className="trade-top">
                        <div className="trade-info">
                          <span className="trade-asset">{trade.asset}</span>
                          <span className={`trade-type ${trade.type.toLowerCase()}`}>{trade.type}</span>
                        </div>
                        <div className="trade-details">
                          <span className="trade-entry">${trade.entry}</span>
                          <span className={`trade-pnl ${trade.pnl.startsWith('+') ? 'positive' : 'negative'}`}>{trade.pnl}</span>
                        </div>
                      </div>
                      <div className="trade-bottom">
                        <div>
                          <span className="trade-size">{trade.amount} {trade.asset}</span>
                          {(trade.tp || trade.sl) && (
                            <div className="trade-tp-sl">
                              {trade.tp && <span className="tp">TP +{trade.tp}%</span>}
                              {trade.tp && trade.sl && <span style={{color:'#1e293b'}}> · </span>}
                              {trade.sl && <span className="sl">SL -{trade.sl}%</span>}
                            </div>
                          )}
                        </div>
                        <button className="close-btn" onClick={() => handleClose(trade.id, trade.asset)}>Close</button>
                      </div>
                    </div>
                  ))}
                  {!activeTrades.length && <div className="empty-state">No active positions</div>}
                </div>
              )}

              {/* Vault */}
              {activeTab === 'vault' && (
                <div className="tab-scroll">
                  <VaultPanel onLog={addLog} />
                </div>
              )}

              {/* MiniPay */}
              {activeTab === 'minipay' && (
                <div className="tab-scroll">
                  <MiniPayPredictionBet
                    market={{ id: targetAsset, title: `${targetAsset}/USD Price Direction` }}
                    onSuccess={(data) => {
                      addLog(`MiniPay Prediction Bet Placed: ${data.amount} USDm | Hash: ${data.hash?.slice(0,8)}...`, 'success');
                    }}
                  />
                  <div style={{ marginTop: '1rem' }} />
                  <MiniPayWallet
                    onPayment={(data) => {
                      addLog(`MiniPay Transfer: ${data.amount} ${data.token} to ${data.to?.slice(0,6)}...`, 'info');
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
        )}

        {/* ── Markets Page ── */}
        {activePage === 'markets' && <MarketsPage />}

        {/* ── History Page ── */}
        {activePage === 'history' && <HistoryPage betHistory={betHistory} activeTrades={activeTrades} />}

      </div>
    </>
  );
}

// ─── Celo Logo SVG ───────────────────────────────────────────────────────────
function CeloLogo({ size = 28 }) {
  return (
    <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="32" rx="4" fill="#111"/>
      <path d="M14 7C8 7 4 10.5 4 16C4 21.5 8 25 14 25L18 25L18 21L14 21C10.5 21 8.5 18.8 8.5 16C8.5 13.2 10.5 11 14 11L18 11L18 7Z" fill="white"/>
      <path d="M21 7L21 25L34 25L34 21L25 21L25 18L33 18L33 14L25 14L25 11L34 11L34 7Z" fill="white"/>
      <path d="M37 7L37 25L50 25L50 21L41 21L41 7Z" fill="white"/>
      <path d="M54 16C54 10.5 58 7 63 7C68 7 72 10.5 72 16C72 21.5 68 25 63 25C58 25 54 21.5 54 16ZM58.5 16C58.5 19.2 60.5 21 63 21C65.5 21 67.5 19.2 67.5 16C67.5 12.8 65.5 11 63 11C60.5 11 58.5 12.8 58.5 16Z" fill="white"/>
    </svg>
  );
}

// ─── Markets Page ─────────────────────────────────────────────────────────────
const MARKET_DATA = [
  { symbol: 'BTC', name: 'Bitcoin',  price: 64218.40, change: 2.14,  vol: '48.2B', mcap: '1.26T', high: 65100, low: 62800 },
  { symbol: 'ETH', name: 'Ethereum', price: 3451.20,  change: 1.87,  vol: '22.8B', mcap: '414B',  high: 3520,  low: 3380  },
  { symbol: 'SOL', name: 'Solana',   price: 148.34,   change: -0.93, vol: '5.4B',  mcap: '68B',   high: 155,   low: 144   },
  { symbol: 'XRP', name: 'Ripple',   price: 0.614,    change: 0.42,  vol: '2.1B',  mcap: '34B',   high: 0.631, low: 0.601 },
  { symbol: 'DOGE', name: 'Dogecoin',price: 0.162,    change: -1.72, vol: '1.8B',  mcap: '23B',   high: 0.168, low: 0.157 },
  { symbol: 'LINK', name: 'Chainlink',price: 18.24,   change: 3.31,  vol: '890M',  mcap: '11B',   high: 18.90, low: 17.60 },
  { symbol: 'AVAX', name: 'Avalanche',price: 38.72,   change: -0.54, vol: '620M',  mcap: '16B',   high: 39.80, low: 37.90 },
  { symbol: 'MATIC',name: 'Polygon', price: 0.882,    change: 1.15,  vol: '480M',  mcap: '8.4B',  high: 0.901, low: 0.865 },
];

function MarketsPage() {
  const [sortBy, setSortBy] = useState('mcap');
  const [filter, setFilter] = useState('');

  const sorted = [...MARKET_DATA]
    .filter(m => m.symbol.includes(filter.toUpperCase()) || m.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => sortBy === 'change' ? b.change - a.change : b.price - a.price);

  return (
    <div className="page-container">
      {/* Stats Bar */}
      <div className="market-stats-bar">
        <div className="market-stat">
          <span className="market-stat-label">Total Market Cap</span>
          <span className="market-stat-value">$2.34T</span>
          <span className="market-stat-change up">+1.84%</span>
        </div>
        <div className="market-stat">
          <span className="market-stat-label">24h Volume</span>
          <span className="market-stat-value">$98.6B</span>
          <span className="market-stat-change up">+5.2%</span>
        </div>
        <div className="market-stat">
          <span className="market-stat-label">BTC Dominance</span>
          <span className="market-stat-value">53.8%</span>
          <span className="market-stat-change down">-0.3%</span>
        </div>
        <div className="market-stat">
          <span className="market-stat-label">Active Assets</span>
          <span className="market-stat-value">8</span>
          <span className="market-stat-change" style={{color:'#63eba7'}}>Tracked</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="market-toolbar">
        <div className="market-search-wrap">
          <Globe size={13} color="#475569" />
          <input
            className="market-search"
            placeholder="Search asset…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="market-sort-btns">
          <button className={`market-sort-btn ${sortBy === 'mcap' ? 'active' : ''}`} onClick={() => setSortBy('mcap')}>By Cap</button>
          <button className={`market-sort-btn ${sortBy === 'change' ? 'active' : ''}`} onClick={() => setSortBy('change')}>By Change</button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card market-table-card">
        <div className="market-table-head">
          <span>#</span>
          <span>Asset</span>
          <span>Price</span>
          <span>24h Change</span>
          <span>24h High / Low</span>
          <span>Volume</span>
          <span>Market Cap</span>
          <span>Signal</span>
        </div>
        {sorted.map((m, i) => {
          const isUp = m.change >= 0;
          return (
            <div key={m.symbol} className="market-table-row">
              <span className="market-rank">{i + 1}</span>
              <div className="market-asset-cell">
                <div className="market-asset-icon">{m.symbol.slice(0, 2)}</div>
                <div>
                  <div className="market-asset-symbol">{m.symbol}</div>
                  <div className="market-asset-name">{m.name}</div>
                </div>
              </div>
              <span className="market-price">${m.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span>
              <span className={`market-change-cell ${isUp ? 'up' : 'down'}`}>
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isUp ? '+' : ''}{m.change.toFixed(2)}%
              </span>
              <div className="market-hl-cell">
                <span className="market-high">{m.high.toLocaleString()}</span>
                <span className="market-hl-sep">/</span>
                <span className="market-low">{m.low.toLocaleString()}</span>
              </div>
              <span className="market-vol">{m.vol}</span>
              <span className="market-mcap">${m.mcap}</span>
              <span className={`market-signal ${isUp ? 'signal-long' : 'signal-short'}`}>
                {isUp ? 'LONG' : 'SHORT'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ betHistory, activeTrades }) {
  const totalPnl = betHistory.reduce((acc, h) => acc + parseFloat(h.pnl) || 0, 0);
  const wins = betHistory.filter(h => h.status === 'profit').length;
  const losses = betHistory.filter(h => h.status === 'loss').length;
  const winRate = betHistory.length ? ((wins / betHistory.length) * 100).toFixed(0) : 0;

  return (
    <div className="page-container">
      {/* Summary cards */}
      <div className="history-stats-bar">
        <div className="history-stat-card">
          <span className="history-stat-label">Total Positions</span>
          <span className="history-stat-value">{betHistory.length + activeTrades.length}</span>
        </div>
        <div className="history-stat-card">
          <span className="history-stat-label">Closed</span>
          <span className="history-stat-value">{betHistory.length}</span>
        </div>
        <div className="history-stat-card">
          <span className="history-stat-label">Win Rate</span>
          <span className={`history-stat-value ${parseFloat(winRate) >= 50 ? 'up' : 'down'}`}>{winRate}%</span>
        </div>
        <div className="history-stat-card">
          <span className="history-stat-label">Net PnL</span>
          <span className={`history-stat-value ${totalPnl >= 0 ? 'up' : 'down'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
          </span>
        </div>
        <div className="history-stat-card">
          <span className="history-stat-label">Active Now</span>
          <span className="history-stat-value" style={{color:'#63eba7'}}>{activeTrades.length}</span>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', flex:1, minHeight:0}}>
        {/* Active Positions */}
        <div className="glass-card" style={{display:'flex', flexDirection:'column', minHeight:0}}>
          <h2 className="card-title"><Activity size={15} color="#63eba7" /> Active Positions</h2>
          <div style={{flex:1, overflowY:'auto'}}>
            {activeTrades.length === 0 && <div className="empty-state">No active positions</div>}
            {activeTrades.map(t => (
              <div key={t.id} className="history-row">
                <div className="history-row-left">
                  <span className={`history-status-dot ${t.type === 'Long' ? 'long' : 'short'}`} />
                  <div>
                    <div className="history-asset">{t.asset} <span className={`trade-type ${t.type.toLowerCase()}`}>{t.type}</span></div>
                    <div className="history-meta">Entry ${t.entry} · {t.amount} units</div>
                  </div>
                </div>
                <div className="history-row-right">
                  <span className={`trade-pnl ${t.pnl.startsWith('+') ? 'positive' : 'negative'}`}>{t.pnl}</span>
                  <span className="history-badge active-badge"><Clock3 size={10}/> Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closed Positions */}
        <div className="glass-card" style={{display:'flex', flexDirection:'column', minHeight:0}}>
          <h2 className="card-title"><History size={15} color="#63eba7" /> Closed Positions</h2>
          <div style={{flex:1, overflowY:'auto'}}>
            {betHistory.length === 0 && <div className="empty-state">No closed positions yet — close a worker to see history</div>}
            {betHistory.map(h => (
              <div key={h.id} className="history-row">
                <div className="history-row-left">
                  <span className={`history-status-dot ${h.status}`} />
                  <div>
                    <div className="history-asset">{h.asset} <span className={`trade-type ${h.type.toLowerCase()}`}>{h.type}</span></div>
                    <div className="history-meta">Entry ${h.entry} · {h.amount} units · {h.date}</div>
                  </div>
                </div>
                <div className="history-row-right">
                  <span className={`trade-pnl ${h.status === 'profit' ? 'positive' : 'negative'}`}>{h.pnl}</span>
                  {h.status === 'profit'
                    ? <span className="history-badge profit-badge"><CheckCircle2 size={10}/> Profit</span>
                    : <span className="history-badge loss-badge"><XCircle size={10}/> Loss</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Header Wallet Status ─────────────────────────────────────────────────────
function MiniPayHeaderStatus() {
  const { address, isMiniPay, connect, isConnecting } = useMiniPayContext();

  if (address) {
    return (
      <div className="wallet-status connected">
        <span className="status-dot pulse" />
        <Wallet size={13} color="#63eba7" />
        <span className="wallet-addr">{address.slice(0, 6)}…{address.slice(-4)}</span>
        {isMiniPay && <span className="mp-chip">MiniPay</span>}
      </div>
    );
  }

  return (
    <div className="wallet-status">
      <span className="status-dot" style={{ background: '#475569' }} />
      <Wallet size={13} color="#475569" />
      <button className="connect-btn" onClick={connect} disabled={isConnecting}>
        {isConnecting ? 'Connecting…' : 'MiniPay Login'}
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <MiniPayProvider>
      <AppInner />
    </MiniPayProvider>
  );
}
