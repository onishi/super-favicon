# SuperFaviconBrowser (iOS)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: Web 版の擬似ブラウザUI（`BrowserChrome`）と同じ見た目のタブバー＋アドレスバー
  - タブバーは小さい Favicon＋タイトルのタブのみ
  - アドレスバーはホーム/戻る/進むボタン、ピル型の URL バー、再読み込みボタンの並び（戻る/進むが不可のときは薄く無効表示）
  - URL バーは編集して Enter で移動できる。https のときは 🔒 を表示。URL っぽくない入力は Google 検索する
  - URL 編集中はボタンが畳まれて URL バーが全幅に広がり、✕ ボタンで編集をキャンセルできる
  - 配色は `src/index.css` の CSS 変数と同じ値で、ライト/ダークモードに追従する
- **残り**: WKWebView によるページ本体（下に引っ張ると再読み込みできる Pull to Refresh 付き）

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）は UIImage でデコードできないため、ページ内で canvas に描いて PNG data URL に変換してから受け取る。

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

Xcode 27.1（iOS 27.1 SDK）でビルド・動作確認している。ベータ版など別の Xcode を使う場合は `xcode-select` を切り替えずに `DEVELOPER_DIR` で指定できる:

```sh
DEVELOPER_DIR=/Applications/Xcode_27.1_beta.app/Contents/Developer xcodebuild ...
```

## iPhone Duo

iPhone Duo（iOS 27.1 シミュレータ）で動作確認済み。Duo の外側ディスプレイでは、システムが画面の片側に縦バー（ステータス表示などの縦の列）を置く。

- 横の safe area の扱いは SwiftUI の環境値 `toolbarVerticalEdge`（iOS 27.1+）で切り替える。デプロイターゲットが iOS 17 のため `ToolbarVerticalEdgeReader` 経由で読む
- 縦バーがない場合（iPhone 横持ちのノッチ側など）: タブバー背景・アドレスバーの区切り線・WebView を safe area まで伸ばす
- 縦バーがある場合: その辺だけは伸ばさず、Safari と同じく縦バーとの境目に区切り線を引く。縦バー自体は背景色のまま、システムのレールとして扱う
- 縦バーがある場合、ナビゲーションボタンはアドレスバーから縦バーに移す（URL バーは全幅になる）。システムの toolbar に `.axisBehavior(.verticalPreferred)` で置き、上側に戻る・進むのグループと独立した再読み込み（ナビゲーションバーの項目。`ToolbarSpacer(.fixed)` で分ける）、下側にホーム（ボトムバーの項目）を並べる
  - ボトムバーの項目は `ToolbarSpacer` を挟んでも縦バーの下側に寄るため、上側のグループはナビゲーションバーの項目にしている
  - ナビゲーションバーは横方向には何も描かないが、上に safe area を確保するため、favicon 領域だけ上の safe area まで広げている
- ヒンジ（`UIHingeInteraction`）に連動したレイアウト切り替えは行っていない

## 構成ファイル

- `project.yml` — XcodeGen 定義（ターゲット・Info.plist の内容もここで管理）
- `SuperFaviconBrowser/SuperFaviconBrowserApp.swift` — エントリポイント
- `SuperFaviconBrowser/ContentView.swift` — 画面レイアウト（上半分 favicon / タイトル / URL / WebView）
- `SuperFaviconBrowser/BrowserViewModel.swift` — WKWebView の所有、favicon・タイトルのポーリングとデコード
- `SuperFaviconBrowser/WebView.swift` — WKWebView の SwiftUI ラッパー
- `SuperFaviconBrowser/ToolbarVerticalEdgeReader.swift` — iPhone Duo の縦バーの位置（環境値 `toolbarVerticalEdge`）を iOS 27.1 未満でも安全に読むラッパー
- `SuperFaviconBrowser/Assets.xcassets` — アプリアイコン（ロゴのドット絵。Android版とアイコン画像を共有している）。ベクター原本は [`assets/AppIcon.svg`](../assets/AppIcon.svg)

## 制限事項

- 実機で動かす場合は Xcode の Signing でチームを設定すること
