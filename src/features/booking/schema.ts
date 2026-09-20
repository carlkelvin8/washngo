import { z } from 'zod';

export const bookingSchema = z.object({
  addressId: z.string().uuid('Choose a pickup address.'),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid pickup date.'),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a valid pickup time.'),
  estimatedWeight: z.coerce.number().finite().min(1, 'Estimated weight must be at least 1 kg.').max(50, 'Estimated weight cannot exceed 50 kg.'),
  specialInstructions: z.string().trim().max(500, 'Keep instructions under 500 characters.'),
  paymentMethod: z.enum(['cod','pay_later']),
}).superRefine((value, context) => {
  // Store as Asia/Manila time (+08:00) so validation is TZ-correct regardless of device
  const pickup = new Date(`${value.pickupDate}T${value.pickupTime}:00+08:00`);
  if (Number.isNaN(pickup.valueOf())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupDate'], message: 'Invalid pickup date/time.' });
    return;
  }
  // Reject impossible calendar dates like 2026-02-30 which JS rolls over
  const [y, m, d] = value.pickupDate.split('-').map(Number);
  if (pickup.getFullYear() !== y || pickup.getMonth() + 1 !== m || pickup.getDate() !== d) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupDate'], message: 'Invalid pickup date.' });
    return;
  }
  // Upper bound: don't allow bookings >30 days ahead
  const max = Date.now() + 30 * 24 * 60 * 60 * 1000;
  if (pickup.getTime() > max) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupDate'], message: 'Pickup cannot be more than 30 days ahead.' });
    return;
  }
  if (pickup.getTime() < Date.now() + 2 * 60 * 60 * 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupDate'], message: 'Schedule pickup at least 2 hours from now.' });
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupTime'], message: 'Schedule pickup at least 2 hours from now.' });
  }
});
export type BookingValues = z.infer<typeof bookingSchema>;
