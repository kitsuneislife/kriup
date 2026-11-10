<script lang="ts">
	import type { Size } from '../types';
	import { icons, type IconName } from './icons';

	type Props = {
		name: IconName;
		size?: Size;
		/** Accessible name. Without it the icon is decorative and hidden from screen readers. */
		label?: string;
	};

	let { name, size = 'md', label }: Props = $props();
</script>

<svg
	class="icon"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	style:--size="var(--icon-{size})"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path d={icons[name]} />
</svg>

<style>
	.icon {
		inline-size: var(--size);
		block-size: var(--size);
		flex: none;
	}
</style>
