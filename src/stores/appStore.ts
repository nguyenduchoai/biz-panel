/**
 * Biz-Panel Store - Application State using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Server, ResourceMetrics, Activity } from '../types';

interface AppState {
    // Sidebar
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;

    // Theme
    theme: 'dark' | 'light';
    setTheme: (theme: 'dark' | 'light') => void;

    // Current Server (multi-server support)
    currentServer: Server | null;
    servers: Server[];
    setCurrentServer: (server: Server) => void;
    setServers: (servers: Server[]) => void;

    // Resource Metrics
    metrics: ResourceMetrics | null;
    setMetrics: (metrics: ResourceMetrics) => void;

    // Activities
    activities: Activity[];
    addActivity: (activity: Activity) => void;
    clearActivities: () => void;

    // Global Loading
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    // Notifications
    unreadNotifications: number;
    setUnreadNotifications: (count: number) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Sidebar
            sidebarCollapsed: false,
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            // Theme
            theme: 'dark',
            setTheme: (theme) => {
                document.body.setAttribute('theme-mode', theme);
                set({ theme });
            },

            // Current Server
            currentServer: null,
            servers: [],
            setCurrentServer: (server) => set({ currentServer: server }),
            setServers: (servers) => set({ servers }),

            // Resource Metrics
            metrics: null,
            setMetrics: (metrics) => set({ metrics }),

            // Activities
            activities: [],
            addActivity: (activity) =>
                set((state) => ({
                    activities: [activity, ...state.activities].slice(0, 50),
                })),
            clearActivities: () => set({ activities: [] }),

            // Global Loading
            isLoading: false,
            setIsLoading: (loading) => set({ isLoading: loading }),

            // Notifications
            unreadNotifications: 0,
            setUnreadNotifications: (count) => set({ unreadNotifications: count }),
        }),
        {
            name: 'biz-panel-storage',
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                theme: state.theme,
                currentServer: state.currentServer,
            }),
        }
    )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('biz-panel-storage');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            document.body.setAttribute('theme-mode', parsed.state?.theme || 'dark');
        } catch {
            document.body.setAttribute('theme-mode', 'dark');
        }
    } else {
        document.body.setAttribute('theme-mode', 'dark');
    }
}
