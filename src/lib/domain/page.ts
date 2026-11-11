// RF-13: the page editor changes the order of the sections, their texts and an optional
// image, nothing else. The sections and the text fields of each one come from the template.

export interface Section {
	kind: string;
	fields: Readonly<Record<string, string>>;
}

/** The image of a section: its address and the description read in its place. */
export const IMAGE_FIELDS = ['image', 'imageAlt'] as const;

const isImageField = (key: string) => (IMAGE_FIELDS as readonly string[]).includes(key);

/** The text fields of a section, in the template's order. */
export function textFields(section: Section): string[] {
	return Object.keys(section.fields).filter((key) => !isImageField(key));
}

const signature = (section: Section) => `${section.kind}:${textFields(section).sort().join(',')}`;

/** True when `next` has the same sections as `current`, in any order, with the same text fields. */
export function keepsSections(current: readonly Section[], next: readonly Section[]): boolean {
	const a = current.map(signature).sort();
	const b = next.map(signature).sort();
	return a.length === b.length && a.every((s, i) => s === b[i]);
}

/** Moves the item at `index` one place up or down; at an end it stays where it is. */
export function move<T>(items: readonly T[], index: number, direction: 'up' | 'down'): T[] {
	const to = direction === 'up' ? index - 1 : index + 1;
	const moved = [...items];
	if (index < 0 || index >= items.length || to < 0 || to >= items.length) return moved;
	[moved[index], moved[to]] = [moved[to]!, moved[index]!];
	return moved;
}
