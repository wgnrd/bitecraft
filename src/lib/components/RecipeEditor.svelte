<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Input from '$lib/components/ui/input';
	import * as Textarea from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Separator from '$lib/components/ui/separator';
	import type { Recipe, RecipeTheme } from '$lib/types';

	let {
		recipe,
		onRecipeChange
	}: {
		recipe: Recipe;
		onRecipeChange: (nextRecipe: Recipe) => void;
	} = $props();

	let ingredientDraft = $state('');
	let stepDraft = $state('');

	const updateRecipe = (patch: Partial<Recipe>) => {
		onRecipeChange({ ...recipe, ...patch });
	};

	const updateNumber = (field: 'servings' | 'prepMinutes' | 'cookMinutes', value: string) => {
		if (!value.trim()) {
			updateRecipe({ [field]: null });
			return;
		}

		const parsed = Number.parseInt(value, 10);
		updateRecipe({ [field]: Number.isNaN(parsed) ? null : Math.max(0, parsed) });
	};

	const updateItem = (field: 'ingredients' | 'steps', index: number, value: string) => {
		const next = [...recipe[field]];
		next[index] = value;
		updateRecipe({ [field]: next });
	};

	const addItem = (field: 'ingredients' | 'steps', value: string) => {
		const normalized = value.trim();
		if (!normalized) {
			return;
		}

		updateRecipe({ [field]: [...recipe[field], normalized] });
	};

	const removeItem = (field: 'ingredients' | 'steps', index: number) => {
		updateRecipe({ [field]: recipe[field].filter((_, itemIndex) => itemIndex !== index) });
	};

	const moveItem = (field: 'ingredients' | 'steps', index: number, direction: -1 | 1) => {
		const target = index + direction;
		if (target < 0 || target >= recipe[field].length) {
			return;
		}

		const next = [...recipe[field]];
		[next[index], next[target]] = [next[target], next[index]];
		updateRecipe({ [field]: next });
	};

	const setTheme = (theme: string) => {
		updateRecipe({ theme: theme as RecipeTheme });
	};
</script>

<div class="space-y-4 pb-4">
	<Card.Root class="rounded-2xl border border-black/5 bg-white/75 shadow-xl shadow-amber-100/40 backdrop-blur">
		<Card.Header class="space-y-2">
			<Card.Title class="text-xl font-semibold tracking-tight">Basics</Card.Title>
			<Card.Description>Start with the essential details for your recipe card.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-5">
			<section class="space-y-2">
				<label for="recipe-title" class="text-sm font-medium">Title</label>
				<Input.Root
					id="recipe-title"
					maxlength={120}
					placeholder="e.g. Creamy Tomato Gnocchi"
					value={recipe.title}
					oninput={(event) => updateRecipe({ title: event.currentTarget.value.slice(0, 120) })}
				/>
				<p class="text-xs text-muted-foreground">{recipe.title.length}/120</p>
			</section>

			<section class="space-y-2">
				<label for="recipe-description" class="text-sm font-medium">Description</label>
				<Textarea.Root
					id="recipe-description"
					maxlength={320}
					rows={3}
					placeholder="Tell people what makes this recipe special."
					value={recipe.description}
					oninput={(event) => updateRecipe({ description: event.currentTarget.value.slice(0, 320) })}
				/>
				<p class="text-xs text-muted-foreground">{recipe.description.length}/320</p>
			</section>

			<section class="grid gap-3 sm:grid-cols-3">
				<div class="space-y-2">
					<label for="servings" class="text-sm font-medium">Servings</label>
					<Input.Root
						id="servings"
						type="number"
						min={0}
						placeholder="4"
						value={recipe.servings?.toString() ?? ''}
						oninput={(event) => updateNumber('servings', event.currentTarget.value)}
					/>
				</div>
				<div class="space-y-2">
					<label for="prep-minutes" class="text-sm font-medium">Prep (min)</label>
					<Input.Root
						id="prep-minutes"
						type="number"
						min={0}
						placeholder="15"
						value={recipe.prepMinutes?.toString() ?? ''}
						oninput={(event) => updateNumber('prepMinutes', event.currentTarget.value)}
					/>
				</div>
				<div class="space-y-2">
					<label for="cook-minutes" class="text-sm font-medium">Cook (min)</label>
					<Input.Root
						id="cook-minutes"
						type="number"
						min={0}
						placeholder="25"
						value={recipe.cookMinutes?.toString() ?? ''}
						oninput={(event) => updateNumber('cookMinutes', event.currentTarget.value)}
					/>
				</div>
			</section>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-2xl border border-black/5 bg-white/75 shadow-xl shadow-amber-100/40 backdrop-blur">
		<Card.Header>
			<Card.Title class="text-xl font-semibold tracking-tight">Theme</Card.Title>
			<Card.Description>Pick a visual tone for your recipe card.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Tabs.Root value={recipe.theme} onValueChange={setTheme} class="w-full gap-0">
				<Tabs.List class="grid h-11 w-full grid-cols-3 rounded-xl bg-muted/70 p-1">
					<Tabs.Trigger value="classic">Classic</Tabs.Trigger>
					<Tabs.Trigger value="minimal">Minimal</Tabs.Trigger>
					<Tabs.Trigger value="bold">Bold</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-2xl border border-black/5 bg-white/75 shadow-xl shadow-amber-100/40 backdrop-blur">
		<Card.Header>
			<Card.Title class="text-xl font-semibold tracking-tight">Ingredients</Card.Title>
			<Card.Description>{recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if recipe.ingredients.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-3 text-sm text-muted-foreground">
					Add your first ingredient to start the list.
				</p>
			{/if}

			<div class="space-y-2">
				{#each recipe.ingredients as ingredient, index (`${ingredient}-${index}`)}
					<div
						class="group flex items-center gap-2 rounded-xl border border-black/5 bg-white/70 p-2 transition hover:bg-white"
						animate:flip={{ duration: 190 }}
						in:fly={{ y: 8, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<Input.Root
							aria-label={`Ingredient ${index + 1}`}
							value={ingredient}
							oninput={(event) => updateItem('ingredients', index, event.currentTarget.value)}
						/>
						<div class="flex items-center gap-1">
							<Button.Root
								variant="ghost"
								size="icon-sm"
								onclick={() => moveItem('ingredients', index, -1)}
								disabled={index === 0}
								aria-label={`Move ingredient ${index + 1} up`}
								title="Move up"
							>
								<ChevronUpIcon class="size-4" />
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="icon-sm"
								onclick={() => moveItem('ingredients', index, 1)}
								disabled={index === recipe.ingredients.length - 1}
								aria-label={`Move ingredient ${index + 1} down`}
								title="Move down"
							>
								<ChevronDownIcon class="size-4" />
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="icon-sm"
								class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								onclick={() => removeItem('ingredients', index)}
								aria-label={`Remove ingredient ${index + 1}`}
								title="Remove"
							>
								<Trash2Icon class="size-4" />
							</Button.Root>
						</div>
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-2 sm:flex-row">
				<Input.Root
					aria-label="New ingredient"
					placeholder="e.g. 2 tbsp olive oil"
					bind:value={ingredientDraft}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addItem('ingredients', ingredientDraft);
							ingredientDraft = '';
						}
					}}
				/>
				<Button.Root
					class="gap-1.5"
					onclick={() => {
						addItem('ingredients', ingredientDraft);
						ingredientDraft = '';
					}}
					disabled={!ingredientDraft.trim()}
				>
					<PlusIcon class="size-4" />
					Add ingredient
				</Button.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-2xl border border-black/5 bg-white/75 shadow-xl shadow-amber-100/40 backdrop-blur">
		<Card.Header>
			<Card.Title class="text-xl font-semibold tracking-tight">Steps</Card.Title>
			<Card.Description>{recipe.steps.length} step{recipe.steps.length === 1 ? '' : 's'}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if recipe.steps.length === 0}
				<p class="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-3 text-sm text-muted-foreground">
					Add your first step to outline the method.
				</p>
			{/if}

			<div class="space-y-2">
				{#each recipe.steps as step, index (`${step}-${index}`)}
					<div
						class="group flex items-start gap-2 rounded-xl border border-black/5 bg-white/70 p-2 transition hover:bg-white"
						animate:flip={{ duration: 190 }}
						in:fly={{ y: 8, duration: 180 }}
						out:fade={{ duration: 130 }}
					>
						<Textarea.Root
							rows={2}
							aria-label={`Step ${index + 1}`}
							value={step}
							oninput={(event) => updateItem('steps', index, event.currentTarget.value)}
						/>
						<div class="flex shrink-0 flex-col gap-1">
							<Button.Root
								variant="ghost"
								size="icon-sm"
								onclick={() => moveItem('steps', index, -1)}
								disabled={index === 0}
								aria-label={`Move step ${index + 1} up`}
								title="Move up"
							>
								<ChevronUpIcon class="size-4" />
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="icon-sm"
								onclick={() => moveItem('steps', index, 1)}
								disabled={index === recipe.steps.length - 1}
								aria-label={`Move step ${index + 1} down`}
								title="Move down"
							>
								<ChevronDownIcon class="size-4" />
							</Button.Root>
							<Button.Root
								variant="ghost"
								size="icon-sm"
								class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								onclick={() => removeItem('steps', index)}
								aria-label={`Remove step ${index + 1}`}
								title="Remove"
							>
								<Trash2Icon class="size-4" />
							</Button.Root>
						</div>
					</div>
				{/each}
			</div>

			<Separator.Root />

			<div class="flex flex-col gap-2 sm:flex-row">
				<Input.Root
					aria-label="New step"
					placeholder="e.g. Simmer for 10 minutes"
					bind:value={stepDraft}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addItem('steps', stepDraft);
							stepDraft = '';
						}
					}}
				/>
				<Button.Root
					class="gap-1.5"
					onclick={() => {
						addItem('steps', stepDraft);
						stepDraft = '';
					}}
					disabled={!stepDraft.trim()}
				>
					<PlusIcon class="size-4" />
					Add step
				</Button.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
