<script lang="ts">
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import UsersIcon from '@lucide/svelte/icons/users';
	import * as Card from '$lib/components/ui/card';
	import * as Badge from '$lib/components/ui/badge';
	import * as Separator from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import type { Recipe } from '$lib/types';

	let { recipe }: { recipe: Recipe } = $props();

	const themeStyles = {
		classic: {
			container: 'bg-linear-to-br from-amber-50 via-orange-50 to-stone-100',
			accent: 'from-amber-500 via-orange-400 to-yellow-400',
			title: 'font-serif text-stone-900',
			description: 'text-stone-700',
			metaBadge: 'border-amber-300/70 bg-amber-100/90 text-amber-900',
			sectionTitle: 'font-serif text-stone-900',
			bullet: 'bg-amber-500',
			stepNumber: 'bg-amber-200 text-amber-900',
			divider: 'bg-amber-200/70'
		},
		minimal: {
			container: 'bg-white',
			accent: 'from-stone-300 via-stone-200 to-stone-300',
			title: 'font-sans tracking-tight text-stone-900',
			description: 'text-stone-600',
			metaBadge: 'border-stone-200 bg-stone-100 text-stone-700',
			sectionTitle: 'font-medium tracking-[0.12em] uppercase text-stone-700',
			bullet: 'bg-stone-500',
			stepNumber: 'border border-stone-200 bg-stone-100 text-stone-700',
			divider: 'bg-stone-200'
		},
		bold: {
			container: 'bg-linear-to-br from-rose-100 via-orange-50 to-yellow-100',
			accent: 'from-rose-600 via-orange-500 to-yellow-500',
			title: 'font-black uppercase tracking-tight text-rose-950',
			description: 'font-medium text-rose-900/80',
			metaBadge: 'border-rose-900 bg-rose-900 text-rose-100',
			sectionTitle: 'font-extrabold tracking-[0.14em] uppercase text-rose-900',
			bullet: 'bg-rose-700',
			stepNumber: 'bg-rose-900 text-rose-50',
			divider: 'bg-rose-200'
		}
	} as const;

	const cardTheme = $derived(themeStyles[recipe.theme]);
</script>

<Card.Root
	class={cn(
		'mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-black/5 shadow-2xl shadow-stone-200/70 transition-all duration-300',
		cardTheme.container
	)}
>
	<div class={cn('h-1.5 w-full bg-linear-to-r', cardTheme.accent)}></div>

	<Card.Header class="gap-5 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
		<div class="space-y-2">
			<Card.Title class={cn('text-3xl leading-tight sm:text-4xl', cardTheme.title)}>
				{recipe.title || 'Untitled recipe'}
			</Card.Title>
			<Card.Description class={cn('max-w-3xl text-sm leading-relaxed sm:text-base', cardTheme.description)}>
				{recipe.description || 'Add a short description to introduce your dish and set the tone.'}
			</Card.Description>
		</div>

		<div class="flex flex-wrap gap-2">
			<Badge.Badge variant="outline" class={cn('gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', cardTheme.metaBadge)}>
				<Clock3Icon class="size-3.5" />
				Prep {recipe.prepMinutes ?? '-'} min
			</Badge.Badge>
			<Badge.Badge variant="outline" class={cn('gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', cardTheme.metaBadge)}>
				<FlameIcon class="size-3.5" />
				Cook {recipe.cookMinutes ?? '-'} min
			</Badge.Badge>
			<Badge.Badge variant="outline" class={cn('gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', cardTheme.metaBadge)}>
				<UsersIcon class="size-3.5" />
				Serves {recipe.servings ?? '-'}
			</Badge.Badge>
		</div>
	</Card.Header>

	<Separator.Root class={cn('mx-6 sm:mx-8', cardTheme.divider)} />

	<Card.Content class="grid gap-8 px-6 py-6 sm:grid-cols-[0.95fr_1.35fr] sm:px-8 sm:py-8">
		<section class="space-y-4">
			<h3 class={cn('text-xs', cardTheme.sectionTitle)}>Ingredients</h3>
			{#if recipe.ingredients.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-4 text-sm text-muted-foreground">
					Add your first ingredient to get started.
				</p>
			{:else}
				<ul class="space-y-3">
					{#each recipe.ingredients as ingredient, index (`${ingredient}-${index}`)}
						<li class="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
							<span class={cn('mt-2 inline-block size-1.5 rounded-full', cardTheme.bullet)}></span>
							<span>{ingredient}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="space-y-4">
			<h3 class={cn('text-xs', cardTheme.sectionTitle)}>Method</h3>
			{#if recipe.steps.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-4 text-sm text-muted-foreground">
					Add your first step to outline how to cook the dish.
				</p>
			{:else}
				<ol class="space-y-4">
					{#each recipe.steps as step, index (`${step}-${index}`)}
						<li class="flex gap-3 text-sm leading-7 text-foreground/90">
							<span
								class={cn(
									'mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
									cardTheme.stepNumber
								)}
							>
								{index + 1}
							</span>
							<span>{step}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</Card.Content>
</Card.Root>
