package com.superfavicon

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** 閲覧履歴の1件。URL をキーに1件だけ持ち、再訪したらタイトルと時刻を更新する */
data class HistoryEntry(val url: String, val title: String, val visitedAt: Long) {
    /** 一覧の1行目に出す表示名。タイトルが取れていないページは URL で代替する */
    val displayTitle: String get() = title.ifEmpty { url }
}

/** SharedPreferences に JSON で永続化する閲覧履歴。URL バーの編集中に候補として提示する */
class HistoryStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var entries: List<HistoryEntry> = load()
        private set

    /** 訪問を記録する。同じ URL の既存エントリは先頭に繰り上げる */
    fun record(url: String, title: String) {
        if (url.isEmpty() || url == "about:blank") return
        val existing = entries.firstOrNull { it.url == url }
        // 読み込み直後などタイトルが未取得のときは、以前に取れていたタイトルを捨てない
        val resolvedTitle = title.ifEmpty { existing?.title ?: "" }
        val updated = ArrayList<HistoryEntry>(entries.size + 1)
        updated.add(HistoryEntry(url, resolvedTitle, System.currentTimeMillis()))
        entries.filterTo(updated) { it.url != url }
        entries = updated.take(MAX_ENTRIES)
        save()
    }

    fun remove(url: String) {
        if (entries.none { it.url == url }) return
        entries = entries.filter { it.url != url }
        save()
    }

    fun clear() {
        if (entries.isEmpty()) return
        entries = emptyList()
        save()
    }

    private fun save() {
        val array = JSONArray()
        entries.forEach { entry ->
            array.put(
                JSONObject()
                    .put(KEY_URL, entry.url)
                    .put(KEY_TITLE, entry.title)
                    .put(KEY_VISITED_AT, entry.visitedAt)
            )
        }
        prefs.edit().putString(KEY_ENTRIES, array.toString()).apply()
    }

    private fun load(): List<HistoryEntry> {
        val json = prefs.getString(KEY_ENTRIES, null) ?: return emptyList()
        val array = runCatching { JSONArray(json) }.getOrNull() ?: return emptyList()
        return (0 until array.length()).mapNotNull { index ->
            val item = array.optJSONObject(index) ?: return@mapNotNull null
            val url = item.optString(KEY_URL)
            if (url.isEmpty()) return@mapNotNull null
            HistoryEntry(url, item.optString(KEY_TITLE), item.optLong(KEY_VISITED_AT))
        }
    }

    companion object {
        /** 保持する履歴の上限(古いものから捨てる) */
        const val MAX_ENTRIES = 200

        /** URL バーの下に一度に出す候補の上限 */
        const val SUGGESTION_LIMIT = 20

        private const val PREFS_NAME = "browser_history"
        private const val KEY_ENTRIES = "entries"
        private const val KEY_URL = "url"
        private const val KEY_TITLE = "title"
        private const val KEY_VISITED_AT = "visitedAt"

        /** 入力文字列に合う候補を新しい順に返す。空文字なら最近の履歴をそのまま出す */
        fun suggestions(entries: List<HistoryEntry>, query: String): List<HistoryEntry> {
            val trimmed = query.trim()
            if (trimmed.isEmpty()) return entries.take(SUGGESTION_LIMIT)
            return entries
                .filter {
                    it.url.contains(trimmed, ignoreCase = true) ||
                        it.title.contains(trimmed, ignoreCase = true)
                }
                .take(SUGGESTION_LIMIT)
        }
    }
}
