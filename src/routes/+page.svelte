<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import RecipeEditor from '$lib/components/RecipeEditor.svelte';
	import RecipePreview from '$lib/components/RecipePreview.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Badge from '$lib/components/ui/badge';
	import * as Button from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Textarea from '$lib/components/ui/textarea';
	import { Toaster } from '$lib/components/ui/sonner';
	import { copyElementImageToClipboard } from '$lib/image';
	import {
		decodeSharedRecipe,
		encodeSharedRecipe,
		getSharedRecipeParam
	} from '$lib/share';
	import {
		clearRecipe,
		deleteRecipeSnapshot,
		loadRecipe,
		loadSavedRecipes,
		normalizeRecipe,
		saveRecipe,
		saveRecipeSnapshot
	} from '$lib/storage';
	import { defaultRecipe } from '$lib/defaultRecipe';
	import type { Recipe, SavedRecipe } from '$lib/types';
	import ChefHatIcon from '@lucide/svelte/icons/chef-hat';
	import CircleEllipsisIcon from '@lucide/svelte/icons/circle-ellipsis';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CopyPlusIcon from '@lucide/svelte/icons/copy-plus';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileJsonIcon from '@lucide/svelte/icons/file-json';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import LinkIcon from '@lucide/svelte/icons/link';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SaveIcon from '@lucide/svelte/icons/save';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const cloneRecipe = (source: Recipe): Recipe => ({
		title: source.title,
		description: source.description,
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
	let activeMobileTab = $state('editor');

	let isResetDialogOpen = $state(false);
	let isImportDialogOpen = $state(false);
	let isDeleteDialogOpen = $state(false);

	let savedRecipes = $state<SavedRecipe[]>([]);
	let selectedSavedId = $state('');
	let pendingDeleteId = $state('');
	let saveName = $state('');
	let importJsonText = $state('');
	let importError = $state('');
	let lastPersistedFingerprint = $state('');
	let lastDraftSavedAt = $state('');
	let isSharedView = $state(false);
	let sharedRecipeName = $state('');

	const recipeFingerprint = $derived(JSON.stringify(recipe));
	const isDirty = $derived(hydrated && !isSharedView && recipeFingerprint !== lastPersistedFingerprint);
	const displayRecipeName = $derived(recipe.title.trim() || saveName.trim() || 'Untitled recipe');

	const formatSavedTime = (isoDate: string): string =>
		new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoDate));

	const removeSharedParamFromUrl = () => {
		const url = new URL(window.location.href);
		url.searchParams.delete(getSharedRecipeParam());
		window.history.replaceState({}, '', url);
	};

	const restoreLocalDraft = () => {
		const storedRecipe = loadRecipe();
		recipe = storedRecipe ? cloneRecipe(storedRecipe) : makeDefaultRecipe();
		saveName = recipe.title.trim() || 'My recipe';
		selectedSavedId = '';
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		toast.success('Returned to your local draft');
	};

	const useSharedRecipeAsDraft = () => {
		saveName = recipe.title.trim() || 'My recipe';
		selectedSavedId = '';
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		saveRecipe(recipe);
		lastPersistedFingerprint = JSON.stringify(recipe);
		lastDraftSavedAt = new Date().toISOString();
		toast.success('Shared recipe loaded into your draft');
	};

	onMount(async () => {
		const storedRecipe = loadRecipe();
		if (storedRecipe) {
			recipe = cloneRecipe(storedRecipe);
		}

		savedRecipes = loadSavedRecipes();
		saveName = storedRecipe?.title.trim() || recipe.title.trim() || 'My recipe';
		lastPersistedFingerprint = JSON.stringify(storedRecipe ? cloneRecipe(storedRecipe) : recipe);
		lastDraftSavedAt = storedRecipe ? new Date().toISOString() : '';

		const sharedPayload = new URL(window.location.href).searchParams.get(getSharedRecipeParam());
		if (sharedPayload) {
			const sharedRecipe = await decodeSharedRecipe(sharedPayload);
			if (sharedRecipe) {
				recipe = cloneRecipe(sharedRecipe);
				isSharedView = true;
				sharedRecipeName = sharedRecipe.title.trim() || 'Shared recipe';
				activeMobileTab = 'preview';
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

		const nextFingerprint = recipeFingerprint;
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		saveTimer = setTimeout(() => {
			saveRecipe(recipe);
			lastPersistedFingerprint = nextFingerprint;
			lastDraftSavedAt = new Date().toISOString();
		}, 450);

		return () => {
			if (saveTimer) {
				clearTimeout(saveTimer);
			}
		};
	});

	const handleRecipeChange = (nextRecipe: Recipe) => {
		if (isSharedView) {
			return;
		}

		recipe = nextRecipe;
	};

	const saveCurrentSnapshot = () => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before saving snapshots');
			return;
		}

		const name = recipe.title.trim() || saveName.trim() || `Recipe ${savedRecipes.length + 1}`;
		const snapshot = saveRecipeSnapshot(recipe, name, selectedSavedId || undefined);
		savedRecipes = loadSavedRecipes();
		selectedSavedId = snapshot.id;
		saveName = snapshot.name;
		toast.success('Recipe snapshot saved');
	};

	const loadRecipeById = (id: string) => {
		const selected = savedRecipes.find((entry) => entry.id === id);
		if (!selected) {
			return;
		}
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		recipe = cloneRecipe(selected.recipe);
		saveName = selected.name;
		selectedSavedId = selected.id;
		toast.success(`Loaded \"${selected.name}\"`);
	};

	const queueDeleteRecipeById = (id: string) => {
		if (!id) {
			return;
		}
		pendingDeleteId = id;
		isDeleteDialogOpen = true;
	};

	const confirmDeleteRecipe = () => {
		const selected = savedRecipes.find((entry) => entry.id === pendingDeleteId);
		if (!selected) {
			isDeleteDialogOpen = false;
			pendingDeleteId = '';
			return;
		}

		deleteRecipeSnapshot(selected.id);
		savedRecipes = loadSavedRecipes();
		if (selectedSavedId === selected.id) {
			selectedSavedId = '';
		}
		pendingDeleteId = '';
		isDeleteDialogOpen = false;
		toast.success(`Deleted \"${selected.name}\"`);
	};

	const createNewRecipe = () => {
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		recipe = makeEmptyRecipe();
		saveName = 'My recipe';
		selectedSavedId = '';
		clearRecipe();
		toast.info('Started a fresh recipe');
	};

	const resetRecipe = () => {
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		clearRecipe();
		recipe = makeDefaultRecipe();
		saveName = recipe.title;
		selectedSavedId = '';
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
			selectedSavedId = '';
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

	const findVisibleRecipeCard = (): HTMLElement | null => {
		const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-recipe-card="true"]'));
		return cards.find((card) => {
			const rect = card.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}) ?? null;
	};

	const copyRecipeImage = async () => {
		if (!browser) {
			return;
		}

		const recipeCard = findVisibleRecipeCard();
		if (!recipeCard) {
			toast.error('Recipe preview is not available to copy');
			return;
		}

		try {
			await copyElementImageToClipboard(recipeCard);
			toast.success('Recipe image copied');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Could not copy the recipe image.';
			toast.error(message);
		}
	};
</script>

<div class="relative min-h-screen overflow-x-clip bg-linear-to-b from-stone-100 via-amber-50 to-orange-100/70 pb-10">
	<div class="pointer-events-none absolute inset-0 -z-10 noise-overlay opacity-40"></div>
	<div class="pointer-events-none absolute right-[-8rem] top-28 -z-10 hidden size-[36rem] rounded-full bg-radial from-orange-300/35 to-transparent blur-3xl lg:block"></div>

	<header class="sticky top-0 z-40 border-b border-black/5 bg-background/75 backdrop-blur-xl">
		<div class="mx-auto flex w-full max-w-[118rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
			<div class="flex min-w-0 items-center gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
					<ChefHatIcon class="size-5" />
				</div>
				<div class="min-w-0">
					<p class="text-[11px] font-semibold tracking-[0.18em] text-amber-700 uppercase">BiteCraft</p>
					<h1 class="truncate text-base font-semibold text-stone-900 sm:text-lg">Recipe Card Builder</h1>
				</div>
			</div>

			<div class="mx-auto hidden min-w-0 max-w-[30rem] flex-1 items-center justify-center gap-2 md:flex">
				<p class="truncate text-sm font-medium text-foreground/90">{displayRecipeName}</p>
				{#if isSharedView}
					<Badge.Badge variant="outline" class="border-sky-200 bg-sky-100/80 text-sky-900">
						Shared view
					</Badge.Badge>
				{:else}
					<Badge.Badge
						variant="outline"
						class={isDirty
							? 'border-amber-200 bg-amber-100/70 text-amber-900'
							: 'border-emerald-200 bg-emerald-100/70 text-emerald-900'}
					>
						{isDirty ? 'Unsaved changes' : 'Saved'}
					</Badge.Badge>
				{/if}
				{#if lastDraftSavedAt && !isSharedView}
					<span class="text-xs text-muted-foreground">Draft {formatSavedTime(lastDraftSavedAt)}</span>
				{/if}
			</div>

			<div class="ml-auto flex items-center gap-2">
				<Button.Root variant="outline" onclick={copyRecipeImage} class="gap-2">
					<CopyIcon class="size-4" />
					Copy image
				</Button.Root>
				<Button.Root variant="outline" onclick={copyShareLink} class="gap-2">
					<LinkIcon class="size-4" />
					Share
				</Button.Root>
				<Button.Root onclick={saveCurrentSnapshot} class="gap-2" disabled={isSharedView}>
					<SaveIcon class="size-4" />
					Save
				</Button.Root>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button.Root variant="outline" size="icon" aria-label="Open actions menu">
							<CircleEllipsisIcon class="size-4" />
						</Button.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-64">
						<DropdownMenu.Label>Recipe actions</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={createNewRecipe}>
							<PlusIcon class="size-4" />
							New recipe
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={openImportDialog}>
							<FileJsonIcon class="size-4" />
							Import JSON
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={copyRecipeJson}>
							<DownloadIcon class="size-4" />
							Copy JSON
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={copyRecipeImage}>
							<CopyIcon class="size-4" />
							Copy image
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={copyShareLink}>
							<LinkIcon class="size-4" />
							Copy share link
						</DropdownMenu.Item>
						<DropdownMenu.Separator />

						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<FolderOpenIcon class="size-4" />
								Load saved
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-64">
								{#if savedRecipes.length === 0}
									<DropdownMenu.Item disabled>No saved recipes</DropdownMenu.Item>
								{:else}
									{#each savedRecipes as saved}
										<DropdownMenu.Item onclick={() => loadRecipeById(saved.id)}>
											<span class="truncate">{saved.name}</span>
										</DropdownMenu.Item>
									{/each}
								{/if}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Trash2Icon class="size-4" />
								Delete saved
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-64">
								{#if savedRecipes.length === 0}
									<DropdownMenu.Item disabled>No saved recipes</DropdownMenu.Item>
								{:else}
									{#each savedRecipes as saved}
										<DropdownMenu.Item
											variant="destructive"
											onclick={() => queueDeleteRecipeById(saved.id)}
										>
											<span class="truncate">{saved.name}</span>
										</DropdownMenu.Item>
									{/each}
								{/if}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive" onclick={() => (isResetDialogOpen = true)}>
							<RotateCcwIcon class="size-4" />
							Reset to default
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</header>

		<main class="mx-auto w-full max-w-[118rem] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-5">
		<div class="mb-4 flex items-center gap-2 md:hidden">
			<p class="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">{displayRecipeName}</p>
			{#if isSharedView}
				<Badge.Badge variant="outline" class="border-sky-200 bg-sky-100/80 text-sky-900">
					Shared
				</Badge.Badge>
			{:else}
				<Badge.Badge
					variant="outline"
					class={isDirty
						? 'border-amber-200 bg-amber-100/70 text-amber-900'
						: 'border-emerald-200 bg-emerald-100/70 text-emerald-900'}
				>
					{isDirty ? 'Unsaved' : 'Saved'}
				</Badge.Badge>
			{/if}
		</div>

		{#if isSharedView}
			<div class="mb-4 rounded-3xl border border-sky-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1">
						<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-sky-700 uppercase">Shared recipe</p>
						<p class="text-sm text-stone-700">
							Viewing "{sharedRecipeName}" from a link. Your local draft stays separate until you import this recipe.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button.Root variant="outline" class="gap-2" onclick={restoreLocalDraft}>
							<RotateCcwIcon class="size-4" />
							My draft
						</Button.Root>
						<Button.Root class="gap-2" onclick={useSharedRecipeAsDraft}>
							<CopyPlusIcon class="size-4" />
							Use as draft
						</Button.Root>
					</div>
				</div>
			</div>
		{/if}

		<div class="lg:hidden">
			{#if isSharedView}
				<div class="rounded-[1.35rem] border border-stone-200/50 bg-white/30 p-0.5 shadow-md shadow-stone-200/25 sm:rounded-3xl sm:p-4">
					<RecipePreview {recipe} onRecipeChange={handleRecipeChange} readonly />
				</div>
			{:else}
				<Tabs.Root bind:value={activeMobileTab} class="w-full gap-4">
					<Tabs.List class="grid h-11 w-full grid-cols-2 rounded-2xl border border-stone-200/70 bg-white/80 p-1 shadow-sm backdrop-blur">
						<Tabs.Trigger value="editor">Editor</Tabs.Trigger>
						<Tabs.Trigger value="preview">Preview</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="editor">
						<RecipeEditor {recipe} onRecipeChange={handleRecipeChange} />
					</Tabs.Content>
					<Tabs.Content value="preview">
						<div class="rounded-[1.35rem] border border-stone-200/50 bg-white/30 p-0.5 shadow-md shadow-stone-200/25 sm:rounded-3xl sm:p-4">
							<RecipePreview {recipe} onRecipeChange={handleRecipeChange} />
						</div>
					</Tabs.Content>
				</Tabs.Root>
			{/if}
		</div>

		{#if isSharedView}
			<section class="hidden pb-5 lg:block">
				<div
					class="rounded-[2rem] border border-stone-200/70 bg-linear-to-b from-white/70 via-white/55 to-white/40 p-6 shadow-xl shadow-stone-200/50 backdrop-blur xl:p-7"
				>
					<div class="mb-5 flex items-center justify-between px-1">
						<div class="space-y-1">
							<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Shared Preview</p>
							<p class="text-sm text-stone-600">Viewing a shared recipe card from a link.</p>
						</div>
					</div>
					<RecipePreview {recipe} onRecipeChange={handleRecipeChange} readonly />
				</div>
			</section>
		{:else}
			<div class="hidden grid-cols-14 gap-7 pb-5 lg:grid">
				<section class="app-scrollbar col-span-5 max-h-[calc(100vh-7.2rem)] overflow-y-auto pr-2">
					<div class="pr-1">
						<RecipeEditor {recipe} onRecipeChange={handleRecipeChange} />
					</div>
				</section>
				<section class="col-span-9">
					<div
						class="sticky top-23 min-h-[calc(100vh-7.5rem)] rounded-[2rem] border border-stone-200/70 bg-linear-to-b from-white/70 via-white/55 to-white/40 p-6 shadow-xl shadow-stone-200/50 backdrop-blur xl:p-7"
					>
						<div class="mb-5 flex items-center justify-between px-1">
							<div class="space-y-1">
								<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-amber-700 uppercase">Live Preview</p>
								<p class="text-sm text-stone-600">Typography and spacing update as you edit.</p>
							</div>
						</div>
						<RecipePreview {recipe} onRecipeChange={handleRecipeChange} />
					</div>
				</section>
			</div>
		{/if}
	</main>
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

<AlertDialog.Root bind:open={isDeleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete saved recipe?</AlertDialog.Title>
			<AlertDialog.Description>
				This only removes the saved snapshot from browser storage.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDeleteRecipe}>Delete</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<Toaster richColors closeButton position="top-right" />
