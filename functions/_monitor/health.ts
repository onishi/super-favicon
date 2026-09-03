/**
 * monitor.wagaya.org 向けの共通ヘルスチェック規格（Monitor Health Check Protocol v1）に
 * 沿ったレスポンスを返す Pages Function。仕様: https://github.com/onishi/monitor/blob/main/SPEC.md#22
 *
 * このプロジェクトはCloudflare Pages（静的サイト + Pages Functions）で配信しており、
 * サーバー側の状態を持たないため web チェックのみ。
 */
export const onRequestGet = (): Response => {
  const now = new Date().toISOString();

  const body = {
    protocol_version: "1.0",
    service: { id: "super-favicon", name: "SUPER-FAVICON", environment: "production" },
    generated_at: now,
    status: "ok",
    checks: [
      {
        id: "web-root",
        type: "web",
        name: "Pages Functions応答",
        status: "ok",
        message: "Pages Functionsが応答しました",
        checked_at: now,
      },
    ],
    alert_urls: [
      {
        label: "Cloudflare Pages ダッシュボード",
        url: "https://dash.cloudflare.com/?to=/:account/pages/view/super-favicon",
      },
      { label: "GitHub リポジトリ", url: "https://github.com/onishi/super-favicon" },
    ],
  };

  return Response.json(body, { status: 200 });
};
