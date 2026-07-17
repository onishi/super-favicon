# SuperFaviconBrowser (Android)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: Web 版の擬似ブラウザUI（`BrowserChrome`）と同じ見た目のタブバー＋アドレスバー
  - 信号機風ドット（赤を押すとホームへ戻る。黄・緑は飾り）と、小さい Favicon＋タイトルのタブ
  - ピル型の URL バー（こちらは編集して Enter で移動できる。https のときは 🔒 を表示）
  - 配色は `src/index.css` の CSS 変数と同じ値で、ライト/ダークモード（values-night）に追従する
- **残り**: WebView によるページ本体（下に引っ張ると再読み込みできる Pull to Refresh 付き）

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）は BitmapFactory でデコードできないため、ページ内で canvas に描いて PNG data URL に変換してから受け取る。

- 起動時のページ: https://super-favicon.com/
- ホーム画面での表示名: SuperFavicon
- Application ID: `com.superfavicon.browser`（super-favicon.com ドメイン由来。Java パッケージにハイフンが使えないため除去）
- 対応 OS: Android 8.0 (API 26)+

## ビルド

JDK 17 と Android SDK（compileSdk 35）が必要。

```sh
cd android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

接続済みの端末/エミュレータへのインストール:

```sh
./gradlew installDebug
```

## 構成ファイル

- `app/src/main/java/com/superfavicon/browser/MainActivity.kt` — WebView の設定、favicon・タイトルのポーリングとデコード、URL バー
- `app/src/main/res/layout/activity_main.xml` — 画面レイアウト（Guideline 50% で上半分を favicon 領域に）
