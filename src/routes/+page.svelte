<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import BitecraftLogo from '$lib/components/BitecraftLogo.svelte';
	import RecipeEditor from '$lib/components/RecipeEditor.svelte';
	import RecipePreview from '$lib/components/RecipePreview.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Button from '$lib/components/ui/button';
	import * as Textarea from '$lib/components/ui/textarea';
	import { Toaster } from '$lib/components/ui/sonner';
	import { copyElementImageToClipboard } from '$lib/image';
	import { defaultRecipe } from '$lib/defaultRecipe';
	import {
		addRecipeToCollection,
		clearRecipe,
		deleteRecipeSnapshot,
		loadCollections,
		loadRecipe,
		loadSavedRecipes,
		normalizeRecipe,
		removeRecipeFromCollection,
		saveCollection,
		saveRecipe,
		saveRecipeSnapshot
	} from '$lib/storage';
	import { decodeSharedRecipe, encodeSharedRecipe, getSharedRecipeParam } from '$lib/share';
	import type { Recipe, RecipeCollection, SavedRecipe } from '$lib/types';
	import BellIcon from '@lucide/svelte/icons/bell';
	import BookMarkedIcon from '@lucide/svelte/icons/book-marked';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CopyPlusIcon from '@lucide/svelte/icons/copy-plus';
	import FilePenLineIcon from '@lucide/svelte/icons/file-pen-line';
	import FileJsonIcon from '@lucide/svelte/icons/file-json';
	import FolderKanbanIcon from '@lucide/svelte/icons/folder-kanban';
	import Grid2x2Icon from '@lucide/svelte/icons/grid-2x2';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import LinkIcon from '@lucide/svelte/icons/link';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserRoundIcon from '@lucide/svelte/icons/user-round';

	type AppView = 'gallery' | 'editor' | 'collections';

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

	const navItems: { id: AppView; label: string; icon: typeof Grid2x2Icon }[] = [
		{ id: 'gallery', label: 'Gallery', icon: Grid2x2Icon },
		{ id: 'editor', label: 'Editor', icon: FilePenLineIcon },
		{ id: 'collections', label: 'Collections', icon: FolderKanbanIcon }
	];

	const categoryByTheme = {
		classic: 'Vegetarian',
		minimal: 'Beverage',
		bold: 'Baking'
	} as const;

	let recipe = $state<Recipe>(makeDefaultRecipe());
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let hydrated = $state(false);
	let activeView = $state<AppView>('editor');
	let searchQuery = $state('');

	let isResetDialogOpen = $state(false);
	let isImportDialogOpen = $state(false);
	let isDeleteDialogOpen = $state(false);

	let savedRecipes = $state<SavedRecipe[]>([]);
	let collections = $state<RecipeCollection[]>([]);
	let selectedSavedId = $state('');
	let selectedCollectionId = $state('');
	let pendingDeleteId = $state('');
	let saveName = $state('');
	let importJsonText = $state('');
	let importError = $state('');
	let lastPersistedFingerprint = $state('');
	let lastDraftSavedAt = $state('');
	let isSharedView = $state(false);
	let sharedRecipeName = $state('');
	let newCollectionName = $state('');
	let newCollectionDescription = $state('');
	let showCollectionComposer = $state(false);

	const recipeFingerprint = $derived(JSON.stringify(recipe));
	const isDirty = $derived(hydrated && !isSharedView && recipeFingerprint !== lastPersistedFingerprint);
	const displayRecipeName = $derived(recipe.title.trim() || saveName.trim() || 'Untitled recipe');
	const activeCollection = $derived(
		collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0] ?? null
	);

	const formatSavedTime = (isoDate: string): string =>
		new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoDate));

	const formatRelativeTime = (isoDate: string): string => {
		const diffMs = new Date(isoDate).getTime() - Date.now();
		const diffHours = Math.round(diffMs / (1000 * 60 * 60));
		if (Math.abs(diffHours) < 24) {
			return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffHours, 'hour');
		}

		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffDays, 'day');
	};

	const getDifficultyLabel = (candidate: Recipe): string => {
		if (candidate.steps.length >= 6 || candidate.ingredients.length >= 10) {
			return 'Advanced';
		}
		if (candidate.steps.length >= 4 || candidate.ingredients.length >= 7) {
			return 'Moderate';
		}
		return 'Simple';
	};

	const getRecipeCategory = (candidate: Recipe): string => categoryByTheme[candidate.theme];

	const getCollectionRecipes = (collection: RecipeCollection | null): SavedRecipe[] => {
		if (!collection) {
			return [];
		}

		return collection.recipeIds
			.map((recipeId) => savedRecipes.find((entry) => entry.id === recipeId))
			.filter((entry): entry is SavedRecipe => Boolean(entry));
	};

	const findCollectionMembership = (recipeId: string): RecipeCollection[] =>
		collections.filter((collection) => collection.recipeIds.includes(recipeId));

	const getFilteredSavedRecipes = (): SavedRecipe[] => {
		const needle = searchQuery.trim().toLowerCase();
		if (!needle) {
			return savedRecipes;
		}

		return savedRecipes.filter((entry) =>
			`${entry.name} ${entry.recipe.description} ${entry.recipe.ingredients.map((ingredient) => ingredient.name).join(' ')}`
				.toLowerCase()
				.includes(needle)
		);
	};

	const getGalleryCards = () => {
		const savedCards = getFilteredSavedRecipes();
		const needle = searchQuery.trim().toLowerCase();
		const currentMatches =
			!needle ||
			`${displayRecipeName} ${recipe.description} ${recipe.ingredients.map((ingredient) => ingredient.name).join(' ')}`
				.toLowerCase()
				.includes(needle);

		return {
			draftIncluded: currentMatches,
			savedCards
		};
	};

	const removeSharedParamFromUrl = () => {
		const url = new URL(window.location.href);
		url.searchParams.delete(getSharedRecipeParam());
		window.history.replaceState({}, '', url);
	};

	const reloadCollections = () => {
		collections = loadCollections();
		if (!selectedCollectionId && collections.length > 0) {
			selectedCollectionId = collections[0].id;
		}
		if (selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId)) {
			selectedCollectionId = collections[0]?.id ?? '';
		}
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
		reloadCollections();
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
				activeView = 'editor';
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

	const persistSnapshot = (successMessage = 'Recipe snapshot saved'): SavedRecipe => {
		const name = recipe.title.trim() || saveName.trim() || `Recipe ${savedRecipes.length + 1}`;
		const snapshot = saveRecipeSnapshot(recipe, name, selectedSavedId || undefined);
		savedRecipes = loadSavedRecipes();
		selectedSavedId = snapshot.id;
		saveName = snapshot.name;
		toast.success(successMessage);
		return snapshot;
	};

	const saveCurrentSnapshot = () => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before saving snapshots');
			return;
		}

		persistSnapshot();
	};

	const publishRecipe = () => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before publishing');
			return;
		}

		persistSnapshot('Recipe published to your gallery');
		activeView = 'gallery';
	};

	const ensureCurrentRecipeSaved = (): SavedRecipe | null => {
		if (isSharedView) {
			toast.info('Import the shared recipe into your draft before adding it to collections');
			return null;
		}

		return persistSnapshot(selectedSavedId ? 'Recipe updated in your library' : 'Recipe saved to your library');
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
		activeView = 'editor';
		toast.success(`Loaded "${selected.name}"`);
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
		reloadCollections();
		if (selectedSavedId === selected.id) {
			selectedSavedId = '';
		}
		pendingDeleteId = '';
		isDeleteDialogOpen = false;
		toast.success(`Deleted "${selected.name}"`);
	};

	const createNewRecipe = () => {
		isSharedView = false;
		sharedRecipeName = '';
		removeSharedParamFromUrl();
		recipe = makeEmptyRecipe();
		saveName = 'My recipe';
		selectedSavedId = '';
		clearRecipe();
		activeView = 'editor';
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
			activeView = 'editor';
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
		return (
			cards.find((card) => {
				const rect = card.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			}) ?? null
		);
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
			const message = error instanceof Error ? error.message : 'Could not copy the recipe image.';
			toast.error(message);
		}
	};

	const createCollectionFromComposer = () => {
		const name = newCollectionName.trim();
		if (!name) {
			toast.error('Give the collection a name first');
			return;
		}

		const collection = saveCollection({
			name,
			description: newCollectionDescription
		});

		reloadCollections();
		selectedCollectionId = collection.id;
		newCollectionName = '';
		newCollectionDescription = '';
		showCollectionComposer = false;
		toast.success(`Collection "${collection.name}" created`);
	};

	const addCurrentRecipeToCollection = (collectionId: string) => {
		const snapshot = ensureCurrentRecipeSaved();
		if (!snapshot) {
			return;
		}

		const updatedCollection = addRecipeToCollection(collectionId, snapshot.id);
		if (!updatedCollection) {
			toast.error('Could not update that collection');
			return;
		}

		reloadCollections();
		selectedCollectionId = updatedCollection.id;
		toast.success(`Added "${snapshot.name}" to ${updatedCollection.name}`);
	};

	const removeRecipeFromActiveCollection = (recipeId: string) => {
		if (!activeCollection) {
			return;
		}

		const updatedCollection = removeRecipeFromCollection(activeCollection.id, recipeId);
		if (!updatedCollection) {
			toast.error('Could not remove recipe from collection');
			return;
		}

		reloadCollections();
		toast.success('Recipe removed from collection');
	};

	const galleryState = $derived(getGalleryCards());
</script>

<svelte:head>
	<title>BiteCraft | Editorial Recipe Studio</title>
	<meta
		name="description"
		content="Design, save, organize, and share polished recipe cards with BiteCraft."
	/>
</svelte:head>

<div class="min-h-screen bg-[#f7f1e4] text-stone-900">
	<div class="flex min-h-screen flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
		<header class="bg-[#fbf6eb]/95 px-2 py-4 md:px-4">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-10">
						<div class="shrink-0">
							<p class="font-serif text-[2.2rem] leading-none font-black tracking-[-0.03em] text-stone-950">
								Bitecraft
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2 lg:hidden">
						<button
							type="button"
							class="inline-flex size-11 items-center justify-center rounded-2xl border border-stone-300/40 bg-white/70 text-stone-800 shadow-sm"
							aria-label="Notifications"
						>
							<BellIcon class="size-4.5" />
						</button>
						<button
							type="button"
							class="inline-flex size-11 items-center justify-center rounded-2xl border border-stone-300/40 bg-white/70 text-stone-800 shadow-sm"
							aria-label="Settings"
						>
							<SettingsIcon class="size-4.5" />
						</button>
					</div>
				</div>

				<nav class="flex items-center gap-2 overflow-x-auto text-lg">
					{#each navItems as item}
						<button
							type="button"
							class={`shrink-0 border-b-2 px-4 py-2 font-serif text-[1.1rem] transition ${
								activeView === item.id
									? 'border-[#9b4d12] text-[#9b4d12]'
									: 'text-stone-500 hover:text-stone-900'
							}`}
							onclick={() => (activeView = item.id)}
						>
							{item.label}
						</button>
					{/each}
				</nav>

				<div class="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
					<label
						class="flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-stone-300/40 bg-[#f4ecdc] px-4 py-3 shadow-inner md:w-[320px]"
					>
						<SearchIcon class="size-4.5 shrink-0 text-stone-500" />
						<input
							bind:value={searchQuery}
							type="search"
							placeholder="Search library..."
							class="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
						/>
					</label>

					<div class="hidden items-center gap-2 lg:flex">
						<button
							type="button"
							class="inline-flex size-11 items-center justify-center rounded-2xl text-stone-900 transition hover:bg-stone-200/50"
							aria-label="Notifications"
						>
							<BellIcon class="size-4.5" />
						</button>
						<button
							type="button"
							class="inline-flex size-11 items-center justify-center rounded-2xl text-stone-900 transition hover:bg-stone-200/50"
							aria-label="Settings"
						>
							<SettingsIcon class="size-4.5" />
						</button>
						<div class="inline-flex size-11 items-center justify-center rounded-2xl bg-[#f1cbaa] text-stone-900 shadow-sm">
							<UserRoundIcon class="size-4.5" />
						</div>
					</div>
				</div>
			</div>
		</header>

		{#if isSharedView}
			<div class="mt-5 rounded-[1.75rem] border border-sky-200 bg-white/80 px-5 py-4 shadow-sm">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p class="text-[0.72rem] font-semibold tracking-[0.26em] text-sky-700 uppercase">Shared recipe</p>
						<p class="mt-1 text-sm text-stone-700">
							Viewing "{sharedRecipeName}" from a link. Import it into your draft before saving or filing it into collections.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button.Root
							variant="outline"
							class="rounded-full border-stone-300 bg-white px-5"
							onclick={restoreLocalDraft}
						>
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

		{#if activeView === 'gallery'}
			<section class="mt-6 grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
				<aside class="rounded-[2rem] border border-stone-300/40 bg-[#f8f1e4] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
					<div class="flex items-start gap-4">
						<div class="inline-flex size-14 items-center justify-center rounded-2xl bg-white/70 text-stone-900 shadow-sm">
							<BookOpenIcon class="size-6" />
						</div>
						<div>
							<h2 class="font-serif text-[2rem] leading-none">Library</h2>
							<p class="mt-2 text-sm tracking-[0.18em] text-stone-500 uppercase">Your editorial collection</p>
						</div>
					</div>

					<Button.Root
						class="mt-8 h-14 w-full rounded-2xl bg-stone-950 text-base font-semibold text-white shadow-[0_20px_40px_-26px_rgba(0,0,0,0.7)]"
						onclick={createNewRecipe}
					>
						<PlusIcon class="size-5" />
						New Recipe
					</Button.Root>

					<div class="mt-10 space-y-2">
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-2xl bg-stone-900/95 px-4 py-4 text-left text-white"
							onclick={() => (activeView = 'gallery')}
						>
							<BookMarkedIcon class="size-5" />
							<div>
								<p class="text-[0.75rem] tracking-[0.2em] text-stone-300 uppercase">Overview</p>
								<p class="mt-1 text-lg font-semibold">All Recipes</p>
							</div>
						</button>

						<div class="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
							<div class="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
								<p class="text-[0.72rem] tracking-[0.18em] text-stone-500 uppercase">Drafts</p>
								<p class="mt-2 text-2xl font-semibold">{selectedSavedId ? '1' : 'Live'}</p>
							</div>
							<div class="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
								<p class="text-[0.72rem] tracking-[0.18em] text-stone-500 uppercase">Saved</p>
								<p class="mt-2 text-2xl font-semibold">{savedRecipes.length}</p>
							</div>
							<div class="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
								<p class="text-[0.72rem] tracking-[0.18em] text-stone-500 uppercase">Collections</p>
								<p class="mt-2 text-2xl font-semibold">{collections.length}</p>
							</div>
						</div>
					</div>
				</aside>

				<div class="rounded-[2rem] border border-stone-300/40 bg-[#fbf6eb] p-6 md:p-8">
					<div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
						<div class="max-w-4xl">
							<p class="text-[0.78rem] font-semibold tracking-[0.32em] text-[#9b4d12] uppercase">Curated Collection</p>
							<h1 class="mt-3 font-serif text-5xl leading-none text-stone-950 md:text-7xl">
								The Autumn Gallery
							</h1>
							<p class="mt-5 max-w-3xl text-lg leading-9 text-stone-700">
								A sanctuary for your most treasured culinary creations. Each card captures the essence of a dish, ready for publication or refinement.
							</p>
						</div>

						<div class="flex flex-wrap gap-3">
							<Button.Root
								variant="outline"
								class="h-16 rounded-2xl border-stone-300 bg-[#ece3d3] px-8 text-lg text-stone-900"
							>
								<SearchIcon class="size-5" />
								Sort
							</Button.Root>
							<Button.Root
								class="h-16 rounded-2xl bg-stone-950 px-8 text-lg text-white shadow-[0_24px_40px_-28px_rgba(0,0,0,0.8)]"
								onclick={() => {
									activeView = 'editor';
									createNewRecipe();
								}}
							>
								<PlusIcon class="size-5" />
								Create New
							</Button.Root>
						</div>
					</div>

					<div class="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)]">
						{#if galleryState.draftIncluded}
							<button
								type="button"
								class="group relative min-h-[620px] overflow-hidden rounded-[1.8rem] bg-stone-950 text-left shadow-[0_24px_80px_-45px_rgba(0,0,0,0.65)]"
								onclick={() => (activeView = 'editor')}
							>
								{#if recipe.heroImageUrl}
									<img src={recipe.heroImageUrl} alt={displayRecipeName} class="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.02]" />
								{:else}
									<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.55),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.4),transparent_28%),linear-gradient(180deg,#3f2b1c,#16120f_55%,#0f0d0b)]"></div>
								{/if}
								<div class="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent"></div>
								<div class="absolute left-8 right-8 top-8 flex items-center justify-between">
									<span class="rounded-full bg-[#f8c9a4] px-4 py-2 text-[0.76rem] font-semibold tracking-[0.18em] text-[#7a3c0a] uppercase">
										Featured Selection
									</span>
									<span class="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[0.72rem] tracking-[0.18em] text-white uppercase">
										{isDirty ? 'In progress' : 'Ready'}
									</span>
								</div>
								<div class="absolute bottom-8 left-8 right-8 text-white">
									<p class="text-[0.82rem] tracking-[0.32em] text-stone-200 uppercase">{getRecipeCategory(recipe)}</p>
									<h2 class="mt-3 max-w-[18ch] font-serif text-4xl leading-[1.03] md:text-6xl">{displayRecipeName}</h2>
									<div class="mt-5 flex flex-wrap gap-5 text-lg text-stone-100">
										<span>{recipe.prepMinutes ?? '-'} mins</span>
										<span>{getDifficultyLabel(recipe)}</span>
									</div>
								</div>
							</button>
						{/if}

						<div class="grid gap-6 sm:grid-cols-2">
							{#each galleryState.savedCards as saved}
								<article class="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-[0_18px_40px_-30px_rgba(82,57,26,0.35)]">
									<button type="button" class="block w-full text-left" onclick={() => loadRecipeById(saved.id)}>
										{#if saved.recipe.heroImageUrl}
											<img
												src={saved.recipe.heroImageUrl}
												alt={saved.name}
												class="h-64 w-full object-cover"
											/>
										{:else}
											<div class="h-64 w-full bg-[linear-gradient(135deg,#2d2d2d,#8a6548,#e4d6b1)]"></div>
										{/if}
										<div class="px-5 pb-5 pt-4">
											<p class="text-[0.74rem] tracking-[0.22em] text-[#8f5b1c] uppercase">
												{getRecipeCategory(saved.recipe)}
											</p>
											<h3 class="mt-3 font-serif text-3xl leading-tight text-stone-950">
												{saved.name}
											</h3>
											<div class="mt-5 flex items-center justify-between border-t border-stone-200 pt-4">
												<p class="text-sm italic text-stone-500">{formatRelativeTime(saved.updatedAt)}</p>
												<div class="flex items-center gap-2 text-stone-500">
													<HeartIcon class="size-5" />
													<span class="text-sm">{findCollectionMembership(saved.id).length}</span>
												</div>
											</div>
										</div>
									</button>
								</article>
							{/each}

							{#if !galleryState.draftIncluded && galleryState.savedCards.length === 0}
								<div class="col-span-full rounded-[1.6rem] border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
									<p class="font-serif text-3xl text-stone-900">No matches in your library</p>
									<p class="mt-3 text-stone-600">Try a different search term or create a new recipe card.</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</section>
		{:else if activeView === 'editor'}
			<section class="mt-4 grid gap-8 xl:grid-cols-[490px_minmax(0,1fr)]">
				<div class="bg-[#f5edde] pr-6 xl:border-r xl:border-stone-300/35">
					<div class="px-0 py-7">
						<h1 class="font-serif text-5xl leading-none text-stone-950">Recipe Builder</h1>
						<p class="mt-3 text-2xl italic text-stone-600">Crafting your next masterpiece</p>
					</div>
					<div class="app-scrollbar max-h-[calc(100vh-14rem)] overflow-y-auto px-0 py-5">
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
								onclick={copyRecipeImage}
							>
								Export as PNG
							</Button.Root>
							<Button.Root
								variant="outline"
								class="h-12 rounded-full border-0 bg-[#ece3d3] px-8 tracking-[0.16em] uppercase shadow-none"
								onclick={() => {
									if (collections[0]) addCurrentRecipeToCollection(collections[0].id);
								}}
								disabled={isSharedView || collections.length === 0}
							>
								Add To Collection
							</Button.Root>
						</div>
					</div>
				</div>
			</section>
		{:else}
			<section class="mt-6 grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
				<aside class="rounded-[2rem] border border-stone-300/40 bg-[#f8f1e4] p-6">
					<div class="flex items-center gap-3">
						<div class="inline-flex size-13 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
							<FolderKanbanIcon class="size-6" />
						</div>
						<div>
							<p class="text-[0.74rem] tracking-[0.22em] text-[#9b4d12] uppercase">Collections</p>
							<h2 class="mt-1 font-serif text-4xl leading-none">Shelves</h2>
						</div>
					</div>

					<div class="mt-6 space-y-2">
						{#each collections as collection}
							<button
								type="button"
								class={`w-full rounded-[1.4rem] px-4 py-4 text-left transition ${
									activeCollection?.id === collection.id
										? 'bg-stone-900 text-white shadow-[0_20px_40px_-30px_rgba(0,0,0,0.55)]'
										: 'bg-white/70 text-stone-900 hover:bg-white'
								}`}
								onclick={() => (selectedCollectionId = collection.id)}
							>
								<p class="font-serif text-2xl">{collection.name}</p>
								<p class={`mt-2 text-sm leading-6 ${activeCollection?.id === collection.id ? 'text-stone-200' : 'text-stone-600'}`}>
									{collection.description}
								</p>
							</button>
						{/each}
					</div>

					<Button.Root
						class="mt-6 h-14 w-full rounded-2xl bg-stone-950 text-white"
						onclick={() => {
							showCollectionComposer = true;
							activeView = 'editor';
						}}
					>
						<PlusIcon class="size-4" />
						Create Collection
					</Button.Root>
				</aside>

				<div class="rounded-[2rem] border border-stone-300/40 bg-[#fbf6eb] p-6 md:p-8">
					{#if activeCollection}
						{@const collectionRecipes = getCollectionRecipes(activeCollection)}
						<div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
							<div class="max-w-4xl">
								<p class="text-[0.78rem] font-semibold tracking-[0.32em] text-[#9b4d12] uppercase">Curated Collection</p>
								<h1 class="mt-3 font-serif text-5xl leading-none text-stone-950 md:text-7xl">
									{activeCollection.name}
								</h1>
								<p class="mt-5 max-w-3xl text-lg leading-9 text-stone-700">
									{activeCollection.description || 'A place to gather recipes into a cohesive editorial story.'}
								</p>
							</div>

							<div class="flex flex-wrap gap-3">
								<Button.Root
									variant="outline"
									class="h-16 rounded-2xl border-stone-300 bg-[#ece3d3] px-8 text-lg text-stone-900"
									onclick={() => {
										activeView = 'editor';
										showCollectionComposer = false;
									}}
								>
									<FilePenLineIcon class="size-5" />
									Edit Recipe
								</Button.Root>
								<Button.Root
									class="h-16 rounded-2xl bg-stone-950 px-8 text-lg text-white"
									onclick={() => addCurrentRecipeToCollection(activeCollection.id)}
									disabled={isSharedView}
								>
									<PlusIcon class="size-5" />
									Add Current
								</Button.Root>
							</div>
						</div>

						<div class="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
							<div class="relative min-h-[560px] overflow-hidden rounded-[1.8rem] bg-stone-950 shadow-[0_24px_80px_-45px_rgba(0,0,0,0.65)]">
								{#if collectionRecipes[0]?.recipe.heroImageUrl}
									<img
										src={collectionRecipes[0].recipe.heroImageUrl}
										alt={collectionRecipes[0].name}
										class="absolute inset-0 h-full w-full object-cover opacity-90"
									/>
								{:else}
									<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.55),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.4),transparent_28%),linear-gradient(180deg,#3f2b1c,#16120f_55%,#0f0d0b)]"></div>
								{/if}
								<div class="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent"></div>
								<div class="absolute bottom-8 left-8 right-8 text-white">
									<p class="text-[0.82rem] tracking-[0.32em] text-stone-200 uppercase">Collection cover</p>
									<h2 class="mt-3 max-w-[14ch] font-serif text-4xl leading-[1.04] md:text-6xl">
										{collectionRecipes[0]?.name ?? displayRecipeName}
									</h2>
									<p class="mt-4 max-w-xl text-lg leading-8 text-stone-200">
										{collectionRecipes[0]?.recipe.description || 'Save recipes into this collection to build a visually rich editorial shelf.'}
									</p>
								</div>
							</div>

							<div class="grid gap-6 sm:grid-cols-2">
								{#each collectionRecipes as saved}
									<article class="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-[0_18px_40px_-30px_rgba(82,57,26,0.35)]">
										<button type="button" class="block w-full text-left" onclick={() => loadRecipeById(saved.id)}>
											{#if saved.recipe.heroImageUrl}
												<img src={saved.recipe.heroImageUrl} alt={saved.name} class="h-56 w-full object-cover" />
											{:else}
												<div class="h-56 w-full bg-[linear-gradient(135deg,#2d2d2d,#8a6548,#e4d6b1)]"></div>
											{/if}
											<div class="px-5 pb-5 pt-4">
												<p class="text-[0.74rem] tracking-[0.22em] text-[#8f5b1c] uppercase">
													{getRecipeCategory(saved.recipe)}
												</p>
												<h3 class="mt-3 font-serif text-3xl leading-tight text-stone-950">
													{saved.name}
												</h3>
											</div>
										</button>
										<div class="flex items-center justify-between border-t border-stone-200 px-5 py-4">
											<p class="text-sm italic text-stone-500">{formatRelativeTime(saved.updatedAt)}</p>
											<Button.Root
												variant="ghost"
												size="icon-sm"
												class="rounded-full text-stone-500 hover:bg-red-50 hover:text-red-700"
												onclick={() => removeRecipeFromActiveCollection(saved.id)}
											>
												<Trash2Icon class="size-4" />
											</Button.Root>
										</div>
									</article>
								{/each}

								{#if collectionRecipes.length === 0}
									<div class="col-span-full rounded-[1.6rem] border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
										<p class="font-serif text-3xl text-stone-900">This shelf is waiting for its first dish</p>
										<p class="mt-3 text-stone-600">Save the recipe you’re editing, then add it to this collection.</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}
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

<AlertDialog.Root bind:open={isDeleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete saved recipe?</AlertDialog.Title>
			<AlertDialog.Description>
				This removes the recipe snapshot from your library and any collections that reference it.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDeleteRecipe}>Delete</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<Toaster richColors closeButton position="top-right" />
