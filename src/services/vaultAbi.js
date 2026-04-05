// PredictionVault — Celo Mainnet 0x940332176188C44069Ee902Ab060d6081f811FB9
export const VAULT_ADDRESS = '0x940332176188C44069Ee902Ab060d6081f811FB9';

export const CUSD       = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
export const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438';

export const VAULT_ABI = [
  // ── Read ────────────────────────────────────────────────────────────────────
  { name: 'owner',          type: 'function', stateMutability: 'view',       inputs: [],                                                                 outputs: [{ type: 'address' }] },
  { name: 'paused',         type: 'function', stateMutability: 'view',       inputs: [],                                                                 outputs: [{ type: 'bool' }] },
  { name: 'isAgent',        type: 'function', stateMutability: 'view',       inputs: [{ name: 'agent', type: 'address' }],                               outputs: [{ type: 'bool' }] },
  { name: 'maxSlippageBps', type: 'function', stateMutability: 'view',       inputs: [],                                                                 outputs: [{ type: 'uint256' }] },
  { name: 'balance',        type: 'function', stateMutability: 'view',       inputs: [{ name: 'token', type: 'address' }],                               outputs: [{ type: 'uint256' }] },

  // ── Write (owner) ────────────────────────────────────────────────────────────
  { name: 'deposit',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],                                                                                                        outputs: [] },
  { name: 'withdraw',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'to', type: 'address' }],                                                                       outputs: [] },
  { name: 'withdrawAll',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }],                                                                                                                                              outputs: [] },
  { name: 'addAgent',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agent', type: 'address' }],                                                                                                                                              outputs: [] },
  { name: 'removeAgent',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agent', type: 'address' }],                                                                                                                                              outputs: [] },
  { name: 'setPaused',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'state', type: 'bool' }],                                                                                                                                                 outputs: [] },
  { name: 'setMaxSlippage', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'bps', type: 'uint256' }],                                                                                                                                                outputs: [] },

  // ── Write (agent) ─────────────────────────────────────────────────────────────
  { name: 'executeSwap',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },

  // ── Events ────────────────────────────────────────────────────────────────────
  { name: 'Deposited',      type: 'event', inputs: [{ name: 'token', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'Withdrawn',      type: 'event', inputs: [{ name: 'token', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'to', type: 'address', indexed: false }] },
  { name: 'AgentAdded',     type: 'event', inputs: [{ name: 'agent', type: 'address', indexed: true }] },
  { name: 'AgentRemoved',   type: 'event', inputs: [{ name: 'agent', type: 'address', indexed: true }] },
  { name: 'SwapExecuted',   type: 'event', inputs: [{ name: 'agent', type: 'address', indexed: true }, { name: 'tokenIn', type: 'address', indexed: false }, { name: 'tokenOut', type: 'address', indexed: false }, { name: 'amountIn', type: 'uint256', indexed: false }, { name: 'amountOut', type: 'uint256', indexed: false }] },
  { name: 'PausedState',    type: 'event', inputs: [{ name: 'state', type: 'bool', indexed: false }] },
];

// ERC20 approve ABI (deposit öncesi gerekli)
export const ERC20_ABI = [
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                     outputs: [{ type: 'uint256' }] },
  { name: 'decimals',  type: 'function', stateMutability: 'view',       inputs: [],                                                                          outputs: [{ type: 'uint8' }] },
];
