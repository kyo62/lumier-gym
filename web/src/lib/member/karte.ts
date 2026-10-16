/** カルテの表示用の名前（プラン・セッションの種類）。顧客管理ツールと同じ区分 */

export const PLAN_LABELS: Record<string, string> = {
  m4: '月4回',
  m2: '月2回',
  pair4: 'ペア 月4回',
  fam6: '家族割 月6回',
  fam8: '家族割 月8回',
  ticket: '回数券',
  sticket: 'コンディショニングストレッチ 回数券',
  visitor: '都度ビジター',
  online: 'オンライン',
  trial: '初回体験',
};

export const SESSION_TYPE_LABELS: Record<string, string> = {
  regular: '通常セッション',
  trial: '初回体験',
  online: 'オンライン',
  stretch: 'コンディショニングストレッチ',
  visitor: '都度ビジター',
};
