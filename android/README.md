# SuperFaviconBrowser (Android)

SUPER-FAVICON 専用のブラウザアプリ。画面の上半分に現在のページの Favicon をデカデカと表示するため、「Favicon がゲーム画面」という SUPER-FAVICON のコンセプトを巨大画面で遊べる。

## 画面構成

- **上半分**: 現在のページの Favicon（`link[rel~="icon"]`）を補間なし（ニアレストネイバー）で拡大表示。32x32 のドット絵が滲まずに表示される
- **中央**: Web 版の擬似ブラウザUI（`BrowserChrome`）と同じ見た目のタブバー＋アドレスバー
  - タブバーは小さい Favicon＋タイトルのタブのみ
  - アドレスバーはホーム/戻る/進むボタン、ピル型の URL バー、再読み込みボタンの並び（戻る/進むが不可のときは薄く無効表示）
  - URL バーは編集して Enter で移動できる。https のときは 🔒 を表示。URL っぽくない入力は Google 検索する
  - URL 編集中はボタンが畳まれて URL バーが全幅に広がり、✕ ボタン（または端末の戻る操作）で編集をキャンセルできる
  - 配色は `src/index.css` の CSS 変数と同じ値で、ライト/ダークモード（values-night）に追従する
- **残り**: WebView によるページ本体（下に引っ張ると再読み込みできる Pull to Refresh 付き）

Favicon とタイトルはページ側で動的に書き換えられる（SUPER-FAVICON はこれでゲーム画面をアニメーションさせる）ため、300ms 間隔で JavaScript を評価してポーリングし、data URL の favicon をその場でデコードして表示する。SVG の favicon（例: SUPER-FAVICON の初期表示 `favicon.svg`）は BitmapFactory でデコードできないため、ページ内で canvas に描いて PNG data URL に変換してから受け取る。

WebView は通常の User-Agent の末尾に `FaviconExplorer/<version>` を追加する。SUPER-FAVICON の Web 側はこのトークンを検出すると、ネイティブ側と重複する擬似タブバー・URLバーを表示しない。

- 起動時のページ: https://super-favicon.com/
- ホーム画面での表示名: SuperFavicon
- Application ID: `com.superfavicon`（super-favicon.com ドメイン由来。Java パッケージにハイフンが使えないため除去）
- 対応 OS: Android 8.0 (API 26)+

## ビルド

JDK 17 と Android SDK（compileSdk 35）が必要。デフォルトの JDK が 17 以外の場合は `JAVA_HOME` で指定する（例: Homebrew の場合 `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew …`）。

```sh
cd android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

接続済みの端末/エミュレータへのインストール:

```sh
./gradlew installDebug
```

## リリースビルド(AAB)

Play Console へアップロードする署名付き AAB を作る。

```sh
cd android
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab
```

### 署名の仕組み

- Google Play の **Play App Signing** を使う前提。ここで署名するのは「アップロードキー」で、アプリ署名キーは Google が管理する
- 署名情報は `android/keystore.properties`(git 管理外)から読む。ファイルがない場合は署名なしでビルドされる
- `versionCode` は git のコミット数(`git rev-list --count HEAD`)から自動採番される

## 構成ファイル

- `app/src/main/java/com/superfavicon/MainActivity.kt` — WebView の設定、favicon・タイトルのポーリングとデコード、URL バー
- `app/src/main/res/layout/activity_main.xml` — 画面レイアウト（Guideline 50% で上半分を favicon 領域に）
- `app/src/main/res/drawable-*dpi/ic_launcher_foreground.png` / `ic_launcher_background.png` — アプリアイコン。iOS版 `ios/SuperFaviconBrowser/Assets.xcassets/AppIcon.appiconset/icon.png` と同じロゴ画像から、adaptive icon 用に「F」のドット絵部分（foreground、セーフゾーン内に収まるよう縮小）とグリッド背景（background、フルブリード）に分離して密度別に書き出したもの
