import SwiftUI

/// 環境値 `toolbarVerticalEdge`（iOS 27.1+）を読んで content に渡す。
/// デプロイターゲットが iOS 17 のため `@Environment` を直接持てないビューから使う。
/// iOS 27.1 未満では縦バーがないものとして nil を渡す
struct ToolbarVerticalEdgeReader<Content: View>: View {
    @ViewBuilder let content: (HorizontalEdge?) -> Content

    var body: some View {
        if #available(iOS 27.1, *) {
            Reader(content: content)
        } else {
            content(nil)
        }
    }

    @available(iOS 27.1, *)
    private struct Reader: View {
        @Environment(\.toolbarVerticalEdge) private var edge
        let content: (HorizontalEdge?) -> Content

        var body: some View {
            content(edge)
        }
    }
}
