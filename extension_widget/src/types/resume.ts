export interface JobData {
  title: string;
  company: string;
  description: string;
  url: string;
  timestamp: string;
  source?: string;
}

export interface ResumeAnalysis {
  keywords?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceLevel?: 'entry' | 'mid' | 'senior';
  industryFocus?: string;
  companySize?: 'startup' | 'mid' | 'enterprise';
  workStyle?: 'remote' | 'hybrid' | 'onsite';
  keyRequirements?: string[];
  desirableTraits?: string[];
  atsKeywords?: string[];
  salaryRange?: string;
  benefits?: string[];
  growthOpportunities?: string;
}

export interface BaseResume {
  fileName: string;
  fileType: string;
  uploadDate: string;
  originalContent?: string;
}

export interface TailoredResume {
  jobTitle: string;
  company: string;
  jobUrl: string;
  pdfUrl: string;
  createdDate: string;
  aiAnalysis: ResumeAnalysis;
}

export interface TailoredResumeResult {
  content: string;
  analysis: ResumeAnalysis;
}

export interface ATSReport {
  score: number;
  missingKeywords: string[];
  suggestions: string[];
  compatibility: 'low' | 'medium' | 'high';
}

export interface ExtensionSettings {
  aiProvider: 'claude' | 'openai';
  apiKey: string;
  googleToken?: string;
}

export interface ChromeMessage {
  action: string;
  data?: any;
  jobData?: JobData;
  file?: string;
  fileName?: string;
  fileType?: string;
  baseResume?: BaseResume;
  pdfUrl?: string;
}

export interface ChromeMessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}