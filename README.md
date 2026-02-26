# FarmWise

An agricultural intelligence platform that combines deep learning-based plant disease detection, an AI-powered advisory chatbot, a hyperlocal marketplace, and real-time weather insights — built for smallholder farmers in India.

## Features

- **Plant Disease Scanner** — Upload a leaf photo and get an instant diagnosis with cure recommendations. Powered by an EfficientNetB3 CNN trained on 200K+ images (99.8% accuracy, 56 disease classes across 17 crops).
- **AI Advisory Chat** — Context-aware agricultural advisor powered by Google Gemini 2.5 Flash. Accepts crop type, growth stage, location, and season to deliver explainable, multilingual recommendations.
- **Marketplace** — Browse and purchase farming inputs (fertilizers, pesticides, seeds) from verified sellers. Integrated with Stripe for payments and Cloudinary for product images.
- **Weather Dashboard** — Real-time weather data and 5-day forecast with automated farming recommendations (irrigation timing, pest spray warnings, heat alerts).
- **User Profiles** — JWT-based authentication with seller registration and order history.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Lucide Icons |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Disease Detection | TensorFlow/Keras (EfficientNetB3), Flask, Gunicorn |
| AI Advisory | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Weather | Open-Meteo API |
| Payments | Stripe |
| Image Hosting | Cloudinary |
| Disease API Hosting | Hugging Face Spaces (Docker) |

## Project Structure

```
farm-wise/
├── frontend/          React app (Vite)
│   └── src/
│       ├── pages/     DiseaseScanner, AdvisoryChat, Marketplace, Weather, ...
│       ├── contexts/  AuthContext, ThemeContext
│       └── config/    API base URL
├── backend/           Express API server
│   ├── routes/        advisory, auth, marketplace, cart, payment, chatHistory
│   ├── models/        User, Product, Order, ChatHistory, Seller, Cart
│   └── server.js
├── disease-api/       Python Flask API (deployed to HF Spaces)
│   ├── app.py         Prediction endpoint + image preprocessing
│   ├── Dockerfile
│   └── requirements.txt
└── package.json       Root scripts (concurrently runs backend + frontend)
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+ (for disease API, if running locally)
- MongoDB Atlas URI
- API keys: Gemini, Stripe, Cloudinary

### Install and Run

```bash
# Install all dependencies (root + backend + frontend)
npm run install-all

# Start both servers concurrently
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.


## Disease Detection Model

| Property | Value |
|----------|-------|
| Architecture | EfficientNetB3 (Transfer Learning) |
| Dataset | Kaggle Plant Disease Expert (200,803 images) |
| Classes | 56 (17 crop types) |
| Test Accuracy | 99.81% |
| Parameters | 11.2M |
| Model Format | Keras `.h5` (129 MB) |
| Inference Input | 200 × 200 RGB |
| Confidence Threshold | 70% |

The model is hosted on Hugging Face Spaces.
