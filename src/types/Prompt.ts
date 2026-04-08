export interface Prompt {
    id: string;
    slug?: string;
    category: string;
    platform: string | string[];
    title: string;
    problem: string;
    before: string;
    after: string;
    fullPrompt?: string;
    instructions?: string;
    tutorialLink?: string;
    tutorialVideo?: string;
    price: number;
    impressions?: number;
    likes?: number;
    unlocks?: number;
    promptType: 'text' | 'image' | 'video';
    beforeImage?: string;
    beforeImageThumb?: string;
    afterImage?: string;
    afterImageThumb?: string;
    outputMedia?: string;
    outputMediaThumb?: string;
    outputMediaType?: 'image' | 'video';
    images?: string[];
    createdAt?: any;
}

