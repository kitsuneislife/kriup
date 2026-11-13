// Pure rules of the player: which lesson opens, and how a lesson's video is shown.

type Lesson = { id: string; completedAt: Date | null };

/** The lesson asked for, else the first one not done yet, else the first (a finished course). */
export function pickLesson<L extends Lesson>(lessons: L[], wanted: string | null): L | undefined {
	return lessons.find((l) => l.id === wanted) ?? lessons.find((l) => !l.completedAt) ?? lessons[0];
}

export type Video =
	{ kind: 'embed'; src: string } | { kind: 'file'; src: string } | { kind: 'link'; src: string };

const FILE = /\.(mp4|webm|ogg|mov)$/i;

/** YouTube and Vimeo pages play in an iframe, plain video files in `<video>`, the rest is a link. */
export function videoOf(url: string): Video {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return { kind: 'link', src: url };
	}
	const host = u.hostname.replace(/^(www|m)\./, '');
	if (host === 'youtu.be' || host === 'youtube.com') {
		const parts = u.pathname.split('/').filter(Boolean);
		const id =
			host === 'youtu.be'
				? parts[0]
				: u.pathname === '/watch'
					? u.searchParams.get('v')
					: parts[0] === 'embed'
						? parts[1]
						: undefined;
		if (id && /^[\w-]{6,20}$/.test(id)) {
			return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
		}
	}
	if (host === 'vimeo.com') {
		const id = u.pathname.split('/').find((p) => /^\d+$/.test(p));
		if (id) return { kind: 'embed', src: `https://player.vimeo.com/video/${id}` };
	}
	if (FILE.test(u.pathname)) return { kind: 'file', src: u.href };
	return { kind: 'link', src: u.href };
}

/** A lesson's text as paragraphs: blank lines separate them. */
export function paragraphs(body: string): string[] {
	return body
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
}
