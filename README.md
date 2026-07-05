# Zidio M1 - Premium Video Conferencing & Real-Time Transcription

## System Overview
Zidio M1 is a modern, high-performance web application designed to facilitate secure video conferencing with real-time, shared speech-to-text transcription. The application utilizes a serverless backend architecture via Firebase Cloud Functions and a deeply customized WebRTC video pipeline powered by Agora.

### Core Capabilities
1. **Video & Audio Conferencing**: Multi-party WebRTC video calls with dynamic layout adjustment.
2. **Real-Time Speech Transcription Architecture**: 
   - **Local Recognition**: The `useSpeechTranscription.js` hook interfaces directly with the browser's native `webkitSpeechRecognition` API. It captures continuous speech, differentiating between *interim* (in-progress) and *final* (completed) phrases.
   - **P2P Synchronization**: To share these captions instantly, the `TranscriptChannel` wrapper leverages the **Agora Real-Time Messaging (RTM)** SDK (v1.5.1). It establishes a side-channel that broadcasts both `interim` and `final` JSON payloads to all connected peers in less than 100ms.
   - **UI Rendering**: The `TranscriptPanel.jsx` component elegantly displays final sentences chronologically, while floating interim text in real-time as users speak, attributing each sentence to the correct speaker via UID mappings.
3. **Persistent Meeting Records**: Upon leaving a call, the aggregated transcript array and meeting metadata are automatically synced to Firebase Firestore (`/meetings/{meetingId}`) for permanent storage and post-meeting review.
4. **Professional Pre-Join Lobby**: A dedicated hardware-selection layer allowing users to preview video and select specific camera/microphone IDs before negotiating the WebRTC connection.
5. **Screen Sharing**: Secure, sandboxed native screen sharing capabilities using dedicated Agora video tracks.

---

## Technical Architecture

The application strictly separates its infrastructure into a client-side React SPA and a serverless Node.js backend.

### Technology Stack
- **Frontend Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Video / Audio Pipeline**: Agora RTC SDK (`agora-rtc-sdk-ng` v4.x)
- **Real-Time Messaging**: Agora RTM SDK (`agora-rtm-sdk` v1.5.1)
- **Database & Auth**: Firebase (Auth, Firestore)
- **Serverless Backend**: Firebase Cloud Functions (Node.js 20, 2nd Gen)
- **Styling**: Vanilla CSS (Strict CSS Tokens, Glassmorphism, Monochromatic Dark Mode)

### Security & Authentication Flow
To maintain strict security over WebRTC connections, the frontend never exposes raw Agora certificates.
1. The React client makes a request to `/api/token?channel={channelId}&uid={numericUid}`.
2. Firebase Hosting natively rewrites `/api/token` to the 2nd Gen Cloud Function `agoraToken`.
3. The Cloud Function securely signs and generates an `rtcToken` (for video) and an `rtmToken` (for messaging) using the `agora-token` library.
4. The client uses these secure tokens to initialize the Agora client pipelines.

---

## System Requirements & Local Setup

### Environment Variables
To run this project locally, you must create a `.env` file in the root directory.

```env
# Agora Configuration (Required for video/audio processing)
VITE_AGORA_APP_ID="your_agora_app_id"
VITE_AGORA_APP_CERTIFICATE="your_agora_app_certificate"

# Firebase Configuration (Required for DB/Auth routing)
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

### Installation Instructions

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the Vite development server
npm run dev

# 3. (Optional) Run Firebase Emulators for backend token logic
npm run serve
```

---

## Codebase Navigation (LLM Context)

For AI assistants or developers analyzing this repository, the core logic is distributed as follows:

- `src/hooks/useAgoraClient.js`: The heart of the WebRTC integration. Manages local track initialization (camera, mic, screen), handles remote participant subscriptions, and maintains the `remoteUsers` state array.
- `src/hooks/useSpeechTranscription.js`: Interfaces directly with the browser's `SpeechRecognition` API. Handles interim results, finalizes sentences, and manages microphone permission states.
- `src/services/transcriptService.js`: Contains `TranscriptChannel`, a class wrapper around the Agora RTM SDK. It handles the bidirectional broadcast of transcript chunks to remote participants.
- `src/components/VideoCall.jsx`: The orchestration layer. It bridges the token fetching, WebRTC client, and transcript messaging into a single cohesive UI.
- `functions/index.js`: The 2nd Gen Firebase Cloud Function responsible for cryptographic token generation. Strictly requires `agora-token` v2.0+ argument signatures.
- `src/index.css`: The central design system. Employs CSS custom properties (`--bg`, `--glass-bg`) to enforce a premium, Apple-inspired dark mode aesthetic globally.
