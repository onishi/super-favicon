import SwiftUI
import UIKit

/// iPhone Duo などでシステムが縦バー（ステータス表示などの縦の列）を置く辺。
/// 縦バーがない端末・向き・iOS 27.1 未満では nil
typealias VerticalBarEdge = HorizontalEdge

/// UIKit の `UITraitCollection.verticalBarEdge` を SwiftUI に橋渡しする透明なビュー。
/// SwiftUI には同等の環境値がないため、トレイトの変化を監視してバインディングに書き戻す
struct VerticalBarEdgeReader: UIViewRepresentable {
    @Binding var edge: VerticalBarEdge?

    func makeUIView(context: Context) -> ProbeView {
        let view = ProbeView()
        view.onChange = { edge = $0 }
        return view
    }

    func updateUIView(_ uiView: ProbeView, context: Context) {
        uiView.onChange = { edge = $0 }
    }

    final class ProbeView: UIView {
        var onChange: ((VerticalBarEdge?) -> Void)?

        override init(frame: CGRect) {
            super.init(frame: frame)
            isUserInteractionEnabled = false
            if #available(iOS 27.1, *) {
                registerForTraitChanges(
                    UITraitCollection.systemTraitsAffectingVerticalBarEdge
                ) { (view: ProbeView, _: UITraitCollection) in
                    view.report()
                }
            }
        }

        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            report()
        }

        private func report() {
            let edge = currentEdge
            // SwiftUI の更新サイクル中に State を書き換えないよう次のループで反映する
            DispatchQueue.main.async { [weak self] in
                self?.onChange?(edge)
            }
        }

        private var currentEdge: VerticalBarEdge? {
            guard #available(iOS 27.1, *) else { return nil }
            switch traitCollection.verticalBarEdge {
            case .leading: return .leading
            case .trailing: return .trailing
            default: return nil
            }
        }
    }
}
