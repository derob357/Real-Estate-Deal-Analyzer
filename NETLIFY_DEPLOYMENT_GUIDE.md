# Netlify Deployment Guide

## Overview
This guide explains how to deploy the Real Estate Analyzer app to Netlify with Supabase database integration.

## Build Configuration

### 1. Netlify Configuration (`netlify.toml`)
The app is configured with:
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `.next`
- **Node Version**: 20.15.0
- **Next.js Plugin**: Automatically detected

### 2. Environment Variables
Set these in your Netlify Dashboard under Site Settings > Environment Variables:

#### Required for Production:
```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.zqpyypormwbmkhnlsqjo.supabase.co:5432/postgres"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_ZXF1aXBwZWQtc2Vhc25haWwtOTEuY2xlcmsuYWNjb3VudHMuZGV2JA"
CLERK_SECRET_KEY="sk_test_29CwK6LmUqzrKZ0X1JsWCiAgdcOigqHVyYFTb0L5yd"

# Application Settings
NODE_ENV="production"
```

#### Optional Configuration:
```bash
# Tax Assessor Configuration
TAX_ASSESSOR_RATE_LIMIT_MS="2000"
TAX_ASSESSOR_MAX_RETRIES="3"
TAX_ASSESSOR_TIMEOUT_MS="30000"

# Scraping Configuration
SCRAPING_CONCURRENT_JOBS="5"
SCRAPING_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
```

## Build Process

### What Happens During Build:
1. **Prisma Generate**: Generates database client
2. **Next.js Build**: Compiles the application
3. **Static Generation**: Pre-renders pages (database connections fail gracefully)
4. **Function Creation**: API routes are converted to Netlify Functions

### Database Handling:
- **Build Time**: Database connections are skipped to prevent build failures
- **Runtime**: Full database functionality with Supabase PostgreSQL
- **Fallback**: Uses SQLite fallback if PostgreSQL unavailable

## Deployment Steps

### 1. Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Connect your Git provider and select the repository
4. Use `real-estate-analyzer` as the base directory

### 2. Configure Build Settings
Netlify should auto-detect the configuration from `netlify.toml`, but verify:
- **Build command**: `npm install && npm run build`
- **Publish directory**: `.next`
- **Base directory**: `real-estate-analyzer`

### 3. Set Environment Variables
Add all required environment variables in Netlify Dashboard:
- Site Settings > Environment Variables
- Add the variables listed above
- **Important**: Replace `[YOUR_PASSWORD]` with your actual Supabase password

### 4. Deploy
1. Click "Deploy site"
2. Monitor the build logs for any issues
3. Test the deployed site

## Testing the Deployment

### 1. Health Check Endpoints
Test these URLs after deployment:
- `/api/health` - Application health check
- `/api/database/health` - Database connectivity
- `/api/test-build` - Build verification endpoint

### 2. Expected Behavior
- **Static pages**: Load immediately
- **API routes**: Work with database (if configured) or graceful degradation
- **Database operations**: Full functionality with valid DATABASE_URL

## Troubleshooting

### Common Issues:

#### Build Failures:
- Check that all environment variables are set
- Verify `npm install` runs successfully
- Review build logs for specific errors

#### Database Connection Issues:
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Check Supabase project status
- Ensure database password is correct

#### Runtime Errors:
- Check Netlify Function logs
- Verify environment variables are set in production
- Test API endpoints individually

## Features Deployed

### ✅ Working Features:
- Next.js 15.3.2 with App Router
- Static site generation (SSG)
- API routes as Netlify Functions
- Image optimization via Netlify Image CDN
- TypeScript compilation
- Tailwind CSS styling
- shadcn/ui components

### 🔄 Database-Dependent Features:
- Property analysis and storage
- Tax assessor data lookup
- Market data aggregation
- User authentication (Clerk)
- Institutional data scraping

### 📝 Notes:
- App gracefully handles database unavailability
- Build process skips database connections
- Runtime provides full functionality with proper environment variables
- Progressive Web App (PWA) features included