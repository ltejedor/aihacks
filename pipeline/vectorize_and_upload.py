import os
import json
import math
import time
from typing import List, Dict, Any

from dotenv import load_dotenv
from supabase import create_client, Client
import openai
from openai import OpenAI

load_dotenv()

# ---------------------------------------------------------------------------
# ENV CONFIG
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # service role or anon with insert perms
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY]):
    raise RuntimeError("SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY must be set in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# ---------------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------------
WEB_RESOURCES_PATH = "content/web_resources.json"
TABLE_NAME = "message_embeddings"
EMBED_MODEL = "text-embedding-3-small"  # cheap and performant
BATCH_SIZE = 100  # number of texts per embedding request
INSERT_CHUNK = 200  # rows per DB insert

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def load_text_chunks() -> List[Dict[str, Any]]:
    """Extracts text chunks (summaries & docs) from web_resources.json with metadata."""
    with open(WEB_RESOURCES_PATH, "r") as f:
        resources = json.load(f)

    chunks = []
    for res in resources:
        res_meta = {
            "resource_id": res["resource_id"],
            "tags": res.get("tags", []),
            "date": res.get("date"),
            "evergreen_rating": res.get("evergreen_rating"),
            "reaction_count": res.get("reaction_count", 0),
        }

        # Combine summary and documentation into single chunk per resource
        summary = res.get("summary", {})
        doc_text = res.get("documentation", "").strip()
        
        # Build combined text
        text_parts = []
        if summary.get('title'):
            text_parts.append(summary['title'])
        if summary.get('summary_text'):
            text_parts.append(summary['summary_text'])
        if doc_text:
            text_parts.append(f"Documentation:\n{doc_text}")
        
        if text_parts:
            combined_text = "\n\n".join(text_parts)
            chunk_meta = {**res_meta, "type": "resource", "title": summary.get('title', '')}
            chunks.append({"content": combined_text, "metadata": chunk_meta})
    return chunks


def chunk_batches(items: List[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Call OpenAI embedding API for a list of texts."""
    resp = openai_client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in resp.data]


def upload_rows(rows: List[Dict[str, Any]]):
    """Batch insert rows into Supabase."""
    # Supabase-py allows up to ~10k rows; we chunk to avoid huge payloads
    for chunk in chunk_batches(rows, INSERT_CHUNK):
        data, error = supabase.table(TABLE_NAME).insert(chunk).execute()
        if error:
            print("Insert error:", error)
        time.sleep(0.5)  # gentle pacing


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    chunks = load_text_chunks()
    print(f"Found {len(chunks)} text chunks to embed and upload.")

    all_rows = []
    for batch in chunk_batches(chunks, BATCH_SIZE):
        texts = [c["content"] for c in batch]
        embeddings = embed_texts(texts)
        for item, emb in zip(batch, embeddings):
            row = {
                "content": item["content"],
                "embedding": emb,
                "metadata": item["metadata"],
            }
            all_rows.append(row)
        # flush intermittently to reduce memory
        if len(all_rows) >= INSERT_CHUNK:
            upload_rows(all_rows)
            all_rows.clear()
        time.sleep(1)  # rate limiting for OpenAI

    if all_rows:
        upload_rows(all_rows)

    print("Upload complete!")


if __name__ == "__main__":
    main() 