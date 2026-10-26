# Zel Signals

Multi-strategy trading signal app with an AI trade reviewer, packaged as a signed Android APK.

## Flow
1. **Connect** a market data provider (Twelve Data, Alpha Vantage, Yahoo Finance or Binance) and paste its API key.
2. **Choose a market** (forex pair, metal, crypto or stock) and a timeframe (5m, 15m, 1h, 4h, Daily).
3. **Pick one or more strategies** (EMA trend, RSI reversal, MACD momentum, Bollinger bounce, Donchian breakout, Supertrend, Stochastic cross).
4. **Analyze** loads 300 candles, runs every selected strategy and returns BUY, SELL or NO TRADE with Entry, Stop Loss, TP1/TP2/TP3 (1R/2R/3R, stop = 1.5 × ATR14).
5. **AI Analyst** box: add any AI API key (OpenAI, Anthropic Claude, Google Gemini, Groq, OpenRouter, DeepSeek or a custom OpenAI-compatible endpoint). The AI reviews the signal and returns a GOOD / CAUTION / BAD verdict with its bias.

Keys are stored only on the device (localStorage inside the app).

## Project layout
- `src/lib/providers.ts` – market data adapters and candle normalisation
- `src/lib/indicators.ts`, `src/lib/strategies.ts`, `src/lib/analyze.ts` – indicator math, strategy votes, signal and TP/SL engine
- `src/lib/ai.ts` – AI prompt, provider adapters and verdict parsing
- `src/components/` – the screens (connect, market, strategy, result, AI box, candle chart)
- `capacitor.config.ts` – Android wrapper config (native HTTP enabled to bypass CORS)
- `scripts/build-apk.sh` – static export → Capacitor sync → signed Gradle release build
- `releases/ZelSignals-release.apk` – the signed APK produced by the script

## Build the APK
Requirements: JDK 21, Android SDK (platform 36, build-tools 36.0.0). Paths can be overridden with `JAVA_HOME` and `ANDROID_HOME`.

```bash
npm install
bash scripts/build-apk.sh
```

The first run generates a release keystore at `android/app/zel-signals-release.keystore` and its credentials in `android/keystore.properties`. Keep both files safe: they are required to publish updates to the same app.

Install on a device: copy `releases/ZelSignals-release.apk` to the phone, allow installing from unknown sources, and open it.

## Web preview
`npm run build` and `npm start` run the same UI as a Next.js server app (with the `/api/health` route backed by Postgres via Drizzle).

## Disclaimer
Signals are generated from historical candles for education and research. Not financial advice.
