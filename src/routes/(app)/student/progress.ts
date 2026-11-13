// Progress as the student sees it: shared by the course list and the player.

/** Whole percent of lessons done; 0 for a course without lessons. */
export function percent(done: number, total: number): number {
	return total === 0 ? 0 : Math.floor((done / total) * 100);
}

export const lessonCountText = (n: number) => (n === 1 ? '1 aula' : `${n} aulas`);

/** "3 de 8 aulas concluídas", or what to expect when there is nothing to watch yet. */
export function progressText(done: number, total: number): string {
	if (total === 0) return 'Ainda sem aulas';
	return `${done} de ${lessonCountText(total)} ${total === 1 ? 'concluída' : 'concluídas'}`;
}
