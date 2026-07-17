import SwiftUI
import WebKit

/// WKWebView を所有し、タイトル・URL・favicon をポーリングで追いかけるビューモデル。
/// SUPER-FAVICON はページ側が favicon(data URL) を毎フレーム差し替えてゲーム画面にするため、
/// 一定間隔で link[rel~=icon] を読み直して大きく表示する。
@MainActor
final class BrowserViewModel: NSObject, ObservableObject {
    static let homeURL = URL(string: "https://super-favicon.pages.dev/")!
    private static let pollInterval: TimeInterval = 0.3

    let webView: WKWebView
    private let refreshControl = UIRefreshControl()

    @Published var pageTitle: String = ""
    @Published var urlText: String = ""
    @Published var favicon: UIImage?

    /// URL バー編集中はページ側の URL で上書きしない
    var isEditingURL = false

    private var timer: Timer?
    private var lastFaviconHref: String?

    /// SVG の favicon はネイティブ側（UIImage / BitmapFactory）でデコードできないため、
    /// ページ内で canvas に描いて PNG data URL に変換して返す。変換は画像読み込み待ちで
    /// 非同期になるので、結果をグローバルにキャッシュして次回以降のポーリングで拾う。
    private static let pageInfoJS = """
        (function () {
          var links = document.querySelectorAll('link[rel~="icon"]');
          var href = '';
          if (links.length > 0) {
            href = links[links.length - 1].href;
          } else {
            // about:blank など base URL が不正な間は new URL が例外を投げる
            try { href = new URL('/favicon.ico', location.href).href; } catch (e) {}
          }
          var path = href.split('?')[0].split('#')[0].toLowerCase();
          var icon = href;
          if (href.slice(0, 14).toLowerCase() === 'data:image/svg' || path.slice(-4) === '.svg') {
            var cache = window.__superFaviconSvgPng || (window.__superFaviconSvgPng = {});
            if (cache.src !== href) {
              cache.src = href;
              cache.png = '';
              var img = new Image();
              if (href.slice(0, 5) !== 'data:') img.crossOrigin = 'anonymous';
              img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                canvas.getContext('2d').drawImage(img, 0, 0, 128, 128);
                try {
                  if (cache.src === href) cache.png = canvas.toDataURL('image/png');
                } catch (e) {}
              };
              img.src = href;
            }
            icon = cache.png;
          }
          return JSON.stringify({ title: document.title, icon: icon });
        })()
        """

    override init() {
        webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        super.init()
        webView.allowsBackForwardNavigationGestures = true
        webView.navigationDelegate = self
        refreshControl.addTarget(self, action: #selector(reloadForRefresh), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        webView.load(URLRequest(url: Self.homeURL))
        startPolling()
    }

    /// Pull to Refresh: 現在のページを再読み込みする
    @objc private func reloadForRefresh() {
        if webView.url == nil {
            webView.load(URLRequest(url: Self.homeURL))
        } else {
            webView.reload()
        }
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

    /// data:image/png;base64,... 形式をデコードする（SVG はページ側 JS で PNG に変換済み）
    private static func decodeDataURL(_ href: String) -> UIImage? {
        guard let comma = href.firstIndex(of: ",") else { return nil }
        let meta = href[..<comma]
        guard meta.contains(";base64") else { return nil }
        guard let data = Data(base64Encoded: String(href[href.index(after: comma)...])) else { return nil }
        return UIImage(data: data)
    }
}

extension BrowserViewModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refreshControl.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
    }
}
