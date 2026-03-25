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

<div class="space-y-8 pb-5">
	<section class="border-b border-stone-200/70 pb-8">
		<div class="mb-8">
			<p class="text-[0.95rem] font-semibold tracking-[0.24em] text-stone-700 uppercase">Recipe Details</p>
		</div>

		<div class="space-y-6">
			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-title" class="text-[1.1rem] font-medium text-stone-700">Recipe Title</label>
				</div>
				<Input.Root
					id="recipe-title"
					maxlength={120}
					disabled={readonly}
					placeholder="e.g. Creamy Tomato Gnocchi"
					class="h-20 rounded-2xl border-0 bg-white px-6 font-serif text-[2rem] text-stone-900 shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.title}
					oninput={(event) => updateRecipe({ title: event.currentTarget.value.slice(0, 120) })}
				/>
			</section>

			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-description" class="text-[1.1rem] font-medium text-stone-700">Description</label>
				</div>
				<Textarea.Root
					id="recipe-description"
					maxlength={320}
					disabled={readonly}
					rows={4}
					placeholder="Tell people what makes this recipe special."
					class="min-h-40 rounded-2xl border-0 bg-white px-6 py-5 text-[1rem] leading-[1.7] text-stone-700 shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.description}
					oninput={(event) => updateRecipe({ description: event.currentTarget.value.slice(0, 320) })}
				/>
			</section>

			<section class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="servings" class="text-[1.1rem] font-medium text-stone-700">Servings</label>
					<Input.Root
						id="servings"
						disabled={readonly}
						placeholder="4-6"
						class="h-18 rounded-2xl border-0 bg-white px-6 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.servings === null ? '' : `${recipe.servings}`}
						oninput={(event) => updateNumber('servings', event.currentTarget.value)}
					/>
				</div>
				<div class="space-y-2">
					<label for="prep-minutes" class="text-[1.1rem] font-medium text-stone-700">Prep Time</label>
					<Input.Root
						id="prep-minutes"
						disabled={readonly}
						placeholder="20 mins"
						class="h-18 rounded-2xl border-0 bg-white px-6 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.prepMinutes === null ? '' : `${recipe.prepMinutes}`}
						oninput={(event) => updateNumber('prepMinutes', event.currentTarget.value)}
					/>
				</div>
			</section>
		</div>
	</section>

	<section class="border-b border-stone-200/70 pb-8">
		<div class="mb-6 flex items-center justify-between gap-4">
			<div class="space-y-1">
				<p class="text-[0.95rem] font-semibold tracking-[0.24em] text-stone-700 uppercase">Ingredients</p>
			</div>
			<button
				type="button"
				class="text-sm font-semibold tracking-[0.08em] text-amber-700 uppercase transition hover:text-amber-800"
				onclick={addIngredient}
				disabled={readonly}
			>
				+ Add Row
			</button>
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
							class="group grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<div class="flex items-center gap-1.5">
							<Button.Root
								variant="ghost"
								size="icon-sm"
								disabled={readonly}
								class="hidden touch-none text-stone-400 hover:bg-amber-100 hover:text-amber-900 group-hover:inline-flex"
								aria-label={`Drag ingredient ${index + 1} to reorder`}
								title="Drag to reorder"
								onpointerdown={(event) => startDrag('ingredients', index, event)}
							>
								<GripVerticalIcon class="size-4" />
							</Button.Root>
							<Input.Root
								aria-label={`Ingredient ${index + 1} amount`}
								disabled={readonly}
								placeholder="2 lbs"
								class="h-14 rounded-2xl border-0 bg-white px-5 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={[
									ingredient.amount === null ? '' : `${ingredient.amount}`,
									ingredient.unit
								]
									.filter(Boolean)
									.join(' ')}
								oninput={(event) => {
									const value = event.currentTarget.value.trim();
									const match = value.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)?\s*(.*)$/);
									const amountValue = match?.[1] ?? '';
									const unitValue = match?.[2] ?? '';
									const numeric = Number.parseFloat(amountValue);
									updateIngredient(index, 'amount', Number.isNaN(numeric) ? null : numeric);
									updateIngredient(index, 'unit', unitValue);
								}}
							/>
						</div>
						<Input.Root
							aria-label={`Ingredient ${index + 1} name`}
							disabled={readonly}
							placeholder="Heirloom Tomatoes, sliced"
							class="min-w-0 h-14 rounded-2xl border-0 bg-white px-5 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
							value={ingredient.name}
							oninput={(event) => updateIngredient(index, 'name', event.currentTarget.value)}
						/>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="pb-2">
		<div class="mb-6 flex items-center justify-between gap-4">
			<div class="space-y-1">
				<p class="text-[0.95rem] font-semibold tracking-[0.24em] text-stone-700 uppercase">Method</p>
			</div>
			<button
				type="button"
				class="text-sm font-semibold tracking-[0.08em] text-amber-700 uppercase transition hover:text-amber-800"
				onclick={() => {
					addStep(stepDraft || `Step ${recipe.steps.length + 1}`);
					stepDraft = '';
				}}
				disabled={readonly}
			>
				+ Add Step
			</button>
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
							class="group rounded-2xl bg-white px-4 py-4"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
							<div class="flex items-start gap-2.5">
								<div class="mt-1 flex items-center gap-1.5 pl-1 text-stone-400">
								<Button.Root
									variant="ghost"
									size="icon-sm"
									disabled={readonly}
									class="hidden touch-none text-stone-500 hover:bg-amber-100 hover:text-amber-900 group-hover:inline-flex"
									aria-label={`Drag step ${index + 1} to reorder`}
									title="Drag to reorder"
									onpointerdown={(event) => startDrag('steps', index, event)}
								>
									<GripVerticalIcon class="size-4" />
								</Button.Root>
								<span class="w-6 text-center text-sm font-medium text-amber-700">{String(index + 1).padStart(2, '0')}</span>
							</div>
							<Textarea.Root
								rows={2}
								aria-label={`Step ${index + 1}`}
								disabled={readonly}
									class="min-h-20 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-2 py-1 text-[1rem] leading-relaxed shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
								value={step}
								oninput={(event) => updateStep(index, event.currentTarget.value)}
							/>
							<div
								class="hidden shrink-0 flex-col gap-1 rounded-xl bg-white/70 p-1 opacity-100 transition-all duration-200 sm:group-focus-within:flex sm:group-hover:flex"
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
		</div>
	</section>

	<section class="border-t border-stone-200/70 pt-8">
		<div class="space-y-6">
			<section class="space-y-2">
				<div class="flex items-center justify-between gap-2">
					<label for="recipe-hero-image" class="text-[0.95rem] font-medium text-stone-700">Hero image URL</label>
					<p class="text-xs text-stone-500">{recipe.heroImageUrl.length}/2048</p>
				</div>
				<Input.Root
					id="recipe-hero-image"
					type="url"
					maxlength={2048}
					disabled={readonly}
					placeholder="https://images.example.com/your-dish.jpg"
					class="h-14 rounded-2xl border-0 bg-white px-5 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
					value={recipe.heroImageUrl}
					oninput={(event) => updateHeroImageUrl(event.currentTarget.value)}
				/>
				<p class="text-xs leading-5 text-stone-500">
					Optional. Paste a direct image URL, then drag the image in the live preview and use the
					mouse wheel to zoom.
				</p>
			</section>

			<section class="grid gap-4 sm:grid-cols-[1fr_1fr]">
				<div class="space-y-2">
					<label for="cook-minutes" class="text-[0.95rem] font-medium text-stone-700">Cook Time</label>
					<Input.Root
						id="cook-minutes"
						disabled={readonly}
						placeholder="30 mins"
						class="h-14 rounded-2xl border-0 bg-white px-5 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.cookMinutes === null ? '' : `${recipe.cookMinutes}`}
						oninput={(event) => updateNumber('cookMinutes', event.currentTarget.value)}
					/>
				</div>
			</section>

			<section>
				<div class="mb-4 space-y-1">
					<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Style</p>
					<h2 class="text-xl font-semibold tracking-tight text-stone-900">Theme</h2>
				</div>
				<Tabs.Root value={recipe.theme} onValueChange={setTheme} class="w-full gap-0">
					<Tabs.List class="grid h-auto w-full grid-cols-1 gap-2.5 bg-transparent p-0 sm:grid-cols-3">
						{#each themeOptions as option}
							<Tabs.Trigger
								value={option.value}
								disabled={readonly}
								class="group h-auto min-h-28 flex-col items-start rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-4 text-left whitespace-normal shadow-none transition-all duration-200 hover:border-amber-300/80 hover:bg-white data-[state=active]:border-amber-400 data-[state=active]:bg-white xl:px-5"
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
		</div>
	</section>
</div>
