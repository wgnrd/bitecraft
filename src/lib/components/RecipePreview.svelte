<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Badge from '$lib/components/ui/badge';
	import ImageIcon from '@lucide/svelte/icons/image';
	import { cn } from '$lib/utils';
	import type { Recipe } from '$lib/types';

	let {
		recipe,
		onRecipeChange,
		readonly = false
	}: {
		recipe: Recipe;
		onRecipeChange: (nextRecipe: Recipe) => void;
		readonly?: boolean;
	} = $props();

	let isDragging = $state(false);
	let dragPointerId = $state<number | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragOriginX = 50;
	let dragOriginY = 50;

	const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

	const updateRecipe = (patch: Partial<Recipe>) => {
		if (readonly) {
			return;
		}

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
		if (readonly || !recipe.heroImageUrl) {
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
		if (readonly || !recipe.heroImageUrl || event.button !== 0) {
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
			accent: 'bg-[#f7cfb0] text-[#8a4613]',
			accentAlt: 'bg-[#e9e2d6] text-stone-700',
			title: 'font-serif text-stone-950',
			description: 'text-stone-700 italic',
			meta: 'text-stone-900',
			sectionTitle: 'text-stone-900',
			bullet: 'bg-[#9b4d12]',
			stepNumber: 'text-[#9b4d12]',
			rule: 'bg-stone-200',
			paper: 'bg-white'
		},
		minimal: {
			accent: 'bg-stone-200 text-stone-700',
			accentAlt: 'bg-stone-100 text-stone-600',
			title: 'font-sans tracking-tight text-stone-950',
			description: 'text-stone-600 italic',
			meta: 'text-stone-900',
			sectionTitle: 'text-stone-900',
			bullet: 'bg-stone-500',
			stepNumber: 'text-stone-600',
			rule: 'bg-stone-200',
			paper: 'bg-white'
		},
		bold: {
			accent: 'bg-[#f5c89d] text-[#803b0b]',
			accentAlt: 'bg-[#ece1d5] text-stone-700',
			title: 'font-serif text-stone-950',
			description: 'text-stone-700 italic',
			meta: 'text-stone-950',
			sectionTitle: 'text-stone-900',
			bullet: 'bg-[#8d3500]',
			stepNumber: 'text-[#8d3500]',
			rule: 'bg-stone-200',
			paper: 'bg-white'
		}
	} as const;

	const cardTheme = $derived(themeStyles[recipe.theme]);

	const formatIngredient = (ingredient: Recipe['ingredients'][number]): string => {
		const amount = ingredient.amount === null ? '' : `${ingredient.amount}`;
		return [amount, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
	};

	const readableTagText = (hex: string): string => {
		const normalized = hex.replace('#', '');
		if (normalized.length !== 6) return '#1f1a17';
		const r = Number.parseInt(normalized.slice(0, 2), 16);
		const g = Number.parseInt(normalized.slice(2, 4), 16);
		const b = Number.parseInt(normalized.slice(4, 6), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.7 ? '#3b2a1d' : '#fff8f1';
	};
</script>

<Card.Root
	data-recipe-card="true"
	class={cn(
		'mx-auto w-full max-w-[1120px] overflow-hidden rounded-[1.8rem] py-0 shadow-[0_22px_60px_-44px_rgba(45,30,14,0.22)]',
		cardTheme.paper
	)}
>
	<div class={cn('grid min-h-[720px]', recipe.showHeroImage ? 'lg:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1fr)]' : 'grid-cols-1')}>
		{#if recipe.showHeroImage}
			<div
				class={cn(
					'relative min-h-[24rem] overflow-hidden bg-stone-900 touch-none select-none lg:min-h-full',
					readonly ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
				)}
				role="group"
				aria-label={
					readonly
						? 'Hero image preview.'
						: 'Hero image preview. Drag to reposition and use the mouse wheel to zoom.'
				}
				onwheel={handleHeroWheel}
				onpointerdown={handleHeroPointerDown}
				onpointermove={handleHeroPointerMove}
				onpointerup={handleHeroPointerUp}
				onpointercancel={handleHeroPointerUp}
			>
				{#if recipe.heroImageUrl}
					<img
						src={recipe.heroImageUrl}
						alt={recipe.title ? `${recipe.title} hero image` : 'Recipe hero image'}
						class="absolute inset-0 block h-full w-full object-cover"
						style={`object-position: ${recipe.heroImagePositionX}% ${recipe.heroImagePositionY}%; transform: scale(${recipe.heroImageScale}); transform-origin: center;`}
						draggable="false"
					/>
				{:else}
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.5),transparent_30%),radial-gradient(circle_at_75%_18%,rgba(249,115,22,0.35),transparent_25%),linear-gradient(180deg,#2e3137,#121212_58%,#0c0b0a)] blur-[1px]"></div>
					<div class="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
					<div class="absolute inset-0 flex items-center justify-center p-10">
						<div class="w-full max-w-[16rem] rounded-[2rem] border border-white/12 bg-white/8 p-6 text-center backdrop-blur-[4px]">
							<div class="mx-auto flex size-14 items-center justify-center rounded-full bg-white/10 text-stone-100">
								<ImageIcon class="size-6" />
							</div>
							<p class="mt-5 text-[0.75rem] tracking-[0.28em] text-stone-300 uppercase">Cover image</p>
							<p class="mt-3 text-sm leading-7 text-stone-200/85">
								Add a hero image URL to give this card its editorial cover.
							</p>
						</div>
					</div>
				{/if}
				<div class="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent"></div>
				<div class="absolute bottom-0 left-0 right-0 px-8 pb-9 text-white">
					<p class="text-[0.85rem] tracking-[0.38em] text-stone-200 uppercase">Summer season</p>
					<h3 class="mt-4 max-w-[12ch] font-serif text-5xl leading-[1]">
						{recipe.title || 'Harvest Table Favorites'}
					</h3>
				</div>
			</div>
		{/if}

		<div class="flex flex-col px-6 py-6 sm:px-10 sm:py-8">
			<div class="flex items-center justify-between gap-3">
				<div class="flex flex-wrap gap-2">
					{#each recipe.tags as tag, index (index)}
						<Badge.Badge
							variant="outline"
							class="rounded-full border-0 px-4 py-1.5 text-[0.72rem] font-semibold tracking-[0.16em] uppercase shadow-none"
							style={`background:${tag.color}; color:${readableTagText(tag.color)};`}
						>
							{tag.label}
						</Badge.Badge>
					{/each}
				</div>
			</div>

			<div class="mt-10">
				<Card.Title class={cn('max-w-[11ch] text-[3.2rem] leading-[0.94] sm:text-[4.5rem]', cardTheme.title)}>
					{recipe.title || 'Untitled recipe'}
				</Card.Title>
				<Card.Description class={cn('mt-8 max-w-[24rem] border-l-2 border-stone-200 pl-6 text-[1.05rem] leading-10 sm:text-[1.1rem]', cardTheme.description)}>
					{recipe.description || 'Add a short description to introduce your dish and set the tone.'}
				</Card.Description>
			</div>

			<div class={cn('mt-10 grid gap-4 rounded-[1.6rem] bg-stone-100/80 px-4 py-6 sm:grid-cols-3 sm:px-6', cardTheme.rule)}>
				<div class="rounded-[1rem] px-2 py-1.5">
					<p class="text-[0.72rem] tracking-[0.22em] text-stone-500 uppercase">Servings</p>
					<p class={cn('mt-2 text-3xl font-medium', cardTheme.meta)}>{recipe.servings ?? '-'}</p>
				</div>
				<div class="rounded-[1rem] px-2 py-1.5">
					<p class="text-[0.72rem] tracking-[0.22em] text-stone-500 uppercase">Prep time</p>
					<p class={cn('mt-2 text-3xl font-medium', cardTheme.meta)}>{recipe.prepMinutes ?? '-'} min</p>
				</div>
				<div class="rounded-[1rem] px-2 py-1.5">
					<p class="text-[0.72rem] tracking-[0.22em] text-stone-500 uppercase">Cook time</p>
					<p class={cn('mt-2 text-3xl font-medium', cardTheme.meta)}>{recipe.cookMinutes ?? '-'} min</p>
				</div>
			</div>

			<div class="mt-10 grid gap-8 xl:grid-cols-2">
				<section>
					<h3 class={cn('border-b border-stone-200 pb-3 text-[0.88rem] font-semibold tracking-[0.26em] uppercase', cardTheme.sectionTitle)}>
						Ingredients
					</h3>
					{#if recipe.ingredients.length === 0}
						<p class="pt-5 text-sm leading-7 text-stone-500">Add your first ingredient to get started.</p>
					{:else}
						<ul class="space-y-4 pt-6">
							{#each recipe.ingredients as ingredient, index (`${ingredient.name}-${index}`)}
								<li class="flex gap-3 text-lg leading-8 text-stone-800">
									<span class={cn('mt-3 inline-block size-2 shrink-0 rounded-full', cardTheme.bullet)}></span>
									<span>{formatIngredient(ingredient)}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section>
					<h3 class={cn('border-b border-stone-200 pb-3 text-[0.88rem] font-semibold tracking-[0.26em] uppercase', cardTheme.sectionTitle)}>
						The Method
					</h3>
					{#if recipe.steps.length === 0}
						<p class="pt-5 text-sm leading-7 text-stone-500">Add your first step to outline how to cook the dish.</p>
					{:else}
						<ol class="space-y-5 pt-6">
							{#each recipe.steps as step, index (`${step}-${index}`)}
								<li class="flex gap-4 text-lg leading-8 text-stone-800">
									<span class={cn('font-semibold', cardTheme.stepNumber)}>{String(index + 1).padStart(2, '0')}</span>
									<span>{step}</span>
								</li>
							{/each}
						</ol>
					{/if}
				</section>
			</div>
		</div>
	</div>
</Card.Root>
