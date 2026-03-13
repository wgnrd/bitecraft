import type { Recipe } from '$lib/types';

export const defaultRecipe: Recipe = {
	title: 'Herbed Lemon Chicken Skillet',
	description:
		'A weeknight-friendly one-pan recipe with bright lemon, garlic, and tender chicken finished with fresh herbs.',
	heroImageUrl: '',
	heroImageScale: 1,
	heroImagePositionX: 50,
	heroImagePositionY: 50,
	servings: 4,
	prepMinutes: 15,
	cookMinutes: 25,
	ingredients: [
		'1.5 lb boneless chicken thighs',
		'2 tbsp olive oil',
		'4 garlic cloves, minced',
		'1 lemon (zest + juice)',
		'1 cup low-sodium chicken broth',
		'2 tbsp chopped parsley',
		'1 tsp kosher salt',
		'1/2 tsp black pepper'
	],
	steps: [
		'Season chicken with salt and pepper. Heat oil in a skillet over medium-high heat.',
		'Sear chicken 4-5 minutes per side until golden. Transfer to a plate.',
		'Reduce heat to medium, saute garlic for 30 seconds, then add broth, lemon zest, and juice.',
		'Return chicken to skillet and simmer 10-12 minutes until cooked through.',
		'Finish with parsley and spoon pan sauce over the top before serving.'
	],
	theme: 'classic'
};
