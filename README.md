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

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please open an issue on the GitHub repository. 