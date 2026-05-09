import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'submission_returned',
  'submission_approved',
  'new_period',
  'approval_assigned',
  'approval_pending',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

/** Campos comuns no payload disparado pelo trigger / serviços */
export const submissionNotificationPayloadSchema = z
  .object({
    submission_id: z.string().uuid().optional(),
    franchise_id: z.string().uuid().optional(),
    reporting_period_id: z.string().uuid().optional(),
    period_label: z.string().nullable().optional(),
    from_status: z.string().nullable().optional(),
    to_status: z.string().nullable().optional(),
  })
  .passthrough();

export const newPeriodPayloadSchema = z
  .object({
    reporting_period_id: z.string().uuid(),
    period_label: z.string().nullable().optional(),
  })
  .passthrough();

export type NotificationPayload = z.infer<typeof submissionNotificationPayloadSchema> &
  Record<string, unknown>;

export const notificationRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type NotificationRow = z.infer<typeof notificationRowSchema>;
