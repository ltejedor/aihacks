const { Client, LocalAuth } = require('../index');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const TARGET_GROUP_ID = '120363199877384683@g.us'; // MIT AI Hacks group
const OUTPUT_DIR = path.join(__dirname, '../outputs');
const REACTIONS_FILE = path.join(OUTPUT_DIR, 'reactions_data.json');

// Initialize client with authentication
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "reaction-monitor"
    }),
    puppeteer: { 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Store for reactions data
let reactionsData = [];

// Load existing reactions data if file exists
async function loadExistingData() {
    try {
        const data = await fs.readFile(REACTIONS_FILE, 'utf8');
        reactionsData = JSON.parse(data);
        console.log(`📚 Loaded ${reactionsData.length} existing reactions from ${REACTIONS_FILE}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('📝 No existing reactions file found, starting fresh');
        } else {
            console.error('❌ Error loading existing data:', error.message);
        }
    }
}

// Save reactions data to file
async function saveReactionsData() {
    try {
        await fs.writeFile(REACTIONS_FILE, JSON.stringify(reactionsData, null, 2));
        console.log(`💾 Saved ${reactionsData.length} reactions to ${REACTIONS_FILE}`);
    } catch (error) {
        console.error('❌ Error saving reactions data:', error.message);
    }
}

// Get detailed information about a reaction
async function getReactionDetails(reaction) {
    try {
        // Get sender contact information
        const senderContact = await client.getContactById(reaction.senderId);
        
        // Get the message that was reacted to
        let originalMessage = null;
        if (reaction.msgId && reaction.msgId._serialized) {
            try {
                originalMessage = await client.getMessageById(reaction.msgId._serialized);
            } catch (error) {
                console.log('⚠️ Could not fetch original message:', error.message);
            }
        }

        // Get chat information
        const chat = await client.getChatById(TARGET_GROUP_ID);

        return {
            reactionId: reaction.id._serialized,
            timestamp: reaction.timestamp,
            dateTime: new Date(reaction.timestamp * 1000).toISOString(),
            emoji: reaction.reaction,
            sender: {
                id: reaction.senderId,
                name: senderContact.name || senderContact.pushname || 'Unknown',
                number: senderContact.number
            },
            originalMessage: originalMessage ? {
                id: originalMessage.id._serialized,
                body: originalMessage.body,
                type: originalMessage.type,
                timestamp: originalMessage.timestamp,
                dateTime: new Date(originalMessage.timestamp * 1000).toISOString(),
                from: originalMessage.from,
                author: originalMessage.author
            } : null,
            chat: {
                id: chat.id._serialized,
                name: chat.name
            },
            raw: {
                orphan: reaction.orphan,
                orphanReason: reaction.orphanReason,
                read: reaction.read,
                ack: reaction.ack
            }
        };
    } catch (error) {
        console.error('❌ Error getting reaction details:', error.message);
        return null;
    }
}

// Check if reaction already exists in our data
function reactionExists(reactionId) {
    return reactionsData.some(r => r.reactionId === reactionId);
}

// Client event handlers
client.on('loading_screen', (percent, message) => {
    console.log(`🔄 Loading: ${percent}% - ${message}`);
});

client.on('qr', (qr) => {
    console.log('📱 QR Code received. Please scan with WhatsApp:');
    console.log(qr);
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

client.on('ready', async () => {
    console.log('🚀 WhatsApp client is ready!');
    console.log('👀 Monitoring reactions in MIT AI Hacks group...');
    
    // Load existing data
    await loadExistingData();
    
    // Verify we can access the target group
    try {
        const targetChat = await client.getChatById(TARGET_GROUP_ID);
        console.log(`📍 Connected to group: ${targetChat.name}`);
        console.log(`👥 Participants: ${targetChat.participants ? targetChat.participants.length : 'Unknown'}`);
    } catch (error) {
        console.error('❌ Could not access target group:', error.message);
        console.log('❓ Make sure you are a member of the group and the ID is correct');
    }
});

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

// Main reaction handler
client.on('message_reaction', async (reaction) => {
    try {
        // Check if this reaction is from our target group
        const chatId = reaction.msgId ? reaction.msgId.remote : null;
        
        if (!chatId || chatId !== TARGET_GROUP_ID) {
            return; // Not from our target group
        }

        console.log('\n🎭 New reaction detected!');
        console.log(`   Emoji: ${reaction.reaction}`);
        console.log(`   From: ${reaction.senderId}`);
        console.log(`   Time: ${new Date(reaction.timestamp * 1000).toLocaleString()}`);

        // Check if we already have this reaction
        const reactionId = reaction.id._serialized;
        if (reactionExists(reactionId)) {
            console.log('   ℹ️ Reaction already recorded, skipping');
            return;
        }

        // Get detailed information
        const reactionDetails = await getReactionDetails(reaction);
        
        if (reactionDetails) {
            // Add to our data store
            reactionsData.push(reactionDetails);
            
            console.log(`   👤 Sender: ${reactionDetails.sender.name} (${reactionDetails.sender.number})`);
            if (reactionDetails.originalMessage) {
                console.log(`   💬 Message: "${reactionDetails.originalMessage.body.substring(0, 50)}${reactionDetails.originalMessage.body.length > 50 ? '...' : ''}"`);
            }
            
            // Save to file
            await saveReactionsData();
            
            console.log('   ✅ Reaction saved successfully!');
        }
        
    } catch (error) {
        console.error('❌ Error processing reaction:', error.message);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await saveReactionsData();
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await saveReactionsData();
    await client.destroy();
    process.exit(0);
});

// Start the client
console.log('🚀 Starting WhatsApp Reaction Monitor...');
console.log(`📁 Reactions will be saved to: ${path.resolve(REACTIONS_FILE)}`);
client.initialize(); 