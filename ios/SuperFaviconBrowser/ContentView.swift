import SwiftUI

struct ContentView: View {
    var body: some View {
        ToolbarVerticalEdgeReader { edge in
            // 縦バーにナビゲーションボタンを置くにはシステムの toolbar が必要なため NavigationStack で包む
            NavigationStack {
                BrowserView(toolbarVerticalEdge: edge)
            }
        }
    }
}

private struct BrowserView: View {
    /// iPhone Duo などでシステムが縦バー（ステータス表示などの縦の列）を置く辺。縦バーがなければ nil
    let toolbarVerticalEdge: HorizontalEdge?

    @StateObject private var model = BrowserViewModel()
    @FocusState private var urlFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            faviconArea
                .frame(maxHeight: .infinity)
                // 縦バーのボタンを置くためのナビゲーションバーは横方向には何も描かないが、
                // 上に safe area を確保してしまうので、操作のない favicon 領域だけそこまで広げる
                .ignoresSafeArea(.container, edges: showsVerticalBar ? .top : [])
            tabBar
            toolbar
            // 横・下の safe area（横持ちのノッチ側やホームインジケータ）まで WebView を広げる。
            // コンテンツの逃がしは WKWebView 自身が safe area を見て行う
            WebView(webView: model.webView)
                .frame(maxHeight: .infinity)
                .ignoresSafeArea(.container, edges: bleedEdges.union(.bottom))
        }
        .overlay(alignment: toolbarVerticalEdge == .leading ? .leading : .trailing) {
            // Safari と同じく、縦バーとの境目に区切り線を引く
            if toolbarVerticalEdge != nil {
                Theme.border.frame(width: 1)
                    .ignoresSafeArea(.container, edges: .vertical)
            }
        }
        .background(Theme.bg)
        .modifier(VerticalBarToolbar(model: model, isEnabled: showsVerticalBar))
        // 縦バーがないときは従来どおり自前のアドレスバーだけを使い、ナビゲーションバーは出さない
        .toolbar(showsVerticalBar ? .automatic : .hidden, for: .navigationBar)
        .onChange(of: urlFieldFocused) { _, focused in
            model.isEditingURL = focused
        }
    }

    /// ナビゲーションボタンをアドレスバーではなく縦バーに置くか
    private var showsVerticalBar: Bool {
        toolbarVerticalEdge != nil
    }

    /// バー背景や WebView を横の safe area まで伸ばす辺。
    /// iPhone Duo の縦バーはシステムのレールとして扱い、その辺だけは伸ばさない
    private var bleedEdges: Edge.Set {
        switch toolbarVerticalEdge {
        case .leading: .trailing
        case .trailing: .leading
        case nil: .horizontal
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
        .background(Theme.codeBg, ignoresSafeAreaEdges: bleedEdges.union(.vertical))
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
    /// URL 編集中や、ボタンを縦バーに置いているときはボタンを畳んでピルを全幅に広げる
    private var toolbar: some View {
        HStack(spacing: 6) {
            if !urlFieldFocused && !showsVerticalBar {
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
            } else if !showsVerticalBar {
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
            // タブバーの背景と同じく横の safe area まで区切り線を伸ばす
            Theme.border.frame(height: 1)
                .ignoresSafeArea(.container, edges: bleedEdges)
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

/// iPhone Duo の縦バーにナビゲーションボタンを置く。
/// 上側に戻る・進む・再読み込み、下側にホームを並べる（Safari の縦バーと同じ上下の分け方）
private struct VerticalBarToolbar: ViewModifier {
    @ObservedObject var model: BrowserViewModel
    let isEnabled: Bool

    func body(content: Content) -> some View {
        if #available(iOS 27.1, *) {
            content.toolbar {
                if isEnabled {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button("戻る", systemImage: "chevron.backward") {
                            model.goBack()
                        }
                        .disabled(!model.canGoBack)
                        Button("進む", systemImage: "chevron.forward") {
                            model.goForward()
                        }
                        .disabled(!model.canGoForward)
                        Button("再読み込み", systemImage: "arrow.clockwise") {
                            model.reload()
                        }
                    }
                    .axisBehavior(.verticalPreferred)

                    ToolbarItem(placement: .bottomBar) {
                        Button("ホームへ戻る", systemImage: "house") {
                            model.goHome()
                        }
                    }
                    .axisBehavior(.verticalPreferred)
                }
            }
        } else {
            content
        }
    }
}

#Preview {
    ContentView()
}
