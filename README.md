<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xtPu0T2c9cMZshraQI7zwp4YxVSTEV7i

## Run Locally

**Prerequisites:** Node.js, MongoDB running locally (default database: `pruebajoaquin`)

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and adjust the values when needed:
   - `VITE_API_BASE_URL`: URL of the API (defaults to `http://localhost:4000/api`)
   - `API_KEY`: Gemini key if you want to use AI estimations
   - `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_*_COLLECTION`: Mongo connection info (defaults point to the local `pruebajoaquin` database)
   - `API_PORT`: Port where the API server will run
3. Start the Mongo-backed API: `npm run server`
4. In a different terminal, run the web client: `npm run dev`

The React app will read/write users, projects, tasks and material requests through the API, so keep both processes running while you work.
