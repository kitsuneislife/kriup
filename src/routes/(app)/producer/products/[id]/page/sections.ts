// The sales page form (RF-13): each field is named `sections.<position>.<kind>.<field>`, so
// the form carries the sections' order and kinds without hidden inputs. updatePage checks
// the structure, and its errors come back as `sections.<position>.fields.<field>`.

import { move } from '#lib/domain/page';

const FIELD = /^sections\.(\d{1,2})\.(\w{1,40})\.(\w{1,40})$/;

export type TypedSection = { kind: string; fields: Record<string, string> };

/**
 * The sections as typed, in the form's order. An empty image drops the image and its
 * description. `move` ("2:up") moves a section after reading, so a move keeps what was typed.
 */
export function readSections(form: FormData): TypedSection[] {
	const sections: TypedSection[] = [];
	for (const [name, value] of form) {
		const match = FIELD.exec(name);
		if (!match || typeof value !== 'string') continue;
		const section = (sections[Number(match[1])] ??= { kind: match[2]!, fields: {} });
		section.fields[match[3]!] = value;
	}
	// a gap in the numbering is a forged form: keep it, the service refuses the structure
	const read = Array.from(sections, (s) => s ?? { kind: '', fields: {} });
	for (const { fields } of read) {
		if (fields.image !== undefined && fields.image.trim() === '') {
			delete fields.image;
			delete fields.imageAlt;
		}
	}
	const moved = /^(\d{1,2}):(up|down)$/.exec(String(form.get('move') ?? ''));
	return moved ? move(read, Number(moved[1]), moved[2] as 'up' | 'down') : read;
}

/** For the screen: has any field of section `index` an error? */
export function sectionHasError(errors: Record<string, string>, index: number): boolean {
	return Object.keys(errors).some((path) => path.startsWith(`sections.${index}.`));
}
