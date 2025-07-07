const { Client, LocalAuth } = require('../index');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { getGroupByKey } = require('../config/groups');

class MessageContentExtractor {
    constructor() {
        this.groupInfo = getGroupByKey('MIT_AI_HACKS');
        this.outputDir = path.join(__dirname, '../outputs');
        this.currentRun = {
            startTime: new Date().toISOString(),
            messagesExtracted: 0,
            lastMessageTimestamp: null,
            errors: [],
            batchesFetched: 0
        };
        
        // Safety settings to avoid WhatsApp bans
        this.safetySettings = {
            initialDelayBetweenAttempts: 5000,  // 5 seconds between batch size attempts
            delayBetweenMessages: 50,           // 50ms between processing messages
            progressUpdateEvery: 50,            // Update progress every N messages
            maxRetries: 3,                      // Max retries for failed operations
            backoffMultiplier: 2,               // Exponential backoff for retries
            monitoringInterval: 30000           // 30 seconds for monitoring new messages
        };
        
        this.allMessages = [];
        this.processedMessageIds = new Set();
        this.reactionsData = new Map(); // messageId -> reactions array
        
        console.log('🔍 MIT AI Hacks Message Content Extractor');
        console.log('='.repeat(50));
        console.log(`📂 Target Group: ${this.groupInfo.displayName} (${this.groupInfo.id})`);
        console.log(`📁 Output Directory: ${this.outputDir}`);
        console.log(`⚡ Safety Settings: ${this.safetySettings.delayBetweenMessages}ms between messages, ${this.safetySettings.initialDelayBetweenAttempts}ms between attempts`);
        console.log('🔄 This will run continuously until stopped (Ctrl+C)');
        console.log('');
    }

    async initializeClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "message-content-extractor"
            }),
            puppeteer: {
                headless: false,
                timeout: 120000, // 2 minutes timeout
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ],
                executablePath: undefined
            },
            takeoverOnConflict: true,
            takeoverTimeoutMs: 15000
        });

        this.client.on('qr', (qr) => {
            console.log('📱 Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log('⏳ Waiting for QR code scan...');
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp Web is ready!');
            console.log('⏳ Initializing message extraction...');
            this.startExtraction();
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Authentication failed:', msg);
            this.saveCurrentProgress();
            process.exit(1);
        });

        this.client.on('disconnected', (reason) => {
            console.log('📱 WhatsApp disconnected:', reason);
            this.saveCurrentProgress();
            process.exit(0);
        });

        // Graceful shutdown handlers
        process.on('SIGINT', () => {
            console.log('\n🛑 Received shutdown signal...');
            this.gracefulShutdown();
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Received termination signal...');
            this.gracefulShutdown();
        });

        console.log('🚀 Initializing WhatsApp Web connection...');
        await this.client.initialize();
    }

    async startExtraction() {
        try {
            console.log('🔍 Getting group chat...');
            await this.sleep(5000); // Wait for full initialization
            
            const chat = await this.client.getChatById(this.groupInfo.id);
            if (!chat) {
                throw new Error(`Could not find group with ID: ${this.groupInfo.id}`);
            }

            console.log(`✅ Found group: "${chat.name}"`);
            console.log(`👥 Participants: ${chat.participants ? chat.participants.length : 'Loading...'}`);
            
            // Wait for participants to load
            await this.sleep(3000);
            console.log(`👤 Loaded ${chat.participants.length} participants`);

            // Load existing data if available
            await this.loadExistingData();

            // Start the continuous extraction process
            await this.extractMessagesInBatches(chat);

        } catch (error) {
            console.error('❌ Error in extraction:', error);
            this.currentRun.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            });
            await this.saveCurrentProgress();
        }
    }

    async loadExistingReactionsData() {
        const reactionsFile = path.join(this.outputDir, 'reactions_data.json');
        
        try {
            if (fs.existsSync(reactionsFile)) {
                console.log('📂 Loading existing reactions data...');
                const existingReactions = JSON.parse(fs.readFileSync(reactionsFile, 'utf8'));
                
                // Index reactions by message ID for quick lookup
                existingReactions.forEach(reaction => {
                    if (reaction.originalMessage && reaction.originalMessage.id) {
                        const messageId = reaction.originalMessage.id;
                        if (!this.reactionsData.has(messageId)) {
                            this.reactionsData.set(messageId, []);
                        }
                        this.reactionsData.get(messageId).push({
                            emoji: reaction.emoji,
                            sender: reaction.sender,
                            timestamp: reaction.timestamp
                        });
                    }
                });
                
                console.log(`✅ Loaded reactions for ${this.reactionsData.size} messages`);
            } else {
                console.log('📂 No existing reactions file found, will extract from messages directly');
            }
        } catch (error) {
            console.log('⚠️  Could not load existing reactions data:', error.message);
        }
    }

    async loadExistingData() {
        const dataFile = path.join(this.outputDir, 'mit_ai_hacks_messages_full.json');
        const metaFile = path.join(this.outputDir, 'mit_ai_hacks_extraction_metadata.json');
        
        try {
            if (fs.existsSync(dataFile)) {
                console.log('📂 Loading existing message data...');
                const existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                this.allMessages = existingData.messages || [];
                this.processedMessageIds = new Set(this.allMessages.map(m => m.id));
                console.log(`✅ Loaded ${this.allMessages.length} existing messages`);
            }
            
            if (fs.existsSync(metaFile)) {
                console.log('📂 Loading extraction metadata...');
                const metadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                if (metadata.lastRun && metadata.lastRun.lastMessageTimestamp) {
                    this.currentRun.lastMessageTimestamp = metadata.lastRun.lastMessageTimestamp;
                    console.log(`✅ Last extraction: ${metadata.lastRun.startTime}`);
                }
            }
        } catch (error) {
            console.log('⚠️  Could not load existing data:', error.message);
        }

        // Load reactions data
        await this.loadExistingReactionsData();
    }

    async extractMessagesInBatches(chat) {
        console.log('🔄 Starting message extraction...');
        console.log('💡 Press Ctrl+C to stop and save progress');
        console.log('');

        // Start with a larger batch to get as many historical messages as possible
        const initialBatchSizes = [5000, 2000, 1000, 500, 200, 100];
        let totalFetched = 0;
        let allFetchedMessages = [];

        // Try different batch sizes to get maximum historical data
        for (const batchSize of initialBatchSizes) {
            try {
                console.log(`📦 Attempting to fetch ${batchSize} messages...`);
                
                const messages = await this.retryOperation(
                    () => chat.fetchMessages({ limit: batchSize }),
                    `fetch ${batchSize} messages`
                );

                if (messages && messages.length > 0) {
                    allFetchedMessages = messages;
                    console.log(`✅ Successfully fetched ${messages.length} messages with limit ${batchSize}`);
                    break;
                } else {
                    console.log(`⚠️  No messages returned with limit ${batchSize}`);
                }

            } catch (error) {
                console.log(`⚠️  Failed to fetch ${batchSize} messages: ${error.message}`);
                // Continue to next batch size
            }

            // Safety delay between attempts
            await this.sleep(this.safetySettings.initialDelayBetweenAttempts);
        }

        if (allFetchedMessages.length === 0) {
            console.log('❌ Could not fetch any messages');
            return;
        }

        console.log(`🎉 Total messages available: ${allFetchedMessages.length}`);
        console.log('🔄 Processing messages...');

        // Process all fetched messages
        const newMessages = [];
        for (let i = 0; i < allFetchedMessages.length; i++) {
            const message = allFetchedMessages[i];
            
            // Skip if already processed
            if (this.processedMessageIds.has(message.id._serialized)) {
                continue;
            }

            const processedMessage = await this.processMessage(message);
            if (processedMessage) {
                newMessages.push(processedMessage);
                this.processedMessageIds.add(message.id._serialized);
            }

            // Progress indicator and safety delay
            if ((i + 1) % this.safetySettings.progressUpdateEvery === 0) {
                console.log(`📊 Processed ${i + 1}/${allFetchedMessages.length} messages (${newMessages.length} new)`);
                await this.sleep(this.safetySettings.delayBetweenMessages * 20); // Longer delay every N messages
            } else if (i < allFetchedMessages.length - 1) {
                await this.sleep(this.safetySettings.delayBetweenMessages);
            }
        }

        // Add new messages to collection
        this.allMessages.push(...newMessages);
        totalFetched = newMessages.length;
        this.currentRun.messagesExtracted = newMessages.length;
        this.currentRun.batchesFetched = 1;

        console.log(`✅ Processed ${newMessages.length} new messages`);
        console.log(`📊 Total messages in collection: ${this.allMessages.length}`);

        // Update last message timestamp
        if (newMessages.length > 0) {
            const timestamps = newMessages.map(m => m.timestamp);
            this.currentRun.lastMessageTimestamp = Math.max(...timestamps);
            
            // Also store the oldest message timestamp for future incremental updates
            const oldestTimestamp = Math.min(...timestamps);
            console.log(`📅 Message range: ${new Date(oldestTimestamp * 1000).toISOString()} to ${new Date(this.currentRun.lastMessageTimestamp * 1000).toISOString()}`);
        }

        // Save progress
        console.log('💾 Saving progress...');
        await this.saveCurrentProgress();

        console.log(`\n🎉 Initial extraction complete!`);
        console.log(`📊 Total messages extracted: ${this.allMessages.length}`);
        console.log(`🔄 Now monitoring for new messages... (Press Ctrl+C to stop)`);

        // Save final progress after initial extraction
        await this.saveCurrentProgress();

        // Switch to monitoring mode for new messages
        await this.monitorForNewMessages(chat);
    }

    async processMessage(message) {
        try {
            const processedMessage = {
                id: message.id._serialized,
                timestamp: message.timestamp,
                date: new Date(message.timestamp * 1000).toISOString(),
                from: message.from,
                author: message.author || message.from,
                body: message.body,
                type: message.type,
                hasMedia: message.hasMedia,
                hasReaction: message.hasReaction,
                deviceType: message.deviceType,
                isForwarded: message.isForwarded,
                isGif: message.isGif,
                isStarred: message.isStarred,
                mentionedIds: message.mentionedIds || [],
                reactions: [],
                links: [],
                media: null
            };

            // Extract author info
            if (message.author) {
                processedMessage.authorPhone = message.author.replace('@c.us', '');
            }

            // Process reactions - Enhanced approach with fallback
            if (message.hasReaction) {
                try {
                    // Try to get reactions directly first
                    if (message.reactions && message.reactions.length > 0) {
                        processedMessage.reactions = message.reactions.map(reaction => ({
                            emoji: reaction.emoji,
                            reactors: reaction.reactors.map(reactor => ({
                                id: reactor.id._serialized,
                                phone: reactor.id.user
                            }))
                        }));
                    } else {
                        // If reactions aren't populated, try to fetch them using getReactions method
                        try {
                            const reactions = await message.getReactions();
                            if (reactions && reactions.length > 0) {
                                processedMessage.reactions = reactions.map(reaction => ({
                                    emoji: reaction.emoji,
                                    reactors: reaction.reactors ? reaction.reactors.map(reactor => ({
                                        id: reactor.id._serialized || reactor.id,
                                        phone: reactor.id.user || reactor.phone || 'unknown'
                                    })) : []
                                }));
                            }
                        } catch (reactionError) {
                            console.log(`⚠️  Could not fetch reactions for message ${message.id._serialized}: ${reactionError.message}`);
                            // Leave reactions as empty array for now
                        }
                    }
                    
                    // Fallback: Check our loaded reactions data if no reactions were found
                    if (processedMessage.reactions.length === 0 && this.reactionsData.has(message.id._serialized)) {
                        const loadedReactions = this.reactionsData.get(message.id._serialized);
                        
                        // Group by emoji to match the expected format
                        const reactionsByEmoji = new Map();
                        loadedReactions.forEach(reaction => {
                            if (!reactionsByEmoji.has(reaction.emoji)) {
                                reactionsByEmoji.set(reaction.emoji, []);
                            }
                            reactionsByEmoji.get(reaction.emoji).push({
                                id: reaction.sender.id,
                                phone: reaction.sender.number
                            });
                        });
                        
                        processedMessage.reactions = Array.from(reactionsByEmoji.entries()).map(([emoji, reactors]) => ({
                            emoji: emoji,
                            reactors: reactors
                        }));
                        
                        console.log(`✅ Used loaded reactions data for message ${message.id._serialized} (${processedMessage.reactions.length} reaction types)`);
                    }
                    
                } catch (reactionError) {
                    console.log(`⚠️  Error processing reactions for message ${message.id._serialized}: ${reactionError.message}`);
                    // Leave reactions as empty array
                }
            }

            // Extract links from message body
            if (message.body) {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const links = message.body.match(urlRegex);
                if (links) {
                    processedMessage.links = links;
                }
            }

            // Process media (with safety check)
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    if (media) {
                        processedMessage.media = {
                            mimetype: media.mimetype,
                            filename: media.filename,
                            size: media.data ? media.data.length : 0
                            // Note: Not storing actual media data to keep JSON manageable
                            // Could save to separate files if needed
                        };
                    }
                } catch (mediaError) {
                    console.log(`⚠️  Could not download media for message ${message.id._serialized}: ${mediaError.message}`);
                    processedMessage.media = {
                        error: 'Could not download media',
                        mimetype: 'unknown'
                    };
                }
            }

            return processedMessage;

        } catch (error) {
            console.error(`❌ Error processing message ${message.id._serialized}:`, error.message);
            return null;
        }
    }

    async monitorForNewMessages(chat) {
        console.log(`🔍 Starting monitoring mode (checking every ${this.safetySettings.monitoringInterval/1000} seconds)...`);
        
        while (true) {
            try {
                await this.sleep(this.safetySettings.monitoringInterval);
                
                console.log(`🔍 Checking for new messages... (Current total: ${this.allMessages.length})`);
                const recentMessages = await this.retryOperation(
                    () => chat.fetchMessages({ limit: 20 }),
                    'monitor new messages'
                );
                
                if (!recentMessages || recentMessages.length === 0) {
                    console.log('📭 No messages returned during monitoring');
                    continue;
                }
                
                let newCount = 0;
                for (const message of recentMessages) {
                    if (!this.processedMessageIds.has(message.id._serialized)) {
                        const processedMessage = await this.processMessage(message);
                        if (processedMessage) {
                            // Add to beginning (newest first)
                            this.allMessages.unshift(processedMessage);
                            this.processedMessageIds.add(message.id._serialized);
                            newCount++;
                            
                            // Update last message timestamp
                            if (processedMessage.timestamp > (this.currentRun.lastMessageTimestamp || 0)) {
                                this.currentRun.lastMessageTimestamp = processedMessage.timestamp;
                            }
                        }
                        
                        // Small delay between processing new messages
                        await this.sleep(this.safetySettings.delayBetweenMessages);
                    }
                }
                
                if (newCount > 0) {
                    console.log(`✅ Found ${newCount} new messages`);
                    this.currentRun.messagesExtracted += newCount;
                    await this.saveCurrentProgress();
                } else {
                    console.log('📭 No new messages');
                }
                
            } catch (error) {
                console.error('❌ Error monitoring new messages:', error.message);
                // Wait longer on error
                await this.sleep(this.safetySettings.monitoringInterval * 2);
            }
        }
    }

    async retryOperation(operation, description) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.safetySettings.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.log(`⚠️  Attempt ${attempt}/${this.safetySettings.maxRetries} failed for ${description}: ${error.message}`);
                
                if (attempt < this.safetySettings.maxRetries) {
                    const delay = this.safetySettings.initialDelayBetweenAttempts * Math.pow(this.safetySettings.backoffMultiplier, attempt - 1);
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    async saveCurrentProgress() {
        try {
            // Sort messages by timestamp (newest first)
            this.allMessages.sort((a, b) => b.timestamp - a.timestamp);
            
            // Save main message data
            const messageData = {
                extractionInfo: {
                    groupId: this.groupInfo.id,
                    groupName: this.groupInfo.displayName,
                    lastUpdated: new Date().toISOString(),
                    totalMessages: this.allMessages.length,
                    currentRun: this.currentRun
                },
                messages: this.allMessages
            };
            
            const dataFile = path.join(this.outputDir, 'mit_ai_hacks_messages_full.json');
            fs.writeFileSync(dataFile, JSON.stringify(messageData, null, 2));
            
            // Save extraction metadata
            const metadata = {
                lastRun: {
                    ...this.currentRun,
                    endTime: new Date().toISOString()
                },
                extractionHistory: [] // Could store multiple runs
            };
            
            const metaFile = path.join(this.outputDir, 'mit_ai_hacks_extraction_metadata.json');
            fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
            
            console.log(`💾 Progress saved: ${this.allMessages.length} messages`);
            
        } catch (error) {
            console.error('❌ Error saving progress:', error);
        }
    }

    async gracefulShutdown() {
        console.log('💾 Saving final progress...');
        await this.saveCurrentProgress();
        
        console.log('📊 Final Statistics:');
        console.log(`   📨 Messages extracted: ${this.allMessages.length}`);
        console.log(`   🔄 Batches processed: ${this.currentRun.batchesFetched}`);
        console.log(`   ⏱️  Runtime: ${((Date.now() - new Date(this.currentRun.startTime)) / 60000).toFixed(1)} minutes`);
        console.log(`   ❌ Errors: ${this.currentRun.errors.length}`);
        
        if (this.client) {
            await this.client.destroy();
        }
        
        console.log('👋 Extraction stopped gracefully');
        process.exit(0);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the extraction
const extractor = new MessageContentExtractor();
extractor.initializeClient().catch(error => {
    console.error('❌ Failed to initialize:', error);
    process.exit(1);
}); 