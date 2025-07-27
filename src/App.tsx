import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDF.js worker from CDN - this needs to be set for react-pdf to work
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Profile {
  name: string;
  email: string;
  phone: string;
  website: string;
  summary: string;
  work_experience: Array<{
    job_title: string;
    company: string;
    dates: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    university: string;
    dates: string;
  }>;
  skills: string[];
}

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF file.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const generateProfile = async () => {
    if (!file) {
      setError('Please upload a resume first.');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          setError('Failed to read file data.');
          setLoading(false);
          return;
        }
        
        const base64File = result.split(',')[1];
        
        const prompt = `Extract the following information from this resume and return ONLY a valid JSON object with this exact structure:

{
  "name": "Full Name",
  "email": "email@example.com", 
  "phone": "Phone Number",
  "website": "Website URL",
  "summary": "Professional summary paragraph",
  "work_experience": [
    {
      "job_title": "Job Title",
      "company": "Company Name", 
      "dates": "Start Date - End Date",
      "responsibilities": ["Responsibility 1", "Responsibility 2", "Responsibility 3"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "university": "University Name",
      "dates": "Start Date - End Date"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
}

Ensure all arrays are properly formatted and all fields are strings. Do not include any text before or after the JSON object.`;
        
        const payload = {
            contents: [
                  {
                      role: "user",
                      parts: [
                          { text: prompt },
                          {
                              inlineData: {
                                  mimeType: "application/pdf",
                                  data: base64File
                              }
                          }
                      ]
                  }
              ],
        };
        
        // IMPORTANT: You need to add your Google Gemini API key here
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
        if (!apiKey) {
          setError("API key not configured. Please add your Google Gemini API key to the environment variables.");
          setLoading(false);
          return;
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(payload)
                   });
            
            if (!response.ok) {
              throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
              const text = result.candidates[0].content.parts[0].text;
              console.log('Raw AI response:', text);
              
              // Clean the string to ensure it's valid JSON
              const cleanedJsonString = text.replace(/```json|```/g, '').trim();
              console.log('Cleaned JSON string:', cleanedJsonString);
              
              try {
                const parsedProfile = JSON.parse(cleanedJsonString);
                
                // Validate and normalize the profile data
                const normalizedProfile: Profile = {
                  name: parsedProfile.name || 'Name not found',
                  email: parsedProfile.email || 'Email not found',
                  phone: parsedProfile.phone || 'Phone not found',
                  website: parsedProfile.website || 'Website not found',
                  summary: parsedProfile.summary || 'Summary not found',
                  work_experience: Array.isArray(parsedProfile.work_experience) 
                    ? parsedProfile.work_experience.map((job: any) => ({
                        job_title: job.job_title || 'Job title not found',
                        company: job.company || 'Company not found',
                        dates: job.dates || 'Dates not found',
                        responsibilities: Array.isArray(job.responsibilities) 
                          ? job.responsibilities 
                          : (typeof job.responsibilities === 'string' 
                              ? [job.responsibilities] 
                              : ['Responsibilities not found'])
                      }))
                    : [],
                  education: Array.isArray(parsedProfile.education)
                    ? parsedProfile.education.map((edu: any) => ({
                        degree: edu.degree || 'Degree not found',
                        university: edu.university || 'University not found',
                        dates: edu.dates || 'Dates not found'
                      }))
                    : [],
                  skills: Array.isArray(parsedProfile.skills) 
                    ? parsedProfile.skills 
                    : (typeof parsedProfile.skills === 'string' 
                        ? [parsedProfile.skills] 
                        : ['Skills not found'])
                };
                
                setProfile(normalizedProfile);
              } catch (parseError) {
                console.error('Failed to parse AI response:', parseError);
                console.log('Raw AI response:', text);
                setError("The AI response could not be parsed. Please try again with a different resume.");
              }
            } else {
              setError("Could not extract information from the resume. Please try again.");
            }
        } catch (e) {
            setError(`An error occurred while generating the profile: ${e instanceof Error ? e.message : 'Unknown error'}`);
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
  };

  const generateHTML = (profile: Profile) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.name} - Professional CV</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 20px; }
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen font-sans">
    <div class="container mx-auto px-6 py-8 max-w-4xl">
        <div class="bg-white p-8 rounded-lg shadow-lg">
            <!-- Header -->
            <div class="text-center border-b pb-6 mb-6">
                <h1 class="text-4xl font-bold text-gray-800 mb-2">${profile.name}</h1>
                <p class="text-gray-600">
                    ${profile.email} &bull; ${profile.phone} &bull; 
                    <a href="${profile.website}" class="text-blue-500 hover:underline">${profile.website}</a>
                </p>
            </div>

            <!-- Summary -->
            ${profile.summary ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-3">Professional Summary</h3>
                <p class="text-gray-700 leading-relaxed">${profile.summary}</p>
            </div>
            ` : ''}
            
            <!-- Work Experience -->
            ${profile.work_experience && profile.work_experience.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-3">Work Experience</h3>
                ${profile.work_experience.map((job, index) => `
                    <div class="mb-4 ${index > 0 ? 'pt-4 border-t border-gray-200' : ''}">
                        <h4 class="text-lg font-bold text-gray-800">${job.job_title}</h4>
                        <p class="text-gray-600 font-semibold mb-2">${job.company} | ${job.dates}</p>
                        ${job.responsibilities && job.responsibilities.length > 0 ? `
                        <ul class="list-disc list-inside text-gray-700 space-y-1">
                            ${job.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                        </ul>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Education -->
            ${profile.education && profile.education.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-3">Education</h3>
                ${profile.education.map((edu, index) => `
                    <div class="mb-4 ${index > 0 ? 'pt-4 border-t border-gray-200' : ''}">
                        <h4 class="text-lg font-bold text-gray-800">${edu.degree}</h4>
                        <p class="text-gray-600 font-semibold">${edu.university} | ${edu.dates}</p>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Skills -->
            ${profile.skills && profile.skills.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-3">Skills</h3>
                <div class="flex flex-wrap gap-2">
                    ${profile.skills.map(skill => `
                        <span class="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">${skill}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="text-center text-gray-500 text-sm mt-8 pt-6 border-t border-gray-200">
                <p>Generated with AI Resume Builder</p>
            </div>
        </div>
    </div>

    <!-- Print Button -->
    <div class="fixed bottom-4 right-4 no-print">
        <button onclick="window.print()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Print CV
        </button>
    </div>
</body>
</html>`;

    return htmlContent;
  };

  const downloadHTML = () => {
    if (!profile) return;
    
    const htmlContent = generateHTML(profile);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/\s+/g, '_')}_CV.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-800">AI Resume Builder</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Upload */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload Your Resume</h2>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
              <input {...getInputProps()} />
              {
                isDragActive ?
                  <p className="text-blue-500">Drop the files here ...</p> :
                  <p className="text-gray-500">Drag 'n' drop your PDF resume here, or click to select a file</p>
              }
            </div>
            {file && (
              <div className="mt-4">
                <p className="text-gray-600"><strong>Selected file:</strong> {file.name}</p>
                <div className="mt-2 border rounded-lg overflow-hidden">
                    <Document file={file}>
                        <Page pageNumber={1} />
                    </Document>
                </div>
              </div>
            )}
            {error && <p className="text-red-500 mt-4">{error}</p>}
            <button 
              onClick={generateProfile} 
              disabled={loading || !file}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors duration-300 font-semibold"
            >
              {loading ? 'Generating Profile...' : 'Generate Web CV'}
            </button>
          </div>

          {/* Right Column: Profile */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Web CV Profile</h2>
            {profile ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-4">
                    <h1 className="text-4xl font-bold text-gray-800">{profile.name}</h1>
                    <p className="text-gray-600 mt-2">
                        {profile.email} &bull; {profile.phone} &bull; <a href={profile.website} className="text-blue-500 hover:underline">{profile.website}</a>
                    </p>
                </div>

                {/* Summary */}
                {profile.summary && <div>
                    <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-2">Summary</h3>
                    <p className="text-gray-700">{profile.summary}</p>
                </div>}
                
                {/* Work Experience */}
                {profile.work_experience && <div>
                    <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-2">Work Experience</h3>
                    {profile.work_experience?.map((job, index) => (
                        <div key={index} className="mb-4">
                            <h4 className="text-lg font-bold text-gray-800">{job.job_title}</h4>
                            <p className="text-gray-600 font-semibold">{job.company} | {job.dates}</p>
                            <ul className="list-disc list-inside text-gray-700 mt-1">
                                {job.responsibilities?.map((resp, i) => <li key={i}>{resp}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>}

                {/* Education */}
                {profile.education && <div>
                    <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-2">Education</h3>
                    {profile.education?.map((edu, index) => (
                        <div key={index} className="mb-4">
                            <h4 className="text-lg font-bold text-gray-800">{edu.degree}</h4>
                            <p className="text-gray-600 font-semibold">{edu.university} | {edu.dates}</p>
                        </div>
                    ))}
                </div>}

                {/* Skills */}
                {profile.skills && <div>
                    <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.skills?.map((skill, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded">{skill}</span>
                        ))}
                    </div>
                </div>}

                {/* Download HTML Button */}
                <div className="pt-6 border-t border-gray-200">
                    <button 
                        onClick={downloadHTML}
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 font-semibold"
                    >
                        📥 Download HTML CV
                    </button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        Get a standalone HTML file you can upload to your website
                    </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>Your generated profile will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App; 