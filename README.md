# Client-Side Movies & Series Search

This is a client-side streaming search application built with React, TypeScript, and AppWrite authentication. Search for movies and TV series with an integrated player.

## Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- AppWrite account (https://cloud.appwrite.io)
- TMDB API key (https://www.themoviedb.org/settings/api)

### Installation Steps

1. Clone this repository:
   ```bash
   git clone https://github.com/craeckor/client-side-movies-series-search.git
   cd client-side-movies-series-search
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (⚠️ Required):
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in your credentials:
     ```env
     VITE_APPWRITE_ENDPOINT=https://your-appwrite-endpoint.com/v1
     VITE_APPWRITE_PROJECT_ID=your_project_id_here
     VITE_TMDB_API_KEY=your_tmdb_api_key_here
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

### Getting Your API Keys

#### AppWrite Endpoint & Project ID
1. Go to https://cloud.appwrite.io and sign in
2. Create a new project or select an existing one
3. Go to **Settings** → **Endpoint** to find your endpoint
4. Go to **Settings** → **Project ID** to find your project ID

#### TMDB API Key
1. Go to https://www.themoviedb.org/settings/api
2. Create an API key (requires a free account)
3. Copy the API key and paste it into your `.env` file

## Features

- 🔐 Secure authentication via AppWrite
- 🎬 Search movies and TV series
- 📱 Responsive design
- ⚡ Client-side rendering with React
- 🎯 Type-safe with TypeScript

## Environment Variables

⚠️ **Never commit `.env` file to version control.** Use `.env.example` as a template only.

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_APPWRITE_ENDPOINT` | Your AppWrite instance endpoint | Yes |
| `VITE_APPWRITE_PROJECT_ID` | Your AppWrite project ID | Yes |
| `VITE_TMDB_API_KEY` | TMDB API key for movie database access | Yes |

## Build for Production

```bash
npm run build
```

The build will fail if any required environment variables are missing. This ensures production builds never run with incomplete configuration.

## CORS & Security Notes

This application runs primarily client-side. CORS is handled through configured AppWrite endpoints and TMDB API.
