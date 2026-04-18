import { useState, useEffect, useCallback } from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  formatEther,
  getContract,
  encodeFunctionData,
  parseUnits,
} from "viem";
import { celo, celoSepolia } from "viem/chains";

// ─── Sabitler ────────────────────────────────────────────────────────────────
const IS_TESTNET = import.meta.env.VITE_USE_TESTNET === "true";
const CHAIN = IS_TESTNET ? celoSepolia : celo;

// Mainnet stablecoin adresleri
const TOKEN_ADDRESSES = {
  USDm: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  USDT: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
};

// Minimal ERC20 ABI (balance + transfer)
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMiniPay() {
  const [address, setAddress] = useState(null);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balances, setBalances] = useState({ USDm: "0", USDC: "0", USDT: "0" });
  const [walletClient, setWalletClient] = useState(null);
  const [publicClient, setPublicClient] = useState(null);
  const [error, setError] = useState(null);

  // ── Cüzdana bağlan ──────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!window?.ethereum) {
      setError("Ethereum provider not found.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const miniPay = window.ethereum.isMiniPay !== undefined ? Boolean(window.ethereum.isMiniPay) : true;
      setIsMiniPay(miniPay);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      });

      const userAddress = accounts[0];
      setAddress(userAddress);

      const wc = createWalletClient({
        chain: CHAIN,
        transport: custom(window.ethereum),
      });

      const pc = createPublicClient({
        chain: CHAIN,
        transport: http(),
      });

      setWalletClient(wc);
      setPublicClient(pc);

      // Bakiye çek
      await fetchBalances(userAddress, pc);
    } catch (err) {
      setError(err.message || "Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Bakiye getir ────────────────────────────────────────────────────────────
  const fetchBalances = useCallback(async (userAddr, pc) => {
    if (!userAddr || !pc) return;

    const results = {};
    for (const [symbol, tokenAddr] of Object.entries(TOKEN_ADDRESSES)) {
      try {
        const contract = getContract({ abi: ERC20_ABI, address: tokenAddr, client: pc });
        const raw = await contract.read.balanceOf([userAddr]);
        // USDm → 18 decimal, USDC/USDT → 6 decimal
        const decimals = symbol === "USDm" ? 18 : 6;
        results[symbol] = (Number(raw) / 10 ** decimals).toFixed(4);
      } catch {
        results[symbol] = "0";
      }
    }
    setBalances(results);
  }, []);

  // ── Token transfer (tahmin bedeli ödemek için) ──────────────────────────────
  const sendTokenTransfer = useCallback(
    async ({ tokenSymbol = "USDm", amount, to }) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error("Wallet not connected.");
      }

      const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
      const decimals = tokenSymbol === "USDm" ? 18 : 6;

      const hash = await walletClient.sendTransaction({
        account: address,
        to: tokenAddress,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [to, parseUnits(`${Number(amount)}`, decimals)],
        }),
        // MiniPay sadece legacy tx destekler; feeCurrency USDm ile ödenir
        feeCurrency: TOKEN_ADDRESSES.USDm,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") throw new Error("Transaction failed.");

      // Bakiyeleri güncelle
      await fetchBalances(address, publicClient);

      return { hash, receipt };
    },
    [walletClient, publicClient, address, fetchBalances]
  );

  // ── Gas tahmini ─────────────────────────────────────────────────────────────
  const estimateFee = useCallback(
    async ({ to, value = "0x0", data = "0x" }) => {
      if (!publicClient || !address) return "0";

      try {
        const gasLimit = await publicClient.estimateGas({
          account: address,
          to,
          value,
          data,
          feeCurrency: TOKEN_ADDRESSES.USDm,
        });

        const gasPriceHex = await publicClient.request({
          method: "eth_gasPrice",
          params: [TOKEN_ADDRESSES.USDm],
        });

        const gasPrice = BigInt(gasPriceHex);
        const feeWei = gasLimit * gasPrice;
        return formatEther(feeWei); // USDm cinsinden yaklaşık ücret
      } catch {
        return "< 0.001";
      }
    },
    [publicClient, address]
  );

  // ── Otomatik bağlan ───────────────────────────────────────
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    address,
    isMiniPay,
    isConnecting,
    balances,
    error,
    connect,
    sendTokenTransfer,
    estimateFee,
    walletClient,
    fetchBalances: () => fetchBalances(address, publicClient),
    TOKEN_ADDRESSES,
    CHAIN,
  };
}
