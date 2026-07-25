# SuperFaviconBrowser (iOS)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: Web 版の擬似ブラウザUI（`BrowserChrome`）と同じ見た目のタブバー＋アドレスバー
  - タブバーは小さい Favicon＋タイトルのタブのみ
  - アドレスバーはホーム/戻る/進むボタン、ピル型の URL バー、再読み込みボタンの並び（戻る/進むが不可のときは薄く無効表示）
  - URL バーは編集して Enter で移動できる。https のときは 🔒 を表示。URL っぽくない入力は Google 検索する
  - URL 編集中はボタンが畳まれて URL バーが全幅に広がり、✕ ボタンで編集をキャンセルできる
  - URL 編集中は WebView の上に閲覧履歴の一覧が重なって出る（履歴機能。詳細は下記）
  - 配色は `src/index.css` の CSS 変数と同じ値で、ライト/ダークモードに追従する
- **残り**: WKWebView によるページ本体（下に引っ張ると再読み込みできる Pull to Refresh 付き）

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）は UIImage でデコードできないため、ページ内で canvas に描いて PNG data URL に変換してから受け取る。

## URL バーの履歴

URL バーをタップして編集を始めると、WebView に重ねて閲覧履歴の一覧が出る。編集を終える（✕ / 移動）と閉じる。WebView を画面から外すと favicon のアニメーションが止まってしまうため、表示の入れ替えではなく重ね表示にしている。

- 履歴はページの読み込み完了時（`didFinish`）に「URL + タイトル + 時刻」で記録する。同じ URL は1件にまとめて先頭へ繰り上げ、最大 200 件まで保持する（`UserDefaults` に JSON で永続化）
  - SUPER-FAVICON はスコア表示のためタイトルを常時書き換えるが、記録するのは読み込み完了時点のタイトルのみ（`[100] ドットフラップ` のようなスコア付きタイトルは残らない）
  - ページ内の履歴操作（SPA の pushState によるゲーム選択など）は記録しない
- 一覧は新しい順に最大 20 件。URL バーに文字を入力すると、URL とタイトルの部分一致（大文字小文字を無視）で絞り込む。編集を始めた直後（現在の URL がそのまま入っている状態）は絞り込まずに最近の履歴を出す
- 行をタップするとその URL へ移動する。行を左スワイプで1件削除、ヘッダの「すべて削除」で全消去できる

WKWebView は通常の User-Agent の末尾に `FaviconExplorer/<version>` を追加する。SUPER-FAVICON の Web 側はこのトークンを検出すると、ネイティブ側と重複する擬似タブバー・URLバーを表示しない。

- 起動時のページ: https://super-favicon.com/
- ホーム画面での表示名: SuperFavicon
- Bundle ID: `com.superfavicon`（super-favicon.com ドメイン由来。ハイフンは ID に使えないため除去）
- 対応 OS: iOS 17.0+

## ビルド

Xcode プロジェクトは [XcodeGen](https://github.com/yonaskolb/XcodeGen) で生成する。`.xcodeproj` は生成物のためコミットせず、`project.yml` を管理する（`brew install xcodegen` でインストール）。

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
- `SuperFaviconBrowser/BrowserViewModel.swift` — WKWebView の所有、favicon・タイトルのポーリングとデコード、履歴の記録
- `SuperFaviconBrowser/BrowserHistory.swift` — 閲覧履歴の保持・永続化（UserDefaults）と候補の絞り込み
- `SuperFaviconBrowser/WebView.swift` — WKWebView の SwiftUI ラッパー
- `SuperFaviconBrowser/Assets.xcassets` — アプリアイコン（ロゴのドット絵。Android版とアイコン画像を共有している）。ベクター原本は [`assets/AppIcon.svg`](../assets/AppIcon.svg)

## 制限事項

- 実機で動かす場合は Xcode の Signing でチームを設定すること
