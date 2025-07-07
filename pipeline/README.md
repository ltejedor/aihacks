# AI Community Resource RAG Pipeline

A pipeline for processing WhatsApp chat data from AI communities into curated, evergreen resources suitable for RAG (Retrieval-Augmented Generation) systems.

## Overview

This pipeline transforms raw WhatsApp chat messages into high-quality, searchable resources by:

1. **Organizing** messages into topical clusters using LLM analysis
2. **Rating** resources for evergreen value (filtering out events/jobs)
3. **Enriching** with summaries, documentation, and tags
4. **Vectorizing** for semantic search

## Pipeline Steps

```
Raw Messages → Organize → Rate → Enrich → Vectorize → RAG-Ready
```

1. `organize_resources.py` - Groups related messages into resources
2. `prepare_resources_for_web.py` - Rates and enriches with summaries
3. `vectorize_and_upload.py` - Creates embeddings and uploads to Supabase

## Output Formats

### 1. Structured JSON (`content/web_resources.json`)

Each resource contains:

```json
{
  "resource_id": "uuid-string",
  "original_description": "One-sentence description of the conversation",
  "date": "2025-04-04T03:21:51.000Z",
  "reaction_count": 8,
  "evergreen_rating": 3,
  "summary": {
    "title": "Using AI for Startup Advice",
    "summary_text": "Problem: Founders need unbiased startup guidance...\n\n• Use ChatGPT as startup therapist\n• Upload docs to Perplexity for critique..."
  },
  "documentation": "Step-by-step guide:\n1. Upload company materials\n2. Ask for detailed critique...",
  "tags": ["llms", "startup-advice", "ai-tools"],
  "messages": [...]
}
```

### 2. Vector Embeddings (Supabase `message_embeddings` table)

```sql
CREATE TABLE message_embeddings (
  id BIGINT PRIMARY KEY,
  content TEXT,           -- Combined title + summary + documentation
  embedding VECTOR,       -- OpenAI text-embedding-3-small
  metadata JSONB          -- Resource metadata for filtering
);
```

**Metadata Structure:**
```json
{
  "resource_id": "uuid",
  "type": "resource",
  "title": "Resource Title",
  "tags": ["llms", "startup-advice"],
  "date": "2025-04-04T03:21:51.000Z",
  "evergreen_rating": 3,
  "reaction_count": 8
}
```

## Using in RAG Systems

### Basic Semantic Search

```python
from supabase import create_client
import openai

# 1. Embed user query
query_embedding = openai.Embedding.create(
    model="text-embedding-3-small",
    input="How to get startup advice from AI?"
)

# 2. Search vectors
results = supabase.rpc('match_documents', {
    'query_embedding': query_embedding,
    'match_threshold': 0.7,
    'match_count': 5
}).execute()
```

### Filtered Search with Metadata

```python
# Search only high-quality resources about specific topics
results = supabase.table('message_embeddings').select('*').match({
    'metadata->>evergreen_rating': '3',
    'metadata->tags': '["llms"]'
}).rpc('match_documents', {...}).execute()
```

### Ranking by Engagement

```python
# Boost results by reaction count
for result in results:
    reaction_boost = result['metadata']['reaction_count'] * 0.1
    result['score'] += reaction_boost
```

## Key Metadata Fields

| Field | Type | Description | Usage in RAG |
|-------|------|-------------|--------------|
| `evergreen_rating` | int (0-3) | Resource quality rating | Filter low-quality content |
| `reaction_count` | int | Total emoji reactions | Boost popular resources |
| `tags` | string[] | Topic tags | Category filtering |
| `date` | string | Resource timestamp | Recency weighting |
| `title` | string | Resource title | Display in results |

## Content Quality

### Evergreen Rating Scale
- **3**: Highly evergreen (timeless tutorials, tool guides)
- **2**: Mostly evergreen (some dated context)
- **1**: Time-sensitive content (filtered out)
- **0**: Non-evergreen (events, jobs - filtered out)

### Tag Categories
Resources are tagged with concrete, searchable terms:
- **Technologies**: `llms`, `agents`, `computer-vision`, `voice-ai`
- **Use Cases**: `marketing`, `evaluations`, `data-labeling`
- **Tools**: `api-tools`, `no-code`, `frameworks`

## Example RAG Queries

**Query**: "Best tools for AI agents"
**Returns**: Resources tagged with `agents` and `api-tools`, ranked by `evergreen_rating` and `reaction_count`

**Query**: "How to evaluate LLM outputs" 
**Returns**: Resources about `evaluations` and `llms` with practical guidance

**Query**: "Computer vision for startups"
**Returns**: `computer-vision` resources with business applications

## Integration Tips

1. **Hybrid Search**: Combine semantic similarity with metadata filters
2. **Result Ranking**: Weight by `evergreen_rating` × `reaction_count`
3. **Freshness**: Use `date` for time-sensitive queries
4. **Context**: Include full `messages` array for detailed context
5. **Deduplication**: Use `resource_id` to avoid duplicate results

## Data Freshness

Resources represent real conversations from AI community experts, curated for:
- ✅ Practical, actionable advice
- ✅ Tool recommendations with context
- ✅ Problem-solution discussions
- ❌ Events, job posts, social chatter
- ❌ Outdated or time-sensitive content

This ensures your RAG system returns high-value, evergreen insights for AI builders and founders. 