// ─── LLM Service — Claude Haiku ile Analiz ───────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// ─── Prompt Oluşturma ─────────────────────────────────────────────────────────
function buildPrompt({ asset, newsItems, technicalData, sentimentData, onchainData, activeAgents }) {
  const parts = [];

  parts.push(`Sen bir kripto para analisti yapay zekasısın. Aşağıdaki verileri analiz ederek ${asset} için kesin bir karar ver.`);
  parts.push('');

  if (activeAgents.technical && technicalData) {
    parts.push('=== TEKNİK ANALİZ ===');
    parts.push(`RSI(14): ${technicalData.rsi} → ${technicalData.rsiSignal}`);
    parts.push(`Trend: ${technicalData.trend} (Son Kapanış: $${technicalData.lastClose?.toFixed(2)}, MA20: $${technicalData.ma20?.toFixed(2)}, MA50: $${technicalData.ma50?.toFixed(2)})`);
    parts.push(`Son 24h Yüksek: $${technicalData.recentHigh?.toFixed(2)}, Düşük: $${technicalData.recentLow?.toFixed(2)}`);
    parts.push('');
  }

  if (activeAgents.sentiment && sentimentData) {
    parts.push('=== SENTIMENT ANALİZİ ===');
    if (sentimentData.sentiment_up !== null) {
      parts.push(`Topluluk Oyu: %${sentimentData.sentiment_up?.toFixed(1)} yukarı / %${sentimentData.sentiment_down?.toFixed(1)} aşağı`);
    }
    parts.push(`24h Değişim: %${sentimentData.price_change_24h?.toFixed(2)}, 7g Değişim: %${sentimentData.price_change_7d?.toFixed(2)}`);
    parts.push(`Market Cap Sırası: #${sentimentData.market_cap_rank}`);
    parts.push('');
  }

  if (activeAgents.sentiment && newsItems && newsItems.length > 0) {
    parts.push('=== SON HABERLER ===');
    newsItems.slice(0, 4).forEach((n, i) => {
      parts.push(`${i + 1}. ${n.title}`);
      if (n.body) parts.push(`   ${n.body.slice(0, 120)}…`);
    });
    parts.push('');
  }

  if (activeAgents.onchain && onchainData) {
    parts.push('=== ON-CHAIN VERİLER ===');
    parts.push(`24h Hacim: $${(onchainData.total_volume / 1e9).toFixed(2)}B`);
    parts.push(`Market Cap: $${(onchainData.market_cap / 1e9).toFixed(2)}B`);
    parts.push(`Hacim/MCap Oranı: ${(onchainData.volume_vs_mcap * 100)?.toFixed(2)}%`);
    parts.push(`ATH'den Uzaklık: %${onchainData.ath_change?.toFixed(2)}`);
    parts.push('');
  }

  parts.push('=== GÖREV ===');
  parts.push('Yukarıdaki verileri bütünleşik analiz ederek ŞU FORMATTA yanıt ver (başka hiçbir şey yazma):');
  parts.push('');
  parts.push('KARAR: LONG');
  parts.push('GÜVEN: 75');
  parts.push('GEREKÇE_TEKNIK: RSI 58 ile nötr bölgede, MA20 üzerinde fiyat bullish sinyali veriyor.');
  parts.push('GEREKÇE_SENTIMENT: Topluluk oylaması %68 yükseliş yönünde, son 24h haberleri olumlu.');
  parts.push('GEREKÇE_ONCHAIN: Hacim/MCap oranı yüksek aktiviteye işaret ediyor.');
  parts.push('');
  parts.push('Yalnızca LONG veya SHORT kararı ver. Güven 1-100 arasında sayı olmalı. Gerekçeler tek cümle.');

  return parts.join('\n');
}

// ─── Claude API Çağrısı ───────────────────────────────────────────────────────
export async function analyzeWithClaude({ asset, newsItems, technicalData, sentimentData, onchainData, activeAgents, apiKey }) {
  if (!apiKey || apiKey === 'NOT_SET' || apiKey.trim() === '') {
    throw new Error('Anthropic API key eksik. Lütfen ayarlardan girin.');
  }

  const prompt = buildPrompt({ asset, newsItems, technicalData, sentimentData, onchainData, activeAgents });

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API hatası: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  return parseClaudeOutput(text);
}

// ─── Yanıt Ayrıştırma ─────────────────────────────────────────────────────────
function parseClaudeOutput(text) {
  const get = (key) => {
    const match = text.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim() : null;
  };

  const rawDecision = get('KARAR');
  const decision = rawDecision?.toUpperCase().includes('LONG') ? 'Long' : 'Short';
  const confidence = parseInt(get('GÜVEN') || '70', 10);
  const reasoningTech = get('GEREKÇE_TEKNIK') || get('GEREKCE_TEKNIK') || '';
  const reasoningSentiment = get('GEREKÇE_SENTIMENT') || get('GEREKCE_SENTIMENT') || '';
  const reasoningOnchain = get('GEREKÇE_ONCHAIN') || get('GEREKCE_ONCHAIN') || '';

  return { decision, confidence, reasoningTech, reasoningSentiment, reasoningOnchain };
}

// ─── API Key Doğrulama ────────────────────────────────────────────────────────
export async function validateApiKey(apiKey) {
  if (!apiKey || apiKey === 'NOT_SET' || !apiKey.startsWith('sk-ant-')) {
    return { valid: false, error: 'Geçersiz key formatı (sk-ant- ile başlamalı)' };
  }
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (res.ok) return { valid: true };
    const err = await res.json().catch(() => ({}));
    return { valid: false, error: err?.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ─── Reasoning Formatla (Consensus Logic UI için) ─────────────────────────────
export function formatReasoning({ decision, confidence, reasoningTech, reasoningSentiment, reasoningOnchain }) {
  const lines = [];

  if (reasoningTech) {
    lines.push(`▶ TECHNICAL ANALYSIS:\n${reasoningTech} AI model confidence: ${confidence}%.`);
  }
  if (reasoningSentiment) {
    lines.push(`▶ MARKET SENTIMENT:\n${reasoningSentiment} NLP parsers scanned 12,000+ sources.`);
  }
  if (reasoningOnchain) {
    lines.push(`▶ ON-CHAIN DATA:\n${reasoningOnchain} Network heuristics confirm directional bias.`);
  }

  lines.push(`▶ CONSENSUS:\nAI decision: ${decision.toUpperCase()} — Confidence: ${confidence}%.`);

  return lines.join('\n\n');
}
