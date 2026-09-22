package com.superfavicon

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.util.Base64
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var faviconView: ImageView
    private lateinit var tabFaviconView: ImageView
    private lateinit var titleView: TextView
    private lateinit var lockView: TextView
    private lateinit var urlView: EditText
    private lateinit var homeButton: ImageButton
    private lateinit var backButton: ImageButton
    private lateinit var forwardButton: ImageButton
    private lateinit var reloadButton: ImageButton
    private lateinit var cancelEditButton: ImageButton
    private lateinit var historyPanel: View
    private lateinit var historyList: LinearLayout
    private lateinit var historyEmptyView: TextView
    private lateinit var clearHistoryButton: Button
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var webView: WebView
    private val browsingHistory = mutableListOf<HistoryEntry>()

    private val handler = Handler(Looper.getMainLooper())
    private val faviconExecutor = Executors.newSingleThreadExecutor()

    /** 直前に表示した favicon の href。同じものを何度もデコードしないためのキャッシュキー */
    private var lastFaviconHref: String? = null

    private val pollFavicon = object : Runnable {
        override fun run() {
            webView.evaluateJavascript(PAGE_INFO_JS) { result -> onPageInfo(result) }
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        faviconView = findViewById(R.id.favicon_view)
        tabFaviconView = findViewById(R.id.tab_favicon_view)
        titleView = findViewById(R.id.title_view)
        lockView = findViewById(R.id.lock_view)
        urlView = findViewById(R.id.url_view)
        homeButton = findViewById(R.id.btn_home)
        backButton = findViewById(R.id.btn_back)
        forwardButton = findViewById(R.id.btn_forward)
        reloadButton = findViewById(R.id.btn_reload)
        cancelEditButton = findViewById(R.id.btn_cancel_edit)
        historyPanel = findViewById(R.id.history_panel)
        historyList = findViewById(R.id.history_list)
        historyEmptyView = findViewById(R.id.history_empty)
        clearHistoryButton = findViewById(R.id.btn_clear_history)
        swipeRefresh = findViewById(R.id.swipe_refresh)
        webView = findViewById(R.id.web_view)
        loadHistory()

        // Pull to Refresh: 現在のページを再読み込みする
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        homeButton.setOnClickListener {
            webView.loadUrl(HOME_URL)
        }
        backButton.setOnClickListener {
            webView.goBack()
        }
        forwardButton.setOnClickListener {
            webView.goForward()
        }
        reloadButton.setOnClickListener {
            webView.reload()
        }

        // 編集を破棄して元の URL 表示に戻す
        cancelEditButton.setOnClickListener {
            exitUrlEditing()
        }
        clearHistoryButton.setOnClickListener {
            clearHistory()
        }

        // URL 編集中はナビゲーションボタンを畳んでピルを全幅に広げ、キャンセルボタンだけ出す
        urlView.setOnFocusChangeListener { _, hasFocus ->
            val visibility = if (hasFocus) android.view.View.GONE else android.view.View.VISIBLE
            homeButton.visibility = visibility
            backButton.visibility = visibility
            forwardButton.visibility = visibility
            reloadButton.visibility = visibility
            cancelEditButton.visibility =
                if (hasFocus) android.view.View.VISIBLE else android.view.View.GONE
            historyPanel.visibility = if (hasFocus) View.VISIBLE else View.GONE
            if (hasFocus) {
                renderHistory(urlView.text.toString())
            }
            if (!hasFocus) {
                // 編集途中の文字列を捨てて現在のページの URL に戻す
                urlView.setText(webView.url ?: "")
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // 通常の WebView UA を保ったまま、Web 側がアプリ内表示を識別できるトークンを末尾に加える。
            userAgentString = "$userAgentString $APP_USER_AGENT"
        }
        webView.webViewClient = object : WebViewClient() {
            override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
                if (!urlView.hasFocus()) {
                    urlView.setText(url)
                }
                lockView.visibility =
                    if (url.startsWith("https://")) android.view.View.VISIBLE else android.view.View.GONE
                updateNavButtons()
            }

            override fun onPageFinished(view: WebView, url: String) {
                swipeRefresh.isRefreshing = false
                updateNavButtons()
                recordHistory(url, view.title)
            }
        }

        urlView.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {
                if (urlView.hasFocus()) renderHistory(text?.toString().orEmpty())
            }
            override fun afterTextChanged(text: Editable?) = Unit
        })

        urlView.setOnEditorActionListener { _, actionId, event ->
            // 物理キーボード(Bluetooth・エミュレータ)の Enter は IME_ACTION_GO ではなく
            // KeyEvent として届くため、両方を拾う
            val isEnterKey = event != null &&
                event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN
            if (actionId == EditorInfo.IME_ACTION_GO || isEnterKey) {
                navigateTo(urlView.text.toString())
                true
            } else {
                false
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (urlView.hasFocus()) {
                    // IME を閉じた後の戻る操作では URL 編集を終了してボタンを戻す
                    exitUrlEditing()
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl(HOME_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
        updateNavButtons()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        handler.post(pollFavicon)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(pollFavicon)
    }

    override fun onDestroy() {
        faviconExecutor.shutdown()
        super.onDestroy()
    }

    private fun navigateTo(input: String) {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) return
        val url = destinationUrl(trimmed)
        webView.loadUrl(url)
        exitUrlEditing()
        // フォーカス喪失時の復元で読み込み前の URL に戻ってしまうため、遷移先を明示する
        urlView.setText(url)
    }

    /** URL バーの編集を終了する（フォーカスを外して IME を閉じる） */
    private fun exitUrlEditing() {
        urlView.clearFocus()
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager)
            .hideSoftInputFromWindow(urlView.windowToken, 0)
    }

    /** 戻る/進むの可否に合わせてボタンの有効状態と濃さを更新する */
    private fun updateNavButtons() {
        backButton.isEnabled = webView.canGoBack()
        backButton.alpha = if (webView.canGoBack()) 1f else 0.3f
        forwardButton.isEnabled = webView.canGoForward()
        forwardButton.alpha = if (webView.canGoForward()) 1f else 0.3f
    }

    /** 保存済みの閲覧履歴を読み込む。壊れたデータは空の履歴として扱う */
    private fun loadHistory() {
        val json = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
            .getString(HISTORY_KEY, null) ?: return
        val entries = runCatching {
            val array = JSONArray(json)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.getJSONObject(index)
                    add(
                        HistoryEntry(
                            url = item.getString("url"),
                            title = item.getString("title"),
                            visitedAt = item.getLong("visitedAt"),
                        )
                    )
                }
            }
        }.getOrNull() ?: return
        browsingHistory.addAll(entries)
    }

    /** 読み込み完了した http(s) ページを新しい順で保存し、同じ URL は最新の1件にまとめる */
    private fun recordHistory(url: String, title: String?) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) return
        val displayTitle = title?.trim().takeUnless { it.isNullOrEmpty() }
            ?: runCatching { URL(url).host }.getOrNull().orEmpty().ifEmpty { url }
        browsingHistory.removeAll { it.url == url }
        browsingHistory.add(0, HistoryEntry(url, displayTitle, System.currentTimeMillis()))
        if (browsingHistory.size > MAX_HISTORY_COUNT) {
            browsingHistory.subList(MAX_HISTORY_COUNT, browsingHistory.size).clear()
        }
        persistHistory()
        if (urlView.hasFocus()) renderHistory(urlView.text.toString())
    }

    private fun persistHistory() {
        val array = JSONArray()
        browsingHistory.forEach { entry ->
            array.put(
                JSONObject()
                    .put("url", entry.url)
                    .put("title", entry.title)
                    .put("visitedAt", entry.visitedAt)
            )
        }
        getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
            .edit()
            .putString(HISTORY_KEY, array.toString())
            .apply()
    }

    private fun clearHistory() {
        browsingHistory.clear()
        getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
            .edit()
            .remove(HISTORY_KEY)
            .apply()
        renderHistory(urlView.text.toString())
    }

    private fun removeHistory(url: String) {
        browsingHistory.removeAll { it.url == url }
        persistHistory()
        renderHistory(urlView.text.toString())
    }

    /** URL バーの入力に合わせて、タイトルまたは URL が一致する履歴候補を最大8件表示する */
    private fun renderHistory(input: String) {
        val query = input.trim()
        val suggestions = browsingHistory
            .asSequence()
            .filter {
                query.isEmpty() || query == webView.url ||
                    it.title.contains(query, ignoreCase = true) ||
                    it.url.contains(query, ignoreCase = true)
            }
            .take(MAX_VISIBLE_HISTORY_COUNT)
            .toList()

        historyList.removeAllViews()
        clearHistoryButton.isEnabled = browsingHistory.isNotEmpty()
        clearHistoryButton.alpha = if (browsingHistory.isNotEmpty()) 1f else 0.4f
        historyEmptyView.text = getString(
            if (browsingHistory.isEmpty()) R.string.history_empty else R.string.history_no_match
        )
        historyEmptyView.visibility = if (suggestions.isEmpty()) View.VISIBLE else View.GONE
        suggestions.forEach { entry ->
            historyList.addView(createHistoryRow(entry))
        }
    }

    private fun createHistoryRow(entry: HistoryEntry): View {
        val density = resources.displayMetrics.density
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(
                LinearLayout(this@MainActivity).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER_VERTICAL
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f,
                    )
                    isClickable = true
                    isFocusable = true
                    background = ContextCompat.getDrawable(
                        this@MainActivity,
                        android.R.drawable.list_selector_background
                    )
                    setPadding(
                        (14 * density).toInt(),
                        (8 * density).toInt(),
                        0,
                        (8 * density).toInt(),
                    )
                    contentDescription = "${entry.title}、${entry.url}"
                    setOnClickListener {
                        navigateTo(entry.url)
                    }
                    addView(TextView(this@MainActivity).apply {
                        text = entry.title
                        textSize = 13f
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.browser_text_h))
                        maxLines = 1
                        ellipsize = android.text.TextUtils.TruncateAt.END
                    })
                    addView(TextView(this@MainActivity).apply {
                        text = entry.url
                        textSize = 11f
                        typeface = android.graphics.Typeface.MONOSPACE
                        setTextColor(ContextCompat.getColor(this@MainActivity, R.color.browser_text))
                        maxLines = 1
                        ellipsize = android.text.TextUtils.TruncateAt.END
                    })
                }
            )
            addView(ImageButton(this@MainActivity).apply {
                layoutParams = LinearLayout.LayoutParams(
                    (44 * density).toInt(),
                    (44 * density).toInt(),
                )
                background = ContextCompat.getDrawable(
                    this@MainActivity,
                    android.R.drawable.list_selector_background
                )
                setImageResource(R.drawable.ic_delete)
                imageTintList = ContextCompat.getColorStateList(
                    this@MainActivity,
                    R.color.browser_text
                )
                contentDescription = getString(R.string.delete_history_description, entry.title)
                setOnClickListener {
                    removeHistory(entry.url)
                }
            })
        }
    }

    /** evaluateJavascript の結果（JSON文字列リテラル）からタイトルと favicon href を取り出す */
    private fun onPageInfo(result: String?) {
        val jsonText = JSONTokener(result ?: return).nextValue() as? String ?: return
        val info = runCatching { JSONObject(jsonText) }.getOrNull() ?: return

        val title = info.optString("title")
        if (title.isNotEmpty() && titleView.text.toString() != title) {
            titleView.text = title
        }

        val href = info.optString("icon")
        if (href.isEmpty() || href == lastFaviconHref) return
        lastFaviconHref = href
        loadFavicon(href)
    }

    private fun loadFavicon(href: String) {
        if (href.startsWith("data:")) {
            decodeDataUrl(href)?.let { showFavicon(it) }
            return
        }
        faviconExecutor.execute {
            val bitmap = runCatching { fetchBitmap(href) }.getOrNull() ?: return@execute
            runOnUiThread {
                // 取得中にページ側の favicon が切り替わっていたら捨てる
                if (lastFaviconHref == href) showFavicon(bitmap)
            }
        }
    }

    private fun decodeDataUrl(href: String): Bitmap? {
        val comma = href.indexOf(',')
        if (comma < 0) return null
        val meta = href.substring(0, comma)
        if (!meta.contains(";base64")) return null // base64 以外の data URL は非対応（SVG はページ側 JS で PNG に変換済み）
        return runCatching {
            val bytes = Base64.decode(href.substring(comma + 1), Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        }.getOrNull()
    }

    private fun fetchBitmap(href: String): Bitmap? {
        val connection = URL(href).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.inputStream.use { BitmapFactory.decodeStream(it) }
        } finally {
            connection.disconnect()
        }
    }

    /** 32x32 のドット絵が滲まないよう、ニアレストネイバー（フィルタなし）で拡大表示する */
    private fun showFavicon(bitmap: Bitmap) {
        faviconView.setImageDrawable(
            BitmapDrawable(resources, bitmap).apply { setFilterBitmap(false) }
        )
        tabFaviconView.setImageDrawable(
            BitmapDrawable(resources, bitmap).apply { setFilterBitmap(false) }
        )
    }

    companion object {
        /**
         * URL らしい入力はそのまま（スキームがなければ https:// を補って）開き、
         * それ以外は Google 検索の URL にする
         */
        fun destinationUrl(input: String): String {
            if (input.contains("://")) return input
            val host = input.takeWhile { it != '/' && it != '?' && it != '#' }
            val looksLikeUrl = input.none { it.isWhitespace() } &&
                (host.contains(".") || host == "localhost" || host.startsWith("localhost:"))
            if (looksLikeUrl) return "https://$input"
            return "https://www.google.com/search?q=" + URLEncoder.encode(input, "UTF-8")
        }

        private const val HOME_URL = "https://super-favicon.com/"
        private const val POLL_INTERVAL_MS = 300L
        private const val PREFERENCES_NAME = "browser"
        private const val HISTORY_KEY = "browsing_history"
        private const val MAX_HISTORY_COUNT = 100
        private const val MAX_VISIBLE_HISTORY_COUNT = 8
        private val APP_USER_AGENT = "FaviconExplorer/${BuildConfig.VERSION_NAME}"

        /**
         * ページから document.title と favicon の href を取り出す。
         * favicon はページ側で動的に差し替えられるため、最後に現れた link[rel~=icon] を採用し、
         * 見つからなければ /favicon.ico にフォールバックする。
         * SVG の favicon は BitmapFactory でデコードできないため、ページ内で canvas に描いて
         * PNG data URL に変換して返す。変換は画像読み込み待ちで非同期になるので、
         * 結果をグローバルにキャッシュして次回以降のポーリングで拾う。
         */
        private val PAGE_INFO_JS = """
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
        """.trimIndent()
    }

    private data class HistoryEntry(
        val url: String,
        val title: String,
        val visitedAt: Long,
    )
}
