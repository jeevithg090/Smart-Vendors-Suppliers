# 🏪 Smart Street - Street Food Sourcing Platform

🌐 **Live Demo: [https://smart-street.netlify.app/](https://smart-street.netlify.app/)**

A comprehensive web application designed to solve the raw material sourcing challenges faced by street food vendors in India. Built with modern technologies and AI-powered features to revolutionize the street food supply chain.

## 🌟 Overview

Smart Street is a B2B marketplace that connects street food vendors with verified suppliers, providing AI-powered recommendations, group ordering capabilities, and comprehensive business management tools. The platform addresses the core pain points of sourcing reliable raw materials at competitive prices.

## ✨ Key Features

### 🏪 For Vendors
- **Smart Supplier Discovery**: Find verified suppliers by location, ingredients, and quality ratings
- **AI-Powered Recommendations**: Intelligent supplier matching based on preferences and trust scores
- **Group Orders**: Collaborate with other vendors for bulk buying and cost reduction
- **Voice Queries**: Ask questions in Hindi, Tamil, Telugu, and other Indian languages
- **Order Management**: Track orders from placement to delivery with real-time updates
- **Financial Analytics**: Comprehensive spending analysis and cost optimization
- **Recipe Costing Calculator**: Calculate exact costs for menu items
- **FSSAI Verification**: View supplier certification status

### 🏭 For Suppliers
- **AI Inventory Forecasting**: Predict demand based on historical data and seasonal patterns
- **Automated Stock Management**: Smart reordering and inventory optimization
- **Quality Assurance**: Manage product quality and certifications
- **Price Optimization**: Dynamic pricing based on market conditions
- **Analytics Dashboard**: Track sales, revenue, and customer insights
- **FSSAI Certificate Verification**: Automated verification using OCR and AI
- **Customer Loyalty Programs**: Reward repeat customers and build relationships

### 🤖 AI-Powered Features
- **Inventory Forecasting**: Real-time predictions considering Indian festivals and seasonal patterns
- **Voice Query Processing**: Multilingual voice commands with contextual responses
- **Trust Score Calculation**: AI-calculated reliability scores for vendors and suppliers
- **Smart Recommendations**: Personalized supplier and product suggestions
- **Demand Prediction**: Festival-aware demand forecasting (Diwali, Holi, etc.)

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Recharts** for data visualization

### Backend & Database
- **Convex** - Serverless database and real-time functions
- **Real-time subscriptions** for live updates
- **CRUD operations** with optimistic updates

### Authentication
- **Clerk** for secure user authentication
- **Role-based access control** (Vendor/Supplier)
- **Session management** and protected routes

### AI & External Services
- **OpenRouter AI** - Multiple AI models with fallback support
- **Sarvam AI** - Multilingual speech-to-text
- **OCR Space** - Certificate text extraction
- **Google Translate** - Translation services

### Testing & Quality
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **ESLint** for code quality
- **TypeScript** for type safety

### DevOps
- **Docker** containerization
- **Vercel** deployment ready
- **CI/CD** with automated testing
- **Performance monitoring**

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

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
   
   Create a `.env.local` file in the root directory:
   ```env
   # Authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   
   # Database
   VITE_CONVEX_URL=your_convex_deployment_url
   
   # AI Services
   OPENROUTER_API_KEY=your_openrouter_api_key
   SARVAM_API_KEY=your_sarvam_api_key
   
   # OCR Service
   OCR_SPACE_API_KEY=your_ocr_space_api_key
   
   # Optional
   GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
   ```

4. **Set up Convex backend**
   ```bash
   # Install Convex CLI globally
   npm install -g convex
   
   # Login to Convex
   npx convex login
   
   # Deploy backend functions
   npx convex deploy
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 Usage Guide

### For Vendors

1. **Sign Up**: Create an account and select "Vendor" role
2. **Complete Profile**: Add business details, location, and preferences
3. **Discover Suppliers**: Browse verified suppliers in your area
4. **Place Orders**: Order raw materials individually or join group orders
5. **Track Orders**: Monitor delivery status in real-time
6. **Use Voice Queries**: Ask questions like "मेरे पास कितने ऑर्डर हैं?" (How many orders do I have?)
7. **Analyze Finances**: View spending patterns and cost optimization suggestions

### For Suppliers

1. **Sign Up**: Create an account and select "Supplier" role
2. **Verify FSSAI**: Upload your FSSAI certificate for automatic verification
3. **Add Inventory**: List your products with pricing and availability
4. **Manage Orders**: Process incoming orders and update status
5. **View Analytics**: Monitor sales performance and customer insights
6. **Use AI Forecasting**: Get demand predictions for better inventory management

## 🏗️ Project Structure

```
smart-street/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── AuthFlow.tsx     # Authentication flow
│   │   ├── VoiceQuery.tsx   # Voice query interface
│   │   ├── FSSAIVerification.tsx # Certificate verification
│   │   └── ...              # 50+ other components
│   ├── pages/               # Main application pages
│   │   ├── HomePage.tsx     # Landing page
│   │   ├── VendorDashboard.tsx # Vendor dashboard
│   │   └── SupplierDashboard.tsx # Supplier dashboard
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── services/            # External service integrations
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript type definitions
├── convex/                  # Backend functions and schema
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Authentication functions
│   ├── voiceQuery.ts       # Voice processing
│   ├── fssaiVerification.ts # FSSAI verification
│   └── ...                 # 20+ other backend functions
├── e2e/                    # End-to-end tests
├── public/                 # Static assets
└── scripts/                # Deployment and utility scripts
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Unit tests with Vitest
```bash
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:ui         # Visual UI
```

### End-to-end tests with Playwright
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Interactive mode
npm run test:e2e:debug  # Debug mode
```

### Type checking
```bash
npm run typecheck
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Deploy backend**
   ```bash
   npx convex deploy --prod
   ```

2. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard**

### Deploy with Docker

1. **Build Docker image**
   ```bash
   npm run docker:build
   ```

2. **Run container**
   ```bash
   npm run docker:run
   ```

## 🔧 Advanced Features

### Voice Query System
- **Languages**: Hindi, Tamil, Telugu, English
- **Features**: Speech-to-text, context-aware responses
- **Usage**: Click mic button and ask questions naturally
- **Examples**: 
  - "मेरा कुल खर्च क्या है?" (What is my total spending?)
  - "कौन से सप्लायर सबसे अच्छे हैं?" (Which suppliers are the best?)

### AI Inventory Forecasting
- **Festival Awareness**: Considers Diwali, Holi, Navratri, Eid
- **Seasonal Patterns**: Monsoon, summer, winter demand
- **Regional Preferences**: State-specific food preferences
- **Confidence Scoring**: Reliability metrics for predictions

### FSSAI Certificate Verification
- **OCR Technology**: Automatic text extraction from certificates
- **AI Analysis**: Smart validation of certificate data
- **Status Tracking**: Real-time verification status
- **Business Matching**: Compares certificate with profile data

### Group Orders
- **Cost Reduction**: Bulk buying for better prices
- **Smart Matching**: AI suggests similar orders to join
- **Coordination**: Built-in communication tools
- **Split Payments**: Automatic cost distribution

## 🔒 Security Features

- **Authentication**: Secure JWT-based auth with Clerk
- **Role-based Access**: Vendor and supplier permissions
- **Data Encryption**: All data encrypted in transit and at rest
- **API Security**: Rate limiting and input validation
- **Error Handling**: Comprehensive error boundaries
- **Privacy**: No audio data stored, only transcriptions

## 📊 Performance Optimizations

- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Automatic image compression
- **Caching**: Smart caching strategies
- **Bundle Analysis**: Optimize bundle size
- **PWA Support**: Progressive Web App features
- **Offline Support**: Basic offline functionality

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interfaces
- Mobile-optimized voice recording
- PWA installation support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use Tailwind for styling
- Follow existing code conventions
- Update documentation

## 📄 API Documentation

### Voice Query API
```typescript
// Process voice query
await api.voiceQuery.processVoiceQuery({
  audioBlob: File,
  userRole: "vendor" | "supplier"
})
```

### FSSAI Verification API
```typescript
// Verify FSSAI certificate
await api.fssaiVerification.verifyFSSAICertificate({
  supplierId: Id<"suppliers">,
  imageBase64: string
})
```

## 🐛 Troubleshooting

### Common Issues

1. **Microphone not working**
   - Ensure HTTPS connection
   - Check browser permissions
   - Verify microphone hardware

2. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version (18+)
   - Verify environment variables

3. **Authentication issues**
   - Check Clerk configuration
   - Verify API keys
   - Clear browser cache

4. **Voice queries not working**
   - Check Sarvam API key
   - Verify OpenRouter configuration
   - Test with different languages

### Getting Help
- Check the [troubleshooting guide](src/docs/ERROR_HANDLING_GUIDE.md)
- Review [error handling documentation](AUTHENTICATION_UPDATE.md)
- Contact support via the app

## 📋 Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] WhatsApp integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language UI
- [ ] Blockchain integration for trust
- [ ] IoT sensor integration
- [ ] Advanced ML recommendations

### Version History
- **v1.0.0**: Initial release with core features
- **v1.1.0**: Added voice queries and FSSAI verification
- **v1.2.0**: Implemented AI inventory forecasting
- **v1.3.0**: Enhanced UI and mobile support

## 📞 Support

- **Documentation**: [Builder.io Docs](https://www.builder.io/c/docs/projects)
- **Email**: [Contact Support](#reach-support)
- **Issues**: Create GitHub issue
- **Community**: Join our Discord

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Tutedude Web Development Hackathon 1.0
- Special thanks to the Indian street food vendors who inspired this project
- Powered by Convex, Clerk, and OpenRouter
- Icons by React Icons and Heroicons

---

**Made with ❤️ for the Indian street food ecosystem**

Transform your street food business with Smart Street - where technology meets tradition!
