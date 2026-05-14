# PawMira 🐾

> ⚡ Report quickly → Respond quickly → Rescue faster

PawMira is a modern MERN-stack web application designed to facilitate the rapid reporting and rescue of injured animals. Built with a mobile-first approach, it features an intuitive user interface for reporters, an integrated WhatsApp chatbot (via Twilio), and a comprehensive NGO dashboard with map-based tracking.

## Features
- **Mobile-First Reporting:** Optimized emergency report flow with geolocation and image compression.
- **WhatsApp Integration:** Twilio chatbot for users with limited internet access to report emergencies.
- **NGO Dashboard:** Manage, track, and filter incoming reports using an interactive Map view (Leaflet) and List view.
- **Status & Priority System:** Automated and manual prioritization with full status history tracking.
- **Cloudinary Storage:** Secure, optimized image hosting for report photos.

## Tech Stack
**Frontend:**
- React + Vite
- Tailwind CSS v4
- Framer Motion (Animations)
- React Router DOM
- Leaflet (Maps)
- React Hot Toast

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- JWT (Authentication)
- Twilio (WhatsApp API)
- Cloudinary + Multer (Image Uploads)
- Helmet & Express Rate Limit (Security)

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or local instance)
- Cloudinary Account
- Twilio Account

### Environment Setup
1. Clone the repository
2. Navigate to `server` and create a `.env` file based on `.env.example`:
   ```bash
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

### Running Locally
**1. Start the Backend Server**
```bash
cd server
npm install
npm run dev
```

**2. Start the Frontend Application**
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` to view the application.

## Project Structure
- `/client` - React frontend application.
- `/server` - Node.js Express backend API.

## Architecture Highlights
- **Soft Deletion:** Implemented in `Report` model (`is_deleted`, `deleted_at`) to ensure no loss of critical rescue data.
- **Geospatial Queries:** Utilizes MongoDB `2dsphere` index for location-based report filtering.
- **Session Management:** WhatsApp user sessions are temporarily stored in MongoDB with TTL indexing for automatic cleanup.
- **Image Compression:** Client-side compression via web worker (`browser-image-compression`) before upload to save bandwidth.

---
*Built with ❤️ for every pawsome soul.*
