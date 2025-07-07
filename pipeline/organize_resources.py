import os
import json
import time
import uuid
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def call_openai_to_find_related_messages(candidate_message, context_messages):
    """
    Calls OpenAI to determine if a message is a resource and to find related messages.
    """
    context_str = "\n".join([f"ID: {msg['id']}, Author: {msg['author']}, Body: {msg['body']}" for msg in context_messages])

    prompt = f"""
You are an AI assistant that helps organize chat messages into valuable, evergreen resources.
Your goal is to identify conversations that would be useful to someone reading the chat history weeks or months later.

A "resource" is a conversation that provides lasting value. This could be:
- A discussion about a specific technical problem and its solution.
- A shared link to a tool, paper, or article with insightful commentary.
- A deep discussion on a specific, relevant topic (e.g., a new AI model, a programming technique).

**STRICT FILTERING - DO NOT classify as a resource:**
- Event announcements (hackathons, conferences, meetups, workshops, showcases with specific dates)
- Job postings or internship opportunities
- Simple social chatter (e.g., "hello", "thank you")
- Logistical planning (e.g., "Is anyone doing the hackathon tomorrow", "let's meet at 5")
- Recruitment or networking messages
- Broad, generic questions that don't lead to a specific, deep discussion
- Single messages without substantive follow-up discussion

Here is a candidate message and its surrounding context.

Candidate message:
ID: {candidate_message['id']}
Author: {candidate_message['author']}
Body: {candidate_message['body']}

Context:
{context_str}

Your task is to perform the following steps:

**Step 1: Determine if the candidate message is the start of a useful resource.**
- A useful message must have evergreen value. Ask yourself: "Would someone new to this chat find this conversation useful weeks from now?"
- Be very strict. Most messages are not resources.
- **Example of a non-resource message:** "Is anyone doing the hackathon tomorrow" - this is logistical and has no long-term value.
- **Example of a non-resource message:** "BNT's AI Startup Showcase on April 24th" - this is an event announcement.

**Step 2: If it IS a resource, identify all messages that are part of the SAME, FOCUSED discussion.**
- The messages must be *directly* related to the candidate message's specific topic.
- Be very precise about topic boundaries. For example:
    - A discussion about "AI agents for B2B marketing" is a **different** topic from "using ChatGPT for startup advice". Do not group them, even if they are near each other.
    - A discussion about a new model like "Llama 4" should be its own resource, unless other messages are also *specifically* about Llama 4.
- Only include messages that are part of the core discussion. Do not include tangentially related comments.
- **IMPORTANT:** You must include the candidate message ID in the related_message_ids array if it's a resource.

**Step 3: If it IS a resource, provide a concise, one-sentence description.**
- The description should accurately summarize the specific topic of the resource.

Provide your answer in JSON format with three keys:
- "is_resource": boolean (true if the candidate is a useful resource, false otherwise)
- "related_message_ids": an array of message IDs. If "is_resource" is false, this should be an empty array. If true, it MUST include the candidate message ID.
- "resource_description": a string. If "is_resource" is false, this should be an empty string.

JSON Response:
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides JSON output."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return None

def main():
    """
    Main function to organize messages into resources.
    """
    with open('content/mit_ai_hacks_messages_with_reactions.json', 'r') as f:
        data = json.load(f)
    
    messages = data['messages']
    
    # Filter out messages with no body
    messages = [msg for msg in messages if msg.get('body')]

    # Sort messages by timestamp
    messages.sort(key=lambda x: x['timestamp'])
    
    message_map = {msg['id']: msg for msg in messages}
    
    resources = []
    processed_message_ids = set()
    
    messages_to_process = messages

    for i, message in enumerate(messages_to_process):
        if message['id'] in processed_message_ids:
            continue

        print(f"Processing message {i+1}/{len(messages_to_process)}: {message['id']}")

        context_start = max(0, i - 10)
        context_end = min(len(messages), i + 11)
        context = messages[context_start:context_end]
        
        result = call_openai_to_find_related_messages(message, context)
        
        if result and result.get("is_resource"):
            related_ids = result.get("related_message_ids", [])
            if not related_ids:
                print(f"  -> Skipping resource: No related message IDs provided")
                continue

            # Validate that all related message IDs exist in our message map
            valid_ids = [msg_id for msg_id in related_ids if msg_id in message_map]
            if len(valid_ids) != len(related_ids):
                missing_ids = [msg_id for msg_id in related_ids if msg_id not in message_map]
                print(f"  -> Warning: {len(missing_ids)} message IDs not found in message map")
            
            if not valid_ids:
                print(f"  -> Skipping resource: No valid message IDs found")
                continue

            resource_description = result.get("resource_description", "")
            
            new_message_ids = set(valid_ids)
            
            best_match_resource = None
            max_overlap = 0.0

            for resource in resources:
                existing_message_ids = {msg['id'] for msg in resource['messages']}
                
                intersection = new_message_ids.intersection(existing_message_ids)
                if not intersection:
                    continue

                union = new_message_ids.union(existing_message_ids)
                overlap = len(intersection) / len(union) # Jaccard index
                
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_match_resource = resource

            # Merge if overlap is greater than 50%
            if best_match_resource and max_overlap > 0.5:
                existing_message_ids = {msg['id'] for msg in best_match_resource['messages']}
                all_ids = existing_message_ids.union(new_message_ids)
                
                resource_messages = []
                for msg_id in all_ids:
                    if msg_id in message_map:
                        # Simplify reaction data - just keep count
                        msg = message_map[msg_id].copy()
                        if 'reactions' in msg:
                            reaction_count = sum(reaction.get('count', 0) for reaction in msg['reactions'])
                            msg['hasReaction'] = reaction_count > 0
                            msg['reactionCount'] = reaction_count
                            del msg['reactions']  # Remove detailed reaction data
                        resource_messages.append(msg)

                # Final validation: ensure we have messages
                if not resource_messages:
                    print(f"  -> Skipping merged resource: No valid messages found")
                    continue

                resource_messages.sort(key=lambda x: x['timestamp'])
                best_match_resource['messages'] = resource_messages
                
                # The description of the larger cluster (before merge) is kept.
                if len(new_message_ids) > len(existing_message_ids):
                    best_match_resource['resource_description'] = resource_description
                
                for msg_id in new_message_ids:
                    processed_message_ids.add(msg_id)
                
                print(f"  -> Merged with existing resource. Overlap: {max_overlap:.2f}. Total messages: {len(best_match_resource['messages'])}.")
            
            else:
                # No significant overlap, create new resource
                resource_id = str(uuid.uuid4())
                
                resource_messages = []
                for msg_id in valid_ids:
                    if msg_id in message_map:
                        # Simplify reaction data - just keep count
                        msg = message_map[msg_id].copy()
                        if 'reactions' in msg:
                            reaction_count = sum(reaction.get('count', 0) for reaction in msg['reactions'])
                            msg['hasReaction'] = reaction_count > 0
                            msg['reactionCount'] = reaction_count
                            del msg['reactions']  # Remove detailed reaction data
                        resource_messages.append(msg)

                # Final validation: ensure we have messages
                if not resource_messages:
                    print(f"  -> Skipping new resource: No valid messages found")
                    continue
                
                resource_messages.sort(key=lambda x: x['timestamp'])

                resources.append({
                    "resource_id": resource_id,
                    "resource_description": resource_description,
                    "messages": resource_messages
                })
                
                for msg_id in valid_ids:
                    processed_message_ids.add(msg_id)
                
                print(f"  -> Found new resource with {len(resource_messages)} messages.")

        # Rate limiting
        time.sleep(1)

    with open('content/organized_resources.json', 'w') as f:
        json.dump(resources, f, indent=2)

    print(f"Organized {len(resources)} resources into content/organized_resources.json")

if __name__ == "__main__":
    main()
