// SUPER-FAVICON Viewer bookmarklet
// 実行中のページの favicon を別ウィンドウに巨大表示する。
// favicon の差し替え（アニメーション）に追従するため、親ページ側で
// <link rel="icon"> を 100ms ごとにポーリングして画像を更新し続ける。
// もう一度実行するとウィンドウを閉じる（トグル動作）。
(() => {
  const KEY = '__superFaviconViewer';
  const prev = window[KEY];
  if (prev && prev.win && !prev.win.closed) {
    clearInterval(prev.timer);
    prev.win.close();
    window[KEY] = null;
    return;
  }

  // 最後に宣言されている icon を採用（動的差し替えは同じ link 要素の href を書き換える想定）
  const getIconHref = () => {
    let href = '';
    document.querySelectorAll('link[rel~="icon"]').forEach((l) => {
      if (l.href) href = l.href;
    });
    return href || location.origin + '/favicon.ico';
  };

  const win = window.open('', '_blank', 'width=512,height=560');
  if (!win) {
    alert('ポップアップがブロックされました。このサイトのポップアップを許可してください。');
    return;
  }

  const d = win.document;
  d.title = document.title;
  d.body.style.cssText =
    'margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;';
  const img = d.createElement('img');
  img.style.cssText =
    'width:min(100vw,100vh);height:min(100vw,100vh);image-rendering:pixelated;';
  img.src = getIconHref();
  d.body.appendChild(img);

  const timer = setInterval(() => {
    if (win.closed) {
      clearInterval(timer);
      window[KEY] = null;
      return;
    }
    const href = getIconHref();
    if (img.src !== href) img.src = href;
    if (d.title !== document.title) d.title = document.title;
  }, 100);

  window[KEY] = { win, timer };
})();
