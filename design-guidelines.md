# I Got This In My Fridge - Design Guidelines

**Design System & Brand Guide**  
Version 1.0 | May 2026

---

## 1. Brand Identity

### Brand Personality
**Playful, Comedic, Friendly**

The app is your supportive cooking buddy who's always cracking jokes and encouraging you. It celebrates the messy, fun reality of home cooking while making it accessible and stress-free.

### Core Values
- 🎉 **Playful** - Fun doesn't stop at the feature set; it's in every micro-interaction
- 😂 **Comedic** - Self-aware humor about food, cooking disasters, expired ingredients
- 🤝 **Friendly** - Never judgmental; always encouraging even when recipes fail
- 🎨 **Creative** - Handmade aesthetic, imperfect and charming
- 🚀 **Empowering** - "You got this!" mindset throughout

### Tone of Voice

| Context | Example |
|---------|---------|
| Loading | "Reading through your stuff..." / "Wow, that's a lot..." / "Are you sure that's not expired?" |
| Success | "Yasss, you're making this!" / "Let's go!" / "Chef's kiss incoming!" |
| Error | "Oops! Something went wrong. Let's try again?" |
| Empty State | "No dishes yet, but you're about to change that!" |
| Profile | "You've made X dishes and we're so proud!" |

**Tone Rules:**
- ✅ Casual, conversational (like texting a friend)
- ✅ Occasionally sarcastic (but never mean)
- ✅ Self-aware and honest
- ✅ Encouraging and supportive
- ❌ Never judgmental or preachy
- ❌ Avoid corporate or stiff language

---

## 2. Color Palette

### Primary Colors

| Color | Hex | RGB | Usage | Mood |
|-------|-----|-----|-------|------|
| **Fresh Green** | `#22C55E` | 34, 197, 94 | Primary actions, success states, positive CTAs | Energetic, fresh, food-related |
| **Warm Coral** | `#FF6B6B` | 255, 107, 107 | Secondary actions, highlights, "dislike" buttons | Friendly, warm, approachable |
| **Sunny Yellow** | `#FBBF24` | 251, 191, 36 | Accents, badges, "I'm making this!" emphasis | Happy, playful, attention-grabbing |
| **Sky Blue** | `#3B82F6` | 59, 130, 246 | Links, info states, profile elements | Calm, trustworthy |

### Secondary/Support Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Soft Purple** | `#A78BFA` | 167, 139, 250 | Loading states, animations, decorative elements |
| **Mint Green** | `#6EE7B7` | 110, 231, 183 | Hover states, active states, progress indicators |
| **Peachy Pink** | `#FBCFE8` | 251, 207, 232 | Playful backgrounds, card hover, soft highlights |
| **Light Gray** | `#F3F4F6` | 243, 244, 246 | Backgrounds, card bases, subtle dividers |
| **Dark Gray** | `#1F2937` | 31, 41, 55 | Text, headings, primary content |
| **Medium Gray** | `#6B7280` | 107, 114, 128 | Secondary text, captions, disabled states |

### Usage Guidelines

**Meal Suggestion Cards:**
- Background: `#F3F4F6` (light gray)
- Border: Soft shadow, no visible border
- Hover: Slight glow with `#FBBF24` (yellow) or `#22C55E` (green)

**Action Buttons:**
- Primary ("I'm Making This"): `#22C55E` background, white text
- Secondary ("Try Something Else"): `#FF6B6B` background, white text
- Hover: Brighten by 10-15%
- Active: Darken by 10-15%

**Loading State:**
- Background: Semi-transparent dark overlay (rgba(0, 0, 0, 0.6))
- Text: White
- Spinner: Gradient animation using `#A78BFA` → `#22C55E` → `#FBBF24`

**Ingredient "You Might Need" Section:**
- Background: Soft peachy-pink `#FBCFE8` or light purple `#F0E6FF`
- Border-left: `#A78BFA` (2px)
- Text: `#1F2937` (dark gray)

**Rating Stars:**
- Empty: `#D1D5DB` (light gray)
- Filled: `#FBBF24` (yellow)
- Hover: `#FBBF24` with slight glow

---

## 3. Typography

### Font Family

**Headlines, Interactive Elements & Display:**
- **Font:** "Fredoka" (sans-serif, rounded, subtly hand-drawn)
- **Weight:** Bold (700) for H1/H2, Semi-bold (600) for H3+
- **Style:** Subtly sketched appearance (not obviously hand-drawn, but organic feel)
- **Usage:** H1, H2, H3, buttons, labels, loading messages, CTAs, interactive elements
- **Characteristics:** Geometric foundation with slight sketch undertones, friendly but professional

**Body Text, Inputs & Details:**
- **Font:** "Poppins" (sans-serif, clean, geometric)
- **Weight:** Regular (400) for body, Semi-bold (600) for labels
- **Style:** Modern, geometric, highly readable
- **Usage:** Body paragraphs, ingredients list, input fields, captions, secondary text, recipe instructions
- **Characteristics:** Clean, no-nonsense, professional

### Type Scale

| Usage | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| **H1 (Page Title)** | Fredoka | 36px | Bold (700) | 1.2 | -0.5px |
| **H2 (Section Title)** | Fredoka | 28px | Bold (700) | 1.2 | -0.3px |
| **H3 (Card Title)** | Fredoka | 20px | Bold (700) | 1.3 | 0px |
| **H4 (Subheading)** | Fredoka | 16px | Semi-bold (600) | 1.4 | 0px |
| **Body (Large)** | Poppins | 16px | Regular (400) | 1.6 | 0.3px |
| **Body (Standard)** | Poppins | 14px | Regular (400) | 1.6 | 0.3px |
| **Body (Small)** | Poppins | 12px | Regular (400) | 1.5 | 0.2px |
| **Caption** | Poppins | 11px | Regular (400) | 1.4 | 0.1px |
| **Button Text** | Fredoka | 14px | Semi-bold (600) | 1.5 | 0.5px |
| **Loading Message** | Fredoka | 18px | Semi-bold (600) | 1.4 | 0.2px |
| **Input Labels** | Poppins | 14px | Semi-bold (600) | 1.5 | 0.3px |
| **Ingredients List** | Poppins | 14px | Regular (400) | 1.6 | 0.3px |

### Text Colors

| Type | Color | Hex |
|------|-------|-----|
| Primary Headings | Dark Gray | `#1F2937` |
| Body Text | Dark Gray | `#1F2937` |
| Secondary Text | Medium Gray | `#6B7280` |
| Disabled Text | Light Gray | `#D1D5DB` |
| Link Text | Sky Blue | `#3B82F6` |
| Success Text | Fresh Green | `#22C55E` |
| Warning Text | Warm Coral | `#FF6B6B` |

### Typography Strategy: Fredoka + Poppins

**Why This Combination Works:**

**Fredoka** (H1, H2, H3, Buttons, Interactive Elements, Loading Messages)
- Subtly hand-drawn appearance without being cartoonish
- Rounded, friendly letterforms that feel organic
- Professional enough for serious content, playful enough for brand personality
- Perfect for Duolingo-esque aesthetic (playful but trustworthy)
- Creates visual hierarchy and draws attention to important elements
- Makes loading messages feel encouraging rather than robotic

**Poppins** (Body, Inputs, Ingredients, Labels)
- Clean, geometric, highly readable
- Optimized for readability at smaller sizes
- Professional appearance for factual content (recipes, ingredients)
- Maintains clarity in form inputs and detailed information
- Creates contrast with Fredoka for visual interest

**Visual Impact:**
- Headlines & interactive elements (Fredoka): Playful, friendly, engaging
- Content & details (Poppins): Clear, trustworthy, easy to read
- The combination achieves "fun brand meets serious functionality"
- Users focus on playful elements, trust the practical information

**Font Pairing Benefits:**
✓ Creates visual distinction without clashing  
✓ Fredoka's curves complement Poppins' geometry  
✓ Both are web-safe and performant  
✓ Both have extensive language support  
✓ Maintains readability at all sizes  
✓ Accessible for color-blind users (not color-dependent)

---

## 4. Component Specifications

### 4.1 Buttons

**Style: Pill-shaped, Soft Edges**

```
Visual Properties:
- Border-radius: 24px (fully rounded pill)
- Padding: 12px 24px (height ~44px for touch)
- Font-weight: 600
- Font-size: 14px
- Box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- Transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Button Types:**

| Type | Background | Text | Hover | Active |
|------|-----------|------|-------|--------|
| **Primary** | `#22C55E` | White | Brighten 15% + shadow | Darken 10% + scale 0.98 |
| **Secondary** | `#FF6B6B` | White | Brighten 15% + shadow | Darken 10% + scale 0.98 |
| **Tertiary** | `#F3F4F6` | `#1F2937` | `#E5E7EB` | `#D1D5DB` |
| **Delete** | `#FF6B6B` | White | Brighten 15% + pulse | Darken 10% |
| **Disabled** | `#D1D5DB` | `#9CA3AF` | None | None |

**Animations:**
- Hover: Scale 1.05 + lift shadow
- Active: Scale 0.98 + depress shadow
- Duration: 150ms, easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy)

**Icon + Text:**
- Icon: 18px, margin-right 8px
- Always icon on left
- Vertically centered

### 4.2 Cards

**Style: Soft Shadows, Hand-drawn feel**

```
Visual Properties:
- Border-radius: 20px
- Background: `#FFFFFF` or `#F3F4F6`
- Box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06)
- Padding: 16px (internal) / 12px (tight layouts)
- Border: None (shadow only)
- Position: relative
- Transition: all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Meal Suggestion Card:**
```
Layout:
- Image/Icon (top, full width): 180px height
- Content (bottom): Title + Likelihood meter
- Overlay on image: Slight gradient (transparent → dark at bottom)

Hover State:
- Scale: 1.03
- Shadow: 0 12px 32px rgba(0, 0, 0, 0.12)
- Yellow glow: box-shadow: 0 0 20px rgba(251, 191, 36, 0.4)
- Likelihood bar animates: fills with color

On Click:
- Scale down briefly (0.98) then back
- Loader appears
```

**Dish History Card (Profile):**
```
Layout:
- Image/Icon (top left): 80px x 80px, rounded 12px
- Title (top right): Large, bold
- Stars (bottom right): 5 empty stars, click to rate
- Metadata (bottom left): Date created, small gray text

Hover State:
- Scale: 1.02
- Shadow increases
- Title color shifts to `#22C55E`

On Click:
- Open modal with full recipe
- Smooth fade + slide animation
```

**Likelihood Meter:**
```
Visual:
- Background: `#E5E7EB` (light gray)
- Fill: Gradient `#22C55E` → `#FBBF24`
- Border-radius: 8px
- Height: 6px
- Width: 100%
- Animation on load: Fills from 0% to target in 800ms, cubic-bezier(0.34, 1.56, 0.64, 1)
- Label below: "90% Likelihood" (14px, medium gray)
```

### 4.3 Input Fields

**Style: Soft, Friendly**

```
Visual Properties:
- Border-radius: 12px
- Padding: 12px 16px
- Border: 2px solid `#E5E7EB`
- Font-size: 14px
- Transition: all 200ms ease
- Background: `#FFFFFF`

States:
- Focus: Border `#22C55E` (green), shadow: 0 0 12px rgba(34, 197, 94, 0.2)
- Error: Border `#FF6B6B` (coral), shadow: 0 0 12px rgba(255, 107, 107, 0.2)
- Disabled: Background `#F3F4F6`, border `#D1D5DB`, cursor not-allowed
```

**Textarea (Ingredient Input):**
```
- Min-height: 80px
- Resize: vertical only
- Same border/focus styling as input
- Placeholder: "chicken breast, garlic, pasta..." (light gray, italic)
```

### 4.4 Modal / Dialog

**Style: Soft, Floating, Layered**

```
Overlay:
- Background: rgba(0, 0, 0, 0.5)
- Transition: opacity 200ms ease

Modal:
- Border-radius: 24px
- Background: `#FFFFFF`
- Box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2)
- Padding: 32px
- Max-width: 600px (mobile: 90vw)
- Animation: 
  - Entrance: Scale 0.9 + opacity 0 → scale 1 + opacity 1 (250ms, bouncy)
  - Exit: Reverse (200ms)

Close Button:
- Icon: X (lucide-react)
- Position: top-right, 16px from edge
- Size: 24px
- Hover: Rotate 90deg + color change to coral
- Cursor: pointer
```

### 4.5 Loading Overlay

**Style: Playful, Animated Ingredients**

```
Background:
- Color: rgba(0, 0, 0, 0.6)
- Transition: opacity 200ms ease
- Full screen (fixed positioning)

Center Content:
- Spinner: 48px diameter, gradient animation
  - Colors: Cycles through `#A78BFA` → `#22C55E` → `#FBBF24` → `#FF6B6B` → back
  - Duration: 2s continuous rotation
  - Border: 4px thick

Floating Ingredients (below spinner):
- 4-5 emoji/icons pulsing up and down
- Icons: 🍗, 🍝, 🥬, 🧅, 🧈 (random rotation)
- Size: 32px
- Animation: Y position -20px to +20px, opacity 0.6 to 1, 1.5s ease-in-out, infinite
- Stagger delay: 0.2s between each
- Bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)

Text (below ingredients):
- Font: "Comfortaa" or "Fredoka" (playful, handwritten feel)
- Size: 18px
- Color: White
- Animation: Fade in/out, 300ms, every 1.5s
- Messages rotate: "Reading through your stuff..." → "Wow that's a lot..." etc.
```

### 4.6 Star Rating

**Style: Interactive, Bouncy**

```
Visual:
- 5 stars, 20px each
- Gap between stars: 6px
- Empty star: `#D1D5DB` (light gray)
- Filled star: `#FBBF24` (yellow)
- Hover state: Star previews fill (all stars up to hover point turn yellow)

Interactions:
- On hover: Scale 1.2 + glow
- On click: 
  - Star animates: Scale 1.3 then back to 1
  - Duration: 300ms, easing: cubic-bezier(0.34, 1.56, 0.64, 1)
  - Confetti burst (optional, playful)
  - Saved toast: "You rated this!"

Accessibility:
- Keyboard navigation: Arrow keys to navigate stars
- ARIA labels: "Rate this dish, {current} of 5 stars"
```

### 4.7 Toast Notification

**Style: Soft, Sliding**

```
Visual:
- Border-radius: 12px
- Padding: 16px 20px
- Box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12)
- Background: `#22C55E` (success) or `#FF6B6B` (error)
- Text: White, 14px

Animation:
- Entrance: Slide in from top-right, 300ms, cubic-bezier(0.34, 1.56, 0.64, 1)
- Exit: Slide out, 200ms, ease
- Auto-dismiss: 3000ms

Position:
- Top-right corner
- Margin: 20px from edges
- Z-index: 9999

Icon:
- 18px, margin-right 8px
- Success: ✓
- Error: ✕
```

---

## 5. Animation Guidelines

### 5.1 Principles

**The animation philosophy is "Bouncy + Smooth":**
- Bouncy for playful interactions (buttons, cards, stars)
- Smooth for transitions and loading (page changes, recipes fading in)
- Never jarring or overly fast
- Always have purpose (not animation for animation's sake)

### 5.2 Easing Functions

| Type | Easing | Usage | Duration |
|------|--------|-------|----------|
| **Bouncy** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button hover, card clicks, star rating | 150-300ms |
| **Smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, fades, modal | 200-400ms |
| **Spring** | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Floating ingredients, loading | 800-1500ms |
| **Gentle** | `ease-in-out` | Subtle hovers, color changes | 100-200ms |

### 5.3 Common Animation Patterns

#### Button Interaction
```
Hover:
- Scale: 1 → 1.05 (150ms, bouncy)
- Shadow: 0 2px 8px → 0 8px 20px

Active/Click:
- Scale: 1.05 → 0.98 (100ms, bouncy)
- Shadow: collapse

Release:
- Scale: 0.98 → 1 (150ms, bouncy)
- Shadow: expand
```

#### Card Suggestion Click
```
Initial State:
- Scale: 1
- Shadow: normal
- Background: light gray

On Hover:
- Scale: 1.03 (200ms, smooth)
- Shadow: larger
- Glow: yellow aura appears
- Likelihood bar animates filling

On Click:
- Scale: 0.98 (100ms, bouncy)
- Loading overlay fades in (200ms)
```

#### Recipe Fade In
```
- Start: opacity 0, scale 0.95, translateY +20px
- End: opacity 1, scale 1, translateY 0
- Duration: 400ms
- Easing: smooth cubic-bezier
- Stagger: 100ms between ingredient sections
```

#### Star Rating Fill
```
- On click: Individual star animates
- Scale: 1 → 1.3 → 1 (300ms, bouncy)
- All stars up to clicked position fill with yellow simultaneously
- Slight confetti burst (optional)
```

#### Loading Spinner
```
- Continuous rotation: 360deg every 2s, infinite
- Gradient animation: Colors cycle every 2s
- Opacity pulse: Subtle breathing effect (0.8 → 1, 1.5s cycle)
```

#### Floating Ingredients (Loading)
```
- Y position: Bounce up/down continuously
- Distance: ±20px
- Duration: 1.5s per cycle
- Stagger: 0.2s between each ingredient
- Easing: Spring (cubic-bezier(0.68, -0.55, 0.265, 1.55))
- Opacity: Pulse between 0.6 and 1
```

### 5.4 Micro-interactions

**Button Ripple Effect (optional but nice):**
```
- On click, radial gradient expands from click point
- Color: White with 20% opacity
- Duration: 400ms
- Easing: ease-out
```

**Ingredient Input Focus:**
```
- Border animates: 2px solid → colorful gradient animation
- Shadow appears: 0 0 0 3px rgba(34, 197, 94, 0.1)
- Placeholder fades slightly
```

**Successful Action (Dish Saved):**
```
- Card pulses once: Scale 1 → 1.05 → 1 (400ms)
- Toast slides in from top
- Confetti (optional): 10-15 small emoji/shapes burst
```

---

## 6. Illustration & Visual Style

### 6.1 Illustration Guidelines

**Style: Custom Hand-Drawn, Playful, Duolingo-esque**

#### Characteristics
- ✨ Hand-drawn appearance (digital pen, not perfectly geometric)
- 🎨 Loose, organic lines (slight imperfections are charming)
- 🎭 Expressive characters & emotions
- 🌈 Use full color palette (vibrant, not muted)
- 📐 Simple shapes, not overly detailed
- 😄 Playful personalities (food with faces, emotions)

#### Use Cases
- Loading screen: Animated chef or food character encouraging you
- Empty states: Hungry character looking for ingredients
- Error states: Sad ingredient, "Let's try again" message
- Success states: Happy food doing a dance
- Profile badges: Achievement icons (e.g., "5 Dishes Made!" 🏅)

#### Tools
- **Adobe Illustrator** / **Procreate** for creating hand-drawn illustrations
- **AI Image Generation** (DALL-E 3, Midjourney, Stable Diffusion) - Optional for branded character/illustration generation
- **SVG export** for web (scalable, animated)
- **Color**: Use full brand palette, no grayscale

#### AI-Generated Illustrations (Team Capability)
If using AI image generation for illustrations:
- **Prompt Strategy:** Use detailed prompts emphasizing hand-drawn, playful, Duolingo-style aesthetic
- **Example Prompt:** "Hand-drawn playful character, smiling pot of soup with expressive eyes and organic lines, vibrant green and yellow colors, illustrated style, Duolingo-esque, PNG transparent background"
- **Quality Control:** Review generated images for brand fit, adjust prompts if needed
- **Post-Processing:** May enhance with manual touch-ups in Adobe Illustrator for consistency
- **Use For:** Loading character, success/error characters, empty state illustrations, achievement badges
- **Combine:** Blend AI-generated illustrations with hand-drawn elements for authenticity

#### Illustration Examples (Descriptions)

**Loading Character:**
- Smiling pot of soup or smiling onion
- Eyes looking around playfully
- Little sparkles floating around
- Occasionally winks or blinks

**"You Might Need" Icon:**
- Shopping bag with cute face
- Or: Hands holding ingredients
- Color: Soft purple gradient

**Error Character:**
- Disappointed onion or wilted vegetable
- Thought bubble: "Let's try again?"
- Color: Coral/peach tones

**Success Character:**
- Dancing carrot or jumping apple
- Confetti around it
- Thumbs up gesture
- Color: Green and yellow

### 6.2 Emoji & Icon Usage

**Primary Icons (from Lucide React):**
- Menu, Close, Search, Heart, Star, Trash, Share, Settings
- Size: 18-24px depending on context
- Color: Inherit from text color or match brand colors

**Ingredient Icons (for "You Might Need"):**
- Use emoji: 🍗, 🧅, 🧈, 🧂, 🥬, 🍝, 🍚, etc.
- Size: 24-32px
- Consistent throughout (always emoji, not photos)

**Meal Category Icons:**
- If meal image fails to load, use emoji of main ingredient
- E.g., Chicken dish → 🍗, Pasta → 🍝, Salad → 🥗

---

## 7. Photography & Imagery

### 7.1 Photography Style

**Priority: Real Food Photography**

- **Source:** Unsplash, Pexels (free, high-quality meal photos)
- **Style:** Appetizing, well-lit, natural lighting preferred
- **Angle:** Top-down (flat lay) or 45-degree angle
- **Composition:** Centered, fill the frame with food
- **Props:** Minimal props (fresh herbs, wooden boards, simple backgrounds)
- **Colors:** Vibrant, natural colors (no overly desaturated or filtered)
- **Quality:** High resolution (at least 1080px width)

### 7.2 Image Optimization

**For Meal Suggestion Cards:**
- Size: 300x180px (16:9 ratio)
- Format: WebP (with JPEG fallback)
- Lazy load: Load on demand, not all at once

**For Profile Dish Cards:**
- Size: 150x150px (1:1 ratio)
- Format: WebP with fallback
- Rounded corners: 12px

**Profile Picture:**
- Size: 120x120px (1:1 ratio)
- Format: WebP with fallback
- Border-radius: 50% (circle)
- Fallback: If user didn't upload, show placeholder with their initials + random brand color

### 7.3 Fallback Strategy

**If meal image fails to load:**
1. Show ingredient emoji (🍗, 🍝, etc.) in center
2. Background: Gradient using two brand colors (e.g., green → yellow)
3. Size: 80px emoji, centered
4. Animation: Subtle bounce or rotate

**Placeholder Backgrounds (Gradients):**
- Pasta: Green → Yellow
- Chicken: Orange → Yellow
- Fish: Blue → Teal
- Vegetarian: Green → Purple
- Dessert: Pink → Yellow

---

## 8. Accessibility

### 8.1 Color & Contrast

- ✅ All text must meet WCAG AA contrast ratio (4.5:1 for body text)
- ✅ Color should not be the only way to convey information
- ✅ Use icons + text for important actions
- ✅ Test with color-blindness simulator (Deuteranopia, Protanopia modes)

### 8.2 Typography

- ✅ Minimum font size: 12px (preferably 14px+ for body)
- ✅ Maximum line length: 80 characters
- ✅ Line-height: 1.5+ for body text
- ✅ Avoid all-caps for long text (use for short labels only)

### 8.3 Interactive Elements

- ✅ Minimum touch target size: 44x44px
- ✅ Clear focus states (visible outline when tabbing)
- ✅ Keyboard navigation support (Tab, Arrow keys, Enter)
- ✅ Aria labels for icon-only buttons
- ✅ Form labels associated with inputs (not just placeholder)

### 8.4 Motion

- ✅ Respect `prefers-reduced-motion` media query
- ✅ For users who prefer reduced motion: Reduce animation duration by 50%, remove spring effects
- ✅ No auto-playing animations (user-triggered only, except loading)

### 8.5 Images & Alt Text

- ✅ All meal images have descriptive alt text: "Creamy pasta carbonara with fresh basil"
- ✅ Decorative illustrations: alt="" (empty)
- ✅ Icons with text: alt="" (text provides context)
- ✅ Icons alone: ARIA label or title attribute

### 8.6 Semantic HTML

- ✅ Use semantic tags: `<button>`, `<input>`, `<label>`, `<nav>`
- ✅ Headings in order (h1 → h2 → h3, no skipping)
- ✅ Links vs buttons: Use `<a>` for navigation, `<button>` for actions

---

## 9. Design Patterns & Best Practices

### 9.1 Empty States

**When no dishes in history yet:**
```
Visual:
- Large illustration: Hungry character looking for food
- Headline: "No dishes yet, but you're about to change that!"
- Subtext: "Head to the chat to discover your first meal"
- CTA Button: "Let's Go!" linking to chat

Animation:
- Character bounces gently, repeating
- Button has subtle pulse (opacity 0.8 → 1)
```

### 9.2 Error States

**API call fails, image not found, etc:**
```
Visual:
- Sad illustration: Wilted vegetable or confused face
- Headline: "Oops! Something went wrong"
- Subtext: Specific error message
- CTA: "Try Again" button

Animation:
- Shake animation on error appearance (20px side-to-side)
- Duration: 300ms, easing: ease-in-out
```

### 9.3 Loading States

**During ingredient parsing or recipe generation:**
```
Visual:
- Full-screen overlay with floating ingredients
- Animated spinner with gradient
- Rotating funny messages
- No interaction possible (overlay is blocking)

Animation:
- Ingredients bounce continuously
- Spinner rotates smoothly
- Text fades in/out every 1.5s
- Duration: Can be 2-10s depending on API
```

### 9.4 Success States

**After saving a dish:**
```
Visual:
- Toast notification: "You saved [Dish Name]! 🎉"
- Optional confetti burst
- Success checkmark animation

Animation:
- Checkmark draws itself (stroke animation)
- Toast slides in from top
- Confetti particles fall (if included)
- Auto-dismiss after 3s
```

### 9.5 Form Validation

**Real-time feedback on inputs:**
```
Username Input:
- As user types: Show green checkmark when valid (2+ chars)
- If empty or too short: Show error message "Min 2 characters"
- Focus: Green border + glow
- Invalid: Red border + glow

Ingredient Input:
- No validation (accepts any text)
- Character count optional: "X characters" in corner
- Focus: Green border + glow
- Placeholder: "chicken breast, garlic, pasta..."

Image Upload:
- Drag-and-drop zone with dashed border
- Hover: Border becomes solid, background highlights
- Selected: Preview thumbnail appears below
- If invalid: Error message + red border
```

---

## 10. Responsive Design

### 10.1 Breakpoints

| Device | Width | Breakpoint | Usage |
|--------|-------|-----------|-------|
| Mobile | <480px | `xs` | Extra small phones |
| Mobile | 480-640px | `sm` | Standard phones |
| Tablet | 641-1024px | `md` | Tablets, large phones |
| Desktop | 1025-1280px | `lg` | Laptops |
| Desktop | >1280px | `xl` | Large monitors |

### 10.2 Mobile-First Approach

**Start with mobile, then enhance for larger screens:**

**Mobile (< 640px):**
- Single column layout
- Full-width cards and buttons
- 1 meal suggestion card visible at a time (scroll or swipe to see 2-3)
- Larger touch targets (48px)
- Simplified navigation (hamburger menu if needed)

**Tablet (641-1024px):**
- 2 meal suggestion cards side-by-side
- Wider buttons and inputs
- More generous padding
- 2-column grid for profile dishes

**Desktop (> 1024px):**
- 3 meal suggestion cards side-by-side
- Centered content container (max-width: 1200px)
- 3-column grid for profile dishes
- Hover effects fully utilized

### 10.3 Responsive Typography

```
H1:
- Mobile: 28px
- Tablet: 32px
- Desktop: 36px

Body:
- Mobile: 14px
- Tablet: 14px
- Desktop: 16px

Buttons:
- Mobile: 16px (larger for touch)
- Tablet/Desktop: 14px
```

---

## 11. Dark Mode (Future Consideration)

**Not required for MVP, but here's a foundation if added:**

| Light Mode | Dark Mode |
|-----------|-----------|
| `#FFFFFF` background | `#1A202C` background |
| `#1F2937` text | `#F3F4F6` text |
| `#F3F4F6` light bg | `#2D3748` light bg |
| Shadows subtle | Shadows darker/more prominent |
| Colors same | Colors desaturated slightly |

---

## 12. File Organization (Design Assets)

```
Design Assets/
├── Colors/
│   └── color-palette.json         # All hex codes, RGB, usage
├── Typography/
│   └── type-scale.md              # Font sizes, weights, line-heights
├── Components/
│   ├── buttons.sketch / figma     # All button states
│   ├── cards.sketch / figma       # Card variations
│   ├── modals.sketch / figma      # Modal templates
│   ├── inputs.sketch / figma      # Form elements
│   └── stars.sketch / figma       # Rating component
├── Illustrations/
│   ├── loading-character.svg
│   ├── empty-state.svg
│   ├── error-character.svg
│   ├── success-character.svg
│   └── ingredients/ (folder)
├── Animations/
│   ├── button-hover.mp4
│   ├── loading-spinner.mp4
│   ├── star-rating.mp4
│   └── card-click.mp4
├── Mockups/
│   ├── mobile-chat.sketch / figma
│   ├── mobile-recipe.sketch / figma
│   ├── mobile-profile.sketch / figma
│   ├── desktop-layouts.sketch / figma
│   └── responsive-grid.sketch / figma
└── README.md                       # Design guide index
```

---

## 13. Design Checklist

Before hand-off to development:

- ☐ All colors tested for WCAG AA contrast
- ☐ All icons have proper sizing (18px, 24px, 32px, etc.)
- ☐ Typography scale matches spec
- ☐ All interactive states defined (hover, active, disabled, focus)
- ☐ All animations have duration & easing specified
- ☐ Responsive breakpoints tested
- ☐ Dark mode considered (or explicitly out-of-scope)
- ☐ Illustrations are hand-drawn style, Duolingo-esque
- ☐ Illustrations have playful expressions/personalities
- ☐ Empty states, error states, loading states designed
- ☐ Accessibility checklist completed (alt text, aria labels, focus states)
- ☐ Motion respects `prefers-reduced-motion`
- ☐ File organization is clear and documented
- ☐ Color palette and typography locked in
- ☐ Design system documented and shareable

---

## 14. Tone & Messaging Examples

### Chat Interface Messages

**On Load:**
- "Ready to cook? Start typing! 👨‍🍳"

**Loading Messages (rotating):**
- "Reading through your stuff..."
- "Wow, that's a lot..."
- "Are you sure that's not expired?"
- "Cooking the perfect suggestion..."
- "Finding hidden gems..."
- "Consulting the food gods..."
- "Magic happening... ✨"

**Success:**
- "Yasss, you're making this! 🎉"
- "Let's go, chef!"
- "This is gonna be delicious!"

**Error:**
- "Oops! Something went wrong. Let's try again?"
- "That didn't work, but you got this! 💪"

**Profile:**
- "You've made X dishes and we're so proud! 🥳"
- "No dishes yet? Let's change that!"

**Empty State (Dishes):**
- "No dishes yet, but you're about to change that!"
- "Ready for your first masterpiece?"

---

## 15. Design Inspiration References

**Duolingo:**
- Playful, hand-drawn mascot
- Bouncy animations
- Encouraging, never judgmental tone
- Vibrant color usage

**Airbnb:**
- Clean, modern typography
- High-quality imagery
- Rounded corners, soft edges
- Inviting color palette

**Stripe:**
- Smooth animations
- Clear hierarchy
- Generous whitespace
- Premium feel without being stuffy

---

**Design System Version:** 1.0  
**Last Updated:** May 2026  
**Brand:** Playful, Friendly, Comedy + Hand-Drawn  
**Target:** Gen Z & Millennials  

---

## Quick Reference: Design Tokens

```json
{
  "colors": {
    "primary": "#22C55E",
    "secondary": "#FF6B6B",
    "accent": "#FBBF24",
    "background": "#F3F4F6",
    "text": "#1F2937"
  },
  "typography": {
    "fontFamily": "Inter, Poppins",
    "headingWeight": 700,
    "bodySize": "14px"
  },
  "spacing": {
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "borderRadius": {
    "sm": "8px",
    "md": "12px",
    "lg": "20px",
    "xl": "24px"
  },
  "typography": {
    "display": {
      "fontFamily": "Fredoka",
      "fontWeight": "700",
      "usage": "H1, H2, H3, buttons, interactive elements, loading messages"
    },
    "body": {
      "fontFamily": "Poppins",
      "fontWeight": "400",
      "usage": "Body text, inputs, ingredients, captions, secondary text"
    },
    "lineHeightBody": "1.6",
    "lineHeightHeading": "1.2"
  },
  "animation": {
    "bouncy": "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
    "spring": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
  }
}
```