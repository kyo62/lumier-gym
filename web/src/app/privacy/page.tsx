import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'プライバシーポリシー' };

/**
 * === TODO ===
 * 実際に使用するツール（アクセス解析、メール配信、決済）に合わせて
 * 「第三者提供」「委託先」の記載を調整してください。
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー">
      <section>
        <h2>1. 取得する情報</h2>
        <p>ご予約にあたり、次の情報を取得します。</p>
        <ul>
          <li>お名前、ふりがな</li>
          <li>電話番号、メールアドレス</li>
          <li>現在の身体のお悩み、ご要望などご入力いただいた内容</li>
          <li>ご予約日時、ご利用プラン、ご来店履歴</li>
        </ul>
      </section>

      <section>
        <h2>2. 利用目的</h2>
        <ul>
          <li>ご予約の受付、確認、変更、キャンセルのご連絡</li>
          <li>安全かつ適切な施術を行うための事前確認</li>
          <li>施術記録の作成と、次回以降のご提案</li>
          <li>お問い合わせへの回答</li>
        </ul>
        <p>ご本人の同意なく、上記以外の目的で利用することはありません。</p>
      </section>

      <section>
        <h2>3. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。なお、予約および決済の運用にあたり、予約管理・決済処理を外部のサービス（Square）に委託しています。委託先に対しては、適切な取り扱いがなされるよう必要な監督を行います。
        </p>
      </section>

      <section>
        <h2>4. 安全管理</h2>
        <p>
          お預かりした情報は、アクセス制限を行ったデータベースに保管しています。施術に関する記録は、施術者本人のみが閲覧します。
        </p>
      </section>

      <section>
        <h2>5. 開示・訂正・削除のご請求</h2>
        <p>
          ご自身の情報の開示、訂正、利用停止、削除をご希望の場合は、下記の連絡先までご連絡ください。ご本人であることを確認のうえ、速やかに対応いたします。
        </p>
      </section>

      <section>
        <h2>6. Cookieおよびアクセス解析</h2>
        <p>
          当サイトでは、サービスの改善のためにアクセス解析ツールを使用する場合があります。これらは個人を特定する情報を含みません。ブラウザの設定によりCookieを無効にすることができます。
        </p>
      </section>

      <section>
        <h2>7. お問い合わせ先</h2>
        <p>
          {site.name}
          <br />
          {site.address.prefecture}
          {site.address.city}
          <br />
          {site.email}
        </p>
      </section>
    </LegalPage>
  );
}
