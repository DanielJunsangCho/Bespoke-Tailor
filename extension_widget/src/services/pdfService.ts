export interface PDFTemplate {
  name: string;
  styles: string;
  render: (content: ParsedResumeContent, rawContent: string) => string;
}

export interface ParsedResumeContent {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: ExperienceItem[];
  skills?: string[];
  education?: EducationItem[];
}

export interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  responsibilities?: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  year: string;
}

export interface PDFGenerationResult {
  url: string;
  blob: Blob;
  filename: string;
}

export class PDFService {
  private templates: { [key: string]: PDFTemplate };

  constructor() {
    this.templates = {
      modern: {
        name: 'Modern',
        styles: this.getModernStyles(),
        render: this.modernTemplate.bind(this)
      },
      classic: {
        name: 'Classic',
        styles: this.getClassicStyles(),
        render: this.classicTemplate.bind(this)
      },
      minimal: {
        name: 'Minimal',
        styles: this.getMinimalStyles(),
        render: this.minimalTemplate.bind(this)
      }
    };
  }

  async generatePDF(resumeContent: string, templateName: string = 'modern'): Promise<PDFGenerationResult> {
    const template = this.templates[templateName] || this.templates.modern;
    
    try {
      const htmlContent = this.generateHTML(resumeContent, template);
      return await this.convertToPDF(htmlContent);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private generateHTML(content: string, template: PDFTemplate): string {
    const parsedContent = this.parseResumeContent(content);
    return template.render(parsedContent, content);
  }

  private async convertToPDF(htmlContent: string): Promise<PDFGenerationResult> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        reject(new Error('Failed to access iframe document'));
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        try {
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          document.body.removeChild(iframe);
          
          resolve({
            url,
            blob,
            filename: `resume-${Date.now()}.html`
          });
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      }, 1000);
    });
  }

  async downloadResume(resumeContent: string, filename?: string, format: 'pdf' | 'docx' | 'txt' = 'pdf'): Promise<PDFGenerationResult> {
    try {
      if (format === 'pdf') {
        const result = await this.generatePDF(resumeContent);
        this.triggerDownload(result.url, filename || result.filename);
        return result;
      } else if (format === 'txt') {
        return this.generateTXT(resumeContent, filename);
      } else {
        throw new Error('Unsupported format');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      throw error;
    }
  }

  private modernTemplate(parsedContent: ParsedResumeContent, rawContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume</title>
    <style>${this.getModernStyles()}</style>
</head>
<body>
    <div class="resume-container">
        <header class="header">
            <h1 class="name">${parsedContent.name || 'Your Name'}</h1>
            <div class="contact-info">
                <span class="email">${parsedContent.email || 'email@example.com'}</span>
                <span class="phone">${parsedContent.phone || '(555) 123-4567'}</span>
                <span class="location">${parsedContent.location || 'City, State'}</span>
            </div>
        </header>

        ${parsedContent.summary ? `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary">${parsedContent.summary}</p>
        </section>
        ` : ''}

        ${parsedContent.experience && parsedContent.experience.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Experience</h2>
            ${parsedContent.experience.map(exp => `
                <div class="experience-item">
                    <div class="experience-header">
                        <h3 class="job-title">${exp.title}</h3>
                        <span class="company">${exp.company}</span>
                        <span class="duration">${exp.duration}</span>
                    </div>
                    <ul class="responsibilities">
                        ${exp.responsibilities?.map(resp => `<li>${resp}</li>`).join('') || ''}
                    </ul>
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${parsedContent.skills && parsedContent.skills.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-grid">
                ${parsedContent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        </section>
        ` : ''}

        ${parsedContent.education && parsedContent.education.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${parsedContent.education.map(edu => `
                <div class="education-item">
                    <h3 class="degree">${edu.degree}</h3>
                    <span class="school">${edu.school}</span>
                    <span class="year">${edu.year}</span>
                </div>
            `).join('')}
        </section>
        ` : ''}

        <div class="raw-content">
            <h2 class="section-title">Full Content</h2>
            <div class="content">${rawContent.replace(/\n/g, '<br>')}</div>
        </div>
    </div>
</body>
</html>`;
  }

  private classicTemplate(_parsedContent: ParsedResumeContent, rawContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume</title>
    <style>${this.getClassicStyles()}</style>
</head>
<body>
    <div class="resume-container">
        <div class="content">${rawContent.replace(/\n/g, '<br>')}</div>
    </div>
</body>
</html>`;
  }

  private minimalTemplate(_parsedContent: ParsedResumeContent, rawContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume</title>
    <style>${this.getMinimalStyles()}</style>
</head>
<body>
    <div class="resume-container">
        <pre class="content">${rawContent}</pre>
    </div>
</body>
</html>`;
  }

  private getModernStyles(): string {
    return `
        @page { margin: 0.5in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        .resume-container { 
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
            padding: 20px;
        }
        .header { 
            text-align: center;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .name { 
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .contact-info { 
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .contact-info span { 
            color: #7f8c8d;
            font-size: 1.1em;
        }
        .section { 
            margin-bottom: 30px;
        }
        .section-title { 
            font-size: 1.4em;
            color: #2c3e50;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .summary { 
            font-size: 1.1em;
            line-height: 1.7;
            color: #555;
        }
        .experience-item { 
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .experience-header { 
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        .job-title { 
            font-size: 1.2em;
            color: #2c3e50;
            font-weight: 600;
        }
        .company { 
            color: #7f8c8d;
            font-style: italic;
        }
        .duration { 
            color: #95a5a6;
            font-size: 0.9em;
        }
        .responsibilities li { 
            margin-bottom: 5px;
            margin-left: 20px;
        }
        .skills-grid { 
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .skill-tag { 
            background: #ecf0f1;
            color: #2c3e50;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.9em;
        }
        .education-item { 
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .degree { 
            color: #2c3e50;
        }
        .school { 
            color: #7f8c8d;
        }
        .year { 
            color: #95a5a6;
        }
        .raw-content { 
            border-top: 1px solid #bdc3c7;
            padding-top: 20px;
            margin-top: 30px;
        }
        .content { 
            font-size: 0.95em;
            line-height: 1.6;
        }
        @media print {
            .resume-container { box-shadow: none; }
            body { background: white; }
        }
    `;
  }

  private getClassicStyles(): string {
    return `
        @page { margin: 0.75in; }
        body { 
            font-family: 'Times New Roman', serif;
            line-height: 1.5;
            color: black;
            font-size: 12pt;
        }
        .resume-container { 
            max-width: 8.5in;
            margin: 0 auto;
        }
        .content { 
            white-space: pre-wrap;
        }
    `;
  }

  private getMinimalStyles(): string {
    return `
        @page { margin: 0.5in; }
        body { 
            font-family: 'Courier New', monospace;
            line-height: 1.4;
            color: black;
            font-size: 11pt;
        }
        .resume-container { 
            max-width: 8.5in;
            margin: 0 auto;
        }
        .content { 
            white-space: pre-wrap;
            font-family: inherit;
        }
    `;
  }

  private parseResumeContent(content: string): ParsedResumeContent {
    const parsed: ParsedResumeContent = {
      name: undefined,
      email: undefined,
      phone: undefined,
      location: undefined,
      summary: undefined,
      experience: [],
      skills: [],
      education: []
    };

    // Extract email
    const emailMatch = content.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) parsed.email = emailMatch[0];

    // Extract phone
    const phoneMatch = content.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) parsed.phone = phoneMatch[0];

    // Extract name (first line that looks like a name)
    const nameMatch = content.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/m);
    if (nameMatch) parsed.name = nameMatch[1];

    // Extract skills
    const skillsMatch = content.match(/(?:skills|technologies|tools)[:\s]*(.*?)(?:\n\s*\n|\n[A-Z]|$)/is);
    if (skillsMatch) {
      parsed.skills = skillsMatch[1]
        .split(/[,;|]/)
        .map(s => s.trim())
        .filter(s => s && s.length > 1)
        .slice(0, 15);
    }

    return parsed;
  }

  private generateTXT(content: string, filename?: string): PDFGenerationResult {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const finalFilename = filename || `resume-${Date.now()}.txt`;
    this.triggerDownload(url, finalFilename);
    
    return { url, blob, filename: finalFilename };
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async generateResumePreview(content: string, templateName: string = 'modern'): Promise<string> {
    const template = this.templates[templateName] || this.templates.modern;
    const parsedContent = this.parseResumeContent(content);
    return template.render(parsedContent, content);
  }

  getAvailableTemplates(): { name: string; displayName: string }[] {
    return Object.entries(this.templates).map(([key, template]) => ({
      name: key,
      displayName: template.name
    }));
  }
}