export const metadata = {
  title: "Quotex Signals Dashboard",
  description: "MACD crossover + Momentum signals on 5s candles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
