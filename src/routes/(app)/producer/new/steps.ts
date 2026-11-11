// The questions of the creation assistant (UC-01), in order. The page and the server both
// read this list, so they agree on which fields each step owns.

export const steps = [
	{ title: 'Tipo', question: 'O que você vai vender?', fields: ['type'] },
	{ title: 'Nome', question: 'Como se chama o produto?', fields: ['name'] },
	{ title: 'Preço', question: 'Quanto vai custar?', fields: ['price'] },
	{ title: 'Público', question: 'Para quem é?', fields: ['audience'] },
	{ title: 'Marca', question: 'Como é a sua marca?', fields: ['color', 'font', 'logoUrl'] },
	{ title: 'Modelo', question: 'Escolha um modelo', fields: [] }
] as const;

export type Field = (typeof steps)[number]['fields'][number];

/** What the person typed, as typed: the server checks it on every step. */
export type Answers = Partial<Record<Field, string>>;

export const fields: Field[] = steps.flatMap((step) => step.fields);

export const brandFonts = ['Inter', 'Roboto', 'Montserrat', 'Lora', 'Playfair Display'];

export const defaultBrandColor = '#0a84ff';
