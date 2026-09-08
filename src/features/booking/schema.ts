import { z } from 'zod';

export const bookingSchema = z.object({
  addressId: z.string().uuid('Choose a pickup address.'),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid pickup date.'),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a valid pickup time.'),
  estimatedWeight: z.coerce.number().finite().min(1, 'Estimated weight must be at least 1 kg.').max(50, 'Estimated weight cannot exceed 50 kg.'),
  specialInstructions: z.string().trim().max(500, 'Keep instructions under 500 characters.'),
  paymentMethod: z.enum(['cod','pay_later']),
}).superRefine((value, context) => {
  const pickup = new Date(`${value.pickupDate}T${value.pickupTime}:00`);
  if (Number.isNaN(pickup.valueOf()) || pickup.getTime() < Date.now() + 2 * 60 * 60 * 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pickupDate'], message: 'Schedule pickup at least 2 hours from now.' });
  }
});
export type BookingValues = z.infer<typeof bookingSchema>;
