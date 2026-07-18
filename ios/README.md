# SuperFaviconBrowser (iOS)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: Web 版の擬似ブラウザUI（`BrowserChrome`）と同じ見た目のタブバー＋アドレスバー
  - 信号機風ドット（赤を押すとホームへ戻る。黄・緑は飾り）と、小さい Favicon＋タイトルのタブ
  - ピル型の URL バー（こちらは編集して Enter で移動できる。https のときは 🔒 を表示）
  - 配色は `src/index.css` の CSS 変数と同じ値で、ライト/ダークモードに追従する
- **残り**: WKWebView によるページ本体（下に引っ張ると再読み込みできる Pull to Refresh 付き）

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）は UIImage でデコードできないため、ページ内で canvas に描いて PNG data URL に変換してから受け取る。

- 起動時のページ: https://super-favicon.com/
- ホーム画面での表示名: SuperFavicon
- Bundle ID: `com.superfavicon.browser`（super-favicon.com ドメイン由来。ハイフンは ID に使えないため除去）
- 対応 OS: iOS 17.0+

## ビルド

Xcode プロジェクトは [XcodeGen](https://github.com/yonaskolb/XcodeGen) で生成する（生成済みの `.xcodeproj` もコミットしてある）。

```sh
cd ios
xcodegen generate            # project.yml から SuperFaviconBrowser.xcodeproj を再生成
open SuperFaviconBrowser.xcodeproj
```

コマンドラインでシミュレータ向けにビルドする場合:

```sh
xcodebuild -project SuperFaviconBrowser.xcodeproj \
  -scheme SuperFaviconBrowser \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

## 構成ファイル

- `project.yml` — XcodeGen 定義（ターゲット・Info.plist の内容もここで管理）
- `SuperFaviconBrowser/SuperFaviconBrowserApp.swift` — エントリポイント
- `SuperFaviconBrowser/ContentView.swift` — 画面レイアウト（上半分 favicon / タイトル / URL / WebView）
- `SuperFaviconBrowser/BrowserViewModel.swift` — WKWebView の所有、favicon・タイトルのポーリングとデコード
- `SuperFaviconBrowser/WebView.swift` — WKWebView の SwiftUI ラッパー
- `SuperFaviconBrowser/Assets.xcassets` — アプリアイコン（地球儀のドット絵。`scripts/generate-app-icons.py` で生成）

## 制限事項

- 実機で動かす場合は Xcode の Signing でチームを設定すること
