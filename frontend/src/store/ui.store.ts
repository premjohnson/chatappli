import { create } from "zustand";

interface UiState {
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
}

export const useUiStore = create<UiState>((set) => ({
    theme: "dark",
    setTheme: (theme) => set({ theme }),
}));
