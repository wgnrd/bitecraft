<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import * as Button from '$lib/components/ui/button';
	import * as Input from '$lib/components/ui/input';
	import * as Textarea from '$lib/components/ui/textarea';
	import * as Separator from '$lib/components/ui/separator';
	import type { Recipe, RecipeIngredient, RecipeTag } from '$lib/types';

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
	let tagDraft = $state('');
	let tagColorDraft = $state('#f7cfb0');

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

	const addTag = () => {
		if (readonly) {
			return;
		}

		const label = tagDraft.trim().slice(0, 32);
		if (!label) {
			return;
		}

		const nextTags: RecipeTag[] = [...recipe.tags, { label, color: tagColorDraft }];
		updateRecipe({ tags: nextTags });
		tagDraft = '';
		tagColorDraft = '#f7cfb0';
	};

	const removeTag = (index: number) => {
		if (readonly) {
			return;
		}

		updateRecipe({ tags: recipe.tags.filter((_, tagIndex) => tagIndex !== index) });
	};

</script>

<div class="space-y-8 pb-5">
	<section class="border-b border-stone-200/70 pb-8">
		<div class="mb-8">
			<p class="text-[0.95rem] font-semibold tracking-[0.24em] text-stone-700 uppercase">Recipe Details</p>
		</div>

		<div class="space-y-6">
			<section class="space-y-2">
				<div class="flex items-center justify-between rounded-2xl bg-white px-5 py-4">
					<div>
						<p class="text-[1rem] font-medium text-stone-800">Show Hero Image</p>
						<p class="mt-1 text-sm text-stone-500">Display the image panel on the final card.</p>
					</div>
					<label class="relative inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							class="peer sr-only"
							checked={recipe.showHeroImage}
							disabled={readonly}
							onchange={(event) =>
								updateRecipe({ showHeroImage: (event.currentTarget as HTMLInputElement).checked })}
						/>
						<span class="h-7 w-12 rounded-full bg-stone-300 transition peer-checked:bg-stone-900"></span>
						<span class="absolute left-1 size-5 rounded-full bg-white transition peer-checked:translate-x-5"></span>
					</label>
				</div>

				{#if recipe.showHeroImage}
					<div class="space-y-2 pt-2">
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
					</div>
				{/if}
			</section>

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

			<section class="space-y-3">
				<div class="flex items-center justify-between gap-4">
					<label for="recipe-tag" class="text-[1rem] font-medium text-stone-700">Card Tags</label>
					<button
						type="button"
						class="text-sm font-semibold tracking-[0.08em] text-amber-700 uppercase transition hover:text-amber-800"
						onclick={addTag}
						disabled={readonly || !tagDraft.trim()}
					>
						+ Add Tag
					</button>
				</div>
				<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
					<Input.Root
						id="recipe-tag"
						maxlength={32}
						disabled={readonly}
						placeholder="e.g. Seasonal"
						class="h-14 rounded-2xl border-0 bg-white px-5 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						bind:value={tagDraft}
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								addTag();
							}
						}}
					/>
					<input
						id="recipe-tag-color"
						type="color"
						disabled={readonly}
						bind:value={tagColorDraft}
						class="h-14 w-full rounded-2xl border-0 bg-white p-2 shadow-none"
					/>
					<div class="hidden sm:block"></div>
				</div>
				{#if recipe.tags.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each recipe.tags as tag, index (index)}
							<div
								class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
								style={`background:${tag.color}; color:${/^#(?:f|F){6}$/.test(tag.color) ? '#1f1a17' : 'inherit'};`}
							>
								<span>{tag.label}</span>
								<button
									type="button"
									class="inline-flex size-5 items-center justify-center rounded-full bg-black/10 text-current"
									aria-label={`Remove tag ${tag.label}`}
									onclick={() => removeTag(index)}
								>
									×
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="grid gap-4 sm:grid-cols-3">
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
				<div class="space-y-2">
					<label for="cook-minutes" class="text-[1.1rem] font-medium text-stone-700">Cook Time</label>
					<Input.Root
						id="cook-minutes"
						disabled={readonly}
						placeholder="30 mins"
						class="h-18 rounded-2xl border-0 bg-white px-6 text-[1rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
						value={recipe.cookMinutes === null ? '' : `${recipe.cookMinutes}`}
						oninput={(event) => updateNumber('cookMinutes', event.currentTarget.value)}
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
						class="grid grid-cols-[auto_5.75rem_minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[auto_11rem_minmax(0,1fr)_auto] md:gap-3"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<div class="flex flex-col gap-1">
							<Button.Root
								variant="ghost"
								size="icon-sm"
								disabled={readonly || index === 0}
								class="size-7 rounded-full text-stone-500 hover:bg-stone-200/70 hover:text-stone-900 sm:size-8"
								onclick={() => moveItem('ingredients', index, index - 1)}
								aria-label={`Move ingredient ${index + 1} up`}
							>
								<ChevronUpIcon class="size-4" />
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="icon-sm"
								disabled={readonly || index === recipe.ingredients.length - 1}
								class="size-7 rounded-full text-stone-500 hover:bg-stone-200/70 hover:text-stone-900 sm:size-8"
								onclick={() => moveItem('ingredients', index, index + 1)}
								aria-label={`Move ingredient ${index + 1} down`}
							>
								<ChevronDownIcon class="size-4" />
							</Button.Root>
						</div>
						<Input.Root
							aria-label={`Ingredient ${index + 1} amount`}
							disabled={readonly}
							placeholder="2 lbs"
							class="h-12 rounded-2xl border-0 bg-white px-4 text-[0.95rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70 sm:h-14 sm:px-5 sm:text-[1rem]"
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
						<Input.Root
							aria-label={`Ingredient ${index + 1} name`}
							disabled={readonly}
							placeholder="Heirloom Tomatoes, sliced"
							class="min-w-0 h-12 rounded-2xl border-0 bg-white px-4 text-[0.95rem] shadow-none transition focus-visible:border-amber-300 focus-visible:ring-amber-200/70 sm:h-14 sm:px-5 sm:text-[1rem]"
							value={ingredient.name}
							oninput={(event) => updateIngredient(index, 'name', event.currentTarget.value)}
						/>
						<div class="flex items-center justify-end md:pr-1">
							<Button.Root
								variant="ghost"
								size="icon-sm"
								disabled={readonly}
								class="size-8 rounded-full text-stone-500 hover:bg-destructive/10 hover:text-destructive sm:size-9"
								onclick={() => removeItem('ingredients', index)}
								aria-label={`Remove ingredient ${index + 1}`}
								title="Remove row"
							>
								<Trash2Icon class="size-4" />
							</Button.Root>
						</div>
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
						class="rounded-2xl bg-white px-4 py-4"
						animate:flip={{ duration: 200 }}
						in:fly={{ y: 6, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<div class="flex items-start gap-2.5">
							<div class="mt-1 flex items-center gap-1.5 pl-1 text-stone-400">
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
						</div>
						<div class="mt-3 flex flex-wrap items-center justify-end gap-2">
							<Button.Root
								variant="ghost"
								size="sm"
								disabled={readonly || index === 0}
								class="h-9 rounded-full px-3 text-stone-500 hover:bg-stone-200/70 hover:text-stone-900"
								onclick={() => moveItem('steps', index, index - 1)}
							>
								<ChevronUpIcon class="size-4" />
								Up
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="sm"
								disabled={readonly || index === recipe.steps.length - 1}
								class="h-9 rounded-full px-3 text-stone-500 hover:bg-stone-200/70 hover:text-stone-900"
								onclick={() => moveItem('steps', index, index + 1)}
							>
								<ChevronDownIcon class="size-4" />
								Down
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="sm"
								disabled={readonly}
								class="h-9 rounded-full px-3 text-stone-500 hover:bg-destructive/10 hover:text-destructive"
								onclick={() => removeItem('steps', index)}
								aria-label={`Remove step ${index + 1}`}
								title="Remove"
							>
								<Trash2Icon class="size-4" />
								Delete
							</Button.Root>
						</div>
					</div>
				{/each}
			</div>

			<Separator.Root class="bg-stone-200/80" />
		</div>
	</section>

</div>
