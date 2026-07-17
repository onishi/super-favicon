import SwiftUI

/// Web版 BrowserChrome（src/index.css / BrowserChrome.css）と同じ配色
enum Theme {
    static let bg = dynamic(light: 0xFFFFFF, dark: 0x16171D)
    static let codeBg = dynamic(light: 0xF4F3EC, dark: 0x1F2028)
    static let border = dynamic(light: 0xE5E4E7, dark: 0x2E303A)
    static let text = dynamic(light: 0x6B6375, dark: 0x9CA3AF)
    static let textHeading = dynamic(light: 0x08060D, dark: 0xF3F4F6)

    static let dotRed = Color(rgb: 0xFF5F57)
    static let dotYellow = Color(rgb: 0xFEBC2E)
    static let dotGreen = Color(rgb: 0x28C840)

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { trait in
            UIColor(rgb: trait.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}

private extension Color {
    init(rgb: UInt32) {
        self.init(uiColor: UIColor(rgb: rgb))
    }
}
