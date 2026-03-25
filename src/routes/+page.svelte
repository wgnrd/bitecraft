<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import RecipeEditor from '$lib/components/RecipeEditor.svelte';
	import RecipePreview from '$lib/components/RecipePreview.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Button from '$lib/components/ui/button';
	import * as Textarea from '$lib/components/ui/textarea';
	import { Toaster } from '$lib/components/ui/sonner';
	import { copyElementImageToClipboard } from '$lib/image';
	import { defaultRecipe } from '$lib/defaultRecipe';
	import {
		clearRecipe,
		loadRecipe,
		normalizeRecipe,
		saveRecipe,
		saveRecipeSnapshot
	} from '$lib/storage';
	import { decodeSharedRecipe, encodeSharedRecipe, getSharedRecipeParam } from '$lib/share';
	import type { Recipe } from '$lib/types';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CopyPlusIcon from '@lucide/svelte/icons/copy-plus';
	import FileJsonIcon from '@lucide/svelte/icons/file-json';
	import LinkIcon from '@lucide/svelte/icons/link';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	const cloneRecipe = (source: Recipe): Recipe => ({
		title: source.title,
		description: source.description,
		tags: source.tags.map((tag) => ({ ...tag })),
		showHeroImage: source.showHeroImage,
		heroImageUrl: source.heroImageUrl,
		heroImageScale: source.heroImageScale,
		heroImagePositionX: source.heroImagePositionX,
		heroImagePositionY: source.heroImagePositionY,
		servings: source.servings,
		prepMinutes: source.prepMinutes,
		cookMinutes: source.cookMinutes,
		ingredients: source.ingredients.map((ingredient) => ({ ...ingredient })),
		steps: [...source.steps],
		theme: source.theme
	});

	const makeDefaultRecipe = (): Recipe => cloneRecipe(defaultRecipe);
	const makeEmptyRecipe = (): Recipe => ({
		title: '',
		description: '',
		tags: [],
		showHeroImage: true,
		heroImageUrl: '',
		heroImageScale: 1,
		heroImagePositionX: 50,
		heroImagePositionY: 50,
		servings: null,
		prepMinutes: null,
		cookMinutes: null,
		ingredients: [],
		steps: [],
		theme: 'classic'
	});

	let recipe = $state<Recipe>(makeDefaultRecipe());
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let hydrated = $state(false);

	let isResetDialogOpen = $state(false);
	let isImportDialogOpen = $state(false);
	let importJsonText = $state('');
	let importError = $state('');
	let saveName = $state('');
	let lastPersistedFingerprint = $state('');
	let isSharedView = $state(false);
	let sharedRecipeName = $state('');

	const removeSharedParamFromUrl = () => {
		const url = new URL(window.location.href);
		url.searchParams.delete(getSharedRecipeParam());
		window.history.replaceState({}, '', url);
	};

	const restoreLocalDraft = () => {
		const storedRecipe = loadRecipe();
		recipe = storedRecipe ? cloneRecipe(storedRecipe) : makeDefaultRecipe();
		saveName = recipe.title.trim() || 'My recipe';
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		toast.success('Returned to your local draft');
	};

	const useSharedRecipeAsDraft = () => {
		saveName = recipe.title.trim() || 'My recipe';
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		saveRecipe(recipe);
		lastPersistedFingerprint = JSON.stringify(recipe);
		toast.success('Shared recipe loaded into your draft');
	};

	onMount(async () => {
		const storedRecipe = loadRecipe();
		if (storedRecipe) {
			recipe = cloneRecipe(storedRecipe);
		}

		saveName = storedRecipe?.title.trim() || recipe.title.trim() || 'My recipe';
		lastPersistedFingerprint = JSON.stringify(storedRecipe ? cloneRecipe(storedRecipe) : recipe);

		const sharedPayload = new URL(window.location.href).searchParams.get(getSharedRecipeParam());
		if (sharedPayload) {
			const sharedRecipe = await decodeSharedRecipe(sharedPayload);
			if (sharedRecipe) {
				recipe = cloneRecipe(sharedRecipe);
				isSharedView = true;
				sharedRecipeName = sharedRecipe.title.trim() || 'Shared recipe';
			} else {
				toast.error('This share link is invalid or corrupted');
				removeSharedParamFromUrl();
			}
		}

		hydrated = true;
	});

	$effect(() => {
		if (!browser || !hydrated || isSharedView) {
			return;
		}

		const nextFingerprint = JSON.stringify(recipe);
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		saveTimer = setTimeout(() => {
			saveRecipe(recipe);
			lastPersistedFingerprint = nextFingerprint;
		}, 450);

		return () => {
			if (saveTimer) clearTimeout(saveTimer);
		};
	});

	const handleRecipeChange = (nextRecipe: Recipe) => {
		if (isSharedView) return;
		recipe = nextRecipe;
	};

	const saveCurrentSnapshot = () => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before saving');
			return;
		}

		const name = recipe.title.trim() || saveName.trim() || 'Untitled recipe';
		saveRecipeSnapshot(recipe, name);
		saveName = name;
		toast.success('Recipe saved');
	};

	const publishRecipe = () => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before publishing');
			return;
		}

		const name = recipe.title.trim() || saveName.trim() || 'Untitled recipe';
		saveRecipeSnapshot(recipe, name);
		saveName = name;
		toast.success('Recipe published');
	};

	const resetRecipe = () => {
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		clearRecipe();
		recipe = makeDefaultRecipe();
		saveName = recipe.title;
		toast.success('Recipe reset to default');
	};

	const openImportDialog = () => {
		importJsonText = JSON.stringify(makeDefaultRecipe(), null, 2);
		importError = '';
		isImportDialogOpen = true;
	};

	const applyImportJson = () => {
		importError = '';
		try {
			const parsed = JSON.parse(importJsonText);
			const normalized = normalizeRecipe(parsed);
			if (!normalized) {
				importError = 'Invalid JSON shape. Expected a Recipe object.';
				return;
			}
			recipe = normalized;
			isSharedView = false;
			sharedRecipeName = '';
			removeSharedParamFromUrl();
			saveName = normalized.title || 'My recipe';
			isImportDialogOpen = false;
			toast.success('Recipe imported successfully');
		} catch {
			importError = 'Could not parse JSON. Please check syntax and try again.';
		}
	};

	const copyRecipeJson = async () => {
		if (!browser || !navigator.clipboard) {
			toast.error('Clipboard is not available in this browser');
			return;
		}
		await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
		toast.success('Recipe JSON copied');
	};

	const copyShareLink = async () => {
		if (!browser || !navigator.clipboard) {
			toast.error('Clipboard is not available in this browser');
			return;
		}

		try {
			const payload = await encodeSharedRecipe(recipe);
			const url = new URL(window.location.href);
			url.searchParams.set(getSharedRecipeParam(), payload);
			await navigator.clipboard.writeText(url.toString());
			toast.success('Share link copied');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'This recipe is too large to share as a link.';
			toast.error(message);
		}
	};

	const copyRecipeImage = async () => {
		if (!browser) return;

		const recipeCard = document.querySelector<HTMLElement>('[data-recipe-card="true"]');
		if (!recipeCard) {
			toast.error('Recipe preview is not available to copy');
			return;
		}

		try {
			await copyElementImageToClipboard(recipeCard);
			toast.success('Recipe image copied');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not copy the recipe image.';
			toast.error(message);
		}
	};
</script>

<svelte:head>
	<title>BiteCraft | Recipe Editor</title>
	<meta
		name="description"
		content="Design, save, share, and export polished recipe cards with BiteCraft."
	/>
</svelte:head>

<div class="min-h-screen bg-[#f7f1e4] text-stone-900">
	<div class="flex min-h-screen flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
		<header class="bg-[#fbf6eb]/95 px-2 py-4 md:px-4">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-serif text-[2.2rem] leading-none font-black tracking-[-0.03em] text-stone-950">
						Bitecraft
					</p>
					<p class="mt-2 text-[0.78rem] font-semibold tracking-[0.32em] text-[#9b4d12] uppercase">
						Editor
					</p>
				</div>

				<div class="flex flex-wrap items-center justify-end gap-3">
					<Button.Root
						variant="outline"
						class="h-11 rounded-full border-0 bg-[#ece3d3] px-5 shadow-none"
						onclick={copyRecipeImage}
					>
						<CopyIcon class="size-4" />
						Copy Image
					</Button.Root>
					<Button.Root
						variant="outline"
						class="h-11 rounded-full border-0 bg-[#ece3d3] px-5 shadow-none"
						onclick={copyShareLink}
					>
						<LinkIcon class="size-4" />
						Share
					</Button.Root>
					<Button.Root
						variant="outline"
						class="h-11 rounded-full border-0 bg-[#ece3d3] px-5 shadow-none"
						onclick={copyRecipeJson}
					>
						<FileJsonIcon class="size-4" />
						JSON
					</Button.Root>
				</div>
			</div>
		</header>

		{#if isSharedView}
			<div class="mt-5 rounded-[1.75rem] border border-sky-200 bg-white/80 px-5 py-4 shadow-sm">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p class="text-[0.72rem] font-semibold tracking-[0.26em] text-sky-700 uppercase">Shared recipe</p>
						<p class="mt-1 text-sm text-stone-700">
							Viewing "{sharedRecipeName}" from a link. Import it into your draft before saving changes.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button.Root variant="outline" class="rounded-full border-stone-300 bg-white px-5" onclick={restoreLocalDraft}>
							My draft
						</Button.Root>
						<Button.Root class="rounded-full bg-stone-950 px-5 text-white" onclick={useSharedRecipeAsDraft}>
							<CopyPlusIcon class="size-4" />
							Use as draft
						</Button.Root>
					</div>
				</div>
			</div>
		{/if}

		<section class="mt-4 grid gap-8 xl:grid-cols-[560px_minmax(0,1fr)]">
			<div class="bg-transparent pr-6 xl:border-r xl:border-stone-300/35">
				<div class="px-0 py-7">
					<h1 class="font-serif text-5xl leading-none text-stone-950">Recipe Builder</h1>
					<p class="mt-3 text-2xl italic text-stone-600">Crafting your next masterpiece</p>
				</div>
				<div class="scrollbar-hidden max-h-[calc(100vh-14rem)] overflow-y-auto px-0 py-5">
					<RecipeEditor {recipe} onRecipeChange={handleRecipeChange} readonly={isSharedView} />
				</div>
				<div class="grid gap-3 px-0 py-5 sm:grid-cols-2">
					<Button.Root
						variant="outline"
						class="h-16 rounded-2xl border-0 bg-[#ddd6c8] text-lg text-stone-900 shadow-none"
						onclick={saveCurrentSnapshot}
						disabled={isSharedView}
					>
						<CopyIcon class="size-5" />
						Save Draft
					</Button.Root>
					<Button.Root
						class="h-16 rounded-2xl bg-stone-950 text-lg text-white shadow-[0_20px_30px_-24px_rgba(0,0,0,0.8)]"
						onclick={publishRecipe}
						disabled={isSharedView}
					>
						<SparklesIcon class="size-5" />
						Publish
					</Button.Root>
				</div>
			</div>

			<div class="min-w-0 bg-[#f8f1e4] pl-2 xl:pl-6">
				<div class="flex h-full flex-col">
					<div class="mb-5 flex items-start justify-between gap-3">
						<div></div>
						<div class="flex items-center gap-3">
							<p class="text-[0.74rem] tracking-[0.28em] text-stone-700 uppercase">Live Preview</p>
							<span class="inline-block size-2 rounded-full bg-[#f5b67d]"></span>
						</div>
					</div>
					<div class="min-w-0">
						<RecipePreview {recipe} onRecipeChange={handleRecipeChange} readonly={isSharedView} />
					</div>
					<div class="mt-6 flex flex-wrap justify-center gap-4">
						<Button.Root
							variant="outline"
							class="h-12 rounded-full border-0 bg-[#ece3d3] px-8 tracking-[0.16em] uppercase shadow-none"
							onclick={copyRecipeImage}
						>
							View Fullscreen
						</Button.Root>
						<Button.Root
							variant="outline"
							class="h-12 rounded-full border-0 bg-[#ece3d3] px-8 tracking-[0.16em] uppercase shadow-none"
							onclick={openImportDialog}
						>
							Import JSON
						</Button.Root>
						<Button.Root
							variant="outline"
							class="h-12 rounded-full border-0 bg-[#ece3d3] px-8 tracking-[0.16em] uppercase shadow-none"
							onclick={() => (isResetDialogOpen = true)}
						>
							Reset Recipe
						</Button.Root>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

<AlertDialog.Root bind:open={isResetDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Reset recipe?</AlertDialog.Title>
			<AlertDialog.Description>
				This restores the default recipe and clears the current browser draft.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={resetRecipe}>Reset</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={isImportDialogOpen}>
	<AlertDialog.Content class="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
		<AlertDialog.Header>
			<AlertDialog.Title>Import recipe JSON</AlertDialog.Title>
			<AlertDialog.Description>
				Paste a JSON object with recipe fields to populate the current draft.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="space-y-2">
			<Textarea.Root
				rows={14}
				bind:value={importJsonText}
				class="h-80 max-h-[60vh] resize-y overflow-y-auto font-mono text-xs [field-sizing:fixed]"
			/>
			{#if importError}
				<p class="text-sm text-destructive">{importError}</p>
			{/if}
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={applyImportJson}>Import</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<Toaster richColors closeButton position="top-right" />
