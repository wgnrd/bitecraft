import type {
	Recipe,
	RecipeCollection,
	RecipeIngredient,
	RecipeTag,
	RecipeTheme,
	SavedRecipe
} from '$lib/types';

const STORAGE_KEY = 'bitecraft:recipe';
const SAVED_RECIPES_KEY = 'bitecraft:saved-recipes';
const COLLECTIONS_KEY = 'bitecraft:collections';
const VALID_THEMES: RecipeTheme[] = ['classic', 'minimal', 'bold'];
const DEFAULT_HERO_IMAGE_SCALE = 1;
const DEFAULT_HERO_IMAGE_POSITION = 50;
const DEFAULT_COLLECTIONS: RecipeCollection[] = [
	{
		id: 'starter-harvest-table',
		name: 'Harvest Table Favorites',
		description: 'A warm mix of seasonal mains, bakes, and drinks for cozy editorial spreads.',
		recipeIds: [],
		coverRecipeId: null,
		updatedAt: '2026-03-19T09:00:00.000Z'
	},
	{
		id: 'starter-autumn-gallery',
		name: 'Autumn Gallery',
		description: 'Curated recipes staged like a visual issue, ready for refinement or publishing.',
		recipeIds: [],
		coverRecipeId: null,
		updatedAt: '2026-03-19T09:00:00.000Z'
	},
	{
		id: 'starter-weekend-baking',
		name: 'Weekend Baking',
		description: 'Proofing projects, laminated doughs, and slow kitchen rituals worth saving.',
		recipeIds: [],
		coverRecipeId: null,
		updatedAt: '2026-03-19T09:00:00.000Z'
	}
];

const clampNumber = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

const toNullableNumber = (value: unknown): number | null => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return null;
	}

	const next = Math.max(0, Math.round(value));
	return Number.isFinite(next) ? next : null;
};

const toStringList = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter(Boolean);
};

const toNullableAmount = (value: unknown): number | null => {
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
		return null;
	}

	return value >= 0 ? Number(value.toFixed(2)) : null;
};

const normalizeIngredient = (value: unknown): RecipeIngredient | null => {
	if (typeof value === 'string') {
		const name = value.trim();
		return name ? { name, amount: null, unit: '' } : null;
	}

	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof RecipeIngredient, unknown>>;
	const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 160) : '';
	if (!name) {
		return null;
	}

	return {
		name,
		amount: toNullableAmount(candidate.amount),
		unit: typeof candidate.unit === 'string' ? candidate.unit.trim().slice(0, 40) : ''
	};
};

const toIngredientList = (value: unknown): RecipeIngredient[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => normalizeIngredient(entry))
		.filter((entry): entry is RecipeIngredient => entry !== null);
};

const normalizeTag = (value: unknown): RecipeTag | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof RecipeTag, unknown>>;
	const label = typeof candidate.label === 'string' ? candidate.label.slice(0, 32).trim() : '';
	const color =
		typeof candidate.color === 'string' && /^#([0-9a-fA-F]{6})$/.test(candidate.color)
			? candidate.color
			: '#f7cfb0';

	if (!label) {
		return null;
	}

	return { label, color };
};

const toTagList = (value: unknown): RecipeTag[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => normalizeTag(entry))
		.filter((entry): entry is RecipeTag => entry !== null);
};

const toClampedNumber = (value: unknown, min: number, max: number, fallback: number): number => {
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
		return fallback;
	}

	return clampNumber(Number(value.toFixed(2)), min, max);
};

export const normalizeRecipe = (value: unknown): Recipe | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof Recipe, unknown>>;
	const legacyCandidate = candidate as Partial<Record<'tagLabel' | 'tagColor', unknown>>;
	const theme =
		typeof candidate.theme === 'string' && VALID_THEMES.includes(candidate.theme as RecipeTheme)
			? (candidate.theme as RecipeTheme)
			: 'classic';

	return {
		title: typeof candidate.title === 'string' ? candidate.title.slice(0, 120) : '',
		description: typeof candidate.description === 'string' ? candidate.description.slice(0, 320) : '',
		tags: (() => {
			const normalizedTags = toTagList(candidate.tags);
			if (normalizedTags.length > 0) {
				return normalizedTags;
			}

			const legacyLabel =
				typeof legacyCandidate.tagLabel === 'string'
					? legacyCandidate.tagLabel.slice(0, 32).trim()
					: '';
			const legacyColor =
				typeof legacyCandidate.tagColor === 'string' &&
				/^#([0-9a-fA-F]{6})$/.test(legacyCandidate.tagColor)
					? legacyCandidate.tagColor
					: '#f7cfb0';

			return legacyLabel ? [{ label: legacyLabel, color: legacyColor }] : [];
		})(),
		showHeroImage: typeof candidate.showHeroImage === 'boolean' ? candidate.showHeroImage : true,
		heroImageUrl:
			typeof candidate.heroImageUrl === 'string' ? candidate.heroImageUrl.trim().slice(0, 2048) : '',
		heroImageScale: toClampedNumber(candidate.heroImageScale, 1, 3, DEFAULT_HERO_IMAGE_SCALE),
		heroImagePositionX: toClampedNumber(
			candidate.heroImagePositionX,
			0,
			100,
			DEFAULT_HERO_IMAGE_POSITION
		),
		heroImagePositionY: toClampedNumber(
			candidate.heroImagePositionY,
			0,
			100,
			DEFAULT_HERO_IMAGE_POSITION
		),
		servings: toNullableNumber(candidate.servings),
		prepMinutes: toNullableNumber(candidate.prepMinutes),
		cookMinutes: toNullableNumber(candidate.cookMinutes),
		ingredients: toIngredientList(candidate.ingredients),
		steps: toStringList(candidate.steps),
		theme
	};
};

export const loadRecipe = (): Recipe | null => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return null;
		}

		return normalizeRecipe(JSON.parse(raw));
	} catch {
		return null;
	}
};

export const saveRecipe = (recipe: Recipe): void => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(recipe));
};

export const clearRecipe = (): void => {
	localStorage.removeItem(STORAGE_KEY);
};

const normalizeSavedRecipe = (value: unknown): SavedRecipe | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof SavedRecipe, unknown>>;
	const recipe = normalizeRecipe(candidate.recipe);

	if (!recipe || typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
		return null;
	}

	return {
		id: candidate.id,
		name: candidate.name.slice(0, 120).trim() || 'Untitled recipe',
		recipe,
		updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
	};
};

const normalizeCollection = (value: unknown): RecipeCollection | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof RecipeCollection, unknown>>;
	if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
		return null;
	}

	const recipeIds = Array.isArray(candidate.recipeIds)
		? candidate.recipeIds.filter((entry): entry is string => typeof entry === 'string')
		: [];

	return {
		id: candidate.id,
		name: candidate.name.slice(0, 80).trim() || 'Untitled collection',
		description:
			typeof candidate.description === 'string'
				? candidate.description.slice(0, 220).trim()
				: '',
		recipeIds: Array.from(new Set(recipeIds)),
		coverRecipeId:
			typeof candidate.coverRecipeId === 'string' && candidate.coverRecipeId.trim()
				? candidate.coverRecipeId
				: null,
		updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
	};
};

export const loadSavedRecipes = (): SavedRecipe[] => {
	try {
		const raw = localStorage.getItem(SAVED_RECIPES_KEY);
		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed
			.map((entry) => normalizeSavedRecipe(entry))
			.filter((entry): entry is SavedRecipe => entry !== null)
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	} catch {
		return [];
	}
};

const persistSavedRecipes = (recipes: SavedRecipe[]): void => {
	localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
};

const makeId = (): string =>
	typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const saveRecipeSnapshot = (recipe: Recipe, name: string, id?: string): SavedRecipe => {
	const current = loadSavedRecipes();
	const now = new Date().toISOString();
	const normalizedName = name.slice(0, 120).trim() || 'Untitled recipe';

	const snapshot: SavedRecipe = {
		id: id ?? makeId(),
		name: normalizedName,
		recipe,
		updatedAt: now
	};

	const next = [snapshot, ...current.filter((entry) => entry.id !== snapshot.id)];
	persistSavedRecipes(next);
	return snapshot;
};

export const deleteRecipeSnapshot = (id: string): void => {
	const current = loadSavedRecipes();
	persistSavedRecipes(current.filter((entry) => entry.id !== id));
	const collections = loadCollections().map((collection) => ({
		...collection,
		recipeIds: collection.recipeIds.filter((recipeId) => recipeId !== id),
		coverRecipeId: collection.coverRecipeId === id ? null : collection.coverRecipeId
	}));
	localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
};

export const loadCollections = (): RecipeCollection[] => {
	try {
		const raw = localStorage.getItem(COLLECTIONS_KEY);
		if (!raw) {
			return DEFAULT_COLLECTIONS;
		}

		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return DEFAULT_COLLECTIONS;
		}

		const collections = parsed
			.map((entry) => normalizeCollection(entry))
			.filter((entry): entry is RecipeCollection => entry !== null)
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		return collections.length > 0 ? collections : DEFAULT_COLLECTIONS;
	} catch {
		return DEFAULT_COLLECTIONS;
	}
};

const persistCollections = (collections: RecipeCollection[]): void => {
	localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
};

export const saveCollection = (
	collection: Pick<RecipeCollection, 'name' | 'description'>,
	id?: string
): RecipeCollection => {
	const current = loadCollections();
	const now = new Date().toISOString();
	const nextCollection: RecipeCollection = {
		id: id ?? makeId(),
		name: collection.name.slice(0, 80).trim() || 'Untitled collection',
		description: collection.description.slice(0, 220).trim(),
		recipeIds: current.find((entry) => entry.id === id)?.recipeIds ?? [],
		coverRecipeId: current.find((entry) => entry.id === id)?.coverRecipeId ?? null,
		updatedAt: now
	};

	const next = [nextCollection, ...current.filter((entry) => entry.id !== nextCollection.id)];
	persistCollections(next);
	return nextCollection;
};

export const deleteCollection = (id: string): void => {
	const current = loadCollections();
	persistCollections(current.filter((entry) => entry.id !== id));
};

export const addRecipeToCollection = (collectionId: string, recipeId: string): RecipeCollection | null => {
	const current = loadCollections();
	const collection = current.find((entry) => entry.id === collectionId);
	if (!collection) {
		return null;
	}

	const updated: RecipeCollection = {
		...collection,
		recipeIds: Array.from(new Set([recipeId, ...collection.recipeIds])),
		coverRecipeId: collection.coverRecipeId ?? recipeId,
		updatedAt: new Date().toISOString()
	};

	persistCollections([updated, ...current.filter((entry) => entry.id !== collectionId)]);
	return updated;
};

export const removeRecipeFromCollection = (
	collectionId: string,
	recipeId: string
): RecipeCollection | null => {
	const current = loadCollections();
	const collection = current.find((entry) => entry.id === collectionId);
	if (!collection) {
		return null;
	}

	const nextRecipeIds = collection.recipeIds.filter((entry) => entry !== recipeId);
	const updated: RecipeCollection = {
		...collection,
		recipeIds: nextRecipeIds,
		coverRecipeId:
			collection.coverRecipeId === recipeId ? nextRecipeIds[0] ?? null : collection.coverRecipeId,
		updatedAt: new Date().toISOString()
	};

	persistCollections([updated, ...current.filter((entry) => entry.id !== collectionId)]);
	return updated;
};
