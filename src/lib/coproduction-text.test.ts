import { describe, expect, it } from 'vitest';
import { durationText, sharePercent, sortInvites } from './coproduction-text';

describe('sharePercent', () => {
	it('reads basis points as a percentage', () => {
		expect(sharePercent(2_500)).toBe('25%');
		expect(sharePercent(1_250)).toBe('12,5%');
	});
});

describe('durationText', () => {
	it('says when there is no end and counts days', () => {
		expect(durationText(null)).toBe('Sem data final');
		expect(durationText(1)).toBe('1 dia a partir do aceite');
		expect(durationText(90)).toBe('90 dias a partir do aceite');
	});
});

describe('sortInvites', () => {
	it('puts pending invites first, the rest newest first', () => {
		const at = (day: number) => new Date(Date.UTC(2026, 10, day));
		const terms = [
			{ id: 'old-ended', status: 'ended', createdAt: at(1) },
			{ id: 'pending-late', status: 'invited', createdAt: at(9) },
			{ id: 'active', status: 'active', createdAt: at(5) },
			{ id: 'pending-early', status: 'invited', createdAt: at(3) }
		] as const;
		expect(sortInvites(terms).map((t) => t.id)).toEqual([
			'pending-early',
			'pending-late',
			'active',
			'old-ended'
		]);
	});
});
