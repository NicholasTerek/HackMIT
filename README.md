# Smart Notes - AI Learning Assistant

Smart note-taking app for students with dyslexia. Combines audio transcription, photo capture, and AI summaries.

## Features

- **Audio transcription** with speech-to-text
- **Photo capture** with AI descriptions  
- **Smart note grouping** (2-minute intervals)
- **AI summaries** via Claude
- **Text-to-speech** for accessibility
- **Search** including photo content (`image: keyword`)

## Architecture

### Frontend (`frontend/`)
React + TypeScript + Tailwind CSS
- Note interface with search and TTS
- Real-time transcription display
- Photo context integration

### Backend (`backend/`)  
Node.js + Express + Claude API
- Photo upload and AI analysis
- Transcription storage
- Summary generation

### Glass (`Glass/`)
MentraOS SDK integration
- Smart glasses photo capture
- Real-time transcription
- WebView interface

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Bun runtime
- Anthropic Claude API key
- MentraOS API key (for Glass integration)

### Installation

1. **Clone and install dependencies**:
```bash
cd HackMIT
bun install
cd frontend && bun install
cd ../backend && npm install
cd ../Glass && bun install
```

2. **Environment Setup**:

Create `backend/.env`:
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

Create `Glass/.env`:
```env
PACKAGE_NAME=your_package_name
MENTRAOS_API_KEY=your_mentraos_api_key
PORT=3000
```

3. **Start the application**:
```bash
# Start all services
bun run dev

# Or start individually
bun run dev:frontend  # Frontend on http://localhost:5173
bun run dev:backend   # Backend on http://localhost:3001
cd Glass && bun run dev  # Glass on http://localhost:3000
```

## 📱 Core Features

### Smart Note Generation
- **Auto-grouping**: Transcriptions and photos are automatically grouped into notes based on 2-minute intervals
- **AI Summaries**: Claude generates concise summaries of transcription content
- **Manual Notes**: Users can create and edit manual notes alongside generated ones
- **Note Management**: Edit, delete, and organize both manual and generated notes

### Advanced Search
- **Text Search**: Search through note titles, content, and transcriptions
- **Image Search**: Use `image: keyword` to search through AI-generated photo descriptions
- **Real-time Results**: Debounced search with loading indicators
- **Async Processing**: Handles large datasets efficiently

### Accessibility Features
- **Text-to-Speech**: All content can be read aloud with custom controls
- **Visual Indicators**: Clear UI feedback for TTS playback status
- **Floating Controls**: Consistent play/stop buttons positioned for easy access
- **Progress Tracking**: Visual progress bars for audio playback

### Photo Integration
- **Multiple Sources**: Support for manual uploads and Glass device captures
- **AI Descriptions**: Automatic image analysis and description generation
- **Context Linking**: Photos are linked to nearby transcriptions temporally
- **Visual Context**: Photos displayed alongside related transcript content

## 🔧 API Endpoints

### Backend Server (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload photos with AI description generation |
| `/photos` | GET | Retrieve uploaded photos list |
| `/glass-photos` | GET | Retrieve Glass device photos |
| `/transcription` | POST | Save transcription with AI analysis |
| `/transcriptions/:userId` | GET | Retrieve user transcriptions |
| `/summarize` | POST | Generate transcript summaries |
| `/chat` | POST | AI chat with note context |

### Glass Server (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webview` | GET | Photo viewer interface |
| `/api/latest-photo` | GET | Latest photo metadata |
| `/api/photo/:requestId` | GET | Photo data by request ID |

## 📂 Project Structure

```
HackMIT/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Route components
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript definitions
│   └── package.json
├── backend/                 # Node.js backend server
│   ├── uploads/            # Photo storage directory
│   ├── transcriptions/     # Transcription log files
│   ├── start.js           # Main server file
│   ├── llm.js             # Claude API integration
│   └── package.json
├── Glass/                  # MentraOS integration
│   ├── src/
│   │   └── index.ts       # Main Glass application
│   ├── photos/            # Glass photo storage
│   ├── views/             # EJS templates
│   └── package.json
└── package.json           # Root package with dev scripts
```

## 🔑 Key Technologies

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **React Router**: Client-side routing
- **Lucide React**: Icon library

### Backend Stack
- **Express.js**: Web application framework
- **Multer**: File upload handling
- **Anthropic SDK**: Claude AI integration
- **CORS**: Cross-origin resource sharing
- **File System**: Local storage management

### Glass Integration
- **MentraOS SDK**: Smart glasses platform integration
- **WebSocket**: Real-time communication
- **EJS**: Template engine for webviews
- **Axios**: HTTP client for API calls

## 🎨 UI/UX Features

### Modern Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Automatic theme detection
- **Smooth Animations**: Tailwind CSS animations
- **Accessible Controls**: ARIA labels and keyboard navigation

### Smart Interactions
- **Debounced Search**: Efficient search with 300ms delay
- **Loading States**: Visual feedback during operations
- **Error Handling**: Graceful error messages and recovery
- **Optimistic Updates**: Immediate UI feedback

## 🔄 Data Flow

1. **Audio Capture**: Glass device or web interface captures audio
2. **Transcription**: Speech-to-text conversion with timestamp
3. **Photo Capture**: Manual upload or Glass device photo
4. **AI Processing**: Claude analyzes photos and generates descriptions
5. **Note Generation**: System groups related content into smart notes
6. **Summarization**: AI creates concise summaries of transcriptions
7. **Search Indexing**: Content becomes searchable including photo descriptions
8. **User Interface**: All content accessible through web interface with TTS

## 🛠️ Development

### Code Organization
- **Hooks**: Custom React hooks for data management (`useNotes`, `useAsyncSummary`)
- **Components**: Modular UI components with TypeScript props
- **Utils**: Helper functions for data processing and formatting
- **Types**: Comprehensive TypeScript definitions

### Key Files
- `frontend/src/hooks/useNotes.ts`: Core note management logic
- `frontend/src/pages/NoteDetail.tsx`: Individual note view with TTS
- `backend/start.js`: Main server with all API endpoints
- `Glass/src/index.ts`: MentraOS integration and photo handling

## 📝 Usage Examples

### Creating Notes
- Notes are automatically generated from transcriptions every 2 minutes
- Manual notes can be created using the "New Note" button
- Both types support full editing and deletion

### Searching Content
- Text search: Type any keyword to search titles and content
- Image search: Use `image: car` to find photos containing cars
- Results update in real-time as you type

### Accessibility
- Click play buttons next to any content for text-to-speech
- Visual progress indicators show playback status
- All controls are keyboard accessible

This application represents a comprehensive solution for accessible, AI-enhanced note-taking that bridges the gap between traditional note-taking and modern assistive technology.
