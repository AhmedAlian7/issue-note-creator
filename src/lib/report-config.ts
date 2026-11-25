import { z } from "zod";
export const frequencies = ["daily", "weekly", "monthly"] as const;
export const frequency = z.enum(frequencies);
export type Frequency = z.infer<typeof frequency>;
export const zone = "Africa/Cairo";
const schedule = z.strictObject({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  recipients: z.array(z.email().max(254)).max(100),
});
export const reportSchedule = z
  .strictObject({
    skipEmpty: z.boolean(),
    daily: schedule,
    weekly: schedule.extend({ weekday: z.int().min(0).max(6) }),
    monthly: schedule.extend({ monthday: z.int().min(1).max(31) }),
  })
  .refine((v) =>
    frequencies.every((k) => !v[k].enabled || v[k].recipients.length > 0),
  );
export type Schedule = z.infer<typeof reportSchedule>;
const base = { enabled: false, recipients: [] };
export const defaultSchedule: Schedule = {
  skipEmpty: true,
  daily: { ...base, time: "22:00" },
  weekly: { ...base, time: "05:00", weekday: 4 },
  monthly: { ...base, time: "09:00", monthday: 1 },
};
const field = z.string().trim().min(1).max(80);
export const company = z.strictObject({
  website: field,
  phone: field.max(32),
  city: field,
});
export const defaultCompany = {
  website: "italianfurniture-eg.com",
  phone: "+20 101 347 8443",
  city: "Cairo, Egypt",
};
