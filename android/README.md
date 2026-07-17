# SuperFaviconBrowser (Android)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: ページタイトル（`document.title`）と URL バー（編集して Enter で移動できる）
- **残り**: WebView によるページ本体

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。

- 起動時のページ: https://super-favicon.pages.dev/
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

## 制限事項

- SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）はデコード非対応。JS が動き出して PNG data URL に切り替わると表示される
