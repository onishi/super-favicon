package com.superfavicon

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONObject
import org.json.JSONTokener
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var faviconView: ImageView
    private lateinit var tabFaviconView: ImageView
    private lateinit var titleView: TextView
    private lateinit var lockView: TextView
    private lateinit var urlView: EditText
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var webView: WebView

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
        swipeRefresh = findViewById(R.id.swipe_refresh)
        webView = findViewById(R.id.web_view)

        // Pull to Refresh: 現在のページを再読み込みする
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        // 赤ドット（Web版の「タイトルへ戻る」に相当）はホームへ戻る
        findViewById<android.view.View>(R.id.dot_home).setOnClickListener {
            webView.loadUrl(HOME_URL)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        webView.webViewClient = object : WebViewClient() {
            override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
                if (!urlView.hasFocus()) {
                    urlView.setText(url)
                }
                lockView.visibility =
                    if (url.startsWith("https://")) android.view.View.VISIBLE else android.view.View.GONE
            }

            override fun onPageFinished(view: WebView, url: String) {
                swipeRefresh.isRefreshing = false
            }
        }

        urlView.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO) {
                navigateTo(urlView.text.toString())
                true
            } else {
                false
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
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
        val url = if (trimmed.contains("://")) trimmed else "https://$trimmed"
        webView.loadUrl(url)
        urlView.clearFocus()
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager)
            .hideSoftInputFromWindow(urlView.windowToken, 0)
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
        private const val HOME_URL = "https://super-favicon.com/"
        private const val POLL_INTERVAL_MS = 300L

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
}
