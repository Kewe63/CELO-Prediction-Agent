/**
 * MiniPayPredictionBet.jsx
 *
 * OWS Prediction Agent'taki "tahmin yap" akışını MiniPay ödemeleriyle birleştirir.
 * Kullanım: <MiniPayPredictionBet market={market} onSuccess={callback} />
 */

import { useState } from "react";
import { useMiniPayContext } from "../context/MiniPayProvider";

// Tahmin market sözleşme adresi (deploy ettikten sonra güncelleyin)
const PREDICTION_CONTRACT = import.meta.env.VITE_PREDICTION_CONTRACT || "0x0000000000000000000000000000000000000000";

const PRESETS = [1, 5, 10, 25]; // USD cinsinden hızlı seçenekler

export function MiniPayPredictionBet({ market, onSuccess }) {
  const { address, isMiniPay, balances, sendTokenTransfer, estimateFee, connect } =
    useMiniPayContext();

  const [outcome, setOutcome] = useState(null); // "YES" | "NO"
  const [amount, setAmount] = useState("");
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | estimating | pending | success | error
  const [txHash, setTxHash] = useState(null);

  if (!address) {
    return (
      <div className="mp-bet-connect">
        <p>Connect your wallet to make a prediction.</p>
        <button className="mp-btn-primary" onClick={connect}>
          MiniPay Login
        </button>
      </div>
    );
  }

  // ── Gas tahmini ─────────────────────────────────────────────────────────────
  async function handleEstimate() {
    if (!amount || !outcome) return;
    setStatus("estimating");
    try {
      const fee = await estimateFee({ to: PREDICTION_CONTRACT });
      setEstimatedFee(fee);
    } finally {
      setStatus("idle");
    }
  }

  // ── Tahmin gönder ───────────────────────────────────────────────────────────
  async function handleBet() {
    if (!amount || !outcome || !address) return;
    setStatus("pending");
    setTxHash(null);

    try {
      // USDm ile ödeme — prediction contract adresine gönderilir
      const { hash } = await sendTokenTransfer({
        tokenSymbol: "USDm",
        amount,
        to: PREDICTION_CONTRACT,
      });

      setTxHash(hash);
      setStatus("success");
      onSuccess?.({ hash, market, outcome, amount });
    } catch (err) {
      console.error("Bet error:", err);
      setStatus("error");
    }
  }

  const balanceNum = parseFloat(balances.USDm || "0");
  const amountNum = parseFloat(amount || "0");
  const insufficient = amountNum > balanceNum;

  return (
    <div className="mp-bet-card">
      {/* Market bilgisi */}
      {market && (
        <div className="mp-bet-market">
          <span className="mp-bet-market-label">Market</span>
          <span className="mp-bet-market-title">{market.title || market.id}</span>
        </div>
      )}

      {/* Sonuç seçimi */}
      <div className="mp-bet-outcomes">
        <button
          className={`mp-outcome-btn yes ${outcome === "YES" ? "active" : ""}`}
          onClick={() => setOutcome("YES")}
        >
          ✅ YES
        </button>
        <button
          className={`mp-outcome-btn no ${outcome === "NO" ? "active" : ""}`}
          onClick={() => setOutcome("NO")}
        >
          ❌ NO
        </button>
      </div>

      {/* Miktar */}
      <div className="mp-bet-amount-row">
        <label className="mp-label">Amount (USDm)</label>
        <div className="mp-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`mp-preset ${amount == p ? "active" : ""}`}
              onClick={() => setAmount(String(p))}
            >
              ${p}
            </button>
          ))}
        </div>
        <input
          type="number"
          className="mp-amount-input"
          min="0.01"
          step="0.01"
          placeholder="Custom amount"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setEstimatedFee(null); }}
        />
        <span className="mp-balance-hint">
          Balance: <b>{balances.USDm} USDm</b>
          {isMiniPay && " · MiniPay ✓"}
        </span>
        {insufficient && (
          <span className="mp-error-hint">⚠ Insufficient balance</span>
        )}
      </div>

      {/* Gas tahmini */}
      {estimatedFee !== null && (
        <p className="mp-fee-hint">
          Estimated network fee: ~{estimatedFee} USDm
        </p>
      )}

      {/* Aksiyonlar */}
      <div className="mp-bet-actions">
        <button
          className="mp-btn-secondary"
          onClick={handleEstimate}
          disabled={!amount || !outcome || status !== "idle"}
        >
          Estimate Fee
        </button>
        <button
          className="mp-btn-primary"
          onClick={handleBet}
          disabled={!amount || !outcome || insufficient || status === "pending"}
        >
          {status === "pending" ? "Sending…" : `${outcome || "Select"} → Predict`}
        </button>
      </div>

      {/* Durum */}
      {status === "success" && txHash && (
        <p className="mp-tx-success">
          🎉 Prediction recorded!{" "}
          <a href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            View on Celoscan ↗
          </a>
        </p>
      )}
      {status === "error" && (
        <p className="mp-error">❌ Transaction rejected or failed.</p>
      )}
    </div>
  );
}
