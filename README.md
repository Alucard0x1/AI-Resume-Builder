# AI Resume Builder

A React-based web application that uses Google's Gemini AI to extract information from PDF resumes and generate beautiful web CV profiles.

## Features

- 📄 PDF resume upload with drag & drop
- 🤖 AI-powered information extraction using Google Gemini
- 🎨 Beautiful, responsive web CV display
- 📱 Mobile-friendly design
- ⚡ Fast and modern React + TypeScript stack

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Google Gemini API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

1. Get your Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
3. Add your API key to the `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Use

1. **Upload Resume**: Drag and drop your PDF resume or click to select a file
2. **Generate Profile**: Click "Generate Web CV" to extract information using AI
3. **View Result**: Your formatted web CV will appear on the right side

## Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles with Tailwind CSS
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Dropzone** - File upload
- **React PDF** - PDF preview
- **Google Gemini AI** - Information extraction

## API Configuration

The app uses Google's Gemini 2.0 Flash model for extracting information from PDF resumes. The AI analyzes the resume and returns structured data including:

- Personal information (name, email, phone, website)
- Professional summary
- Work experience with details
- Education history
- Skills list

## Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Make sure you've created a `.env` file with your Gemini API key
   - Restart the development server after adding the API key

2. **PDF upload issues**
   - Ensure the file is a valid PDF
   - Check that the file size is reasonable (< 10MB)

3. **AI extraction fails**
   - Verify your API key is valid and has sufficient quota
   - Try with a different PDF resume
   - Check the browser console for detailed error messages

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key is correctly configured
3. Ensure all dependencies are installed

## License

MIT License - feel free to use this project for personal or commercial purposes. 