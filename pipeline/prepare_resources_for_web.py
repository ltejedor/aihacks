import os
import json
import time
import re
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def sanitize_json_string(text):
    """
    Sanitize a string to make it valid JSON by removing/replacing invalid control characters.
    """
    # Remove or replace common problematic control characters
    sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)
    sanitized = sanitized.replace('\r\n', '\n').replace('\r', '\n')
    return sanitized

# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def rate_resource_with_claude(resource):
    """
    Uses Claude to rate a resource's evergreen quality for AI builders.

    Rating scale (integer):
      0 – Non-evergreen (e.g. job posts, dated events, one-off announcements)
      1 – Mostly time-sensitive / low long-term value
      2 – Evergreen but with some dated context
      3 – Highly evergreen, valuable reference for AI builders

    Returns an int in the range 0-3, or None if the call fails.
    """
    messages_str = "\n".join([f"Author: {msg['authorPhone']}, Body: {msg['body']}" for msg in resource['messages']])

    prompt = f"""
You are curating a knowledge base for AI builders. You will be shown a cluster of chat messages that has been flagged as a potential resource.

Task: Assess how evergreen and valuable this resource is for builders (i.e. still useful 6+ months from now).

STRICT FILTERING - Rate 0 or 1 for ANY of these:
- Events (hackathons, conferences, meetups, webinars, demos, launches)
- Job postings or recruitment
- Time-sensitive announcements or offers
- News or current events
- Personal updates or social posts
- Simple questions without substantive answers

Rating guidelines (choose ONE integer):
0 – Non-evergreen (events, jobs, announcements, news, personal updates)
1 – Mostly time-sensitive / low long-term value
2 – Evergreen but with some dated context or minor relevance
3 – Highly evergreen, broadly useful reference or guide

Only output a JSON object with exactly two keys:
  "rating"  → integer 0-3 following the scale above
  "reason"  → short text (1-2 sentences) why you gave that rating

Example output:
{{"rating": 0, "reason": "This is an event announcement with specific dates"}}

Here are the messages to evaluate:
{messages_str}
"""
    try:
        resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        if not resp.content or len(resp.content) == 0:
            print("Error: Empty rating response from Claude")
            return None
        json_text = resp.content[0].text.strip()
        # Strip markdown code fences
        if json_text.startswith("```json"):
            json_text = json_text[7:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
        elif json_text.startswith("```"):
            json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
        json_text = sanitize_json_string(json_text.strip())
        try:
            data = json.loads(json_text, strict=False)
            rating = data.get("rating")
            if isinstance(rating, int) and 0 <= rating <= 3:
                return rating
            print("Error: Invalid rating value in response")
            return None
        except json.JSONDecodeError as e:
            print(f"Error parsing rating JSON: {e}")
            print(f"Raw text: {json_text[:200]}...")
            return None
    except Exception as e:
        print(f"Error during rating call: {e}")
        return None

# ---------------------------------------------------------------------------

def enrich_resource_with_claude(resource, rating):
    """
    Calls Claude to enrich a resource with summaries, documentation, and tags.
    `rating` is included in the prompt so Claude is aware of the prior assessment.
    """
    messages_str = "\n".join([f"Author: {msg['authorPhone']}, Body: {msg['body']}" for msg in resource['messages']])

    prompt = f"""
You are an expert content creator for a website that showcases resources for AI hackers and founders.
Your task is to transform a chat conversation into an evergreen resource entry for our site.

Context:
- This resource has been pre-rated for evergreen quality: {rating}/3 (2 = evergreen, 3 = highly evergreen)
- Focus on what will remain useful to readers over time.
- The audience: developers & early-stage startup founders building with AI.

Here is the resource information:
Original one-sentence description: {resource['resource_description']}
Messages:
{messages_str}

Please produce a JSON object with the following keys:
1. "summary": object with:
   • "title" – catchy but clear (max 8 words), specific to the individual tool/solution
   • "summary_text" – start with one sentence that clearly states the core problem/question raised in the chat ("Problem:" or "Question:" prefix). Then provide the key solutions or outcomes from the discussion, using short paragraphs or bullet lists. Include only actionable insights, concrete advice, and takeaways for busy founders. Strictly avoid hype/filler.
2. "documentation": pull out code snippets, commands, links, or explicit step-by-step guides that a reader can copy/paste. Leave empty string if nothing useful.
3. "tags": 3-5 lowercase, hyphenated tags that founders would actually search for (e.g. "llms", "agents", "voice-ai", "computer-vision", "marketing", "evaluations", "data-labeling"). Avoid vague adjectives – favour concrete tech or topic names. No more than 5 tags.

Return ONLY the JSON. Escape newlines in string values as \\n.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.content or len(response.content) == 0:
            print("Error: Empty enrichment response from Claude")
            return None
        json_text = response.content[0].text.strip()
        if json_text.startswith("```json"):
            json_text = json_text[7:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
        elif json_text.startswith("```"):
            json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
        json_text = sanitize_json_string(json_text.strip())
        try:
            result = json.loads(json_text, strict=False)
            # basic validation
            if not isinstance(result, dict):
                print("Error: Enrichment response is not JSON object")
                return None
            return result
        except json.JSONDecodeError as e:
            print(f"Error parsing enrichment JSON: {e}")
            print(f"Response text: {json_text[:200]}...")
            return None
    except Exception as e:
        print(f"Error during enrichment call: {e}")
        return None

# ---------------------------------------------------------------------------

def main():
    """
    Main function to enrich resources and prepare them for the web.
    """
    with open('content/organized_resources.json', 'r') as f:
        organized_resources = json.load(f)

    web_resources = []
    
    # Try to load existing results to resume processing
    web_resources_file = 'content/web_resources.json'
    processed_ids = set()
    
    if os.path.exists(web_resources_file):
        try:
            with open(web_resources_file, 'r') as f:
                web_resources = json.load(f)
                processed_ids = {r['resource_id'] for r in web_resources}
                print(f"Loaded {len(web_resources)} existing results. Resuming from resource {len(web_resources) + 1}")
        except json.JSONDecodeError:
            print("Warning: Existing web_resources.json file is corrupted, starting fresh")
            web_resources = []

    success_count = 0
    failure_count = 0
    max_retries = 3

    for i, resource in enumerate(organized_resources):
        resource_id = resource['resource_id']
        
        # Skip if already processed
        if resource_id in processed_ids:
            continue
            
        print(f"Processing resource {i+1}/{len(organized_resources)}: {resource_id}")
        
        rating = None
        retry_count = 0
        
        # Retry logic for rating
        while retry_count < max_retries and rating is None:
            if retry_count > 0:
                print(f"  -> Retry rating {retry_count}/{max_retries}")
                time.sleep(5)
            
            rating = rate_resource_with_claude(resource)
            
            if rating is None:
                retry_count += 1
        
        if rating is None:
            print(f"  -> Failed to rate resource after {max_retries} attempts.")
            failure_count += 1
            continue

        # Skip resources that are not sufficiently evergreen
        if rating < 2:
            print(f"  -> Skipping resource due to low evergreen rating ({rating}).")
            continue

        enrichment_data = None
        retry_count = 0

        # Retry logic for enrichment
        while retry_count < max_retries and enrichment_data is None:
            if retry_count > 0:
                print(f"  -> Retry enrichment {retry_count}/{max_retries}")
                time.sleep(5)

            enrichment_data = enrich_resource_with_claude(resource, rating)

            if enrichment_data is None:
                retry_count += 1

        if enrichment_data:
            # Get the date from the first message in the cluster
            resource_date = resource['messages'][0]['date'] if resource['messages'] else None
            
            # Calculate reaction count using the new reactionCount field
            reaction_count = sum(msg.get('reactionCount', 0) for msg in resource['messages'])

            # Create single resource entry with the summary object
            summary = enrichment_data.get("summary", {})
            web_resource = {
                "resource_id": resource['resource_id'],
                "original_description": resource['resource_description'],
                "date": resource_date,
                "reaction_count": reaction_count,
                "evergreen_rating": rating,
                "summary": summary,
                "documentation": enrichment_data.get("documentation", ""),
                "tags": enrichment_data.get("tags", []),
                "messages": resource['messages']
            }
            web_resources.append(web_resource)
            success_count += 1
            print(f"  -> Successfully enriched resource.")
        else:
            failure_count += 1
            print(f"  -> Failed to enrich resource after {max_retries} attempts.")

        # Save progress every 10 resources
        if (i + 1) % 10 == 0:
            with open(web_resources_file, 'w') as f:
                json.dump(web_resources, f, indent=2)
            print(f"  -> Saved progress: {success_count} successful, {failure_count} failed")

        # Rate limiting to avoid hitting API limits - increased delay
        time.sleep(3)

    # Final save
    with open(web_resources_file, 'w') as f:
        json.dump(web_resources, f, indent=2)

    print(f"\nProcessing completed:")
    print(f"  Successfully processed: {success_count}")
    print(f"  Failed to process: {failure_count}")
    print(f"  Total resources in output: {len(web_resources)}")
    print(f"  Results saved to {web_resources_file}")

if __name__ == "__main__":
    main()
