import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().trim().min(2, 'Use at least 2 characters.').max(32, 'Keep label under 32 characters.'),
  full_address: z.string().trim().min(8, 'Enter a complete street or house address.').max(200),
  barangay: z.string().trim().min(2, 'Enter your barangay.').max(64),
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .refine((v) => !(v === 0), { message: 'Capture your pickup pin first.' })
    .refine((v) => v >= 13.5 && v <= 14.3, { message: 'Pin must be near Lipa City (13.5–14.3).' }),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .refine((v) => !(v === 0), { message: 'Capture your pickup pin first.' })
    .refine((v) => v >= 120.8 && v <= 121.5, { message: 'Pin must be near Lipa City (120.8–121.5).' }),
});
