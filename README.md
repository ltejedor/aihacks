# AI Hacks - AI Resource Search Platform

> **🚀 Live Demo**: [https://aihacks.vercel.app/](https://aihacks.vercel.app/)

A comprehensive platform that organizes and makes searchable the wealth of AI resources shared in WhatsApp communities. Built specifically for the MIT AI Hacks community, this project transforms casual group conversations into a curated, searchable knowledge base.

## 🎯 What This Project Does
- 📱 **Extracting** conversations and reactions from WhatsApp groups
- 🤖 **Processing** messages with AI to identify evergreen, valuable resources
- 🔍 **Creating** vector embeddings for semantic search
- 🌐 **Presenting** everything in a beautiful, searchable web interface

## 🏗️ Architecture Overview

This project consists of three main components that work together to create a complete resource discovery system:

```
Data Collection → AI Processing → Web Interface
     ↓               ↓               ↓            
  [whatsapp]    →  [pipeline]    →  [app]   
```

### 📱 `/app` - Frontend Web Application

**Live at**: [https://aihacks.vercel.app/](https://aihacks.vercel.app/)

A modern React application with a sleek terminal-inspired interface that makes AI resources discoverable through:

- 🔍 **Vector Similarity Search**: Find resources using natural language queries
- 🔥 **Trending Resources**: Discover the most popular and newest content
- 🔐 **User Authentication**: Secure access for community members
- 📱 **Responsive Design**: Works beautifully on desktop and mobile

**Tech Stack:**
- **Frontend**: React 19, TanStack Start, TypeScript
- **Backend**: Supabase (Database, Auth, Real-time)
- **Styling**: TailwindCSS with custom hacker/terminal theme
- **Search**: Vector embeddings with OpenAI
- **Deployment**: Vercel

### 🔄 `/pipeline` - AI Processing Pipeline

The brain of the operation - transforms raw WhatsApp messages into high-quality, searchable resources through a sophisticated 4-step process:

1. **📋 Organize** - Groups related messages into topical clusters using GPT-4
2. **⭐ Rate** - Evaluates content for evergreen value (0-3 scale) using Claude
3. **✨ Enrich** - Generates summaries, documentation, and tags using Claude
4. **🔢 Vectorize** - Creates embeddings and uploads to Supabase using OpenAI

**Key Features:**
- Filters out time-sensitive content (events, job posts, social chatter)
- Focuses on evergreen, actionable advice and tool recommendations
- Preserves context with reaction counts and community engagement
- Generates structured metadata for enhanced search

**Tech Stack:**
- **Language**: Python
- **AI Models**: OpenAI GPT-4o-mini, Anthropic Claude 3 Haiku & Sonnet
- **Database**: Supabase with vector extensions
- **Processing**: Custom scripts with retry logic and rate limiting

### 📲 `/whatsapp` - Data Collection System

Built on the powerful `whatsapp-web.js` library, this component handles the extraction of conversations from WhatsApp groups:

**Core Features:**
- **Message Extraction**: Captures full conversation history with metadata
- **Reaction Monitoring**: Tracks emoji reactions and engagement in real-time
- **Member Management**: Exports group member information and roles
- **Media Handling**: Processes images, documents, and other shared files
- **Continuous Monitoring**: Watches for new messages and updates

**Key Scripts:**
- `message-content-extractor.js` - Main extraction engine for conversations
- `reaction-monitor.js` - Real-time reaction tracking
- `export-group-members.js` - Group membership analysis
- Various analysis tools for activity reports and engagement metrics

**Tech Stack:**
- **Runtime**: Node.js
- **WhatsApp Integration**: whatsapp-web.js
- **Authentication**: Local session management
- **Data Storage**: JSON files with structured schemas

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for WhatsApp extraction and frontend)
- Python 3.8+ (for AI processing pipeline)
- Supabase account (for database and auth)
- OpenAI API key (for embeddings and processing)
- Anthropic API key (for content rating and enrichment)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ltejedor/aihacks.git
   cd aihacks
   ```

2. **Set up the frontend** (try the search interface)
   ```bash
   cd app
   npm install
   cp .env.example .env.local
   # Add your Supabase credentials
   npm run dev
   ```

3. **Explore the pipeline** 
   ```bash
   cd pipeline
   pip install -r requirements.txt
   # Check out the example data and scripts
   ```

4. **Run WhatsApp extraction** 
   ```bash
   cd whatsapp
   npm install
   # Run any of the analysis scripts
   ```

## 🤝 Get Involved

**This project is in early development** - we're actively building and improving the platform! Here's how you can contribute:

### 🐛 Found Issues or Have Ideas?
- **Report bugs** or **request features** by [opening GitHub issues](https://github.com/ltejedor/aihacks/issues)
- **Share feedback** on the user experience at [aihacks.vercel.app](https://aihacks.vercel.app/)
- **Suggest improvements** to the search relevance or interface

### 💻 Want to Contribute Code?
We welcome contributions! Areas where we'd love help:
- **Frontend improvements** - UI/UX enhancements, new features
- **Search optimization** - Better ranking algorithms, filters
- **Pipeline enhancements** - More sophisticated AI processing
- **WhatsApp integration** - Additional data extraction capabilities
- **Documentation** - Help others understand and use the platform

### 📝 How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Submit a pull request with a clear description

## 🤖 AI-Powered Project Management

We're using **GitHub MCP (Model Context Protocol)** for AI-driven project management! This allows contributors to interact with GitHub issues, pull requests, and more through natural language prompts in Cursor.

### 🚀 Quick Setup Guide

**What is MCP?** MCP is a plugin system that lets Cursor connect to external tools and APIs, including GitHub. By adding a GitHub MCP server, you enable AI-driven interaction with GitHub features.

#### Step 1: Create GitHub Personal Access Token
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Click "Generate new token" (choose fine-grained token if possible)
3. Set permissions: `repo`, `issues` (minimum required)
4. Copy the token for later use

#### Step 2: Install GitHub MCP Server

**Option A: Using Smithery CLI (Recommended)**
```bash
npx -y @smithery/cli@latest install @smithery-ai/github \
  --client cursor \
  --config '{"githubPersonalAccessToken":"your_token_here"}'
```

**Option B: Manual Configuration**
Create/edit `~/.cursor/mcp.json`:
```json
{
  "mcp_servers": {
    "github": {
      "command": "npx @smithery/github-mcp --token your_github_token"
    }
  }
}
```

#### Step 3: Add to Cursor
1. Open Cursor Settings (gear icon)
2. Navigate to MCP section
3. Click "+ Add new global MCP server"
4. Paste the command from Step 2

#### Step 4: Use GitHub MCP
Open Cursor's Agent or Chat tab and try prompts like:
- "Create a new GitHub issue titled 'Bug: Search not working' with description 'Steps to reproduce...'"
- "List all open issues in the aihacks repository"
- "Update issue #123 with a comment about the fix"

### 💡 Tips
- Use fine-grained tokens with minimal permissions for security
- Check MCP logs in Cursor (Output panel → MCP Logs) if you encounter issues
- Restart Cursor after updating MCP settings
- Refer to [Smithery.ai](https://smithery.ai) for advanced workflows

## 🔒 Privacy & Ethics

This project is designed for community benefit with privacy in mind:
- Only processes messages from groups where you're a member
- Focuses on extracting valuable, educational content
- Respects WhatsApp's terms of service
- Filters out personal/private conversations

## 📈 Current Status

**✅ Working:**
- WhatsApp message extraction and monitoring
- AI-powered content processing and curation
- Vector search with semantic similarity
- Modern web interface with authentication

**🚧 In Development:**
- Enhanced search filters and sorting
- Mobile app optimization
- Real-time content updates
- Community contribution features

**🔮 Planned:**
- Multi-group support
- Advanced analytics and insights
- Integration with other communication platforms
- AI-powered content recommendations

## 📊 Project Stats

- **Frontend**: React 19 + TanStack Start + Supabase
- **Backend**: Python + OpenAI + Anthropic + Supabase
- **Data Collection**: Node.js + whatsapp-web.js
- **Deployment**: Vercel + Supabase Cloud
- **License**: ISC

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ltejedor/aihacks/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ltejedor/aihacks/discussions)
- **Live Demo**: [https://aihacks.vercel.app/](https://aihacks.vercel.app/)

---

**Built with ❤️ for the AI community** - helping builders find the resources they need, when they need them.
