import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Password must be 72 characters or less.'),
});
function normalizePhone(v: string) {
  return v.replace(/[\s\-\(\)]/g, '');
}
export const registrationSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120, 'Keep name under 120 characters.'),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^(\+63|0)9\d{9}$/, 'Use a valid Philippine mobile number.')),
});
export const resetSchema = z.object({ email: z.string().email('Enter a valid email.') });
export type LoginValues = z.infer<typeof loginSchema>; export type RegistrationValues = z.infer<typeof registrationSchema>;
