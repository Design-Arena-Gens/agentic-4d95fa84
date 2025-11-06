"use client";
import "./globals.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickChart } from "@/components/CandlestickChart";
import { SignalBadge } from "@/components/SignalBadge";
import { SettingsPanel } from "@/components/SettingsPanel";
import { aggregateTickToCandle } from "@/lib/aggregator";
import { computeMacdAndMomentum, findLatestSignal } from "@/lib/indicators";
import type { Candle, Signal, Tick } from "@/lib/types";

export default function Page() {
  const [wsUrl, setWsUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("wsUrl") ?? "mock";
  });
  const [symbol, setSymbol] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("symbol") ?? "OTC-EURUSD";
  });
  const [momentumThreshold, setMomentumThreshold] = useState<number>(() => {
    if (typeof window === "undefined") return 0.5;
    const v = Number(localStorage.getItem("momentumThreshold"));
    return Number.isFinite(v) && v > 0 ? v : 0.5;
  });
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const latestPriceRef = useRef<number>(100);
  const wsRef = useRef<WebSocket | null>(null);
  const mockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("wsUrl", wsUrl);
  }, [wsUrl]);
  useEffect(() => {
    localStorage.setItem("symbol", symbol);
  }, [symbol]);
  useEffect(() => {
    localStorage.setItem("momentumThreshold", String(momentumThreshold));
  }, [momentumThreshold]);

  // Data feed
  useEffect(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }

    if (wsUrl === "mock" || wsUrl.trim() === "") {
      // generate mock ticks at 10/s
      const start = Date.now();
      let t = 0;
      latestPriceRef.current = latestPriceRef.current || 100;
      mockTimerRef.current = window.setInterval(() => {
        t += 0.1;
        const base = 100 + 2 * Math.sin((Date.now() - start) / 4000);
        const noise = (Math.random() - 0.5) * 0.2;
        const price = base + noise;
        latestPriceRef.current = price;
        const tick: Tick = { symbol, price, ts: Date.now() };
        setCandles(prev => aggregateTickToCandle(prev, tick, 5000));
      }, 100);
      return () => {
        if (mockTimerRef.current) clearInterval(mockTimerRef.current);
      };
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        // Try a few common subscribe shapes; ignore if backend doesn't require
        const subs = [
          { action: "subscribe", symbol },
          { type: "subscribe", channels: [{ name: "ticks", symbols: [symbol] }] },
          { event: "subscribe", channel: "ticks", symbol },
        ];
        subs.forEach(msg => ws.send(JSON.stringify(msg)));
      };
      ws.onmessage = (ev) => {
        // Try to parse common tick shapes
        try {
          const data = JSON.parse(ev.data);
          const msgs = Array.isArray(data) ? data : [data];
          for (const m of msgs) {
            const price = m.price ?? m.p ?? m.last ?? m.close ?? m.c;
            const ts = m.ts ?? m.timestamp ?? m.t ?? Date.now();
            const sym = m.symbol ?? m.s ?? symbol;
            if (typeof price === "number") {
              const tick: Tick = { symbol: sym, price, ts: typeof ts === "number" ? ts : Date.now() };
              latestPriceRef.current = price;
              setCandles(prev => aggregateTickToCandle(prev, tick, 5000));
            }
          }
        } catch {
          // raw price line?
          const maybe = Number(ev.data);
          if (Number.isFinite(maybe)) {
            const tick: Tick = { symbol, price: maybe, ts: Date.now() };
            latestPriceRef.current = maybe;
            setCandles(prev => aggregateTickToCandle(prev, tick, 5000));
          }
        }
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
      return () => {
        try { ws.close(); } catch {}
      };
    } catch {
      // fallback to mock if WebSocket failed
      const id = window.setInterval(() => {
        const price = (latestPriceRef.current || 100) * (1 + (Math.random() - 0.5) * 0.001);
        latestPriceRef.current = price;
        const tick: Tick = { symbol, price, ts: Date.now() };
        setCandles(prev => aggregateTickToCandle(prev, tick, 5000));
      }, 100);
      mockTimerRef.current = id;
      return () => clearInterval(id);
    }
  }, [wsUrl, symbol]);

  // Recompute indicators and signals when candles update
  const { macdLine, signalLine, histogram, momentum } = useMemo(() => {
    const closes = candles.map(c => c.close);
    return computeMacdAndMomentum(closes);
  }, [candles]);

  useEffect(() => {
    if (candles.length < 35) return;
    const sig = findLatestSignal(candles, macdLine, signalLine, momentum, momentumThreshold);
    if (sig) {
      setSignals(prev => [sig, ...prev].slice(0, 200));
    }
  }, [candles, macdLine, signalLine, momentum, momentumThreshold]);

  const latestSignal = signals[0] ?? null;

  return (
    <div className="container">
      <div className="heading">
        <h1>Quotex Signals Dashboard</h1>
        <SignalBadge signal={latestSignal} />
      </div>

      <div className="grid">
        <div className="card" style={{ minHeight: 480 }}>
          <CandlestickChart candles={candles} signals={signals.slice(0, 50)} />
        </div>
        <div className="card">
          <SettingsPanel
            wsUrl={wsUrl}
            onWsUrlChange={setWsUrl}
            symbol={symbol}
            onSymbolChange={setSymbol}
            momentumThreshold={momentumThreshold}
            onMomentumThresholdChange={setMomentumThreshold}
          />
          <div style={{ height: 12 }} />
          <h3>Recent Signals</h3>
          <ul className="list">
            {signals.map((s, idx) => (
              <li key={idx} className="row">
                <span className={`badge ${s.side === "UP" ? "up" : s.side === "DOWN" ? "down" : "neutral"}`}>
                  <span className="signal-title">{s.side}</span>
                </span>
                <span className="small">{new Date(s.ts).toLocaleTimeString()} ? {s.reason}</span>
              </li>
            ))}
          </ul>
          <div className="footer small">Signals are informational only. No guarantees.</div>
        </div>
      </div>
    </div>
  );
}
