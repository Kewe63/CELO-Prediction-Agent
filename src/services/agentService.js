// ─── Agent Service — Gerçek API Veri Toplama ─────────────────────────────────
// Tüm endpointler ücretsiz, CORS destekli

const COIN_MAP = {
  BTC: { id: 'bitcoin',    cgId: 'bitcoin' },
  ETH: { id: 'ethereum',   cgId: 'ethereum' },
  SOL: { id: 'solana',     cgId: 'solana' },
  XRP: { id: 'ripple',     cgId: 'ripple' },
  DOGE:{ id: 'dogecoin',   cgId: 'dogecoin' },
  LINK:{ id: 'chainlink',  cgId: 'chainlink' },
  AVAX:{ id: 'avalanche',  cgId: 'avalanche-2' },
  MATIC:{id: 'polygon',    cgId: 'matic-network' },
};

function getCoin(asset) {
  return COIN_MAP[asset?.toUpperCase()] || COIN_MAP.BTC;
}

// ─── RSI Hesaplama ────────────────────────────────────────────────────────────
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
}

// ─── 1. Sentiment: CryptoCompare News ────────────────────────────────────────
export async function fetchCryptoNews(asset) {
  const key = import.meta.env.VITE_CRYPTOCOMPARE_API_KEY || '';
  const categories = asset === 'BTC' ? 'BTC,Bitcoin' : asset;
  const url = `https://min-api.cryptocompare.com/data/v2/news/?categories=${categories}&lang=EN&sortOrder=latest${key ? '&api_key=' + key : ''}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
    const json = await res.json();
    return (json.Data || []).slice(0, 6).map(n => ({
      title: n.title,
      body: (n.body || '').slice(0, 400),
      source: n.source_info?.name || n.source,
      published: new Date(n.published_on * 1000).toISOString(),
      url: n.url,
    }));
  } catch (err) {
    console.warn('[agentService] CryptoCompare news fetch failed:', err.message);
    return [];
  }
}

// ─── 2. Sentiment: CoinGecko Community Data ──────────────────────────────────
export async function fetchCoinGeckoSentiment(asset) {
  const coin = getCoin(asset);
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coin.cgId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`
    );
    if (!res.ok) throw new Error(`CoinGecko sentiment ${res.status}`);
    const json = await res.json();
    return {
      sentiment_up: json.sentiment_votes_up_percentage ?? null,
      sentiment_down: json.sentiment_votes_down_percentage ?? null,
      price_change_24h: json.market_data?.price_change_percentage_24h ?? null,
      price_change_7d:  json.market_data?.price_change_percentage_7d  ?? null,
      market_cap_rank:  json.market_cap_rank ?? null,
      name: json.name,
    };
  } catch (err) {
    console.warn('[agentService] CoinGecko sentiment fetch failed:', err.message);
    return null;
  }
}

// ─── 3. Technical: CoinGecko OHLC + RSI + MA ─────────────────────────────────
export async function fetchTechnicalData(asset) {
  const coin = getCoin(asset);
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coin.cgId}/ohlc?vs_currency=usd&days=7`
    );
    if (!res.ok) throw new Error(`CoinGecko OHLC ${res.status}`);
    const json = await res.json(); // [[ts, o, h, l, c], ...]

    const closes  = json.map(c => c[4]);
    const highs   = json.map(c => c[2]);
    const lows    = json.map(c => c[3]);
    const last    = closes[closes.length - 1];
    const ma20    = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
    const ma50    = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
    const rsi     = calculateRSI(closes, 14);
    const recentHigh = Math.max(...highs.slice(-24));
    const recentLow  = Math.min(...lows.slice(-24));
    const trend   = last > ma20 ? 'bullish' : 'bearish';
    const rsiSignal = rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral';

    return { rsi, lastClose: last, ma20, ma50, trend, rsiSignal, recentHigh, recentLow };
  } catch (err) {
    console.warn('[agentService] Technical fetch failed:', err.message);
    return null;
  }
}

// ─── 4. On-chain: CoinGecko Markets (ücretsiz proxy) ─────────────────────────
export async function fetchOnchainProxy(asset) {
  const coin = getCoin(asset);
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.cgId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
    );
    if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);
    const [c] = await res.json();
    if (!c) return null;
    return {
      total_volume: c.total_volume,
      market_cap:   c.market_cap,
      volume_vs_mcap: c.market_cap > 0 ? (c.total_volume / c.market_cap) : null,
      ath_change:     c.ath_change_percentage,
      circulating_supply: c.circulating_supply,
      fully_diluted_valuation: c.fully_diluted_valuation,
    };
  } catch (err) {
    console.warn('[agentService] On-chain fetch failed:', err.message);
    return null;
  }
}
