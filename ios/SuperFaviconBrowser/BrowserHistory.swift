import Foundation

/// 閲覧履歴の1件。URL をキーに1件だけ持ち、再訪したらタイトルと時刻を更新する
struct HistoryEntry: Codable, Identifiable, Equatable {
    let url: String
    var title: String
    var visitedAt: Date

    var id: String { url }

    /// 一覧の1行目に出す表示名。タイトルが取れていないページは URL で代替する
    var displayTitle: String { title.isEmpty ? url : title }
}

/// UserDefaults に JSON で永続化する閲覧履歴。URL バーの編集中に候補として提示する
final class BrowserHistory {
    /// 保持する履歴の上限（古いものから捨てる）
    static let maxEntries = 200
    /// URL バーの下に一度に出す候補の上限
    static let suggestionLimit = 20

    private static let storageKey = "browserHistory"

    private let defaults: UserDefaults
    private(set) var entries: [HistoryEntry]

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        entries = Self.load(from: defaults)
    }

    /// 訪問を記録する。同じ URL の既存エントリは先頭に繰り上げる
    func record(url: String, title: String) {
        guard !url.isEmpty, url != "about:blank" else { return }
        let existing = entries.first { $0.url == url }
        // 読み込み直後などタイトルが未取得のときは、以前に取れていたタイトルを捨てない
        let resolvedTitle = title.isEmpty ? (existing?.title ?? "") : title
        var updated = entries.filter { $0.url != url }
        updated.insert(HistoryEntry(url: url, title: resolvedTitle, visitedAt: Date()), at: 0)
        entries = Array(updated.prefix(Self.maxEntries))
        save()
    }

    func remove(urls: Set<String>) {
        guard !urls.isEmpty else { return }
        entries = entries.filter { !urls.contains($0.url) }
        save()
    }

    func clear() {
        guard !entries.isEmpty else { return }
        entries = []
        save()
    }

    /// 入力文字列に合う候補を新しい順に返す。空文字なら最近の履歴をそのまま出す
    static func suggestions(from entries: [HistoryEntry], query: String) -> [HistoryEntry] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return Array(entries.prefix(suggestionLimit)) }
        let matched = entries.filter {
            $0.url.localizedCaseInsensitiveContains(trimmed)
                || $0.title.localizedCaseInsensitiveContains(trimmed)
        }
        return Array(matched.prefix(suggestionLimit))
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }

    private static func load(from defaults: UserDefaults) -> [HistoryEntry] {
        guard let data = defaults.data(forKey: storageKey),
              let entries = try? JSONDecoder().decode([HistoryEntry].self, from: data)
        else { return [] }
        return entries
    }
}
