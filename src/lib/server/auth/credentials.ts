import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1)
});

export const registerSchema = z.object({
	name: z.string().trim().min(1).max(100),
	email: emailSchema,
	password: z.string().min(8).max(200)
});
