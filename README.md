# ⚡ StreamGrabber - Universal Media & Audio Downloader

A personal two-step web tool for extracting high-quality videos or converting audio-only music (MP3, M4A, Opus) from YouTube, Twitter/X, TikTok, Vimeo, Reddit, SoundCloud, and 1000+ supported sites.

Built with:
- **Frontend**: React (Vite), Glassmorphism Vanilla CSS design system, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), `youtube-dl-exec` (`yt-dlp`), `ffmpeg-static`, `node-cron`

---

## ⚙️ System Prerequisites (Host Machine)

This personal application requires the following installed directly on your machine (No Docker required):

1. **Python 3.8+**: Required runtime for executing `yt-dlp`. Must be available on your system `PATH`.
2. **yt-dlp**: Required for extracting media streams and format options from websites. Install/upgrade via `python -m pip install -U yt-dlp`.
3. **ffmpeg**: Required for merging video+audio streams and converting/extracting audio-only formats (e.g. to MP3). *(Bundled via `ffmpeg-static` in `/server` or installed system-wide)*.

---

## 🛠️ System Prerequisites Setup & Verification

### 1. Installation Commands by OS

- **Windows**:
  ```powershell
  python -m pip install -U yt-dlp
  winget install Gyan.FFmpeg
  ```

- **macOS (Homebrew)**:
  ```bash
  brew install python yt-dlp ffmpeg
  ```

- **Linux (Ubuntu / Debian)**:
  ```bash
  sudo apt update && sudo apt install -y python3 python3-pip ffmpeg
  python3 -m pip install -U yt-dlp
  ```

### 2. Pre-Flight Verification

Run the following commands in your terminal before launching the Node server to confirm all binaries are correctly configured on your `PATH`:

```bash
python --version    # Must output Python 3.8 or higher
yt-dlp --version    # Must output yt-dlp version (e.g. 2026.07.04)
ffmpeg -version     # Must output FFmpeg version info
```

---

## 🔄 Two-Step Workflow

1. **Step 1 — Fetch Info**:
   - Paste a media URL and click **Fetch Info**.
   - The backend runs `yt-dlp --dump-single-json` to extract metadata (title, thumbnail, duration, source site) and available video/audio formats.

2. **Step 2 — Select Format & Download**:
   - **Video Mode**: Select your preferred resolution (e.g. 1080p, 720p, 480p, 360p, or Best Available).
   - **Audio Only (Music) Mode**: Select audio format (**MP3**, **M4A/AAC**, **Opus/WebM**) and bitrate (320kbps, 192kbps, 128kbps).
   - Click **Start Download** to process and download your file to disk.

---

## 🗄️ Database & Environment Setup

Configure your MongoDB database string in `server/.env` (or copy from `server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/videodownloader?retryWrites=true&w=majority
```

---

## 🚀 Running Local Dev Servers

1. **Start Backend Server (Port 5000)**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend Dev Server (Port 5173)**:
   ```bash
   cd client
   npm run dev
   ```

Open **`http://localhost:5173`** in your browser!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/info` | Body: `{ "url": "https://..." }`. Extracts metadata, video resolutions, and audio format options. |
| `POST` | `/api/download` | Body: `{ "url", "type", "formatId", "audioFormat", "audioQuality" }`. Downloads video or converts audio. |
| `GET` | `/api/file/:filename` | Stream/download target file as attachment. |
| `GET` | `/api/history` | Returns last 50 download records sorted by date. |
| `DELETE` | `/api/history/:id` | Deletes record from MongoDB and purges file from disk. |

---

## 🧹 Automatic Cleanup Cron

The server runs a background task using `node-cron` every hour:
- Scans `/server/downloads` for files created more than **24 hours ago**.
- Deletes expired files from disk.
- Updates the MongoDB record status to `expired`.
