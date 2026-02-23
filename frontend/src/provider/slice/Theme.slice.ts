import { createSlice } from "@reduxjs/toolkit";

export const ThemeSlice = createSlice({
    name: 'ThemeSlice',
    initialState: {
        theme: localStorage.getItem('theme') || 'light'
    },
    reducers: {
        setTheme(state, action) {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
        }
    }
})

export const { setTheme } = ThemeSlice.actions;

export const ThemeSlicePath = (state: any) => state.ThemeSlice.theme;
