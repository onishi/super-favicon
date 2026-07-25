import SwiftUI

struct ContentView: View {
    @StateObject private var model = BrowserViewModel()
    @FocusState private var urlFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            faviconArea
                .frame(maxHeight: .infinity)
            tabBar
            toolbar
            // URL 編集中は履歴を WebView に重ねて出す（WebView を外すと favicon の
            // アニメーションが止まってしまうため、入れ替えではなく上に載せる）
            ZStack(alignment: .top) {
                WebView(webView: model.webView)
                if urlFieldFocused {
                    historyPanel
                }
            }
            .frame(maxHeight: .infinity)
        }
        .background(Theme.bg)
        .onChange(of: urlFieldFocused) { _, focused in
            model.isEditingURL = focused
            // 編集を始めた直後は現在の URL がそのまま入っているので、絞り込まず最近の履歴を出す
            model.urlTextEdited = false
        }
        .onChange(of: model.urlText) { _, _ in
            // 編集中のポーリング更新は止めているため、この変化はユーザーの入力によるもの
            if urlFieldFocused {
                model.urlTextEdited = true
            }
        }
    }

    /// バーの上側いっぱいに favicon をドット絵のまま（補間なしで）拡大表示する
    private var faviconArea: some View {
        Group {
            if let favicon = model.favicon {
                Image(uiImage: favicon)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "globe")
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(8)
    }

    /// Web版 BrowserChrome のタブバー: favicon 付きタブ
    private var tabBar: some View {
        HStack(alignment: .bottom, spacing: 10) {
            tab

            Spacer(minLength: 0)
        }
        .padding(.top, 10)
        .padding(.horizontal, 12)
        .background(Theme.codeBg)
    }

    private var tab: some View {
        HStack(spacing: 6) {
            if let favicon = model.favicon {
                Image(uiImage: favicon)
                    .interpolation(.none)
                    .resizable()
                    .frame(width: 16, height: 16)
            }
            Text(model.pageTitle)
                .font(.system(size: 13))
                .foregroundStyle(Theme.textHeading)
                .lineLimit(1)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 14)
        .background(
            Theme.bg,
            in: UnevenRoundedRectangle(topLeadingRadius: 8, topTrailingRadius: 8)
        )
    }

    /// Web版 BrowserChrome のアドレスバー: ナビゲーションボタン + ピル型の URL 表示（編集可能）。
    /// URL 編集中はボタンを畳んでピルを全幅に広げる
    private var toolbar: some View {
        HStack(spacing: 6) {
            if !urlFieldFocused {
                toolbarButton("house", label: "ホームへ戻る") {
                    model.goHome()
                }
                toolbarButton("chevron.backward", label: "戻る") {
                    model.goBack()
                }
                .disabled(!model.canGoBack)
                .opacity(model.canGoBack ? 1 : 0.3)
                toolbarButton("chevron.forward", label: "進む") {
                    model.goForward()
                }
                .disabled(!model.canGoForward)
                .opacity(model.canGoForward ? 1 : 0.3)
            }

            urlPill
                .frame(maxWidth: .infinity)

            if urlFieldFocused {
                // キャンセル: 編集を破棄して元の URL 表示に戻す（ポーリングが上書きしてくれる）
                toolbarButton("xmark", label: "入力をキャンセル") {
                    urlFieldFocused = false
                }
            } else {
                toolbarButton("arrow.clockwise", label: "再読み込み") {
                    model.reload()
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: urlFieldFocused)
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Theme.bg)
        .overlay(alignment: .bottom) {
            Theme.border.frame(height: 1)
        }
    }

    private var urlPill: some View {
        HStack(spacing: 6) {
            if model.urlText.hasPrefix("https://") {
                Text("🔒")
                    .font(.system(size: 11))
            }
            TextField("URL を入力", text: $model.urlText)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.center)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.go)
                .focused($urlFieldFocused)
                .onSubmit {
                    model.navigate(to: model.urlText)
                    urlFieldFocused = false
                }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 12)
        .background(Theme.codeBg, in: Capsule())
    }

    /// URL 編集中に出す閲覧履歴の一覧。タップでそのページへ移動、スワイプで1件削除できる
    private var historyPanel: some View {
        VStack(spacing: 0) {
            HStack {
                Text("履歴")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.text)
                Spacer()
                if !model.historyEntries.isEmpty {
                    Button("すべて削除") {
                        model.clearHistory()
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.accent)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Theme.codeBg)

            if model.historySuggestions.isEmpty {
                Text(model.historyEntries.isEmpty ? "履歴はまだありません" : "一致する履歴はありません")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text)
                    .padding(16)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            } else {
                List {
                    ForEach(model.historySuggestions) { entry in
                        Button {
                            model.navigate(to: entry.url)
                            urlFieldFocused = false
                        } label: {
                            historyRow(entry)
                        }
                        .listRowBackground(Theme.bg)
                    }
                    .onDelete { offsets in
                        model.deleteHistorySuggestions(at: offsets)
                    }
                }
                .listStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.bg)
    }

    private func historyRow(_ entry: HistoryEntry) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.displayTitle)
                .font(.system(size: 13))
                .foregroundStyle(Theme.textHeading)
                .lineLimit(1)
            Text(entry.url)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Theme.text)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func toolbarButton(
        _ systemName: String, label: String, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.text)
                .frame(width: 28, height: 28)
        }
        .accessibilityLabel(label)
    }
}

#Preview {
    ContentView()
}
