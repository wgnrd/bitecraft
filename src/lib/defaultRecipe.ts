import type { Recipe } from '$lib/types';

export const defaultRecipe: Recipe = {
	title: 'Herbed Lemon Chicken Skillet',
	description:
		'A weeknight-friendly one-pan recipe with bright lemon, garlic, and tender chicken finished with fresh herbs.',
	tags: [],
	showHeroImage: true,
	heroImageUrl: '',
	heroImageScale: 1,
	heroImagePositionX: 50,
	heroImagePositionY: 50,
	servings: 4,
	prepMinutes: 15,
	cookMinutes: 25,
	ingredients: [
		{ name: 'Boneless chicken thighs', amount: 1.5, unit: 'lb' },
		{ name: 'Olive oil', amount: 2, unit: 'tbsp' },
		{ name: 'Garlic cloves, minced', amount: 4, unit: '' },
		{ name: 'Lemon (zest + juice)', amount: 1, unit: '' },
		{ name: 'Low-sodium chicken broth', amount: 1, unit: 'cup' },
		{ name: 'Fresh parsley, chopped', amount: 2, unit: 'tbsp' },
		{ name: 'Kosher salt', amount: 1, unit: 'tsp' },
		{ name: 'Black pepper', amount: 0.5, unit: 'tsp' }
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
