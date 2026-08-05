"use client";

// lib/CurrencyContext.tsx
// Provides a `formatMoney(usdAmount)` function to the whole app. All amounts
// are stored in the database in USD; this context converts to the user's
// chosen display currency using a live (or fallback) exchange rate fetched
// from the backend, and formats it with the right symbol.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, isLoggedIn } from "./api";

type CurrencyState = {
  currency: string;
  symbol: string;
  rate: number;
  source: "live" | "fallback" | "loading";
  formatMoney: (usdAmount: number) => string;
  refresh: () => void;
};

const defaultState: CurrencyState = {
  currency: "USD",
  symbol: "$",
  rate: 1,
  source: "loading",
  formatMoney: (n: number) => `$${n.toFixed(2)}`,
  refresh: () => {},
};

const CurrencyContext = createContext<CurrencyState>(defaultState);

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");
  const [rate, setRate] = useState(1);
  const [source, setSource] = useState<"live" | "fallback" | "loading">("loading");

  const refresh = () => {
    if (!isLoggedIn()) return;
    api
      .getCurrencyRate()
      .then((res) => {
        setCurrency(res.currency);
        setSymbol(res.symbol);
        setRate(res.rate);
        setSource(res.source);
      })
      .catch(() => {
        // Stay on USD defaults if this fails -- never break the rest of the app.
        setSource("fallback");
      });
  };

  useEffect(() => {
    refresh();
  }, []);

  const formatMoney = (usdAmount: number) => {
    const converted = usdAmount * rate;
    // JPY and a few others don't use decimal subunits in everyday display.
    const decimals = currency === "JPY" ? 0 : 2;
    return `${symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, rate, source, formatMoney, refresh }}>
      {children}
    </CurrencyContext.Provider>
  );
}
