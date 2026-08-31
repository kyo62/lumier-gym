import { site, menus, defaultBusinessHours } from '@/config/site';

const SCHEMA_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

/**
 * schema.org の LocalBusiness 構造化データ。
 * Googleの地図検索・ナレッジパネルでの表示に効く（名古屋市北区でのローカルSEO対策）。
 */
export function LocalBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.tel,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'JP',
      addressRegion: site.address.prefecture,
      addressLocality: site.address.city,
      postalCode: site.address.postalCode,
    },
    openingHoursSpecification: defaultBusinessHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[h.weekday],
      opens: h.startTime,
      closes: h.endTime,
    })),
    priceRange: `¥${Math.min(...menus.map((m) => m.price)).toLocaleString()}〜¥${Math.max(
      ...menus.map((m) => m.price)
    ).toLocaleString()}`,
    makesOffer: menus.map((m) => ({
      '@type': 'Offer',
      name: m.name,
      price: m.price,
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
