import { site, allPlans, businessHours } from '@/config/site';

/**
 * schema.org の構造化データ。
 * Googleの地図検索・ナレッジパネルでの表示に効く（名城公園エリアのローカルSEO対策）。
 */
export function LocalBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: site.name,
    alternateName: site.nameKana,
    description: site.description,
    slogan: site.catchphrase,
    url: site.url,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'JP',
      addressRegion: site.address.prefecture,
      addressLocality: site.address.city,
      postalCode: site.address.postalCode,
    },
    openingHours: businessHours.hours,
    priceRange: `¥${Math.min(...allPlans.map((p) => p.price)).toLocaleString()}〜¥${Math.max(
      ...allPlans.map((p) => p.price)
    ).toLocaleString()}`,
    makesOffer: allPlans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.price,
      priceCurrency: 'JPY',
    })),
  };

  return (
    <script
      type="application/ld+json"
      // 値はすべて自分の設定ファイル由来。外部入力は含まれない。
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
