// What the person reads for the type and the state of a product, in one place. Safe on the
// client: the server import is a type only.

import type { product } from './server/db/schema';
import type { IconName, Tone } from './ui';

type Product = typeof product.$inferSelect;

export const productTypeText: Record<Product['type'], { label: string; icon: IconName }> = {
	course: { label: 'Curso', icon: 'book' },
	mentorship: { label: 'Mentoria', icon: 'users' },
	subscription: { label: 'Assinatura', icon: 'refresh' }
};

export const productStatusText: Record<Product['status'], { label: string; tone: Tone }> = {
	draft: { label: 'Rascunho', tone: 'neutral' },
	published: { label: 'Publicado', tone: 'success' }
};

/** The fonts a producer can pick for the brand (RF-12). */
export const brandFonts = ['Inter', 'Roboto', 'Montserrat', 'Lora', 'Playfair Display'];
