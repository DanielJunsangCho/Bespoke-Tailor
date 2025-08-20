import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ExtensionSettings } from '../../types/resume';

interface SettingsState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: SettingsState = {
  settings: {
    aiProvider: 'claude',
    apiKey: '',
  },
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunk for loading settings
export const loadSettings = createAsyncThunk(
  'settings/load',
  async () => {
    const result = await chrome.storage.sync.get(['aiProvider', 'apiKey', 'googleToken']);
    return {
      aiProvider: result.aiProvider || 'claude',
      apiKey: result.apiKey || '',
      googleToken: result.googleToken || undefined,
    };
  }
);

// Async thunk for saving settings
export const saveSettings = createAsyncThunk(
  'settings/save',
  async (settings: Partial<ExtensionSettings>) => {
    await chrome.storage.sync.set(settings);
    return settings;
  }
);

// Async thunk for Google authentication
export const authenticateGoogle = createAsyncThunk(
  'settings/authenticateGoogle',
  async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'authenticateGoogle'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Authentication failed');
    }
    
    return response.data;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateApiKey: (state, action: PayloadAction<string>) => {
      state.settings.apiKey = action.payload;
    },
    updateProvider: (state, action: PayloadAction<'claude' | 'openai'>) => {
      state.settings.aiProvider = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings cases
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings = { ...state.settings, ...action.payload };
        state.isAuthenticated = !!action.payload.googleToken;
        state.error = null;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load settings';
      })
      
      // Save settings cases
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
      })
      
      // Google auth cases
      .addCase(authenticateGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(authenticateGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.settings.googleToken = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(authenticateGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Authentication failed';
      });
  },
});

export const { updateApiKey, updateProvider, clearError, setAuthenticated } = settingsSlice.actions;
export default settingsSlice.reducer;