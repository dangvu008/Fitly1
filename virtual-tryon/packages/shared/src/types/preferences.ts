export type GenderPreference = 'male' | 'female' | 'unisex';
export type ModestyLevel = 'any' | 'moderate' | 'high';

export interface UserPreferences {
    userId: string;
    gender: GenderPreference;
    preferredStyles: string[];
    modestyLevel: ModestyLevel;
    hideCategories: string[];
    updatedAt: string;
}

export interface OutfitTags {
    outfitId: string;
    genderTarget: GenderPreference;
    style: string;
    isRevealing: boolean;
    isSwimwear: boolean;
    categories: string[];
    createdAt: string;
}

export const STYLE_OPTIONS = [
    'casual', 'formal', 'streetwear', 'sporty', 'vintage',
    'minimalist', 'bohemian', 'chic', 'business', 'party'
];

export const CATEGORY_OPTIONS = [
    'top', 'bottom', 'dress', 'outerwear', 'shoes',
    'bag', 'hat', 'glasses', 'swimwear', 'underwear'
];
