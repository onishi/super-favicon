import SwiftUI
import WebKit

/// WKWebView を所有し、タイトル・URL・favicon をポーリングで追いかけるビューモデル。
/// SUPER-FAVICON はページ側が favicon(data URL) を毎フレーム差し替えてゲーム画面にするため、
/// 一定間隔で link[rel~=icon] を読み直して大きく表示する。
@MainActor
final class BrowserViewModel: ObservableObject {
    static let homeURL = URL(string: "https://super-favicon.pages.dev/")!
    private static let pollInterval: TimeInterval = 0.3

    let webView: WKWebView

    @Published var pageTitle: String = ""
    @Published var urlText: String = ""
    @Published var favicon: UIImage?

    /// URL バー編集中はページ側の URL で上書きしない
    var isEditingURL = false

    private var timer: Timer?
    private var lastFaviconHref: String?

    private static let pageInfoJS = """
        (function () {
          var links = document.querySelectorAll('link[rel~="icon"]');
          var href = links.length > 0
            ? links[links.length - 1].href
            : new URL('/favicon.ico', location.href).href;
          return JSON.stringify({ title: document.title, icon: href });
        })()
        """

    init() {
        webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: Self.homeURL))
        startPolling()
    }

    /// 赤ドット（Web版の「タイトルへ戻る」に相当）: ホームへ戻る
    func goHome() {
        webView.load(URLRequest(url: Self.homeURL))
    }

    func navigate(to input: String) {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let urlString = trimmed.contains("://") ? trimmed : "https://\(trimmed)"
        guard let url = URL(string: urlString) else { return }
        webView.load(URLRequest(url: url))
    }

    private func startPolling() {
        timer = Timer.scheduledTimer(withTimeInterval: Self.pollInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.poll()
            }
        }
    }

    private func poll() {
        if !isEditingURL, let url = webView.url {
            let text = url.absoluteString
            if urlText != text { urlText = text }
        }
        webView.evaluateJavaScript(Self.pageInfoJS) { [weak self] result, _ in
            guard let self, let jsonText = result as? String else { return }
            Task { @MainActor in
                self.apply(pageInfoJSON: jsonText)
            }
        }
    }

    private func apply(pageInfoJSON: String) {
        guard let data = pageInfoJSON.data(using: .utf8),
              let info = try? JSONSerialization.jsonObject(with: data) as? [String: String]
        else { return }

        if let title = info["title"], !title.isEmpty, title != pageTitle {
            pageTitle = title
        }

        guard let href = info["icon"], !href.isEmpty, href != lastFaviconHref else { return }
        lastFaviconHref = href
        loadFavicon(href: href)
    }

    private func loadFavicon(href: String) {
        if href.hasPrefix("data:") {
            if let image = Self.decodeDataURL(href) {
                favicon = image
            }
            return
        }
        guard let url = URL(string: href) else { return }
        Task { [weak self] in
            guard let (data, _) = try? await URLSession.shared.data(from: url),
                  let image = UIImage(data: data)
            else { return }
            await MainActor.run {
                guard let self, self.lastFaviconHref == href else { return }
                self.favicon = image
            }
        }
    }

    /// data:image/png;base64,... 形式をデコードする（SVG など base64 以外は非対応）
    private static func decodeDataURL(_ href: String) -> UIImage? {
        guard let comma = href.firstIndex(of: ",") else { return nil }
        let meta = href[..<comma]
        guard meta.contains(";base64") else { return nil }
        guard let data = Data(base64Encoded: String(href[href.index(after: comma)...])) else { return nil }
        return UIImage(data: data)
    }
}
