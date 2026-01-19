/**
 * Localization System for Biz-Panel
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en } from './en';
import { vi } from './vi';

// Define available languages
export type Language = 'en' | 'vi';

// Translations type
export type Translations = typeof en;

// All translations
const translations: Record<Language, Translations> = {
    en,
    vi,
};

// Language labels
export const languageLabels: Record<Language, string> = {
    en: '🇺🇸 English',
    vi: '🇻🇳 Tiếng Việt',
};

// Zustand store for language
interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

export const useLanguage = create<LanguageState>()(
    persist(
        (set) => ({
            language: 'vi' as Language, // Default to Vietnamese
            t: translations['vi'],
            setLanguage: (lang: Language) => {
                set({
                    language: lang,
                    t: translations[lang],
                });
            },
        }),
        {
            name: 'biz-panel-language',
            partialize: (state) => ({ language: state.language }),
            onRehydrateStorage: () => (state) => {
                // After rehydrating, make sure translations are loaded
                if (state) {
                    state.t = translations[state.language];
                }
            },
        }
    )
);

// Helper hook for easy translation access
export function useTranslation() {
    const { t, language, setLanguage } = useLanguage();
    return { t, language, setLanguage, languages: languageLabels };
}

// Export translations for direct use
export { en, vi, translations };
