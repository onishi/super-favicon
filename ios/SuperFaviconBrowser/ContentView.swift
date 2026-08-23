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
            WebView(webView: model.webView)
                .frame(maxHeight: .infinity)
                .overlay(alignment: .top) {
                    if urlFieldFocused {
                        historyPanel
                            .shadow(color: .black.opacity(0.12), radius: 10, y: 4)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: urlFieldFocused)
        }
        .background(Theme.bg)
        .onChange(of: urlFieldFocused) { _, focused in
            model.isEditingURL = focused
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

    private var historyPanel: some View {
        let suggestions = Array(model.historySuggestions(for: model.urlText).prefix(8))
        return VStack(spacing: 0) {
            HStack {
                Label("履歴", systemImage: "clock.arrow.circlepath")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.textHeading)
                Spacer()
                Button("消去") {
                    model.clearHistory()
                }
                .font(.system(size: 12))
                .foregroundStyle(Theme.text)
                .disabled(model.browsingHistory.isEmpty)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 9)

            Divider()
                .overlay(Theme.border)

            if suggestions.isEmpty {
                Text(model.browsingHistory.isEmpty ? "履歴はまだありません" : "一致する履歴はありません")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 16)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(suggestions) { entry in
                            HStack(spacing: 0) {
                                Button {
                                    model.navigate(to: entry.url)
                                    urlFieldFocused = false
                                } label: {
                                    HStack(spacing: 10) {
                                        Image(systemName: "clock")
                                            .font(.system(size: 12))
                                            .foregroundStyle(Theme.text)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(entry.title)
                                                .font(.system(size: 13, weight: .medium))
                                                .foregroundStyle(Theme.textHeading)
                                                .lineLimit(1)
                                            Text(entry.url)
                                                .font(.system(size: 11, design: .monospaced))
                                                .foregroundStyle(Theme.text)
                                                .lineLimit(1)
                                        }
                                        Spacer(minLength: 0)
                                    }
                                    .contentShape(Rectangle())
                                    .padding(.leading, 14)
                                    .padding(.vertical, 8)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(entry.title)、\(entry.url)")

                                Button {
                                    withAnimation(.easeOut(duration: 0.16)) {
                                        model.removeHistory(url: entry.url)
                                    }
                                } label: {
                                    Image(systemName: "trash")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.text)
                                        .frame(width: 44, height: 44)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(entry.title)を履歴から削除")
                            }

                            if entry.id != suggestions.last?.id {
                                Divider()
                                    .padding(.leading, 36)
                                    .overlay(Theme.border)
                            }
                        }
                    }
                }
                .frame(maxHeight: 190)
            }
        }
        .background(Theme.bg)
        .overlay(alignment: .bottom) {
            Theme.border.frame(height: 1)
        }
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
