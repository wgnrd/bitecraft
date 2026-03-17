<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import LeafIcon from '@lucide/svelte/icons/leaf';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UtensilsCrossedIcon from '@lucide/svelte/icons/utensils-crossed';
	import * as Button from '$lib/components/ui/button';
	import * as Input from '$lib/components/ui/input';
	import * as Textarea from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Separator from '$lib/components/ui/separator';
	import type { Recipe, RecipeIngredient, RecipeTheme } from '$lib/types';

	let {
		recipe,
		onRecipeChange,
		readonly = false
	}: {
		recipe: Recipe;
		onRecipeChange: (nextRecipe: Recipe) => void;
		readonly?: boolean;
	} = $props();

	let stepDraft = $state('');
	let ingredientRowRefs: Array<HTMLDivElement | null> = $state([]);
	let stepRowRefs: Array<HTMLDivElement | null> = $state([]);
	let activeDrag:
		| {
				field: 'ingredients' | 'steps';
				index: number;
				pointerId: number;
		  }
		| null = $state(null);

	const updateRecipe = (patch: Partial<Recipe>) => {
		if (readonly) {
			return;
		}

		onRecipeChange({ ...recipe, ...patch });
	};

	const updateHeroImageUrl = (value: string) => {
		updateRecipe({
			heroImageUrl: value.trim().slice(0, 2048),
			heroImageScale: 1,
			heroImagePositionX: 50,
			heroImagePositionY: 50
		});
	};

	const updateNumber = (field: 'servings' | 'prepMinutes' | 'cookMinutes', value: string) => {
		if (!value.trim()) {
			updateRecipe({ [field]: null });
			return;
		}

		const parsed = Number.parseInt(value, 10);
		updateRecipe({ [field]: Number.isNaN(parsed) ? null : Math.max(0, parsed) });
	};

	const updateStep = (index: number, value: string) => {
		const next = [...recipe.steps];
		next[index] = value;
		updateRecipe({ steps: next });
	};

	const addStep = (value: string) => {
		if (readonly) {
			return;
		}

		const normalized = value.trim();
		if (!normalized) {
			return;
		}

		updateRecipe({ steps: [...recipe.steps, normalized] });
	};

	const updateIngredient = (
		index: number,
		field: keyof RecipeIngredient,
		value: string | number | null
	) => {
		const next = recipe.ingredients.map((ingredient, ingredientIndex) =>
			ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
		);
		updateRecipe({ ingredients: next });
	};

	const updateIngredientAmount = (index: number, value: string) => {
		if (!value.trim()) {
			updateIngredient(index, 'amount', null);
			return;
		}

		const parsed = Number.parseFloat(value);
		updateIngredient(index, 'amount', Number.isNaN(parsed) || parsed < 0 ? null : parsed);
	};

	const addIngredient = () => {
		if (readonly) {
			return;
		}

		updateRecipe({
			ingredients: [...recipe.ingredients, { name: '', amount: null, unit: '' }]
		});
	};

	const removeItem = (field: 'ingredients' | 'steps', index: number) => {
		if (readonly) {
			return;
		}

		updateRecipe({ [field]: recipe[field].filter((_, itemIndex) => itemIndex !== index) });
	};

	const moveItem = (field: 'ingredients' | 'steps', fromIndex: number, toIndex: number) => {
		if (
			fromIndex === toIndex ||
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= recipe[field].length ||
			toIndex >= recipe[field].length
		) {
			return;
		}

		const next = [...recipe[field]];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		updateRecipe({ [field]: next });
	};

	const getRowRefs = (field: 'ingredients' | 'steps') =>
		field === 'ingredients' ? ingredientRowRefs : stepRowRefs;

	const startDrag = (field: 'ingredients' | 'steps', index: number, event: PointerEvent) => {
		if (readonly) {
			return;
		}

		if (event.button !== 0 && event.pointerType === 'mouse') {
			return;
		}

		const handle = event.currentTarget;
		if (handle instanceof HTMLElement) {
			handle.setPointerCapture(event.pointerId);
		}

		activeDrag = { field, index, pointerId: event.pointerId };
		event.preventDefault();
	};

	const handleDragPointerMove = (event: PointerEvent) => {
		if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
			return;
		}

		const rowRefs = getRowRefs(activeDrag.field);
		const targetIndex = rowRefs.findIndex((row) => {
			if (!row) {
				return false;
			}

			const rect = row.getBoundingClientRect();
			return event.clientY >= rect.top && event.clientY <= rect.bottom;
		});

		if (targetIndex === -1 || targetIndex === activeDrag.index) {
			return;
		}

		moveItem(activeDrag.field, activeDrag.index, targetIndex);
		activeDrag = { ...activeDrag, index: targetIndex };
	};

	const endDrag = (event: PointerEvent) => {
		if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
			return;
		}

		activeDrag = null;
	};

	const setTheme = (theme: string) => {
		if (readonly) {
			return;
		}

		updateRecipe({ theme: theme as RecipeTheme });
	};

	const themeOptions: {
		value: RecipeTheme;
		label: string;
		description: string;
		swatchStyle: string;
		icon: typeof UtensilsCrossedIcon;
	}[] = [
		{
			value: 'classic',
			label: 'Classic',
			description: 'Warm serif with handcrafted details.',
			swatchStyle: 'linear-gradient(90deg, rgb(252 211 77), rgb(253 186 116), rgb(231 229 228))',
			icon: UtensilsCrossedIcon
		},
		{
			value: 'minimal',
			label: 'Minimal',
			description: 'Quiet monochrome and clean rhythm.',
			swatchStyle: 'linear-gradient(90deg, rgb(231 229 228), rgb(245 245 244), rgb(244 244 245))',
			icon: LeafIcon
		},
		{
			value: 'bold',
			label: 'Bold',
			description: 'Expressive contrast and strong accents.',
			swatchStyle: 'linear-gradient(90deg, rgb(253 164 175), rgb(254 215 170), rgb(254 240 138))',
			icon: SparklesIcon
		}
	];
</script>

<svelte:window
	onpointermove={handleDragPointerMove}
	onpointerup={endDrag}
	onpointercancel={endDrag}
/>

<div class="space-y-5 pb-5">
	<section
			class="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-lg shadow-amber-100/35 backdrop-blur sm:p-6 xl:p-7"
		>
		<div class="mb-5 flex items-end justify-between gap-4">
			<div class="space-y-1">
				<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Recipe Details</p>
				<h2 class="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">Basics</h2>
				<p class="text-sm text-stone-600">Start with the core information for the recipe card.</p>
			</div>
		</div>

		<div class="space-y-6">
			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-title" class="text-sm font-medium text-stone-800">Title</label>
					<p class="text-xs text-stone-500">{recipe.title.length}/120</p>
				</div>
				<Input.Root
					id="recipe-title"
					maxlength={120}
					disabled={readonly}
					placeholder="e.g. Creamy Tomato Gnocchi"
					class="h-11 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.title}
					oninput={(event) => updateRecipe({ title: event.currentTarget.value.slice(0, 120) })}
				/>
			</section>

			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-description" class="text-sm font-medium text-stone-800">Description</label>
					<p class="text-xs text-stone-500">{recipe.description.length}/320</p>
				</div>
				<Textarea.Root
					id="recipe-description"
					maxlength={320}
					disabled={readonly}
					rows={4}
					placeholder="Tell people what makes this recipe special."
					class="min-h-28 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-sm leading-relaxed transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.description}
					oninput={(event) => updateRecipe({ description: event.currentTarget.value.slice(0, 320) })}
				/>
			</section>

			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-hero-image" class="text-sm font-medium text-stone-800">Hero image URL</label>
					<p class="text-xs text-stone-500">{recipe.heroImageUrl.length}/2048</p>
				</div>
				<Input.Root
					id="recipe-hero-image"
					type="url"
					maxlength={2048}
					disabled={readonly}
					placeholder="https://images.example.com/your-dish.jpg"
					class="h-11 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.heroImageUrl}
					oninput={(event) => updateHeroImageUrl(event.currentTarget.value)}
				/>
				<p class="text-xs leading-5 text-stone-500">
					Optional. Paste a direct image URL, then drag the image in the live preview and use the
					mouse wheel to zoom.
				</p>
			</section>

			<section class="grid gap-3 sm:grid-cols-3">
				<div class="space-y-2">
					<label for="servings" class="text-sm font-medium text-stone-800">Servings</label>
					<Input.Root
						id="servings"
						type="number"
						min={0}
						disabled={readonly}
						placeholder="4"
						class="h-11 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.servings?.toString() ?? ''}
						oninput={(event) => updateNumber('servings', event.currentTarget.value)}
					/>
				</div>
				<div class="space-y-2">
					<label for="prep-minutes" class="text-sm font-medium text-stone-800">Prep (min)</label>
					<Input.Root
						id="prep-minutes"
						type="number"
						min={0}
						disabled={readonly}
						placeholder="15"
						class="h-11 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.prepMinutes?.toString() ?? ''}
						oninput={(event) => updateNumber('prepMinutes', event.currentTarget.value)}
					/>
				</div>
				<div class="space-y-2">
					<label for="cook-minutes" class="text-sm font-medium text-stone-800">Cook (min)</label>
					<Input.Root
						id="cook-minutes"
						type="number"
						min={0}
						disabled={readonly}
						placeholder="25"
						class="h-11 rounded-xl border-stone-200 bg-stone-50/80 px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.cookMinutes?.toString() ?? ''}
						oninput={(event) => updateNumber('cookMinutes', event.currentTarget.value)}
					/>
				</div>
			</section>
		</div>
	</section>

	<section class="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-lg shadow-amber-100/35 backdrop-blur sm:p-6 xl:p-7">
		<div class="mb-4 space-y-1">
			<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Style</p>
			<h2 class="text-xl font-semibold tracking-tight text-stone-900">Theme</h2>
			<p class="text-sm text-stone-600">Choose how the live recipe card should feel and read.</p>
		</div>
		<Tabs.Root value={recipe.theme} onValueChange={setTheme} class="w-full gap-0">
			<Tabs.List class="grid h-auto w-full grid-cols-1 gap-2.5 bg-transparent p-0 sm:grid-cols-3">
				{#each themeOptions as option}
						<Tabs.Trigger
							value={option.value}
							disabled={readonly}
							class="group h-auto min-h-32 flex-col items-start rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-4 text-left whitespace-normal shadow-sm transition-all duration-200 hover:border-amber-300/80 hover:bg-white data-[state=active]:border-amber-400 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-100/70 xl:min-h-36 xl:px-5"
						>
							<div class="mb-3 flex h-10 w-full items-center justify-center rounded-lg" style={`background: ${option.swatchStyle}`}>
								<div class="flex size-7 items-center justify-center rounded-full bg-white/75 text-stone-700 shadow-sm backdrop-blur">
									<option.icon class="size-3.5" />
								</div>
							</div>
							<div class="text-base font-semibold text-stone-900">{option.label}</div>
							<p class="mt-1 w-full break-words text-sm leading-relaxed text-stone-600">{option.description}</p>
						</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	</section>

	<section class="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-lg shadow-amber-100/35 backdrop-blur sm:p-6 xl:p-7">
		<div class="mb-4 flex items-center justify-between gap-4">
			<div class="space-y-1">
				<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Shopping List</p>
				<h2 class="text-xl font-semibold tracking-tight text-stone-900">Ingredients</h2>
			</div>
			<span class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">
				{recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}
			</span>
		</div>

		<div class="space-y-4">
			{#if recipe.ingredients.length === 0}
				<p class="rounded-2xl border border-dashed border-stone-300/80 bg-stone-50/60 px-4 py-3 text-sm text-stone-600">
					Add your first ingredient to start the list.
				</p>
			{/if}

				<div class="space-y-3">
					{#each recipe.ingredients as ingredient, index (index)}
					<div
							bind:this={ingredientRowRefs[index]}
							class="group rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3 transition-all duration-200 hover:border-stone-300 hover:bg-white"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-center gap-1.5 pl-1 text-stone-400">
								<Button.Root
									variant="ghost"
									size="icon-sm"
									disabled={readonly}
									class="touch-none text-stone-500 hover:bg-amber-100 hover:text-amber-900"
									aria-label={`Drag ingredient ${index + 1} to reorder`}
									title="Drag to reorder"
									onpointerdown={(event) => startDrag('ingredients', index, event)}
								>
									<GripVerticalIcon class="size-4" />
								</Button.Root>
								<span class="w-4 text-center text-xs font-medium text-stone-500">{index + 1}</span>
							</div>
							<div
								class="flex items-center gap-1 rounded-xl bg-white/70 p-1 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
							>
								<Button.Root
									variant="ghost"
									size="icon-sm"
									disabled={readonly}
									class="text-stone-500 hover:bg-destructive/10 hover:text-destructive"
									onclick={() => removeItem('ingredients', index)}
									aria-label={`Remove ingredient ${index + 1}`}
									title="Remove"
								>
									<Trash2Icon class="size-4" />
								</Button.Root>
							</div>
						</div>
						<div class="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
							<Input.Root
								aria-label={`Ingredient ${index + 1} name`}
								disabled={readonly}
								placeholder="Fresh parsley"
								class="min-w-0 h-11 rounded-xl border-stone-200 bg-white px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={ingredient.name}
								oninput={(event) => updateIngredient(index, 'name', event.currentTarget.value)}
							/>
							<Input.Root
								aria-label={`Ingredient ${index + 1} amount`}
								type="number"
								min={0}
								step="any"
								disabled={readonly}
								placeholder="2"
								class="h-11 rounded-xl border-stone-200 bg-white px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={ingredient.amount?.toString() ?? ''}
								oninput={(event) => updateIngredientAmount(index, event.currentTarget.value)}
							/>
							<Input.Root
								aria-label={`Ingredient ${index + 1} unit`}
								disabled={readonly}
								placeholder="tbsp"
								class="h-11 rounded-xl border-stone-200 bg-white px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={ingredient.unit}
								oninput={(event) => updateIngredient(index, 'unit', event.currentTarget.value)}
							/>
						</div>
					</div>
				{/each}
			</div>

				<div class="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-2.5">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<p class="px-2 text-sm text-stone-600">
						Add structured ingredients with separate name, amount, and unit fields.
					</p>
					<Button.Root
							disabled={readonly}
							class="h-11 gap-1.5 rounded-xl bg-stone-900 px-4.5 text-stone-50 transition hover:bg-stone-800"
						onclick={addIngredient}
					>
						<PlusIcon class="size-4" />
						Add ingredient
					</Button.Root>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-3xl border border-stone-200/70 bg-white/80 p-5 shadow-lg shadow-amber-100/35 backdrop-blur sm:p-6 xl:p-7">
		<div class="mb-4 flex items-center justify-between gap-4">
			<div class="space-y-1">
				<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Method</p>
				<h2 class="text-xl font-semibold tracking-tight text-stone-900">Steps</h2>
			</div>
			<span class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">
				{recipe.steps.length} step{recipe.steps.length === 1 ? '' : 's'}
			</span>
		</div>

		<div class="space-y-4">
			{#if recipe.steps.length === 0}
				<p class="rounded-2xl border border-dashed border-stone-300/80 bg-stone-50/60 px-4 py-3 text-sm text-stone-600">
					Add your first step to outline the method.
				</p>
			{/if}

				<div class="space-y-3">
					{#each recipe.steps as step, index (index)}
					<div
							bind:this={stepRowRefs[index]}
							class="group rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3 transition-all duration-200 hover:border-stone-300 hover:bg-white"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
							<div class="flex items-start gap-2.5">
								<div class="mt-3 flex items-center gap-1.5 pl-1 text-stone-400">
								<Button.Root
									variant="ghost"
									size="icon-sm"
									disabled={readonly}
									class="touch-none text-stone-500 hover:bg-amber-100 hover:text-amber-900"
									aria-label={`Drag step ${index + 1} to reorder`}
									title="Drag to reorder"
									onpointerdown={(event) => startDrag('steps', index, event)}
								>
									<GripVerticalIcon class="size-4" />
								</Button.Root>
								<span class="w-4 text-center text-xs font-medium text-stone-500">{index + 1}</span>
							</div>
							<Textarea.Root
								rows={2}
								aria-label={`Step ${index + 1}`}
								disabled={readonly}
									class="min-h-24 min-w-0 flex-1 rounded-xl border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={step}
								oninput={(event) => updateStep(index, event.currentTarget.value)}
							/>
							<div
								class="flex shrink-0 flex-col gap-1 rounded-xl bg-white/70 p-1 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
							>
								<Button.Root
									variant="ghost"
									size="icon-sm"
									disabled={readonly}
									class="text-stone-500 hover:bg-destructive/10 hover:text-destructive"
									onclick={() => removeItem('steps', index)}
									aria-label={`Remove step ${index + 1}`}
									title="Remove"
								>
									<Trash2Icon class="size-4" />
								</Button.Root>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<Separator.Root class="bg-stone-200/80" />

				<div class="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-2.5">
				<Input.Root
					aria-label="New step"
					disabled={readonly}
					placeholder="e.g. Simmer for 10 minutes"
						class="h-11 rounded-xl border-stone-200 bg-white px-3.5 text-sm transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					bind:value={stepDraft}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addStep(stepDraft);
							stepDraft = '';
						}
					}}
				/>
				<Button.Root
						disabled={readonly || !stepDraft.trim()}
						class="mt-2 h-11 w-full gap-1.5 rounded-xl bg-stone-900 px-4.5 text-stone-50 transition hover:bg-stone-800 sm:mt-0 sm:w-auto"
					onclick={() => {
						addStep(stepDraft);
						stepDraft = '';
					}}
				>
					<PlusIcon class="size-4" />
					Add step
				</Button.Root>
			</div>
		</div>
	</section>
</div>
