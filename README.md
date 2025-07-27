# Smart Street - Street Food Sourcing Platform

A comprehensive web application designed to solve the raw material sourcing challenges faced by street food vendors in India. Built with React, Vite, Convex, and Clerk authentication.

## Features

### Core Features
- **Vendor Authentication**: Secure sign-up/login with role-based access
- **Supplier Discovery**: Search for verified suppliers by location and ingredients
- **AI-Powered Recommendations**: Smart supplier matching based on preferences and trust scores
- **AI-Powered Inventory Forecasting**: Real-time predictions on inventory needs based on vendor demand trends, historical orders, and external factors
- **Group Orders**: Collaborative bulk buying for cost reduction
- **Order Management**: Track orders from placement to delivery
- **Trust Scoring**: AI-calculated reliability scores for vendors and suppliers

### New: Demand Requests Feature 🆕
- **Create Requests**: Vendors can post specific requests for raw materials
- **AI Suggestions**: Smart matching with similar open requests for grouping
- **Real-time Responses**: Suppliers can respond with quotes and messages
- **Status Tracking**: Monitor request status (open, responded, fulfilled, closed)
- **Mobile-Friendly**: Responsive design for on-the-go vendors

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Convex (serverless database and functions)
- **Authentication**: Clerk
- **Deployment**: Vercel/Netlify ready

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-street
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   VITE_CONVEX_URL=your_convex_url
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## AI-Powered Inventory Forecasting Feature 🚀

### What It Does
Suppliers get real-time predictions on inventory needs based on vendor demand trends, historical orders, and Indian market factors (e.g., seasonal spikes in street food ingredients during Diwali, Holi, and other festivals). This helps avoid stockouts or overstocking, improving reliability and reducing waste.

### For Suppliers
1. **Automatic Forecasting**: Daily AI-generated predictions at 2 AM
2. **Manual Generation**: Click "Generate Forecast" for immediate predictions
3. **Confidence Scores**: Each prediction includes reliability indicators
4. **AI Reasoning**: Understand why predictions were made
5. **Dashboard Integration**: View forecasts in the supplier dashboard

### Key Benefits
- **Prevent Stockouts**: AI predicts demand spikes before they happen
- **Reduce Waste**: Avoid overstocking with accurate predictions
- **Save Time**: No more manual inventory planning
- **FSSAI Integration**: Prioritizes certified stock forecasts
- **Indian Festival Awareness**: Considers Diwali, Holi, Raksha Bandhan, Navratri, Eid, and other festivals
- **Seasonal Adjustments**: Monsoon, summer, and winter demand patterns
- **Regional Preferences**: State-specific food preferences and local events

### Technical Implementation
- **Multiple AI Models**: Uses OpenRouter with fallback models (GPT-4o-mini, Claude-3-haiku, Llama-3.1, Gemini)
- **Indian Market Context**: AI prompts include festival seasons, weather patterns, and regional preferences
- **Historical Analysis**: Analyzes 30 days of order history with seasonal adjustments
- **Real-time Updates**: Forecasts updated daily via cron jobs
- **Fallback Logic**: Statistical forecasting with Indian market multipliers when AI models are unavailable
- **Confidence Scoring**: Each prediction includes reliability metrics
- **FSSAI Integration**: Considers certification impact on demand predictions

## Demand Requests Feature Details

### For Vendors
1. **Create Request**: Click "Create Demand Request" button in the dashboard
2. **Fill Details**: Specify item, quantity, price range, urgency, and location
3. **AI Suggestions**: View similar requests to join for better prices
4. **Track Responses**: Monitor supplier responses and quotes
5. **Convert to Order**: Fulfill requests by converting to actual orders

### For Suppliers (Future Extension)
1. **View Open Requests**: Browse vendor requests in their area
2. **Respond with Quotes**: Provide pricing and availability
3. **Direct Communication**: Message vendors about their requirements

### Key Benefits
- **Reduced Sourcing Time**: No more calling multiple suppliers
- **Better Pricing**: Group requests for bulk discounts
- **Trust Building**: Verified suppliers with AI trust scores
- **Real-time Updates**: Instant notifications for responses

## Project Structure

```
src/
├── components/
│   ├── VendorDashboard.tsx    # Main dashboard with all features
│   └── VendorAuth.tsx         # Authentication component
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point

convex/
├── schema.ts                  # Database schema
├── auth.ts                    # Authentication functions
├── requests.ts                # Demand requests functions
└── _generated/                # Auto-generated API types
```

## Deployment

1. **Deploy Backend**: `npx convex deploy`
2. **Deploy Frontend**: Push to Vercel/Netlify
3. **Set Environment Variables**: Configure production URLs

## Contributing

This project was built for the Tutedude Web Development Hackathon 1.0. The Demand Requests feature addresses the core pain point of street food vendors struggling to find reliable suppliers for raw materials.

## License

MIT License - feel free to use this code for your own projects!
