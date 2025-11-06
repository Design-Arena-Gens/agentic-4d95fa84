"use client";

export function SettingsPanel(props: {
  wsUrl: string;
  onWsUrlChange: (v: string) => void;
  symbol: string;
  onSymbolChange: (v: string) => void;
  momentumThreshold: number;
  onMomentumThresholdChange: (v: number) => void;
}) {
  const { wsUrl, onWsUrlChange, symbol, onSymbolChange, momentumThreshold, onMomentumThresholdChange } = props;
  return (
    <div>
      <h3>Settings</h3>
      <div className="controls">
        <input className="input" style={{ minWidth: 280 }} placeholder="WebSocket URL (or 'mock')" value={wsUrl} onChange={e => onWsUrlChange(e.target.value)} />
        <input className="input" placeholder="Symbol" value={symbol} onChange={e => onSymbolChange(e.target.value)} />
        <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Momentum threshold
          <input className="input" type="number" step={0.1} min={0.1} value={momentumThreshold} onChange={e => onMomentumThresholdChange(Number(e.target.value))} style={{ width: 96 }} />
        </label>
        <button className="button" onClick={() => { onWsUrlChange("mock"); }}>Use Mock Feed</button>
      </div>
      <div className="small" style={{ marginTop: 8 }}>
        Provide a Quotex-compatible tick WebSocket that emits price updates. Unknown formats are auto-parsed when possible.
      </div>
    </div>
  );
}
