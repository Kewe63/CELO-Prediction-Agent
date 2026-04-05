import { useState, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { useMiniPayContext } from '../context/MiniPayProvider';
import { VAULT_ADDRESS } from '../services/vaultAbi';
import {
  ExternalLink, Loader2, ShieldCheck, ShieldOff,
  Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
} from 'lucide-react';

function CeloLogo({ size = 20 }) {
  return (
    <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="100" height="32" rx="4" fill="#111"/>
      <path d="M14 7C8 7 4 10.5 4 16C4 21.5 8 25 14 25L18 25L18 21L14 21C10.5 21 8.5 18.8 8.5 16C8.5 13.2 10.5 11 14 11L18 11L18 7Z" fill="white"/>
      <path d="M21 7L21 25L34 25L34 21L25 21L25 18L33 18L33 14L25 14L25 11L34 11L34 7Z" fill="white"/>
      <path d="M37 7L37 25L50 25L50 21L41 21L41 7Z" fill="white"/>
      <path d="M54 16C54 10.5 58 7 63 7C68 7 72 10.5 72 16C72 21.5 68 25 63 25C58 25 54 21.5 54 16ZM58.5 16C58.5 19.2 60.5 21 63 21C65.5 21 67.5 19.2 67.5 16C67.5 12.8 65.5 11 63 11C60.5 11 58.5 12.8 58.5 16Z" fill="white"/>
    </svg>
  );
}

function shortAddr(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function VaultPanel({ onLog }) {
  const {
    address, isMiniPay, isConnecting, balances,
    connect, fetchBalances, walletClient,
  } = useMiniPayContext();

  const {
    loading, vaultBalances,
    fetchVaultBalances, deposit, withdrawAll,
    addAgent, removeAgent, setPaused, checkIsAgent,
  } = useVault();

  const [depositToken, setDepositToken] = useState('cUSD');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState('cUSD');
  const [agentInput, setAgentInput] = useState('');
  const [agentStatus, setAgentStatus] = useState(null);
  const [paused, setPausedState] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => { fetchVaultBalances(); }, [fetchVaultBalances]);

  const log = (msg, type = 'info') => onLog?.(msg, type);

  const wrap = async (label, fn) => {
    setTxStatus('pending'); setTxHash('');
    try {
      const res = await fn();
      setTxHash(res?.hash || '');
      setTxStatus('ok');
      log(`[Vault] ${label} ✓ ${res?.hash?.slice(0, 12)}…`, 'success');
    } catch (e) {
      setTxStatus('err');
      log(`[Vault] ${label} hata: ${e.message}`, 'error');
    }
  };

  const wc = walletClient;
  const addr = address;

  const handleDeposit = () => {
    if (!depositAmount || !wc || !addr) return;
    wrap(`deposit ${depositAmount} ${depositToken}`, () => deposit(depositToken, depositAmount, wc, addr));
  };

  const handleWithdraw = () => {
    if (!wc || !addr) return;
    wrap(`withdrawAll ${withdrawToken}`, () => withdrawAll(withdrawToken, wc, addr));
  };

  const handleAddAgent = () => {
    if (!agentInput || !wc || !addr) return;
    wrap(`addAgent ${agentInput.slice(0, 10)}…`, () => addAgent(agentInput, wc, addr));
  };

  const handleRemoveAgent = () => {
    if (!agentInput || !wc || !addr) return;
    wrap(`removeAgent ${agentInput.slice(0, 10)}…`, () => removeAgent(agentInput, wc, addr));
  };

  const handleCheckAgent = async () => {
    if (!agentInput) return;
    const result = await checkIsAgent(agentInput);
    setAgentStatus(result);
  };

  const handlePause = (state) => {
    if (!wc || !addr) return;
    wrap(state ? 'pause' : 'unpause', async () => {
      const r = await setPaused(state, wc, addr);
      setPausedState(state);
      return r;
    });
  };

  const handleRefresh = () => {
    fetchVaultBalances();
    if (address) fetchBalances();
  };

  return (
    <div className="vault-panel">

      {/* ── Cüzdan Durumu ── */}
      <div className="vault-wallet-block">
        <div className="vault-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CeloLogo size={22} />
            <span className="vault-title">{isMiniPay ? 'MiniPay' : 'Celo Cüzdan'}</span>
          </div>
          {address ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="vault-connected-addr">{shortAddr(address)}</span>
              {isMiniPay && <span className="vault-minipay-badge">MiniPay</span>}
              <button className="vault-refresh" onClick={handleRefresh} title="Yenile">
                <RefreshCw size={11} />
              </button>
            </div>
          ) : (
            <button
              className="vault-btn vault-btn-green"
              onClick={connect}
              disabled={isConnecting}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.7rem' }}
            >
              {isConnecting ? <Loader2 size={12} className="spin" /> : 'Bağlan'}
            </button>
          )}
        </div>

        {/* Kişisel bakiyeler */}
        {address && (
          <div className="vault-personal-balances">
            {Object.entries(balances).map(([sym, val]) => (
              <div key={sym} className="vault-bal-item">
                <span className="vault-bal-sym">{sym}</span>
                <span className="vault-bal-val">{val}</span>
              </div>
            ))}
          </div>
        )}

        {!address && (
          <p style={{ fontSize: '0.65rem', color: '#334155', marginTop: '0.4rem', textAlign: 'center' }}>
            İşlem yapmak için cüzdanı bağlayın
          </p>
        )}
      </div>

      <div className="vault-sep" />

      {/* ── Vault Bakiyeleri ── */}
      <div className="vault-header">
        <span className="vault-section-label" style={{ marginBottom: 0 }}>PredictionVault</span>
        <a
          className="vault-addr-link"
          href={`https://celoscan.io/address/${VAULT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {VAULT_ADDRESS.slice(0, 8)}…{VAULT_ADDRESS.slice(-6)}
          <ExternalLink size={9} />
        </a>
      </div>
      <div className="vault-balances" style={{ marginTop: '0.3rem' }}>
        {Object.entries(vaultBalances).map(([sym, val]) => (
          <div key={sym} className="vault-bal-item">
            <span className="vault-bal-sym">{sym}</span>
            <span className="vault-bal-val">{val}</span>
          </div>
        ))}
        <button className="vault-refresh" onClick={fetchVaultBalances} title="Vault bakiyesini yenile">
          <RefreshCw size={11} />
        </button>
      </div>

      <div className="vault-sep" />

      {/* ── Para Yatır ── */}
      <p className="vault-section-label">Para Yatır</p>
      <div className="vault-row">
        <select className="vault-select" value={depositToken} onChange={e => setDepositToken(e.target.value)}>
          <option value="cUSD">cUSD</option>
          <option value="CELO">CELO</option>
        </select>
        <input
          className="vault-input"
          type="number"
          placeholder="Miktar"
          value={depositAmount}
          onChange={e => setDepositAmount(e.target.value)}
          min="0"
          step="0.01"
          disabled={!address}
        />
        <button
          className="vault-btn vault-btn-green"
          onClick={handleDeposit}
          disabled={loading || !depositAmount || !address}
          title={!address ? 'Önce cüzdanı bağlayın' : ''}
        >
          {loading ? <Loader2 size={12} className="spin" /> : <ArrowDownToLine size={12} />}
        </button>
      </div>

      {/* ── Para Çek ── */}
      <p className="vault-section-label" style={{ marginTop: '0.4rem' }}>Tamamını Çek</p>
      <div className="vault-row">
        <select className="vault-select" value={withdrawToken} onChange={e => setWithdrawToken(e.target.value)}>
          <option value="cUSD">cUSD</option>
          <option value="CELO">CELO</option>
        </select>
        <button
          className="vault-btn vault-btn-red"
          style={{ flex: 1 }}
          onClick={handleWithdraw}
          disabled={loading || !address}
        >
          {loading ? <Loader2 size={12} className="spin" /> : <><ArrowUpFromLine size={12} /> Çek</>}
        </button>
      </div>

      <div className="vault-sep" />

      {/* ── Agent Yönetimi ── */}
      <p className="vault-section-label">Agent Yönetimi</p>
      <input
        className="vault-input-full"
        type="text"
        placeholder="0x… agent adresi"
        value={agentInput}
        onChange={e => { setAgentInput(e.target.value); setAgentStatus(null); }}
      />
      <div className="vault-row" style={{ marginTop: '0.35rem' }}>
        <button className="vault-btn vault-btn-green" style={{ flex: 1 }} onClick={handleAddAgent} disabled={loading || !agentInput || !address}>
          <Plus size={12} /> Ekle
        </button>
        <button className="vault-btn vault-btn-red" style={{ flex: 1 }} onClick={handleRemoveAgent} disabled={loading || !agentInput || !address}>
          <Trash2 size={12} /> Kaldır
        </button>
        <button className="vault-btn vault-btn-ghost" onClick={handleCheckAgent} disabled={!agentInput} title="Yetkili mi?">
          ?
        </button>
      </div>
      {agentStatus !== null && (
        <p style={{ fontSize: '0.62rem', marginTop: '0.3rem', color: agentStatus ? '#10b981' : '#ef4444' }}>
          {agentStatus ? '✓ Bu adres yetkili agent' : '✗ Bu adres yetkili değil'}
        </p>
      )}

      <div className="vault-sep" />

      {/* ── Güvenlik ── */}
      <div className="vault-row">
        <button
          className={`vault-btn ${paused ? 'vault-btn-green' : 'vault-btn-red'}`}
          style={{ flex: 1 }}
          onClick={() => handlePause(!paused)}
          disabled={loading || !address}
        >
          {paused ? <><ShieldCheck size={12} /> Devam Et</> : <><ShieldOff size={12} /> Swap'ları Durdur</>}
        </button>
      </div>

      {/* ── TX Durumu ── */}
      {txStatus === 'pending' && (
        <p className="vault-tx-status vault-tx-pending"><Loader2 size={11} className="spin" /> İşlem bekleniyor…</p>
      )}
      {txStatus === 'ok' && txHash && (
        <p className="vault-tx-status vault-tx-ok">
          ✓ <a href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">Celoscan'da gör</a>
        </p>
      )}
      {txStatus === 'err' && (
        <p className="vault-tx-status vault-tx-err">✗ İşlem başarısız</p>
      )}
    </div>
  );
}
