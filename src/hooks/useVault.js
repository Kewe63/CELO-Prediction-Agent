// ─── useVault — PredictionVault Celo Mainnet Hook ────────────────────────────
import { useState, useCallback } from 'react';
import {
  createPublicClient,
  http,
  parseEther,
  formatEther,
} from 'viem';
import { celo } from 'viem/chains';
import { VAULT_ADDRESS, VAULT_ABI, ERC20_ABI, CUSD, CELO_TOKEN } from '../services/vaultAbi';

export const vaultPublicClient = createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org'),
});

export function useVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vaultBalances, setVaultBalances] = useState({ cUSD: '—', CELO: '—' });

  // ── Vault bakiyelerini getir ────────────────────────────────────────────────
  const fetchVaultBalances = useCallback(async () => {
    try {
      const [cusdBal, celoBal] = await Promise.all([
        vaultPublicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'balance', args: [CUSD] }),
        vaultPublicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'balance', args: [CELO_TOKEN] }),
      ]);
      setVaultBalances({
        cUSD: parseFloat(formatEther(cusdBal)).toFixed(4),
        CELO: parseFloat(formatEther(celoBal)).toFixed(4),
      });
    } catch (e) {
      console.warn('[useVault] fetchVaultBalances:', e.message);
    }
  }, []);

  // ── Para yatır (approve + deposit) ─────────────────────────────────────────
  const deposit = useCallback(async (tokenSymbol, amountStr, walletClient, address) => {
    setLoading(true); setError(null);
    try {
      const tokenAddr = tokenSymbol === 'CELO' ? CELO_TOKEN : CUSD;
      const amount = parseEther(amountStr);

      const approveTx = await walletClient.writeContract({
        account: address, address: tokenAddr, abi: ERC20_ABI,
        functionName: 'approve', args: [VAULT_ADDRESS, amount],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: approveTx });

      const depositTx = await walletClient.writeContract({
        account: address, address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'deposit', args: [tokenAddr, amount],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: depositTx });

      await fetchVaultBalances();
      return { hash: depositTx };
    } catch (e) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchVaultBalances]);

  // ── Tümünü çek ─────────────────────────────────────────────────────────────
  const withdrawAll = useCallback(async (tokenSymbol, walletClient, address) => {
    setLoading(true); setError(null);
    try {
      const tokenAddr = tokenSymbol === 'CELO' ? CELO_TOKEN : CUSD;
      const tx = await walletClient.writeContract({
        account: address, address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'withdrawAll', args: [tokenAddr],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: tx });
      await fetchVaultBalances();
      return { hash: tx };
    } catch (e) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchVaultBalances]);

  // ── Agent ekle ─────────────────────────────────────────────────────────────
  const addAgent = useCallback(async (agentAddress, walletClient, address) => {
    setLoading(true); setError(null);
    try {
      const tx = await walletClient.writeContract({
        account: address, address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'addAgent', args: [agentAddress],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: tx });
      return { hash: tx };
    } catch (e) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Agent kaldır ────────────────────────────────────────────────────────────
  const removeAgent = useCallback(async (agentAddress, walletClient, address) => {
    setLoading(true); setError(null);
    try {
      const tx = await walletClient.writeContract({
        account: address, address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'removeAgent', args: [agentAddress],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: tx });
      return { hash: tx };
    } catch (e) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Pause / Unpause ─────────────────────────────────────────────────────────
  const setPaused = useCallback(async (state, walletClient, address) => {
    setLoading(true); setError(null);
    try {
      const tx = await walletClient.writeContract({
        account: address, address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'setPaused', args: [state],
      });
      await vaultPublicClient.waitForTransactionReceipt({ hash: tx });
      return { hash: tx };
    } catch (e) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Agent durumu kontrol ────────────────────────────────────────────────────
  const checkIsAgent = useCallback(async (agentAddr) => {
    try {
      return await vaultPublicClient.readContract({
        address: VAULT_ADDRESS, abi: VAULT_ABI,
        functionName: 'isAgent', args: [agentAddr],
      });
    } catch { return false; }
  }, []);

  return {
    loading, error, vaultBalances,
    fetchVaultBalances, deposit, withdrawAll,
    addAgent, removeAgent, setPaused, checkIsAgent,
    VAULT_ADDRESS, CUSD, CELO_TOKEN,
  };
}
