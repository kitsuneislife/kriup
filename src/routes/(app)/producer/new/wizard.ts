// Checks the assistant's answers with the same schemas createProduct uses, one step at a
// time. Server only: the page gets the result, never the schemas.

import { z } from 'zod';
import type { productType } from '#lib/server/db/schema';
import { fieldErrors } from '#lib/server/http';
import { brandSchema, createProductSchema } from '#lib/server/services/catalog';
import { normalizeHex } from '#lib/ui/ColorField/hex';
import { parseReais } from '#lib/ui/format';
import { steps, type Answers } from './steps';

export type ProductType = (typeof productType.enumValues)[number];

const price = z
	.string()
	.trim()
	.min(1)
	.transform((text, issue) => {
		const cents = parseReais(text);
		if (cents === undefined) {
			issue.addIssue({ code: 'custom', message: 'not a price', params: { code: 'invalid_price' } });
			return z.NEVER;
		}
		return cents;
	})
	.pipe(createProductSchema.shape.priceCents);

/** One schema per step that has fields; `types` are the ones with a template. */
const schemas = (types: ProductType[]) => [
	z.object({ type: z.enum(types as [ProductType, ...ProductType[]]) }),
	createProductSchema.pick({ name: true }),
	z.object({ price }),
	createProductSchema.pick({ audience: true }),
	z.object({
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
	})
] as const;

export type Checked = { step: number; fields?: Record<string, string> };

/**
 * Checks steps 0 to `through`. Stops at the first one that fails, with the text of each
 * wrong field; otherwise the next step is open.
 */
export function check(answers: Answers, through: number, types: ProductType[]): Checked {
	const list = schemas(types);
	for (let step = 0; step <= Math.min(through, list.length - 1); step++) {
		const result = list[step]!.safeParse(answers);
		if (!result.success) return { step, fields: fieldErrors(result.error) };
	}
	return { step: Math.min(through + 1, steps.length - 1) };
}

/**
 * Every answer as createProduct takes it, without the template. Throws ZodError if any
 * step is wrong, so run `check` first to send the person back to it.
 */
export function productAnswers(answers: Answers, types: ProductType[]) {
	const [type, name, price, audience, brand] = schemas(types);
	return {
		type: type.parse(answers).type,
		name: name.parse(answers).name,
		priceCents: price.parse(answers).price,
		audience: audience.parse(answers).audience,
		brand: brand.parse(answers)
	};
}
