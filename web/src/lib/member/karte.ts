/** カルテの表示用の名前。プランは karteRules.ts の PLANS から */
import { PLANS } from './karteRules.ts';

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(Object.entries(PLANS).map(([k, v]) => [k, v.label]));

export const SESSION_TYPE_LABELS: Record<string, string> = {
  regular: '通常セッション',
  trial: '初回体験',
  online: 'オンライン',
  stretch: 'コンディショニングストレッチ',
  visitor: '都度ビジター',
};
