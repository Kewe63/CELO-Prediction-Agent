/**
 * MiniPayProvider.jsx
 *
 * Global MiniPay context — tüm uygulama boyunca tek bir wallet bağlantısı sağlar.
 * App.jsx'de en dışa sarın: <MiniPayProvider><App /></MiniPayProvider>
 */

import { createContext, useContext } from "react";
import { useMiniPay } from "../hooks/useMiniPay";

const MiniPayContext = createContext(null);

export function MiniPayProvider({ children }) {
  const wallet = useMiniPay();
  return (
    <MiniPayContext.Provider value={wallet}>
      {children}
    </MiniPayContext.Provider>
  );
}

/** Herhangi bir bileşende: const { address, balances } = useMiniPayContext() */
export function useMiniPayContext() {
  const ctx = useContext(MiniPayContext);
  if (!ctx) throw new Error("useMiniPayContext must be used inside MiniPayProvider");
  return ctx;
}
