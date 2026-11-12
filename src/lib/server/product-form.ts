// Product fields as a form sends them: the assistant and the editor read them the same
// way, then check them with the schemas the catalog services use.

import { z } from 'zod';
import { normalizeHex } from '../ui/ColorField/hex';
import { parseReais } from '../ui/format';
import { brandSchema, offerSchema } from './services/catalog';

/** The brand (RF-12). */
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

/** A price typed in reais, as cents within the offer limits. */
export const priceForm = z
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
	.pipe(offerSchema.shape.priceCents);

/** An offer (RF-15): its price in reais and its guarantee in whole days. */
export const offerForm = z
	.object({
		name: offerSchema.shape.name,
		price: priceForm,
		guaranteeDays: z
			.string()
			.trim()
			.min(1)
			.transform(Number)
			.pipe(offerSchema.shape.guaranteeDays.unwrap())
	})
	.transform(({ price, ...offer }) => ({ ...offer, priceCents: price }));
