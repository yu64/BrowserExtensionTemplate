# ブラウザ拡張機能 Template

WXT を使用したブラウザ拡張機能のテンプレート

## 構成

- WXT（Vite）
- TypeScript
- React
- Tailwind CSS
- Vitest
- Playwright
- ESLint
- @webext-core/messaging
- Zod

## 起動

```powershell

npm install
npm run dev

```

## 使い方

- `npm run dev`（VS Code では F5）で開発用の Chrome を起動する。ソースを保存すると、拡張機能が自動で再読み込みされる。
- VS Code の「開発とデバッグ（Chrome）」で起動すると、デバッガーを接続してブレークポイントを使用できる。
- `npm run check` で lint・型検査・単体テストを実行する。
- `npm run e2e` で E2E テストを実行する。
- `npm run build` で `.output/chrome-mv3` にビルドする。
- `proto use` で `.prototools` のバージョンの Node.js を準備できる。

## ライセンス

[MIT](LICENSE)
