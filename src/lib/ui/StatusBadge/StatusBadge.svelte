<script lang="ts">
	import Badge from '../Badge/Badge.svelte';
	import { statusTone, type Status } from './status';

	type Props = {
		status: Status;
		/** Text shown, in the language of the screen. */
		label: string;
		size?: 'sm' | 'md';
	};

	let { status, label, size = 'md' }: Props = $props();
</script>

<Badge tone={statusTone[status]} {size} dot>{label}</Badge>
