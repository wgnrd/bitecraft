export type RecipeTheme = 'classic' | 'minimal' | 'bold';

export type Recipe = {
	title: string;
	description: string;
	servings: number | null;
	prepMinutes: number | null;
	cookMinutes: number | null;
	ingredients: string[];
	steps: string[];
	theme: RecipeTheme;
};

export type SavedRecipe = {
	id: string;
	name: string;
	recipe: Recipe;
	updatedAt: string;
};
