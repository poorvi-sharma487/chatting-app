import { create } from 'zustand';

interface UIState {
    darkMode: boolean;
    toggleDarkMode: () => void;
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    darkMode: true,
    toggleDarkMode: () => set((state) => {
        const newMode = !state.darkMode;
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return { darkMode: newMode };
    }),
    isMobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
    activeTab: 'chat',
    setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Initialize dark mode on load
if (typeof window !== 'undefined') {
    document.documentElement.classList.add('dark');
}
