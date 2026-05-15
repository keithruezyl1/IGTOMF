# I Got This In My Fridge

**Product Requirements Document (PRD)**

| Field | Value |
|-------|-------|
| **Status** | MVP - In Development |
| **Framework** | **Remix.run** (Node.js) |
| **Version** | 1.0.0 |

---

## 1. Product Overview

### Vision

Transform the way people cook at home by reducing food waste and inspiring creativity. Users can instantly discover delicious meals using ingredients they already have in their fridge, powered by AI-driven meal suggestions and step-by-step recipes.

### Core Value Proposition

- **No Waste:** Stop food spoilage by finding creative meals from what you already have
- **Zero Friction:** Chat-based interface makes ingredient input effortless and fun
- **Smart Guidance:** AI generates recipe-ready meal suggestions with alternatives
- **Personal History:** Track dishes you've made and rate them for future reference

### Target User

Home cooks aged 18-55 who want to reduce food waste, discover new recipes, or quickly find dinner ideas without visiting multiple recipe sites.

---

## 2. User Stories & Flows

### User Story 1: First-Time Onboarding

**As a new user, I want to set up my profile quickly so I can start discovering recipes.**

- User opens app for first time
- **Step 1:** Prompted for username (text input with validation)
- **Step 2:** Upload or select a profile picture (can skip)
- Both stored in localStorage as JSON
- Redirected to main chat interface on completion

### User Story 2: Input Ingredients & Get Suggestions

**As a user, I want to list my ingredients in a natural way and receive creative meal suggestions.**

- User types ingredients into "I got this in my fridge:" text field
- Presses Enter or clicks Submit
- Funny loading overlay appears with rotating humorous messages:
  - "Reading through your stuff..."
  - "Wow that's a lot..."
  - "Are you sure that's not expired?"
  - "Cooking the perfect suggestion..."
  - "Finding hidden gems..."
- **OpenAI API** parses ingredients via LLM
- **OpenAI API** generates 2-3 meal suggestions
- Each suggestion displays as a thick card component with meal image, name, and likelihood meter

### User Story 3: Select a Meal & View Recipe

**As a user, I want to see detailed, actionable recipes for my chosen meal.**

- User clicks on a meal card
- Loading overlay appears with humorous animation
- Recipe displays with full ingredient list + step-by-step instructions
- Ingredients list includes a "You Might Need" section for items not in user's original input
- Two action buttons at bottom: "Dislike" (with icon) & "I'm Making This" (with icon)

### User Story 4: Save & Rate Completed Dishes

**As a user, I want to save dishes I've made and rate them for future reference.**

- User clicks "I'm Making This"
- Dish stored in localStorage with: dish name, original ingredients, recipe, date created
- User navigated to Profile view (accessible from main navigation)
- Dishes listed as card components showing: dish image/icon, name, 5-star rating
- Stars are empty by default; user clicks to rate (1-5 stars)
- Rating stored in localStorage
- User can click dish card to view full recipe details in a popup modal

### User Story 5: Dislike & Try Again

**As a user, I want to easily explore alternative meals if I don't like a suggestion.**

- User clicks "Dislike" button on recipe view
- Returns to chat with text field pre-filled with original ingredient text
- User can modify text and resubmit for new suggestions

### User Story 6: Account Reset

**As a user, I want to start fresh and delete my account and all data.**

- User navigates to Profile view
- Finds "Delete Account" button (with warning styling)
- Confirmation modal appears before deletion
- All localStorage data deleted
- User redirected to 2-step onboarding

---

## 3. Feature Specifications

### 3.1 Onboarding Flow

#### Step 1: Username Entry
- Text input field with label "What's your name?"
- Validation: min 2 chars, max 50 chars
- "Next" button disabled until valid input

#### Step 2: Profile Picture
- File input or drag-and-drop zone for image upload
- Accepted formats: .jpg, .png, .webp
- Image converted to base64 and stored in localStorage
- Can skip this step
- "Complete" button transitions to main app

### 3.2 Chat Interface

#### Chat Window
- Main text input field with label: "I got this in my fridge:"
- Multi-line textarea, allow newlines
- Submit on Enter or button click
- Chat history displayed above with meal suggestions

#### Loading Animation
- Full-screen overlay with semi-transparent dark background
- Animated spinner in center
- Rotating humorous text messages (fade in/out animation):
  - "Reading through your stuff...", "Wow, that's a lot...", "Are you sure that's not expired?", "Cooking the perfect suggestion...", "Finding hidden gems..."
- Messages rotate every 1-2 seconds
- Smooth fade transitions

### 3.3 Meal Suggestion Cards

- Display: 2-3 card components side-by-side (responsive grid)
- Each card contains:
  - Meal image (fetched from **image search API** based on meal name)
  - If no image found: display icon based on main ingredient (meat emoji, chicken, fish, vegetable, etc.)
  - Meal name
  - Likelihood meter: visual progress bar showing 0-100% likelihood of successfully making the dish with provided ingredients
  - Card hover effect: slight scale increase and shadow increase
  - Click anywhere on card to select meal

### 3.4 Recipe View

- Full recipe display with:
  - Meal image/icon at top
  - Meal name (large)
  - Ingredients list with quantities
  - "You Might Need" section: ingredients required but not in user's original input (italicized or marked differently)
  - Step-by-step instructions (numbered list)
  - Two action buttons at bottom:
    - 👎 "I Wanna Try Something Else" (redirects to chat with pre-filled ingredient text)
    - ✅ "I'm Making This" (saves to history, shows confirmation toast)

### 3.5 Profile View

- Header section:
  - Profile picture (circular, responsive size)
  - Username
  - Stats: "X dishes made"
- Dishes Made section:
  - Grid of dish cards showing:
    - Dish image/icon
    - Dish name
    - 5-star rating component (empty stars by default, click to rate)
  - Click on dish card to open modal with full recipe details
- Delete Account button at bottom (red/warning styling) → opens confirmation modal

---

## 4. Data Model & Storage

### localStorage Structure

All data stored as JSON in browser localStorage (no backend required):

#### User Profile
**Key:** `igotthis_profile`

```json
{
  "username": "string",
  "profileImage": "string (base64)",
  "createdAt": "ISO string"
}
```

#### Dishes History
**Key:** `igotthis_dishes`

```json
[
  {
    "id": "string (uuid)",
    "dishName": "string",
    "recipe": {
      "ingredients": [
        {
          "name": "string",
          "quantity": "number",
          "unit": "string",
          "isYouMightNeed": "boolean"
        }
      ],
      "instructions": ["string"]
    },
    "originalIngredients": "string",
    "mealImage": "string (url or base64)",
    "rating": "number (0-5)",
    "createdAt": "ISO string"
  }
]
```

#### Delete Account
- Call: `localStorage.clear()`
- Redirect to onboarding

---

## 5. External API Integrations

### 5.1 OpenAI API

**Purpose:** Parse ingredients and generate meal suggestions

- **Endpoint:** `/v1/chat/completions`
- **Model:** `gpt-4o` (GPT-4 Omni)
- **Three requests:**
  1. Parse ingredients from user text
  2. Generate 2-3 meal suggestions with ingredient likelihood
  3. Generate full recipe (ingredients + instructions) for selected meal
- **Response format:** JSON with structured data

### 5.2 Image Search & Generation

**Purpose:** Fetch or generate meal images for suggestion cards

#### Primary: Image Search API
- **Recommended:** Unsplash API (free tier available)
- **Query:** meal name (e.g., "pasta carbonara")
- **Fallback:** If no image found, display ingredient-based icon (emoji or SVG)

#### Secondary: AI Image Generation (Optional)
The team has **image generation capabilities** and may use AI tools appropriately:

- **Tools:** DALL-E 3, Midjourney, Stable Diffusion, or similar
- **Use Cases:**
  - Generate custom meal images if API results are poor/unavailable
  - Create branded, consistent meal photography style
  - Generate illustrations for loading states, characters, error states
  - Create background patterns or decorative elements
  - Custom ingredient icons if needed
- **Guidelines:**
  - Use prompts that match brand aesthetic (warm, appetizing, inviting)
  - Maintain consistency with design style (hand-drawn, illustrated feel where appropriate)
  - Always combine with real photography when possible (mix generated + real for authenticity)
  - Generated images should enhance UX, not replace quality photography entirely
  - Consider API cost vs. benefit before generation
  - Use sparingly for high-impact elements (loading character, success illustrations)

---

## 6. UI/UX Design Requirements

### Design Principles

- **Fun & Playful:** Use vibrant colors, smooth animations, and humorous copywriting
- **Smooth Animations:** All transitions should feel polished with easing functions
- **Mobile-First:** Responsive design for all screen sizes
- **Accessibility:** WCAG 2.1 AA compliance

### Animation & Motion

- **Loading spinner:** Continuous rotation with smooth easing
- **Text fade animation:** 300ms fade-in/fade-out for loading messages
- **Card hover:** Scale 1.02 + shadow increase on hover (200ms ease)
- **Button interactions:** Quick pulse or color shift on click
- **Modal entrance:** Slide up from bottom or fade in with scale (250ms)
- **Toast notifications:** Slide in from top-right, auto-dismiss after 3 seconds

### Color Palette

- **Primary:** Vibrant green or teal (food-related, fresh vibe)
- **Secondary:** Warm orange/peach (friendly, cooking vibe)
- **Accent:** Bright yellow or pink (fun highlights)
- **Neutral:** Light gray/white backgrounds for readability
- **Warning:** Red for delete actions

### Typography

- **Headlines:** Bold, sans-serif (e.g., Inter, Poppins)
- **Body:** Readable sans-serif with good line-height
- **Humorous text:** Slightly larger size for emphasis

---

## 7. Technical Specifications

### Technology Stack

- **Framework:** **Remix.run**
- **Language:** TypeScript
- **Styling:** Tailwind CSS or CSS-in-JS (Emotion, Styled Components)
- **UI Components:** shadcn/ui or custom components
- **HTTP Client:** fetch API or axios
- **State Management:** React Context API (minimal state needed)
- **Storage:** Browser localStorage
- **Hosting:** Vercel, Netlify, or similar **(Remix compatible)**

### Routes (Remix.run)

```
/onboarding           - 2-step onboarding flow
/                     - Main chat interface (requires completed onboarding)
/profile              - User profile and dishes history
/api/suggest-meals    - Server action for meal suggestions
/api/get-recipe       - Server action for full recipe
/api/search-image     - Server action for meal images
```

### Key Components

- **OnboardingForm** - 2-step username/profile flow
- **ChatInterface** - Text input + history
- **LoadingOverlay** - Animated spinner with rotating humorous text
- **MealSuggestionCard** - Meal card with image, name, likelihood meter
- **RecipeView** - Full recipe display
- **ProfileView** - User profile + dish history
- **DishHistoryCard** - Dish card with rating stars
- **Modal** - Reusable modal for recipe details
- **StarRating** - 5-star interactive rating component

### Remix.run Specific Implementation Details

#### Loaders
- `/onboarding` loader: Check if user has completed onboarding (localStorage check)
- `/` loader: Fetch user profile from localStorage
- `/profile` loader: Fetch user profile and all dishes from localStorage

#### Actions
- **`/api/suggest-meals`** - Server Action that calls OpenAI API to parse ingredients and suggest meals
- **`/api/get-recipe`** - Server Action that calls OpenAI API to generate full recipe
- **`/api/search-image`** - Server Action that calls Unsplash API to fetch meal images

#### Data Flow
1. User submits ingredients in chat form
2. Remix.run `action` routes ingredient text to `/api/suggest-meals`
3. Server-side **OpenAI API** processes request, returns JSON
4. Remix re-renders page with suggestions
5. User selects meal → triggers `/api/get-recipe` action
6. Server-side **OpenAI API** generates recipe, returns JSON
7. Client-side React state updates with recipe
8. User clicks "I'm Making This" → saves to localStorage via Remix action

---

## 8. Success Metrics

- **Completion:** Onboarding completion rate
- **Engagement:** Average meals suggested per session
- **Retention:** Users returning within 7 days
- **Satisfaction:** Average dish rating (4+ stars)
- **Conversion:** % of suggested meals that users "I'm Making This"
- **Performance:** Page load time < 2 seconds

---

## 9. MVP Checklist

### Phase 1: Core Features

- ☐ Onboarding (username + profile pic)
- ☐ Chat interface with ingredient input
- ☐ OpenAI integration for meal suggestions
- ☐ Image search for meal images
- ☐ Meal suggestion cards with likelihood
- ☐ Recipe view with ingredients + instructions
- ☐ "You Might Need" section
- ☐ Save meals to history
- ☐ Profile view with dish history
- ☐ 5-star rating system
- ☐ Delete account feature
- ☐ Loading animations
- ☐ Responsive design
- ☐ Fun animations and transitions

---

## 10. Remix.run Architecture Overview

### Why Remix.run?

Remix.run is **perfect for this app** because:

1. **Form-Heavy:** Natural form handling with progressive enhancement
2. **Server-Rendering:** API calls (OpenAI, Unsplash) happen server-side, never expose keys to client
3. **Nested Routes:** Easy to organize onboarding → chat → profile
4. **Loader Pattern:** Prefetch user data before rendering
5. **Actions:** Handle form submissions with built-in data handling
6. **Full-Stack:** Write Node.js server code + React components in one place

### Server-Side vs Client-Side

**Server-Side (Node.js running on Remix):**
- All API calls to OpenAI and Unsplash (API keys stay secure)
- Data validation and processing
- Session/localStorage sync logic

**Client-Side (React):**
- UI rendering and animations
- localStorage interactions for user profile and dish history
- Form interactions and loading states

---

## 11. Development Timeline

### Week 1: Foundation
- Setup Remix.run project with TypeScript
- Create routing structure (`/onboarding`, `/`, `/profile`)
- Build onboarding form component with image upload

### Week 2: Chat & Suggestions
- Build chat interface component
- Integrate OpenAI API for ingredient parsing and meal suggestions
- Create meal suggestion card components
- Implement loading overlay with animations

### Week 3: Recipe & History
- Integrate OpenAI API for recipe generation
- Build recipe view component with "You Might Need" section
- Implement localStorage storage for dishes
- Create profile view with dish history cards

### Week 4: Polish & Features
- Implement 5-star rating system
- Add delete account functionality
- Integrate image search API
- Add animations and smooth transitions
- Responsive design testing
- Performance optimization

---

## 12. Future Enhancements (Post-MVP)

- User authentication (Firebase/Auth0) for cloud sync
- Dietary restrictions and allergen filters
- Shopping list generation for missing ingredients
- Share recipes with friends
- Meal planning calendar
- Nutrition information per meal
- Recipe video tutorials
- Community ratings and reviews
- Export dish history as PDF

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Framework:** Remix.run (Node.js)