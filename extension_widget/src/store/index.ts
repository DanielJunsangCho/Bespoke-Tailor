import { configureStore } from '@reduxjs/toolkit';
import resumeReducer from './slices/resumeSlice';
import jobReducer from './slices/jobSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    resume: resumeReducer,
    job: jobReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;