import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JobData } from '../../types/resume';

interface JobState {
  currentJob: JobData | null;
  isJobPageDetected: boolean;
  isExtracting: boolean;
  extractionError: string | null;
}

const initialState: JobState = {
  currentJob: null,
  isJobPageDetected: false,
  isExtracting: false,
  extractionError: null,
};

const jobSlice = createSlice({
  name: 'job',
  initialState,
  reducers: {
    setCurrentJob: (state, action: PayloadAction<JobData | null>) => {
      state.currentJob = action.payload;
    },
    setJobPageDetected: (state, action: PayloadAction<boolean>) => {
      state.isJobPageDetected = action.payload;
    },
    setExtracting: (state, action: PayloadAction<boolean>) => {
      state.isExtracting = action.payload;
    },
    setExtractionError: (state, action: PayloadAction<string | null>) => {
      state.extractionError = action.payload;
    },
    updateJobData: (state, action: PayloadAction<Partial<JobData>>) => {
      if (state.currentJob) {
        state.currentJob = { ...state.currentJob, ...action.payload };
      }
    },
    clearJobData: (state) => {
      state.currentJob = null;
      state.isJobPageDetected = false;
      state.extractionError = null;
    },
  },
});

export const {
  setCurrentJob,
  setJobPageDetected,
  setExtracting,
  setExtractionError,
  updateJobData,
  clearJobData,
} = jobSlice.actions;

export default jobSlice.reducer;