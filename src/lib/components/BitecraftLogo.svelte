<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let {
		subtitle = 'Recipe Card Builder',
		compact = false,
		class: className = ''
	}: {
		subtitle?: string;
		compact?: boolean;
		class?: string;
	} = $props();
</script>

<div class={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
	<img
		src={favicon}
		alt="BiteCraft logo"
		class={compact
			? 'size-10 shrink-0 rounded-xl shadow-[0_10px_30px_-16px_rgba(194,65,12,0.8)]'
			: 'size-12 shrink-0 rounded-2xl shadow-[0_18px_40px_-20px_rgba(194,65,12,0.85)]'}
	/>
	<div class="min-w-0">
		<p class="truncate font-serif text-lg leading-none font-black tracking-[0.02em] text-stone-950 sm:text-[1.4rem]">
			BiteCraft
		</p>
		<p class="truncate pt-1 text-[11px] font-semibold tracking-[0.22em] text-amber-700 uppercase">
			{subtitle}
		</p>
	</div>
</div>
