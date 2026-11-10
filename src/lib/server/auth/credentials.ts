import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z.string().min(8).max(200);
export const nameSchema = z.string().trim().min(1).max(100);

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1)
});

export const registerSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	password: passwordSchema
});
