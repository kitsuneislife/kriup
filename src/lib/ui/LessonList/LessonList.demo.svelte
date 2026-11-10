<script lang="ts">
	import { Card, LessonList } from '../index';

	let current = $state('2');
</script>

<Card>
	<LessonList
		label="Aulas do curso"
		bind:current
		modules={[
			{
				title: 'Módulo 1 · Primeiros passos',
				lessons: [
					{ id: '1', title: 'Bem-vindo ao curso', duration: '3:20', done: true },
					{ id: '2', title: 'Materiais e pinceis', duration: '8:45' },
					{ id: '3', title: 'Sua primeira pincelada', duration: '12:10' }
				]
			},
			{
				title: 'Módulo 2 · Cores',
				lessons: [
					{ id: '4', title: 'Mistura de cores', duration: '10:00' },
					{ id: '5', title: 'Transparência', duration: '14:30' }
				]
			}
		]}
	/>
</Card>
