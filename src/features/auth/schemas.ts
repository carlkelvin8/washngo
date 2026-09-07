import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().email('Enter a valid email.'), password: z.string().min(8, 'Use at least 8 characters.') });
export const registrationSchema = loginSchema.extend({ fullName: z.string().trim().min(2, 'Enter your full name.'), phone: z.string().regex(/^(\+63|0)9\d{9}$/, 'Use a valid Philippine mobile number.') });
export const resetSchema = z.object({ email: z.string().email('Enter a valid email.') });
export type LoginValues = z.infer<typeof loginSchema>; export type RegistrationValues = z.infer<typeof registrationSchema>;
