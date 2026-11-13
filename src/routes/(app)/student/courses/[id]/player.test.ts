import { describe, expect, it } from 'vitest';
import { paragraphs, pickLesson, videoOf } from './player';

const at = (id: string, done: boolean) => ({ id, completedAt: done ? new Date() : null });

describe('pickLesson', () => {
	const lessons = [at('a', true), at('b', false), at('c', false)];

	it('opens the one asked for', () => expect(pickLesson(lessons, 'c')?.id).toBe('c'));
	it('opens the first not done by default', () => expect(pickLesson(lessons, null)?.id).toBe('b'));
	it('ignores an id that is not in the course', () =>
		expect(pickLesson(lessons, 'zzz')?.id).toBe('b'));
	it('opens the first lesson of a finished course', () =>
		expect(pickLesson([at('a', true), at('b', true)], null)?.id).toBe('a'));
	it('has nothing to open in an empty course', () => expect(pickLesson([], null)).toBeUndefined());
});

describe('videoOf', () => {
	it('embeds YouTube in its privacy-friendly host', () => {
		for (const url of [
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://youtu.be/dQw4w9WgXcQ',
			'https://youtube.com/embed/dQw4w9WgXcQ'
		]) {
			expect(videoOf(url)).toEqual({
				kind: 'embed',
				src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
			});
		}
	});
	it('embeds Vimeo', () =>
		expect(videoOf('https://vimeo.com/76979871')).toEqual({
			kind: 'embed',
			src: 'https://player.vimeo.com/video/76979871'
		}));
	it('plays a video file', () =>
		expect(videoOf('https://cdn.example.com/a/aula.MP4?x=1').kind).toBe('file'));
	it('links to anything else', () => {
		expect(videoOf('https://example.com/aula').kind).toBe('link');
		expect(videoOf('https://youtube.com/watch').kind).toBe('link');
	});
});

describe('paragraphs', () => {
	it('splits on blank lines', () =>
		expect(paragraphs('um\ndois\n\n\n  tres  \n')).toEqual(['um\ndois', 'tres']));
});
