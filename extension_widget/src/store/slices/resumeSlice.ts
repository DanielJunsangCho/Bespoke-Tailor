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

const testResume: TailoredResume = {
  jobTitle: 'Software Engineer (Platform)',
  company: 'GovDash',
  jobUrl: 'https://jobs.ashbyhq.com/govdash/bcefc8d6-a3e5-4c2e-9b0d-11233df1b7c2',
  pdfUrl: 'https://www.google.com',
  createdDate: '2021-01-01',
  aiAnalysis: {}
}

const initialState: ResumeState = {
  baseResume: null,
  tailoredResumes: [testResume],
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
  async (jobData: any, { getState }) => {
    const state = getState() as any;
    const baseResume = state.resume.baseResume;

    if (!baseResume) {
      throw new Error('No base resume available');
    }

    const response = await chrome.runtime.sendMessage({
      action: 'tailorResume',
      jobData,
      baseResume
    });

    if (!response.success) {
      throw new Error(response.error || 'Tailoring failed');
    }

    // Return both the PDF URL and job data for creating the TailoredResume object
    return {
      pdfUrl: response.data,
      jobData
    };
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
        resume => `${resume.jobTitle}-${resume.createdDate.split('T')[0]}` !== action.payload
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
        const { pdfUrl, jobData } = action.payload;
        const tailoredResume: TailoredResume = {
          jobTitle: jobData.title,
          company: jobData.company,
          jobUrl: jobData.url,
          pdfUrl: pdfUrl,
          createdDate: new Date().toISOString(),
          aiAnalysis: {} // This should be populated with actual analysis data from MCP server
        };
        state.tailoredResumes.unshift(tailoredResume);
        state.error = null;
      })
      .addCase(tailorResume.rejected, (state, action) => {
        console.log("tailoring failed ts");
        state.isLoading = false;
        state.error = action.error.message || 'Tailoring failed';
      })
      
      // Load history cases
      .addCase(loadResumeHistory.fulfilled, (state, action) => {
        state.baseResume = action.payload.baseResume;
        if (action.payload.resumeHistory.length > 0) {
          state.tailoredResumes = action.payload.resumeHistory;
        }
      });
  },
});

export const { clearError, deleteResumeFromHistory, clearAllResumes, setATSReport } = resumeSlice.actions;
export default resumeSlice.reducer;