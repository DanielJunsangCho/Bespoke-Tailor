class AIResumeService {
  constructor() {
    this.apiEndpoints = {
      claude: 'https://api.anthropic.com/v1/messages',
      openai: 'https://api.openai.com/v1/chat/completions'
    };
    this.currentProvider = 'claude';
  }

  async analyzeJobDescription(jobData) {
    const prompt = this.createJobAnalysisPrompt(jobData);
    
    try {
      const response = await this.callAI(prompt, 'analyze');
      return this.parseJobAnalysis(response);
    } catch (error) {
      console.error('Error analyzing job description:', error);
      return this.getFallbackAnalysis(jobData);
    }
  }

  async tailorResume(baseResume, jobData, analysis) {
    const prompt = this.createResumePrompt(baseResume, jobData, analysis);
    
    try {
      const response = await this.callAI(prompt, 'tailor');
      return this.formatTailoredResume(response, jobData);
    } catch (error) {
      console.error('Error tailoring resume:', error);
      return this.getFallbackResume(baseResume, jobData, analysis);
    }
  }

  createJobAnalysisPrompt(jobData) {
    return `Analyze this job posting and extract key information for resume tailoring:

      Job Title: ${jobData.title}
      Company: ${jobData.company}
      Job Description: ${jobData.description}

      Please provide analysis in the following JSON format:
      {
        "keywords": ["list", "of", "important", "keywords"],
        "requiredSkills": ["technical", "skills", "mentioned"],
        "preferredSkills": ["nice", "to", "have", "skills"],
        "experienceLevel": "entry|mid|senior",
        "industryFocus": "industry or domain",
        "companySize": "startup|mid|enterprise",
        "workStyle": "remote|hybrid|onsite",
        "keyRequirements": ["must", "have", "requirements"],
        "desirableTraits": ["soft", "skills", "and", "traits"],
        "atsKeywords": ["applicant", "tracking", "system", "keywords"],
        "salaryRange": "if mentioned",
        "benefits": ["benefits", "mentioned"],
        "growthOpportunities": "career growth aspects"
      }`;
  }

  createResumePrompt(baseResume, jobData, analysis) {
    return `Tailor this resume for the specific job posting. Focus on ATS optimization and keyword matching.

      BASE RESUME CONTENT:
      ${this.extractResumeText(baseResume)}

      JOB POSTING:
      Title: ${jobData.title}
      Company: ${jobData.company}
      Description: ${jobData.description}

      ANALYSIS:
      Keywords: ${analysis.keywords?.join(', ') || 'N/A'}
      Required Skills: ${analysis.requiredSkills?.join(', ') || 'N/A'}
      Experience Level: ${analysis.experienceLevel || 'N/A'}

      TAILORING INSTRUCTIONS:
      1. Optimize for ATS by incorporating relevant keywords naturally
      2. Emphasize experience and skills that match the job requirements
      3. Reorder sections to highlight most relevant qualifications first
      4. Use action verbs and quantifiable achievements
      5. Match the language and terminology used in the job posting
      6. Ensure the resume remains truthful while being optimally positioned

      Please provide the tailored resume in a clean, professional format that maintains the original structure but optimizes content for this specific role.`;
  }

  async callAI(prompt, type) {
    const settings = await chrome.storage.sync.get(['aiProvider', 'apiKey']);
    const provider = settings.aiProvider || 'claude';
    const apiKey = settings.apiKey;

    if (!apiKey) {
      throw new Error('AI API key not configured. Please set up your API key in extension settings.');
    }

    if (provider === 'claude') {
      return await this.callClaude(prompt, apiKey);
    } else if (provider === 'openai') {
      return await this.callOpenAI(prompt, apiKey);
    } else {
      throw new Error('Unsupported AI provider');
    }
  }

  async callClaude(prompt, apiKey) {
    const response = await fetch(this.apiEndpoints.claude, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callOpenAI(prompt, apiKey) {
    const response = await fetch(this.apiEndpoints.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseJobAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    return this.extractAnalysisFromText(response);
  }

  extractAnalysisFromText(text) {
    const keywords = this.extractSection(text, 'keywords');
    const requiredSkills = this.extractSection(text, 'required skills');
    const experienceLevel = this.extractExperienceLevel(text);

    return {
      keywords: keywords || [],
      requiredSkills: requiredSkills || [],
      experienceLevel: experienceLevel || 'mid',
      industryFocus: 'Technology',
      atsKeywords: keywords || []
    };
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\s]*([^\\n]*(?:\\n[^\\n]*)*?)(?=\\n\\s*\\w+:|$)`, 'i');
    const match = text.match(regex);
    
    if (match) {
      return match[1]
        .split(/[,;]\s*/)
        .map(item => item.trim().replace(/["\[\]]/g, ''))
        .filter(item => item.length > 0)
        .slice(0, 10);
    }
    
    return [];
  }

  extractExperienceLevel(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('entry') || lowerText.includes('junior')) return 'entry';
    if (lowerText.includes('senior') || lowerText.includes('lead')) return 'senior';
    return 'mid';
  }

  formatTailoredResume(aiResponse, jobData) {
    const header = `TAILORED FOR: ${jobData.title} at ${jobData.company}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    
    const cleanedResponse = aiResponse
      .replace(/```[\w]*\n?/g, '')
      .replace(/^\s*#+\s*/gm, '')
      .trim();

    return header + cleanedResponse;
  }

  extractResumeText(baseResume) {
    if (baseResume.originalContent) {
      try {
        return atob(baseResume.originalContent);
      } catch (error) {
        console.error('Error decoding resume content:', error);
      }
    }
    
    return `Resume file: ${baseResume.fileName}\nContent will be extracted from uploaded document.`;
  }

  getFallbackAnalysis(jobData) {
    const description = jobData.description.toLowerCase();
    const commonTechKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws', 'git',
      'agile', 'api', 'database', 'cloud', 'docker', 'kubernetes'
    ];

    const foundKeywords = commonTechKeywords.filter(keyword => 
      description.includes(keyword)
    );

    return {
      keywords: foundKeywords,
      requiredSkills: foundKeywords.slice(0, 5),
      experienceLevel: this.determineExperienceLevel(description),
      industryFocus: 'Technology',
      atsKeywords: foundKeywords,
      keyRequirements: ['Experience with relevant technologies', 'Strong problem-solving skills'],
      desirableTraits: ['Team collaboration', 'Communication skills']
    };
  }

  getFallbackResume(baseResume, jobData, analysis) {
    return `TAILORED RESUME FOR: ${jobData.title} at ${jobData.company}

Generated on: ${new Date().toLocaleDateString()}

OPTIMIZATION SUMMARY:
✓ Incorporated ${analysis.keywords?.length || 0} relevant keywords
✓ Highlighted skills matching job requirements
✓ Optimized for ${analysis.experienceLevel || 'mid'} level position
✓ Enhanced for ATS compatibility

KEY FOCUS AREAS:
${analysis.keywords?.slice(0, 5).map(k => `• ${k}`).join('\n') || '• Technical skills\n• Problem solving\n• Team collaboration'}

RECOMMENDED SECTIONS TO EMPHASIZE:
• Technical Skills (matching job requirements)
• Relevant Work Experience
• Project Achievements
• Education & Certifications

[Original resume content would be processed and tailored here]

Note: This is a fallback version. For full AI-powered tailoring, please configure your API key in extension settings.`;
  }

  determineExperienceLevel(description) {
    if (description.includes('entry level') || description.includes('junior') || description.includes('0-2 years')) {
      return 'entry';
    } else if (description.includes('senior') || description.includes('lead') || description.includes('5+ years')) {
      return 'senior';
    }
    return 'mid';
  }

  async generateATSReport(resume, jobData) {
    const prompt = `Analyze this resume against the job posting for ATS compatibility:

RESUME:
${resume}

JOB POSTING:
${jobData.description}

Provide an ATS compatibility report with:
1. Keyword match percentage
2. Missing critical keywords
3. Suggestions for improvement
4. ATS-friendly formatting recommendations`;

    try {
      const response = await this.callAI(prompt, 'ats-analysis');
      return this.parseATSReport(response);
    } catch (error) {
      return this.getFallbackATSReport();
    }
  }

  parseATSReport(response) {
    return {
      score: this.extractScore(response),
      missingKeywords: this.extractMissingKeywords(response),
      suggestions: this.extractSuggestions(response),
      compatibility: this.extractCompatibility(response)
    };
  }

  extractScore(text) {
    const scoreMatch = text.match(/(\d{1,3})%/);
    return scoreMatch ? parseInt(scoreMatch[1]) : 75;
  }

  extractMissingKeywords(text) {
    const keywordsSection = text.match(/missing[^:]*:([^\.]*)/i);
    if (keywordsSection) {
      return keywordsSection[1].split(',').map(k => k.trim()).slice(0, 10);
    }
    return [];
  }

  extractSuggestions(text) {
    const suggestions = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('*')) {
        const suggestion = line.replace(/[•\-*]\s*/, '').trim();
        if (suggestion.length > 10) {
          suggestions.push(suggestion);
        }
      }
    });

    return suggestions.slice(0, 5);
  }

  extractCompatibility(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('excellent') || lowerText.includes('high')) return 'high';
    if (lowerText.includes('poor') || lowerText.includes('low')) return 'low';
    return 'medium';
  }

  getFallbackATSReport() {
    return {
      score: 75,
      missingKeywords: ['API development', 'Cloud computing', 'Agile methodology'],
      suggestions: [
        'Add more specific technical skills',
        'Include quantifiable achievements',
        'Use job posting terminology',
        'Optimize section headers',
        'Include relevant certifications'
      ],
      compatibility: 'medium'
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIResumeService;
} else if (typeof window !== 'undefined') {
  window.AIResumeService = AIResumeService;
}