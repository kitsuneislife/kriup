/** Steps of the spacing scale (`--space-N` in tokens.css). */
export type Space = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;

export type Align = 'start' | 'center' | 'end' | 'stretch';
export type Justify = 'start' | 'center' | 'end' | 'between';
export type Size = 'sm' | 'md' | 'lg';

/** Meaning colors first, then the categorical ones (see docs/design/cores.md). */
export type Tone =
	| 'neutral'
	| 'accent'
	| 'success'
	| 'warning'
	| 'danger'
	| 'indigo'
	| 'purple'
	| 'pink'
	| 'teal'
	| 'mint'
	| 'cyan'
	| 'brown'
	| 'yellow';

/** CSS variable that holds each tone's base color. */
export const toneVar: Record<Tone, string> = {
	neutral: 'var(--gray)',
	accent: 'var(--color-accent)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	danger: 'var(--color-danger)',
	indigo: 'var(--indigo)',
	purple: 'var(--purple)',
	pink: 'var(--pink)',
	teal: 'var(--teal)',
	mint: 'var(--mint)',
	cyan: 'var(--cyan)',
	brown: 'var(--brown)',
	yellow: 'var(--yellow)'
};
