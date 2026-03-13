<script lang="ts">
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import UsersIcon from '@lucide/svelte/icons/users';
	import * as Card from '$lib/components/ui/card';
	import * as Badge from '$lib/components/ui/badge';
	import * as Separator from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import type { Recipe } from '$lib/types';

	let {
		recipe,
		onRecipeChange
	}: {
		recipe: Recipe;
		onRecipeChange: (nextRecipe: Recipe) => void;
	} = $props();

	let isDragging = $state(false);
	let dragPointerId = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragOriginX = 50;
	let dragOriginY = 50;

	const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

	const updateRecipe = (patch: Partial<Recipe>) => {
		onRecipeChange({ ...recipe, ...patch });
	};

	const updateHeroFrame = (patch: Pick<Recipe, 'heroImageScale' | 'heroImagePositionX' | 'heroImagePositionY'>) => {
		updateRecipe(patch);
	};

	const resetDrag = () => {
		isDragging = false;
		dragPointerId = null;
	};

	const handleHeroWheel = (event: WheelEvent) => {
		if (!recipe.heroImageUrl) {
			return;
		}

		event.preventDefault();

		const nextScale = clamp(Number((recipe.heroImageScale - event.deltaY * 0.0015).toFixed(2)), 1, 3);
		if (nextScale === recipe.heroImageScale) {
			return;
		}

		updateHeroFrame({
			heroImageScale: nextScale,
			heroImagePositionX: recipe.heroImagePositionX,
			heroImagePositionY: recipe.heroImagePositionY
		});
	};

	const handleHeroPointerDown = (event: PointerEvent) => {
		if (!recipe.heroImageUrl || event.button !== 0) {
			return;
		}

		const currentTarget = event.currentTarget;
		if (!(currentTarget instanceof HTMLDivElement)) {
			return;
		}

		currentTarget.setPointerCapture(event.pointerId);
		isDragging = true;
		dragPointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragOriginX = recipe.heroImagePositionX;
		dragOriginY = recipe.heroImagePositionY;
	};

	const handleHeroPointerMove = (event: PointerEvent) => {
		if (!isDragging || dragPointerId !== event.pointerId) {
			return;
		}

		const currentTarget = event.currentTarget;
		if (!(currentTarget instanceof HTMLDivElement)) {
			return;
		}

		const rect = currentTarget.getBoundingClientRect();
		if (!rect.width || !rect.height) {
			return;
		}

		const sensitivity = 100 / Math.max(recipe.heroImageScale, 1);
		const nextX = clamp(
			dragOriginX - ((event.clientX - dragStartX) / rect.width) * sensitivity,
			0,
			100
		);
		const nextY = clamp(
			dragOriginY - ((event.clientY - dragStartY) / rect.height) * sensitivity,
			0,
			100
		);

		updateHeroFrame({
			heroImageScale: recipe.heroImageScale,
			heroImagePositionX: Number(nextX.toFixed(2)),
			heroImagePositionY: Number(nextY.toFixed(2))
		});
	};

	const handleHeroPointerUp = (event: PointerEvent) => {
		const currentTarget = event.currentTarget;
		if (currentTarget instanceof HTMLDivElement && dragPointerId === event.pointerId) {
			currentTarget.releasePointerCapture(event.pointerId);
		}

		resetDrag();
	};

	const themeStyles = {
		classic: {
			container: 'bg-linear-to-br from-amber-50 via-orange-50 to-stone-100',
			accent: 'from-amber-500 via-orange-400 to-yellow-400',
			title: 'font-serif text-stone-900',
			description: 'text-stone-700',
			metaBadge: 'border-amber-300/65 bg-amber-100/80 text-amber-950',
			sectionTitle: 'font-serif text-stone-900',
			bullet: 'bg-amber-500',
			stepNumber: 'bg-amber-200 text-amber-900',
			divider: 'bg-amber-200/70',
			panel: 'bg-white/65'
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
			divider: 'bg-stone-200',
			panel: 'bg-stone-50/65'
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
			divider: 'bg-rose-200',
			panel: 'bg-white/60'
		}
	} as const;

	const cardTheme = $derived(themeStyles[recipe.theme]);
</script>

	<Card.Root
		class={cn(
			'mx-auto w-full max-w-none gap-0 overflow-hidden rounded-[1rem] border border-stone-200/70 py-0 shadow-xl shadow-stone-200/55 transition-all duration-300 sm:rounded-[1.8rem] sm:shadow-2xl sm:shadow-stone-200/70',
			cardTheme.container
		)}
	>
	{#if recipe.heroImageUrl}
		<div
			class={cn(
				'relative aspect-[16/7] w-full overflow-hidden bg-stone-200 touch-none select-none sm:aspect-[16/6] xl:aspect-[16/5]',
				isDragging ? 'cursor-grabbing' : 'cursor-grab'
			)}
			role="group"
			aria-label="Hero image preview. Drag to reposition and use the mouse wheel to zoom."
			onwheel={handleHeroWheel}
			onpointerdown={handleHeroPointerDown}
			onpointermove={handleHeroPointerMove}
			onpointerup={handleHeroPointerUp}
			onpointercancel={handleHeroPointerUp}
		>
			<img
				src={recipe.heroImageUrl}
				alt={recipe.title ? `${recipe.title} hero image` : 'Recipe hero image'}
				class="block h-full w-full object-cover"
				style={`object-position: ${recipe.heroImagePositionX}% ${recipe.heroImagePositionY}%; transform: scale(${recipe.heroImageScale}); transform-origin: center;`}
				draggable="false"
			/>
		</div>
	{/if}
	<div class={cn('h-2 w-full bg-linear-to-r', cardTheme.accent, recipe.heroImageUrl ? '-mt-px' : '')}></div>

	<Card.Header
		class={cn(
			'gap-3 px-2.5 pb-3 sm:gap-4 sm:px-11 sm:pb-5 xl:px-14 xl:pb-5',
			recipe.heroImageUrl ? 'pt-3 sm:pt-5' : 'pt-4 sm:pt-11'
		)}
	>
		<div class="space-y-3">
			<Card.Title class={cn('text-[1.6rem] leading-[1.05] sm:text-[2.6rem]', cardTheme.title)}>
				{recipe.title || 'Untitled recipe'}
			</Card.Title>
			<Card.Description class={cn('max-w-3xl text-[0.95rem] leading-7 sm:text-[1.06rem] sm:leading-8', cardTheme.description)}>
				{recipe.description || 'Add a short description to introduce your dish and set the tone.'}
			</Card.Description>
		</div>

		<div class="flex flex-wrap gap-2.5">
			<Badge.Badge
				variant="outline"
				class={cn('gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur', cardTheme.metaBadge)}
			>
				<Clock3Icon class="size-3.5" />
				Prep {recipe.prepMinutes ?? '-'} min
			</Badge.Badge>
			<Badge.Badge
				variant="outline"
				class={cn('gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur', cardTheme.metaBadge)}
			>
				<FlameIcon class="size-3.5" />
				Cook {recipe.cookMinutes ?? '-'} min
			</Badge.Badge>
			<Badge.Badge
				variant="outline"
				class={cn('gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur', cardTheme.metaBadge)}
			>
				<UsersIcon class="size-3.5" />
				Serves {recipe.servings ?? '-'}
			</Badge.Badge>
		</div>
	</Card.Header>

	<Separator.Root class={cn('mx-2.5 sm:mx-11 xl:mx-14', cardTheme.divider)} />

	<Card.Content class="grid gap-2 px-2.5 pb-2.5 pt-3 sm:grid-cols-[1.08fr_1.6fr] sm:gap-10 sm:px-11 sm:pb-10 sm:pt-6 xl:px-14 xl:pb-11 xl:pt-7">
		<section class={cn('space-y-3 rounded-[0.95rem] border border-transparent p-1.5 sm:space-y-5 sm:rounded-2xl sm:border-white/50 sm:p-6', cardTheme.panel)}>
			<h3 class={cn('text-[0.7rem]', cardTheme.sectionTitle)}>Ingredients</h3>
			{#if recipe.ingredients.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-4 py-4 text-sm leading-7 text-muted-foreground sm:py-5 sm:text-base sm:leading-8">
					Add your first ingredient to get started.
				</p>
			{:else}
				<ul class="space-y-2.5 sm:space-y-4">
					{#each recipe.ingredients as ingredient, index (`${ingredient}-${index}`)}
						<li class="flex items-start gap-3 text-sm leading-7 text-foreground/90 sm:gap-3.5 sm:text-base sm:leading-8">
							<span class={cn('mt-2.5 inline-block size-1.5 rounded-full sm:mt-3', cardTheme.bullet)}></span>
							<span>{ingredient}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class={cn('space-y-3 rounded-[0.95rem] border border-transparent p-1 sm:space-y-5 sm:rounded-2xl sm:border-white/50 sm:p-6', cardTheme.panel)}>
			<h3 class={cn('text-[0.7rem]', cardTheme.sectionTitle)}>Method</h3>
			{#if recipe.steps.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-4 py-4 text-sm leading-7 text-muted-foreground sm:py-5 sm:text-base sm:leading-8">
					Add your first step to outline how to cook the dish.
				</p>
			{:else}
				<ol class="space-y-3.5 sm:space-y-6">
					{#each recipe.steps as step, index (`${step}-${index}`)}
						<li class="flex gap-2.5 text-sm leading-7 text-foreground/90 sm:gap-4 sm:text-base sm:leading-8">
							<span
								class={cn(
									'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold shadow-sm sm:mt-1 sm:size-8 sm:text-xs',
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
