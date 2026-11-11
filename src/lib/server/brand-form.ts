// The brand fields as a form sends them (RF-12): the assistant and the editor read them
// the same way, then check them with the schema createProduct and updateProduct use.

import { z } from 'zod';
import { normalizeHex } from '../ui/ColorField/hex';
import { brandSchema } from './services/catalog';

export const brandForm = z.object({
	color: z
		.string()
		.transform((text) => normalizeHex(text) ?? text)
		.pipe(brandSchema.shape.color),
	font: brandSchema.shape.font,
	logoUrl: z
		.string()
		.trim()
		.transform((text) => text || null)
		.pipe(brandSchema.shape.logoUrl)
});
