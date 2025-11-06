"use client";
import { useEffect, useRef } from "react";
import { createChart, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { Candle, Signal } from "@/lib/types";

export function CandlestickChart({ candles, signals }: { candles: Candle[]; signals: Signal[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#121826" }, textColor: "#e5edf5" },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      grid: { horzLines: { color: "#1f2a3a" }, vertLines: { color: "#1f2a3a" } },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#17c964",
      downColor: "#f31260",
      borderUpColor: "#17c964",
      borderDownColor: "#f31260",
      wickUpColor: "#17c964",
      wickDownColor: "#f31260",
    });
    seriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data = candles.map(c => ({
      time: (Math.floor(c.time / 1000) as unknown) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    seriesRef.current.setData(data);
  }, [candles]);

  useEffect(() => {
    if (!seriesRef.current) return;
    // place markers at candle times for signals
    const markers = signals.map(s => ({
      time: (Math.floor(s.candleTime / 1000) as unknown) as UTCTimestamp,
      position: s.side === "UP" ? "belowBar" : "aboveBar",
      color: s.side === "UP" ? "#17c964" : "#f31260",
      shape: s.side === "UP" ? "arrowUp" : "arrowDown",
      text: s.side,
    }));
    seriesRef.current.setMarkers(markers);
  }, [signals]);

  return <div ref={containerRef} style={{ width: "100%", height: 456 }} />;
}
