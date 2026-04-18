import { useState } from "react";
import { useMiniPayContext } from "../context/MiniPayProvider";

function CeloLogo({ size = 28 }) {
  return (
    <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 100 32" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <rect width="100" height="32" rx="4" fill="#111"/>
      <path d="M14 7C8 7 4 10.5 4 16C4 21.5 8 25 14 25L18 25L18 21L14 21C10.5 21 8.5 18.8 8.5 16C8.5 13.2 10.5 11 14 11L18 11L18 7Z" fill="white"/>
      <path d="M21 7L21 25L34 25L34 21L25 21L25 18L33 18L33 14L25 14L25 11L34 11L34 7Z" fill="white"/>
      <path d="M37 7L37 25L50 25L50 21L41 21L41 7Z" fill="white"/>
      <path d="M54 16C54 10.5 58 7 63 7C68 7 72 10.5 72 16C72 21.5 68 25 63 25C58 25 54 21.5 54 16ZM58.5 16C58.5 19.2 60.5 21 63 21C65.5 21 67.5 19.2 67.5 16C67.5 12.8 65.5 11 63 11C60.5 11 58.5 12.8 58.5 16Z" fill="white"/>
    </svg>
  );
}

// ─── Yardımcı: Adresi kısalt ─────────────────────────────────────────────────
function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────
export function MiniPayWallet({ onPayment }) {
  const {
    address,
    isMiniPay,
    isConnecting,
    balances,
    error,
    connect,
    sendTokenTransfer,
    fetchBalances,
  } = useMiniPayContext();

  const [payAmount, setPayAmount] = useState("");
  const [payTo, setPayTo] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDm");
  const [txStatus, setTxStatus] = useState(null); // null | 'pending' | 'success' | 'error'
  const [txHash, setTxHash] = useState(null);

  // ── Tahmin bedeli öde ───────────────────────────────────────────────────────
  async function handlePay(e) {
    e.preventDefault();
    if (!payAmount || !payTo) return;
    setTxStatus("pending");
    setTxHash(null);
    try {
      const { hash } = await sendTokenTransfer({
        tokenSymbol: selectedToken,
        amount: payAmount,
        to: payTo,
      });
      setTxHash(hash);
      setTxStatus("success");
      onPayment?.({ hash, amount: payAmount, token: selectedToken, to: payTo });
      setPayAmount("");
      setPayTo("");
    } catch (err) {
      console.error(err);
      setTxStatus("error");
    }
  }

  // ── Cüzdan bağlı değil ─────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="minipay-card minipay-connect">
        <div className="mp-logo">
          <CeloLogo size={32} />
          <span>MiniPay</span>
        </div>
        <p className="mp-desc">
          Connect your MiniPay wallet to join Prediction Agent and deposit stablecoins for your predictions.
        </p>
        {error && <p className="mp-error">{error}</p>}
        <button
          className="mp-btn-primary"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting…" : "MiniPay Login"}
        </button>
        <p className="mp-hint">
          If you don't have MiniPay, download for{" "}
          <a
            href="https://play.google.com/store/apps/details?id=com.opera.minipay"
            target="_blank"
            rel="noreferrer"
          >
            Android
          </a>{" "}
          or{" "}
          <a
            href="https://apps.apple.com/app/minipay-easy-global-wallet/id6504087257"
            target="_blank"
            rel="noreferrer"
          >
            iOS
          </a>.
        </p>
      </div>
    );
  }

  // ── Cüzdan bağlı ───────────────────────────────────────────────────────────
  return (
    <div className="minipay-card">
      {/* Başlık */}
      <div className="mp-header">
        <div className="mp-logo">
          <CeloLogo size={24} />
          <span>MiniPay (Celo)</span>
        </div>
        <div className="mp-address" title={address}>
          {shortAddr(address)}
          <span className="mp-badge">MiniPay ✓</span>
        </div>
      </div>

      {/* Bakiyeler */}
      <div className="mp-balances">
        {Object.entries(balances).map(([token, bal]) => (
          <div key={token} className="mp-balance-item">
            <span className="mp-token-name">{token}</span>
            <span className="mp-token-amount">{bal}</span>
          </div>
        ))}
        <button className="mp-refresh" onClick={fetchBalances} title="Refresh">
          ↻
        </button>
      </div>

      {/* Ödeme formu */}
      <form className="mp-pay-form" onSubmit={handlePay}>
        <h4>Deposit for Prediction</h4>

        <label>
          Token
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
          >
            <option value="USDm">USDm</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </label>

        <label>
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 1.00"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Recipient Address
          <input
            type="text"
            placeholder="0x…"
            value={payTo}
            onChange={(e) => setPayTo(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          className="mp-btn-primary"
          disabled={txStatus === "pending"}
        >
          {txStatus === "pending" ? "Sending…" : "Send"}
        </button>
      </form>

      {/* İşlem durumu */}
      {txStatus === "success" && txHash && (
        <p className="mp-tx-success">
          ✅ Success!{" "}
          <a
            href={`https://celoscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Celoscan
          </a>
        </p>
      )}
      {txStatus === "error" && (
        <p className="mp-error">❌ Transaction failed. Try again.</p>
      )}
    </div>
  );
}
