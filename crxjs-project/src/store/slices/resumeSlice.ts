import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BaseResume, TailoredResume, ATSReport } from '../../types/resume';

interface ResumeState {
  baseResume: BaseResume | null;
  tailoredResumes: TailoredResume[];
  currentATSReport: ATSReport | null;
  isLoading: boolean;
  error: string | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
}

const initialState: ResumeState = {
  baseResume: null,
  tailoredResumes: [],
  currentATSReport: null,
  isLoading: false,
  error: null,
  uploadStatus: 'idle',
};

// Async thunk for uploading resume
export const uploadResume = createAsyncThunk(
  'resume/upload',
  async (payload: { file: string; fileName: string; fileType: string }) => {
    const response = await chrome.runtime.sendMessage({
      action: 'uploadResume',
      ...payload
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Upload failed');
    }
    
    return response.data;
  }
);

// Async thunk for tailoring resume
export const tailorResume = createAsyncThunk(
  'resume/tailor',
  async (jobData: any) => {
    const response = await chrome.runtime.sendMessage({
      action: 'tailorResume',
      jobData
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Tailoring failed');
    }
    
    return response.data;
  }
);

// Async thunk for loading resume history
export const loadResumeHistory = createAsyncThunk(
  'resume/loadHistory',
  async () => {
    const result = await chrome.storage.sync.get(['baseResume', 'resumeHistory']);
    return {
      baseResume: result.baseResume || null,
      resumeHistory: result.resumeHistory || []
    };
  }
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    deleteResumeFromHistory: (state, action: PayloadAction<string>) => {
      state.tailoredResumes = state.tailoredResumes.filter(
        resume => resume.docId !== action.payload
      );
    },
    clearAllResumes: (state) => {
      state.tailoredResumes = [];
    },
    setATSReport: (state, action: PayloadAction<ATSReport>) => {
      state.currentATSReport = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload resume cases
      .addCase(uploadResume.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.error = null;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.uploadStatus = 'success';
        state.baseResume = action.payload;
        state.error = null;
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.uploadStatus = 'error';
        state.error = action.error.message || 'Upload failed';
      })
      
      // Tailor resume cases
      .addCase(tailorResume.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(tailorResume.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tailoredResumes.unshift(action.payload);
        state.error = null;
      })
      .addCase(tailorResume.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Tailoring failed';
      })
      
      // Load history cases
      .addCase(loadResumeHistory.fulfilled, (state, action) => {
        state.baseResume = action.payload.baseResume;
        state.tailoredResumes = action.payload.resumeHistory;
      });
  },
});

export const { clearError, deleteResumeFromHistory, clearAllResumes, setATSReport } = resumeSlice.actions;
export default resumeSlice.reducer;