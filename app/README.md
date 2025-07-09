# AI_HACKS - AI Resource Search Platform

A modern AI resource search platform built with TanStack Start and Supabase, featuring vector similarity search across curated AI resources with a sleek terminal-inspired interface.

## Features

- 🔍 **Vector Similarity Search**: Advanced search across AI resources using embeddings
- 🔥 **Trending Resources**: Display of newest and most popular AI content
- 🔐 **Authentication**: User authentication powered by Supabase
- 📱 **Responsive Design**: Modern UI with hacker/terminal aesthetic
- ⚡ **Fast Performance**: Built with TanStack Start for optimal performance

## Tech Stack

- **Frontend**: React 19, TanStack Start, TypeScript
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Search**: Vector embeddings and similarity search

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ltejedor/aihacks.git
cd aihacks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Copy your project URL and anon key from Settings > API
3. Create a `.env.local` file in the root directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

Set up the required tables in your Supabase database:

```sql
-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create resources table for search functionality
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  embedding vector(1536), -- Adjust dimension based on your embedding model
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reactions INTEGER DEFAULT 0
);

-- Enable RLS (Row Level Security)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
CREATE POLICY "Enable read access for all users" ON resources FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON posts FOR SELECT USING (auth.role() = 'authenticated');
```

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth.tsx        # Authentication components
│   ├── SearchInput.tsx # Search interface
│   └── SearchResults.tsx # Search results display
├── routes/             # TanStack Router routes
│   ├── index.tsx       # Home page with search
│   ├── login.tsx       # Login page
│   ├── signup.tsx      # Sign up page
│   └── _authed/        # Protected routes
├── utils/              # Utility functions
│   ├── supabase.ts     # Supabase client configuration
│   ├── search.ts       # Search functionality
│   └── embeddings.ts   # Vector embedding utilities
└── styles/             # CSS styles
    └── app.css         # Global styles and hacker theme
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Authentication

The app includes authentication pages:
- `/login` - User login
- `/signup` - User registration
- `/logout` - User logout

Protected routes are under the `/_authed` path and require authentication.

## Phone Authentication System

The application currently uses a streamlined phone-based authentication system designed to provide quick access to the AI resource search while maintaining user engagement tracking.

### Current Implementation (Faux-Auth)

**How it works:**
1. Users visit `/phone-login` and enter their phone number
2. The system creates an anonymous Supabase user session
3. The phone number is saved to a `phone_numbers_temp` table for logging purposes
4. Users gain immediate access to the search functionality

**Database Setup:**
```sql
-- Create table for phone number logging
CREATE TABLE phone_numbers_temp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_num TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Key Components:**
- `PhoneAuth.tsx`: Branded phone authentication component with WhatsApp community integration
- `phone-login.tsx`: Server function handling anonymous auth + phone logging
- `__root.tsx`: Updated user context to support both anonymous and authenticated users
- Route protection: Authenticated users are redirected away from `/phone-login`

**Benefits of Current System:**
- **Zero friction**: Users can access the search immediately without waiting for SMS
- **Community focus**: Emphasizes the connection to the AI Hacks WhatsApp community
- **Analytics**: Tracks user engagement and phone numbers for community building
- **Progressive enhancement**: Easy to upgrade to real verification later
- **Robust error handling**: Phone logging failures don't prevent authentication success

### Planned Upgrade: Real Phone Verification

**Future Implementation:**
The same user interface will be enhanced with actual phone number verification using Supabase's built-in OTP (One-Time Password) system:

1. **OTP Generation**: `supabase.auth.signInWithOtp({ phone: '+1234567890' })`
2. **Verification Step**: Users enter 6-digit code sent via SMS
3. **Authenticated Session**: Real phone-verified user account
4. **Data Migration**: Existing phone numbers will be linked to verified accounts

**Timeline:**
- **Phase 1** (Current): Anonymous auth + phone logging for rapid user onboarding
- **Phase 2** (Planned): Upgrade to real OTP verification with same UX
- **Phase 3** (Future): Optional account linking and advanced user features

This approach allows us to gather user interest and build the community while maintaining the technical infrastructure for a seamless upgrade to full phone verification.

## Search Functionality

The search system uses vector embeddings to find similar AI resources. To populate your database with resources:

1. Add resources to the `resources` table
2. Generate embeddings for the content
3. The search will automatically find similar resources based on user queries

## Styling

The application uses a custom hacker/terminal theme with:
- Green terminal text (`text-hacker-green`)
- Cyan accents (`text-hacker-cyan`)
- Dark background (`bg-hacker-bg`)
- Monospace fonts for terminal feel
- Animated cursor and glitch effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request


## Support

For issues and questions, please open an issue on the GitHub repository. 