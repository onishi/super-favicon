import SwiftUI
import WebKit

/// ビューモデルが所有する WKWebView をそのまま表示するラッパー
struct WebView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView {
        webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
