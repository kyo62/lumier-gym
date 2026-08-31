import { z } from 'zod';
import { menus } from '@/config/site';

const menuIds = menus.map((m) => m.id) as [string, ...string[]];

export const bookingInputSchema = z.object({
  menuId: z.enum(menuIds),
  /** 予約開始時刻（ISO 8601） */
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(1, 'お名前を入力してください').max(60),
  kana: z.string().trim().max(60).optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(10, '電話番号を正しく入力してください')
    .max(20)
    .regex(/^[0-9+\-() ]+$/, '電話番号は数字とハイフンで入力してください'),
  email: z.email('メールアドレスを正しく入力してください').max(120),
  concern: z.string().trim().max(1000).optional().or(z.literal('')),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
  agreed: z.literal(true, { message: '利用規約への同意が必要です' }),
  turnstileToken: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const overrideInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(['closed', 'open']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    note: z.string().max(200).optional(),
  })
  .refine((v) => v.kind !== 'open' || (v.startTime && v.endTime), {
    message: '臨時営業は開始時刻と終了時刻の指定が必要です',
    path: ['startTime'],
  })
  .refine((v) => !v.startTime || !v.endTime || v.startTime < v.endTime, {
    message: '終了時刻は開始時刻より後にしてください',
    path: ['endTime'],
  });

export const businessHourInputSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: '終了時刻は開始時刻より後にしてください',
    path: ['endTime'],
  });

export const blockInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    reason: z.string().max(200).optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: '終了時刻は開始時刻より後にしてください',
    path: ['endTime'],
  });
