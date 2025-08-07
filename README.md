# Bespoke Resume Chrome Extension

Automatically tailor your resume for job applications using AI. This Chrome extension detects job postings, analyzes requirements, and creates customized resumes stored in Google Docs.

## Features

- 🔍 **Auto-Detection**: Automatically detects job postings on major job sites (LinkedIn, Indeed, Glassdoor, etc.)
- 🤖 **AI-Powered Analysis**: Uses Claude or OpenAI to analyze job descriptions and extract key requirements
- 📝 **Google Docs Integration**: Stores and edits resumes directly in Google Docs
- 🎯 **ATS Optimization**: Optimizes resumes for Applicant Tracking Systems with keyword matching
- 📊 **Resume History**: Track all your tailored resumes and application history
- 📄 **Multiple Export Formats**: Download as PDF, DOCX, or plain text
- 🏷️ **Keyword Highlighting**: Identifies and incorporates important keywords from job postings

## Setup Instructions

### 1. Prerequisites

- Google Chrome browser
- Google account (for Google Docs integration)
- AI API key (Claude or OpenAI)

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Docs API
   - Google Drive API
4. Create credentials (OAuth 2.0 Client ID):
   - Application type: Chrome Extension
   - Add your extension ID once installed
5. Update `manifest.json` with your client ID:
   ```json
   "oauth2": {
     "client_id": "YOUR_GOOGLE_CLIENT_ID",
     "scopes": [
       "https://www.googleapis.com/auth/documents",
       "https://www.googleapis.com/auth/drive.file"
     ]
   }
   ```

### 3. AI Service Setup

Choose one of the following AI providers:

#### Option A: Claude (Anthropic)
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account and get your API key
3. Configure in extension settings

#### Option B: OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Configure in extension settings

### 4. Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Note the extension ID for Google Cloud setup

### 5. Configuration

1. Click the extension icon in Chrome
2. Go to settings (if available) or configure through the popup
3. Enter your AI API key
4. Complete Google authentication when prompted
5. Upload your base resume

## Usage

### Basic Workflow

1. **Upload Base Resume**: Click the extension icon and upload your master resume
2. **Navigate to Job Posting**: Visit any supported job site and open a job posting
3. **Tailor Resume**: Click the "Tailor Resume" button that appears on job pages
4. **Review & Download**: View the tailored resume in Google Docs and download as needed

### Supported Job Sites

- LinkedIn Jobs
- Indeed
- Glassdoor
- Monster
- ZipRecruiter
- Workday
- Greenhouse
- Lever
- SmartRecruiters

### Features in Detail

#### Auto-Detection
The extension automatically detects when you're viewing a job posting and shows a "Tailor Resume" button. It extracts:
- Job title and company
- Job description and requirements
- Key skills and qualifications

#### AI Analysis
The AI service analyzes job postings to identify:
- Required vs. preferred skills
- Experience level expectations
- Industry-specific keywords
- ATS-friendly terminology
- Company culture indicators

#### Resume Tailoring
AI tailoring includes:
- Keyword optimization for ATS
- Skill emphasis based on job requirements
- Experience reordering for relevance
- Language matching to job posting tone
- Achievement highlighting

## File Structure

```
├── manifest.json           # Extension configuration
├── popup.html              # Main popup interface
├── popup.js                # Popup functionality
├── content.js              # Job page detection
├── content.css             # Styling for injected elements
├── background.js           # Background service worker
├── ai-service.js           # AI integration service
├── pdf-service.js          # PDF generation and download
├── history.html            # Resume history page
├── history.js              # History management
└── README.md              # This file
```

## API Integration

### Google Docs API
- Creates new documents for each tailored resume
- Updates document content with AI-generated text
- Maintains document permissions and sharing

### AI Services
- **Claude**: Uses Anthropic's Claude API for natural language processing
- **OpenAI**: Alternative using GPT models
- Both services analyze job descriptions and tailor resume content

## Privacy & Security

- All resume data is stored in your personal Google Drive
- API keys are stored locally in Chrome's secure storage
- No resume content is transmitted to third-party servers except AI providers
- Job posting data is only used for analysis and not stored permanently

## Troubleshooting

### Common Issues

**Extension not detecting job pages:**
- Ensure you're on a supported job site
- Check that the page has loaded completely
- Try refreshing the page

**Google authentication failing:**
- Verify your Google Cloud project setup
- Check that the correct client ID is in manifest.json
- Ensure required APIs are enabled

**AI service errors:**
- Verify your API key is correct and active
- Check your API usage limits
- Ensure you have sufficient credits/quota

**Resume not generating:**
- Confirm you've uploaded a base resume
- Check that Google Docs API permissions are granted
- Verify internet connectivity

### Debug Mode

Enable Chrome Developer Tools to see console logs:
1. Right-click extension icon → "Inspect popup"
2. Check console for error messages
3. Look for API response details

## Development

### Local Development

1. Make changes to source files
2. Go to `chrome://extensions/` and click refresh for your extension
3. Test functionality on supported job sites

### Adding New Job Sites

To add support for new job sites:

1. Update `manifest.json` host permissions
2. Add site-specific selectors to `content.js`
3. Test detection and extraction logic

### Customizing AI Prompts

Modify prompts in `ai-service.js`:
- `createJobAnalysisPrompt()` - for job description analysis
- `createResumePrompt()` - for resume tailoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple job sites
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Chrome extension console logs
- Verify API configurations and permissions

## Future Enhancements

- Cover letter generation
- Interview preparation based on job analysis
- Application tracking and follow-up reminders
- Resume A/B testing and optimization
- Integration with additional job sites
- Mobile app companion