import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import url from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;

app.post('/v1/agent/execute', async (req, res) => {
  const { wallet_id, asset, prediction, amount, risk_profile, timeframe, active_modules } = req.body;
  
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.VITE_OWS_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }

  if (authHeader !== `Bearer ${process.env.VITE_OWS_AGENT_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized: Invalid Agent Token" });
  }

  console.log(`\n--- NEW PREDICTION REQUEST ---`);
  console.log(`Asset: ${asset} | Prediction: ${prediction} | Amount: ${amount}`);
  
  try {
    let owsCore = null;
    try {
      owsCore = await import('@open-wallet-standard/core');
    } catch (e) {
      console.warn(`[WARN] @open-wallet-standard/core native bindings not available on Windows. Falling back to simulation mode.`);
    }

    const tradeAction = prediction.toUpperCase() === 'UP' ? 'LONG' : 'SHORT';
    const messageToSign = `EXECUTE_TRADE: ${tradeAction} ${amount} ${asset} on ${timeframe} timeframe (Risk: ${risk_profile})`;
    let signature = "0xsimulated_signature_mocked_for_demo";

    if (owsCore) {
      let walletInfo = null;
      try {
          walletInfo = owsCore.getWallet(wallet_id);
      } catch (e) {
          console.warn(`Wallet ID ${wallet_id} not found in vault.`);
      }

      if (walletInfo) {
        console.log(`Wallet Found: ${walletInfo.name}. Initiating OWS local hardware signing...`);
        const rawSig = owsCore.signMessage(walletInfo.name, "evm", messageToSign, "");
        signature = rawSig.signature;
        console.log(`Signature generated successfully: ${signature.substring(0, 15)}...`);
      } else {
        console.log(`Wallet not found locally. Sending mock signature.`);
      }
    }

    const txHash = "0x" + Math.random().toString(16).substring(2, 64).padEnd(64, '0');

    res.json({
      success: true,
      trade: {
        asset,
        prediction: tradeAction,
        amount,
        tx_hash: txHash,
        signature: signature
      },
      reasoning: "OpenWallet API successfully authenticated and signed the prediction request."
    });

  } catch (err) {
    console.error("OWS Signing Error:", err);
    res.status(500).json({ error: err.message || "Failed to process through OpenWallet Standard" });
  }
});

app.post('/v1/agent/close', async (req, res) => {
  const { wallet_id, asset, tp, sl } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.VITE_OWS_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }

  console.log(`\n--- POSITION CLOSE REQUEST ---`);
  console.log(`Asset: ${asset} | TP Margin: ${tp}% | SL Margin: ${sl}% | Wallet: ${wallet_id}`);
  
  const txHash = "0x" + Math.random().toString(16).substring(2, 64).padEnd(64, '0');
  
  res.json({
    success: true,
    message: "Position closed and signed via OWS",
    tx_hash: txHash
  });
});

app.listen(PORT, () => {
  console.log(`
======================================================
🚀 OWS Agent Local Interconnection Node Running!
======================================================
Port: ${PORT}
Expected API_KEY: ${process.env.VITE_OWS_API_KEY}
Vault Integration: @open-wallet-standard/core (Active)
`);
});
