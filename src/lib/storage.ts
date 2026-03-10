import type { Recipe, RecipeTheme, SavedRecipe } from '$lib/types';

const STORAGE_KEY = 'bitecraft:recipe';
const SAVED_RECIPES_KEY = 'bitecraft:saved-recipes';
const VALID_THEMES: RecipeTheme[] = ['classic', 'minimal', 'bold'];

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

export const normalizeRecipe = (value: unknown): Recipe | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const candidate = value as Partial<Record<keyof Recipe, unknown>>;
	const theme =
		typeof candidate.theme === 'string' && VALID_THEMES.includes(candidate.theme as RecipeTheme)
			? (candidate.theme as RecipeTheme)
			: 'classic';

	return {
		title: typeof candidate.title === 'string' ? candidate.title.slice(0, 120) : '',
		description: typeof candidate.description === 'string' ? candidate.description.slice(0, 320) : '',
		servings: toNullableNumber(candidate.servings),
		prepMinutes: toNullableNumber(candidate.prepMinutes),
		cookMinutes: toNullableNumber(candidate.cookMinutes),
		ingredients: toStringList(candidate.ingredients),
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
};
