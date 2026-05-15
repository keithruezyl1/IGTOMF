# I Got This In My Fridge - Tech Stack

**Updated: May 2026**

---

## 🏗️ Core Architecture

### Framework & Runtime
- **Remix.run** (v2.x) - Full-stack React framework
- **Node.js** (v18+ / v20+) - Server runtime
- **TypeScript** - Type-safe development
- **React** (v18+) - UI library (included with Remix)

---

## 🎨 Frontend / Client-Side

### Styling & CSS
- **Tailwind CSS** v3.x - Utility-first CSS framework
- **PostCSS** - CSS transformation (included with Tailwind)
- **Autoprefixer** - Browser compatibility

### UI Components & Libraries
- **shadcn/ui** - Pre-built, customizable React components
  - Button, Card, Input, Modal, Toast, etc.
- **Framer Motion** v10.x - Smooth animations and transitions
  - Loading spinner animations
  - Card hover effects
  - Modal entrance/exit animations
  - Text fade transitions
- **Lucide React** - Icon library
  - Meal category icons (meat, chicken, fish, vegetables, fruits)
  - Action buttons (dislike, checkmark, etc.)

### Form Handling
- **React Hook Form** v7.x - Efficient form state management
- **Zod** v3.x - Schema validation
  - Username validation (2-50 chars)
  - Image file validation
  - Ingredient text validation

### HTTP & Data Fetching
- **Axios** or **fetch API** - HTTP client
  - Calls to `/api/suggest-meals`, `/api/get-recipe`, `/api/search-image`
- **SWR** (optional) - Data fetching library for client-side caching

### State Management
- **React Context API** - Global state (user profile, dishes, loading states)
- **useReducer** Hook (if complex state needed)
- **localStorage API** - Persistent browser storage

### Storage
- **localStorage** - Client-side persistent storage
  - User profile (username, base64 image)
  - Dishes history (name, recipe, ingredients, rating)

### Performance & Optimization
- **React.memo** - Memoize components to prevent unnecessary re-renders
- **useCallback** - Memoize callback functions
- **Image optimization** - Next.js Image component (if available) or native `<img>` with lazy loading

---

## 🔌 Backend / Server-Side

### Framework
- **Remix.run Actions & Loaders** - Server-side data handling
- **Express.js** (optional, if additional middleware needed)

### API Integration & HTTP
- **OpenAI SDK** v4.x
  - `gpt-4o` model for ingredient parsing, meal suggestions, recipe generation
  - Endpoint: `https://api.openai.com/v1/chat/completions`
- **Axios** - HTTP requests to external APIs

### Image Search API
- **Unsplash API** (free tier)
  - Fetch meal images by query
  - Fallback: Display ingredient-based emoji/SVG icons
  - Alternative: Pexels API, Pixabay API

### AI Image Generation (Optional, Team Capability)
- **Available Tools:** DALL-E 3, Midjourney, Stable Diffusion
- **Primary Use Cases:**
  - Generate custom meal images if search results insufficient
  - Create branded illustrations (loading character, success/error states)
  - Custom background patterns and decorative elements
- **Implementation Approach:**
  - Can be API-integrated or pre-generated and stored
  - Use for high-impact visuals where brand consistency matters
  - Combine with real photography for authenticity
  - Match prompts to design guidelines aesthetic

### Environment Variables
- `.env.local` file for API keys:
  ```
  OPENAI_API_KEY=sk-...
  UNSPLASH_ACCESS_KEY=...
  ```

### Error Handling
- **Try-catch blocks** for API calls
- **Custom error boundaries** (React)
- **Graceful fallbacks** for failed image searches

---

## 📦 Development Tools

### Build & Bundling
- **Vite** - Remix uses Vite for fast development builds
- **esbuild** - JavaScript bundler/minifier

### Package Manager
- **npm** v9+ or **pnpm** v8+
  - Node package management
  - Dependency installation

### Testing (Optional, Post-MVP)
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Cypress** or **Playwright** - E2E testing

### Linting & Code Quality
- **ESLint** - JavaScript linter
  - Config: `eslint-config-remix`
- **Prettier** - Code formatter
- **TypeScript** - Type checking

### Development Server
- **Remix dev server** - Hot module reloading (HMR)
- **Live reload** on file changes

---

## 🌐 Deployment & Hosting

### Hosting Platforms (Remix Compatible)
- **Vercel** (recommended)
  - Automatic deployments from Git
  - Edge Functions support
  - Environment variables management
- **Netlify** (alternative)
- **Fly.io** (alternative)
- **AWS Lambda** / **AWS EC2** (alternative)

### Database (None for MVP)
- **localStorage** only (client-side)
- Post-MVP: PostgreSQL, MongoDB, or Firebase

### CDN
- Vercel Edge CDN (built-in)
- CloudFront (if AWS)

---

## 🔐 Security & Authentication

### Security Considerations
- **API keys stored server-side only** (OpenAI, Unsplash)
- **No exposed credentials** in client-side code
- **HTTPS only** in production
- **CORS handling** for API requests
- **Content Security Policy (CSP)** headers

### Authentication (MVP: None)
- Post-MVP: Firebase Auth, Auth0, or Remix Sessions

### Data Protection
- Base64 image encoding for localStorage
- No sensitive data stored client-side
- localStorage cleared on account deletion

---

## 📊 Monitoring & Analytics (Optional, Post-MVP)

- **Vercel Analytics** - Built-in performance metrics
- **Sentry** - Error tracking
- **LogRocket** - Session replay and debugging
- **Google Analytics** (optional)

---

## 📝 Documentation & Version Control

### Version Control
- **Git** (GitHub, GitLab, Bitbucket)
- **.gitignore** - Exclude `node_modules/`, `.env.local`, build files

### Documentation
- **README.md** - Project setup and overview
- **API documentation** - OpenAI & Unsplash integration guides
- **Component documentation** - Storybook (post-MVP)

### Environment Files
- `.env.local` - Local development secrets
- `.env.example` - Template for required env vars

---

## 🗂️ Project Structure (Remix.run Convention)

```
igotthis/
├── app/
│   ├── routes/
│   │   ├── onboarding.tsx          # Onboarding page
│   │   ├── _index.tsx              # Main chat interface (/)
│   │   ├── profile.tsx             # Profile page
│   │   ├── api/
│   │   │   ├── suggest-meals.ts   # Server action for meal suggestions
│   │   │   ├── get-recipe.ts      # Server action for recipe generation
│   │   │   └── search-image.ts    # Server action for image search
│   ├── components/
│   │   ├── OnboardingForm.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── MealSuggestionCard.tsx
│   │   ├── RecipeView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── DishHistoryCard.tsx
│   │   ├── Modal.tsx
│   │   └── StarRating.tsx
│   ├── hooks/
│   │   ├── useLocalStorage.ts      # Custom hook for localStorage
│   │   ├── useUserProfile.ts       # Fetch user profile
│   │   └── useDishes.ts            # Fetch dishes history
│   ├── context/
│   │   └── AppContext.tsx          # Global app context
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── lib/
│   │   ├── openai.ts              # OpenAI API helper
│   │   ├── unsplash.ts            # Unsplash API helper
│   │   └── storage.ts             # localStorage utilities
│   ├── styles/
│   │   └── globals.css            # Global styles + Tailwind
│   └── root.tsx                   # Root layout
├── public/
│   └── favicon.ico
├── .env.local                      # Local env vars (API keys)
├── .env.example                    # Env template
├── .gitignore
├── tsconfig.json                   # TypeScript config
├── remix.config.js                 # Remix configuration
├── tailwind.config.js              # Tailwind config
├── postcss.config.js               # PostCSS config
├── package.json
└── README.md
```

---

## 📋 Dependencies Summary

### Production Dependencies

```json
{
  "dependencies": {
    "remix": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "openai": "^4.x",
    "axios": "^1.x",
    "framer-motion": "^10.x",
    "lucide-react": "^0.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "shadcn/ui": "^0.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-toast": "^1.x"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@types/node": "^20.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "eslint": "^8.x",
    "eslint-config-remix": "^latest",
    "prettier": "^3.x",
    "vite": "^latest"
  }
}
```

---

## 🚀 Performance Targets

| Metric | Target |
|--------|--------|
| Page Load | < 2s |
| Time to Interactive (TTI) | < 3s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| First Input Delay (FID) | < 100ms |
| Bundle Size (JS) | < 150KB (gzipped) |
| Bundle Size (CSS) | < 50KB (gzipped) |

---

## 🔄 API Integration Flow

### Request Flow (Remix.run)

```
User Input (Chat)
    ↓
Remix Form Action (/api/suggest-meals)
    ↓
Server-Side: OpenAI API Call (gpt-4o)
    ↓
Parse & Format Response
    ↓
Return JSON to Client
    ↓
React Re-renders with Suggestions
```

### External APIs Used

| Service | Purpose | Rate Limit | Auth |
|---------|---------|-----------|------|
| **OpenAI (gpt-4o)** | Ingredient parsing, meal suggestions, recipe generation | 3,500 RPM (Pro) | API Key |
| **Unsplash** | Fetch meal images | 50 requests/hour (free) | Access Key |

---

## 🛡️ Best Practices

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier for consistency
- ✅ Component-based architecture
- ✅ Separation of concerns (server/client)

### Performance
- ✅ Code splitting with Remix routes
- ✅ Image lazy loading
- ✅ Memoization for expensive components
- ✅ Debouncing for form inputs

### Security
- ✅ Environment variables for secrets
- ✅ Server-side API calls (no exposed keys)
- ✅ Input validation with Zod
- ✅ HTTPS in production

### Accessibility
- ✅ Semantic HTML
- ✅ ARIA labels for interactive elements
- ✅ Keyboard navigation support
- ✅ Color contrast compliance (WCAG AA)

---

## 📦 Build & Deployment Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Start dev server with HMR

# Build
npm run build           # Production build

# Production
npm start               # Start production server

# Testing (post-MVP)
npm run test            # Run unit tests
npm run test:e2e        # Run E2E tests

# Linting
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

---

## 🔮 Post-MVP Tech Stack Additions

- **Prisma ORM** - Database management (if adding backend DB)
- **PostgreSQL** or **MongoDB** - Production database
- **Firebase** or **Auth0** - User authentication
- **Stripe** - Payment processing (if monetizing)
- **SendGrid** or **Resend** - Email notifications
- **AI Image Generation APIs** - DALL-E 3, Midjourney API, or Stable Diffusion (for branded meal/illustration generation)
- **Storybook** - Component documentation
- **Vitest + React Testing Library** - Comprehensive testing
- **Playwright** - E2E testing
- **Docker** - Containerization for deployment

---

**Last Updated:** May 2026  
**Framework:** Remix.run (Node.js)  
**Model:** gpt-4o (OpenAI)