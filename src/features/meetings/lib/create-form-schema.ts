import { z } from 'zod';

import { isAlignedToSlot, isClockTime, SLOT_MINUTE_OPTIONS, toMinutes } from './time';

export const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    timezone: z.string().trim().min(1, 'Timezone is required'),
    slotMinutes: z.coerce
      .number()
      .refine(value => SLOT_MINUTE_OPTIONS.includes(value as (typeof SLOT_MINUTE_OPTIONS)[number]), {
        message: 'Choose a supported interval',
      }),
    windowStartTime: z.string().refine(isClockTime, 'Use HH:mm'),
    windowEndTime: z.string().refine(isClockTime, 'Use HH:mm'),
    disabledDaysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  })
  .superRefine((value, ctx) => {
    if (!isAlignedToSlot(value.windowStartTime, value.slotMinutes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Start time must align to ${value.slotMinutes}-minute steps`,
        path: ['windowStartTime'],
      });
    }

    if (!isAlignedToSlot(value.windowEndTime, value.slotMinutes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `End time must align to ${value.slotMinutes}-minute steps`,
        path: ['windowEndTime'],
      });
    }

    if (isClockTime(value.windowStartTime) && isClockTime(value.windowEndTime)) {
      if (toMinutes(value.windowEndTime) <= toMinutes(value.windowStartTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be later than start time',
          path: ['windowEndTime'],
        });
      }
    }
  });

export type CreateMeetingFormValues = z.infer<typeof createMeetingSchema>;
