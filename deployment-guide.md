# Deployment Guide: I Got This In My Fridge

**Remix.run Web App Deployment Strategy**  
Version 1.0 | May 2026

---

## 1. Hosting Platform Selection

### Recommended: Vercel (🏆 Best for Remix)

**Why Vercel?**
- ✅ **Remix-optimized** - Built-in Remix support, no configuration needed
- ✅ **Automatic deployments** - Connect GitHub, auto-deploy on push
- ✅ **Edge Functions** - Run server code globally
- ✅ **Environment variables** - Easy management
- ✅ **Free tier available** - Perfect for MVP
- ✅ **Preview deployments** - Test before production
- ✅ **Integrated monitoring** - Analytics, speed insights
- ✅ **Serverless** - No servers to manage
- ✅ **Zero downtime** - Automatic blue-green deployments

**Pricing:**
- Free tier: Perfect for MVP/testing
- Pro: $20/month (when you need more)
- Enterprise: Custom pricing

**Setup Time:** 5 minutes

---

### Alternative: Netlify

**Pros:**
- Good Remix support
- CMS integrations
- Form handling built-in

**Cons:**
- Slightly less optimized for Remix than Vercel
- Same pricing as Vercel

**When to use:** If you already use Netlify ecosystem

---

### Alternative: Fly.io

**Pros:**
- Full control
- Docker-based
- Global deployment
- Cheaper for high-traffic apps

**Cons:**
- More complex setup
- Requires Docker knowledge
- Not as beginner-friendly

**When to use:** If you need custom deployment options

---

## 2. Pre-Deployment Checklist

Before you deploy, make sure you have:

- [ ] **GitHub/GitLab repository** - Code version control
- [ ] **API Keys** - OpenAI, Unsplash (stored safely)
- [ ] **Domain name** (optional for MVP, add later)
- [ ] **Email** - For hosting account
- [ ] **git configured locally** - Ready to push code
- [ ] **Remix app ready** - No major bugs, basic testing done

---

## 3. Step-by-Step: Vercel Deployment

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Create .gitignore
cat > .gitignore << EOF
node_modules/
.env.local
.env.production.local
dist/
build/
.DS_Store
EOF

# Add files
git add .

# Commit
git commit -m "Initial commit: I got this in my fridge app"

# Add GitHub remote and push
git remote add origin https://github.com/YOUR_USERNAME/igotthis.git
git branch -M main
git push -u origin main
```

### Step 2: Create Vercel Account

1. Go to **vercel.com**
2. Click "Sign Up"
3. Choose "GitHub" (easiest)
4. Authorize Vercel to access GitHub
5. Verify email

### Step 3: Import Project to Vercel

1. On Vercel dashboard, click "Add New" → "Project"
2. Select your GitHub repository (`igotthis`)
3. Vercel auto-detects Remix (no framework selection needed)
4. Click "Deploy"

**Vercel will automatically:**
- Detect `remix.config.js`
- Run `npm install`
- Run `npm run build`
- Deploy to preview URL

### Step 4: Add Environment Variables

**In Vercel Dashboard:**

1. Go to **Project Settings** → **Environment Variables**
2. Add each variable:

```
OPENAI_API_KEY = sk-...
UNSPLASH_ACCESS_KEY = ...
```

3. **Important:** Set these for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional)

4. Click "Save"
5. Redeploy so changes take effect:
   - Go to "Deployments"
   - Click "..." on latest deployment
   - Click "Redeploy"

### Step 5: Custom Domain (Optional, Add Later)

1. In **Settings** → **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `igotthis.com`)
4. Follow DNS setup instructions
5. DNS propagates in 24-48 hours

---

## 4. Environment Variables Setup

### What You Need

**Production (.env.production):**
```
OPENAI_API_KEY=sk-xxxxx (from OpenAI dashboard)
UNSPLASH_ACCESS_KEY=xxxxx (from Unsplash API)
NODE_ENV=production
```

**Development (.env.local):**
```
OPENAI_API_KEY=sk-xxxxx
UNSPLASH_ACCESS_KEY=xxxxx
NODE_ENV=development
```

### How to Get API Keys

**OpenAI API Key:**
1. Go to **platform.openai.com**
2. Sign up or login
3. Click profile → "API keys"
4. Create new secret key
5. Copy and save (you won't see it again)
6. Add to `OPENAI_API_KEY`

**Unsplash Access Key:**
1. Go to **unsplash.com/developers**
2. Sign up / login
3. Create application
4. Accept terms
5. Copy "Access Key"
6. Add to `UNSPLASH_ACCESS_KEY`

### Security Best Practices

- ✅ **Never commit `.env.local`** (already in .gitignore)
- ✅ **Never push keys to GitHub** 
- ✅ **Use Vercel's Environment Variables** for production
- ✅ **Rotate keys** if accidentally exposed
- ✅ **Use different keys** for dev/staging/production (if possible)
- ✅ **Monitor API usage** to detect unauthorized access

---

## 5. CI/CD Pipeline (Automated Testing/Deployment)

### GitHub Actions (Automatic with Vercel)

**What happens automatically:**

```
You push to GitHub
    ↓
GitHub triggers Vercel
    ↓
Vercel builds & tests
    ↓
Preview deployment created
    ↓
You review in preview
    ↓
Merge to main
    ↓
Vercel deploys to production
```

**No setup needed** - Vercel handles this!

### Optional: Add Pre-deployment Checks

Create `.github/workflows/checks.yml`:

```yaml
name: Pre-deployment Checks

on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run build
```

This ensures code passes linting/building before merging.

---

## 6. Build Process

### Local Build (Before Deploying)

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Check build output
ls -la build/
```

**Build Output:**
- Optimized JavaScript bundles
- CSS compiled via Tailwind
- Static assets minified
- Ready for production server

### Build Times

- First build: 30-60 seconds (including dependencies)
- Subsequent builds: 15-30 seconds (cached)
- Vercel typically faster due to smart caching

---

## 7. Monitoring & Analytics

### Vercel Analytics (Built-in)

**Free tier includes:**
- Deploy history
- Build times
- Error tracking (basic)
- Performance metrics

**View in Vercel Dashboard:**
1. Project → **Analytics**
2. See: Page load times, user analytics, errors

### Optional: Enhanced Monitoring

**Sentry (Error Tracking)**
```bash
npm install @sentry/remix
```

1. Create account at **sentry.io**
2. Create new project (Remix)
3. Add to your code:

```javascript
// app/entry.server.tsx
import * as Sentry from "@sentry/remix";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

4. Get `SENTRY_DSN` from Sentry
5. Add to Vercel Environment Variables

**Benefits:**
- Real-time error notifications
- Error grouping & tracking
- User session replay
- Performance monitoring

---

## 8. Database Setup (Post-MVP)

**For MVP:** localStorage only (no database needed) ✅

**Post-MVP (when adding user auth):**

### Option A: PostgreSQL + Prisma (Recommended)

```bash
# Install Prisma
npm install @prisma/client
npm install -D prisma

# Initialize
npx prisma init
```

**Database Provider:**
- **Vercel Postgres** (easiest, integrated with Vercel)
- **Railway** (simple, affordable)
- **Supabase** (PostgreSQL + Auth)
- **PlanetScale** (MySQL)

**Setup Vercel Postgres:**
1. In Vercel dashboard: **Storage** → **Postgres**
2. Create database
3. Copy connection string
4. Add to `.env.local`

### Option B: MongoDB + Mongoose

```bash
npm install mongoose
```

**Hosts:**
- **MongoDB Atlas** (free tier available)
- **Railway**

---

## 9. Deployment Workflow

### Development → Production Flow

```
1. Local Development
   - Create feature branch: git checkout -b feature/meal-suggestions
   - Make changes
   - Test locally: npm run dev
   - Commit: git commit -m "Add meal suggestions"

2. Push to GitHub
   - git push origin feature/meal-suggestions
   - Create Pull Request on GitHub

3. Preview Deployment (Automatic)
   - Vercel deploys to preview URL
   - Share with team for testing
   - Review UI/UX/functionality

4. Merge to Main
   - GitHub: Approve and merge PR
   - Deletes feature branch

5. Production Deployment (Automatic)
   - Vercel deploys main to production
   - Your live URL updates
   - Zero downtime deployment
```

### Rollback (If Something Breaks)

**Via Vercel Dashboard:**
1. Go to **Deployments**
2. Find previous working deployment
3. Click "..." → **Promote to Production**
4. Done! (30 seconds)

---

## 10. Cost Breakdown

### MVP Phase (First Month)

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel Hosting** | $0 | Free tier, plenty for MVP |
| **OpenAI API** | $5-20 | Based on usage |
| **Unsplash API** | $0 | Free tier (50 req/hour) |
| **Domain** | $0 | Optional, add later |
| **Monitoring** | $0 | Vercel analytics included |
| **Total** | $5-20 | Very affordable! |

### Post-MVP Phase (With Database)

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel Hosting** | $20/month | Pro plan if needed |
| **Vercel Postgres** | $15/month | 10GB free then $0.14/GB |
| **OpenAI API** | $20-100 | Scales with users |
| **Unsplash API** | $0-50 | Paid tier if high usage |
| **Domain** | $12/year | Optional |
| **Sentry (optional)** | $0-29 | Free or paid tiers |
| **Total** | $50-200+ | Scales with growth |

---

## 11. Performance Optimization

### Before Deploying

**Optimize images:**
```bash
# Check image sizes
npm install -D sharp

# Compress images
# Use WebP format
# Lazy load images
```

**Bundle size:**
```bash
npm run build
# Check build output size
# Aim for < 200KB JS (gzipped)
```

**Vercel Insights:**
- Core Web Vitals
- Performance Score
- Optimization suggestions

### Monitoring Performance

```bash
# Lighthouse testing
# Run locally: npm run build && npm start
# Use Chrome DevTools → Lighthouse
# Target: 90+ score
```

---

## 12. Security Checklist

- [ ] API keys in Vercel Environment Variables (never in code)
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] `.env.local` in `.gitignore`
- [ ] No secrets in git history
- [ ] CORS configured properly
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all forms
- [ ] Error messages don't expose sensitive info

---

## 13. Post-Deployment Checklist

After deploying to production:

- [ ] Test all features work (ingredients input, meal suggestions, recipe view)
- [ ] Test on mobile device
- [ ] Check API keys are working (call OpenAI & Unsplash)
- [ ] Verify localStorage is working (save dish, check profile)
- [ ] Test delete account (localStorage clear)
- [ ] Check error handling (bad network, API down)
- [ ] Verify page load speed (< 2 seconds)
- [ ] Set up error monitoring (Sentry optional)
- [ ] Share URL with team for feedback
- [ ] Monitor error logs for 24 hours

---

## 14. Troubleshooting Common Issues

### Issue: "Cannot find module" Error

**Cause:** Missing dependency

**Fix:**
```bash
npm install [missing-package]
git commit -am "Add dependency"
git push
# Vercel redeploys automatically
```

### Issue: API Keys Not Working

**Cause:** Environment variables not set

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Confirm keys are added
3. Redeploy: Click "..." on latest deployment → "Redeploy"

### Issue: Slow Build Times

**Cause:** Large node_modules or missing build cache

**Fix:**
1. Check `npm list` for duplicates
2. Run `npm dedupe`
3. Vercel caches builds (usually speeds up)

### Issue: Blank Page in Production

**Cause:** Build errors not visible locally

**Fix:**
1. Check Vercel build logs: Dashboard → Deployments → Click deployment
2. Scroll to "Build" tab
3. Look for error messages
4. Fix and redeploy

---

## 15. Deployment Command Reference

### Local Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Build & test locally
npm run build            # Build for production
npm start                # Start production server locally

# Cleanup
npm run clean            # Delete build files
```

### Git Commands

```bash
# Create feature branch
git checkout -b feature/feature-name

# Commit changes
git add .
git commit -m "Descriptive message"

# Push to GitHub
git push origin feature/feature-name

# Create Pull Request (on GitHub.com)
# Merge when approved
git switch main
git pull origin main
```

### Vercel Commands (Optional CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel              # Deploy preview
vercel --prod       # Deploy to production

# Environment variables
vercel env ls       # List env vars
vercel env add      # Add env var
```

---

## 16. Timeline: From Development to Live

| Phase | Time | Steps |
|-------|------|-------|
| **Setup** | 5 min | Create GitHub account, connect Vercel |
| **First Deploy** | 2 min | Push code, watch Vercel deploy |
| **Add Secrets** | 3 min | Add OpenAI & Unsplash keys to Vercel |
| **Test Production** | 10 min | Test all features on live URL |
| **Custom Domain** | 2 min + 24h | Add domain, wait for DNS propagation |
| **Total** | ~22 min | **App is live!** |

---

## 17. What I Recommend: Quick Start Path

### Week 1: Get Live ASAP

1. **Create GitHub account** (5 min)
2. **Push code to GitHub** (5 min)
3. **Connect to Vercel** (5 min)
4. **Add API keys** (5 min)
5. **Test on preview URL** (10 min)
6. **Merge to main** (2 min)
7. **Live in production!** (automatic)

**Result:** App is live at `igotthis.vercel.app` (or your custom domain)

### Optional: Add Later

- Custom domain name
- Error monitoring (Sentry)
- Analytics (beyond Vercel's)
- Database (when adding user auth)
- CDN optimization (if scaling)

---

## 18. Helpful Resources

**Vercel Docs:**
- https://vercel.com/docs/frameworks/remix
- https://vercel.com/docs/environment-variables

**Remix Docs:**
- https://remix.run/docs/en/main/start/deployment

**GitHub Docs:**
- https://docs.github.com/en/repositories

**API Setup:**
- OpenAI: https://platform.openai.com/docs
- Unsplash: https://unsplash.com/developers

---

## 19. Support & Help

**If Something Goes Wrong:**

1. **Check Vercel logs:**
   - Dashboard → Deployments → Click deployment → "Build" tab

2. **Check GitHub Actions:**
   - GitHub repo → Actions tab → See build failures

3. **Test locally first:**
   - `npm run dev`
   - Reproduce issue locally before deploying

4. **Ask for help:**
   - Vercel support: https://vercel.com/support
   - GitHub discussions: Your repo
   - Stack Overflow: Tag `remix.run`

---

**Deployment Status:** Ready to deploy anytime! 🚀  
**Recommended Platform:** Vercel (5-minute setup)  
**Estimated First Deploy:** 10 minutes total  
**Cost for MVP:** $5-20/month (mostly API usage)


my github is https://github.com/keithruezyl1/IGTOMF