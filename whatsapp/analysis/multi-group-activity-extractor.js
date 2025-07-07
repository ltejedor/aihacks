const { Client, LocalAuth } = require('../index');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { getGroupIds, getAllGroups } = require('../config/groups');

function extractMultiGroupActivity() {
    console.log('📊 Multi-Group Activity Extractor');
    console.log('='.repeat(50));
    console.log('🎯 Extracting activity data from 9 specified groups');
    console.log('⏱️  This will take 15-20 minutes for complete data extraction');
    console.log('');

    // Get groups from configuration
    const targetGroups = getGroupIds();
    const groupsInfo = getAllGroups();

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: "multi-group-extractor"
        }),
        puppeteer: {
            headless: false,
            timeout: 60000,
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
            executablePath: undefined // Let it auto-detect Chrome
        },
        takeoverOnConflict: true,
        takeoverTimeoutMs: 10000
    });

    client.on('qr', (qr) => {
        console.log('📱 Scan this QR code with WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('⏳ Waiting for QR code scan...');
    });

    client.on('ready', async () => {
        try {
            console.log('✅ WhatsApp Web is ready!');
            console.log('⏳ Waiting 5 seconds for full initialization...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('🔍 Starting multi-group activity extraction...');
            console.log('');

            const allGroupsData = [];
            const memberActivityAcrossGroups = new Map();

            // Process each group
            for (const [groupName, groupId] of Object.entries(targetGroups)) {
                console.log(`📂 Processing ${groupName}...`);
                console.log('-'.repeat(40));

                try {
                    // Get the chat/group
                    const chat = await client.getChatById(groupId);
                    
                    if (!chat) {
                        console.log(`❌ Could not find group: ${groupName}`);
                        continue;
                    }

                    console.log(`✅ Found group: ${chat.name}`);
                    console.log(`👥 Participants: ${chat.participants ? chat.participants.length : 'Loading...'}`);

                    // Wait a bit for participants to load
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Get group members
                    const participants = chat.participants || [];
                    console.log(`👤 Loaded ${participants.length} participants`);

                    // Extract messages (try different limits)
                    console.log('📱 Extracting messages...');
                    let messages = [];
                    
                    try {
                        // Start with a reasonable number and increase if needed
                        messages = await chat.fetchMessages({ limit: 2000 });
                        console.log(`📨 Extracted ${messages.length} messages (limit: 2000)`);
                        
                        // If we hit the limit, try to get more
                        if (messages.length === 2000) {
                            console.log('🔄 Trying to get more messages...');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            messages = await chat.fetchMessages({ limit: 5000 });
                            console.log(`📨 Extracted ${messages.length} messages (limit: 5000)`);
                        }
                    } catch (error) {
                        console.log(`⚠️  Error fetching messages: ${error.message}`);
                        messages = [];
                    }

                    // Process messages and reactions
                    const userActivity = new Map();
                    const messagesByMonth = new Map();
                    const reactionsByMonth = new Map();

                    // Initialize all participants in activity map
                    participants.forEach(participant => {
                        const phone = participant.id.user;
                        userActivity.set(phone, {
                            name: participant.pushname || participant.notify || phone,
                            phone: phone,
                            isAdmin: participant.isAdmin || false,
                            isSuperAdmin: participant.isSuperAdmin || false,
                            messages: 0,
                            reactionsGiven: 0,
                            reactionsReceived: 0,
                            messagesByMonth: {},
                            reactionsByMonth: {},
                            lastActivity: null
                        });
                    });

                    console.log(`🔄 Processing ${messages.length} messages for activity data...`);

                    messages.forEach(message => {
                        const timestamp = message.timestamp;
                        const date = new Date(timestamp * 1000);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        
                        // Message author
                        const authorPhone = message.author ? message.author.replace('@c.us', '') : message.from.replace('@c.us', '').replace('@g.us', '');
                        
                        // Count message
                        if (userActivity.has(authorPhone)) {
                            const userData = userActivity.get(authorPhone);
                            userData.messages++;
                            userData.messagesByMonth[monthKey] = (userData.messagesByMonth[monthKey] || 0) + 1;
                            userData.lastActivity = Math.max(userData.lastActivity || 0, timestamp);
                            userActivity.set(authorPhone, userData);
                        }

                        // Process reactions
                        if (message.hasReaction) {
                            try {
                                const reactions = message.reactions || [];
                                reactions.forEach(reaction => {
                                    reaction.reactors.forEach(reactor => {
                                        const reactorPhone = reactor.id.user;
                                        const messageAuthorPhone = authorPhone;

                                        // Count reaction given
                                        if (userActivity.has(reactorPhone)) {
                                            const reactorData = userActivity.get(reactorPhone);
                                            reactorData.reactionsGiven++;
                                            reactorData.reactionsByMonth[monthKey] = (reactorData.reactionsByMonth[monthKey] || 0) + 1;
                                            reactorData.lastActivity = Math.max(reactorData.lastActivity || 0, timestamp);
                                            userActivity.set(reactorPhone, reactorData);
                                        }

                                        // Count reaction received
                                        if (userActivity.has(messageAuthorPhone)) {
                                            const authorData = userActivity.get(messageAuthorPhone);
                                            authorData.reactionsReceived++;
                                            userActivity.set(messageAuthorPhone, authorData);
                                        }
                                    });
                                });
                            } catch (reactionError) {
                                // Ignore reaction processing errors
                            }
                        }
                    });

                    // Convert to array and calculate totals
                    const groupActivity = Array.from(userActivity.values()).map(user => ({
                        ...user,
                        totalActivity: user.messages + user.reactionsGiven + user.reactionsReceived,
                        groupName: groupName,
                        groupId: groupId
                    }));

                    // Sort by total activity
                    groupActivity.sort((a, b) => b.totalActivity - a.totalActivity);

                    // Add to cross-group tracking
                    groupActivity.forEach(user => {
                        if (!memberActivityAcrossGroups.has(user.phone)) {
                            memberActivityAcrossGroups.set(user.phone, {
                                name: user.name,
                                phone: user.phone,
                                groups: {}
                            });
                        }
                        const memberData = memberActivityAcrossGroups.get(user.phone);
                        memberData.groups[groupName] = {
                            totalActivity: user.totalActivity,
                            messages: user.messages,
                            reactionsGiven: user.reactionsGiven,
                            reactionsReceived: user.reactionsReceived,
                            isAdmin: user.isAdmin,
                            isSuperAdmin: user.isSuperAdmin
                        };
                    });

                    // Store group data
                    allGroupsData.push({
                        groupName: groupName,
                        groupId: groupId,
                        actualName: chat.name,
                        participantCount: participants.length,
                        messageCount: messages.length,
                        activityData: groupActivity
                    });

                    console.log(`✅ Completed ${groupName}: ${participants.length} members, ${messages.length} messages`);
                    console.log(`📊 Top 5 most active: ${groupActivity.slice(0, 5).map(u => `${u.name}(${u.totalActivity})`).join(', ')}`);
                    console.log('');

                    // Delay between groups
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (groupError) {
                    console.error(`❌ Error processing ${groupName}: ${groupError.message}`);
                    continue;
                }
            }

            // Generate individual group reports
            console.log('📄 Generating individual group reports...');
            allGroupsData.forEach(groupData => {
                const csvFilename = path.join(__dirname, '../outputs', `${groupData.groupName.toLowerCase()}_activity_report.csv`);
                const csvHeaders = [
                    'Name', 'Phone', 'Role', 'Total Activity', 'Messages', 'Reactions Given', 'Reactions Received'
                ];
                const csvRows = [csvHeaders.join(',')];

                groupData.activityData.forEach(user => {
                    const role = user.isSuperAdmin ? 'Super Admin' : user.isAdmin ? 'Admin' : 'Member';
                    const row = [
                        `"${user.name}"`,
                        `"${user.phone}"`,
                        `"${role}"`,
                        user.totalActivity,
                        user.messages,
                        user.reactionsGiven,
                        user.reactionsReceived
                    ];
                    csvRows.push(row.join(','));
                });

                fs.writeFileSync(csvFilename, csvRows.join('\n'));
                console.log(`✅ Generated: ${path.basename(csvFilename)}`);
            });

            // Generate cross-group analysis
            console.log('🔄 Generating cross-group analysis...');
            const crossGroupCsvHeaders = ['Name', 'Phone'];
            
            // Add columns for each group
            Object.keys(targetGroups).forEach(groupName => {
                crossGroupCsvHeaders.push(`${groupName}_Total`, `${groupName}_Messages`, `${groupName}_Reactions_Given`, `${groupName}_Reactions_Received`, `${groupName}_Role`);
            });
            crossGroupCsvHeaders.push('Total_Groups', 'Overall_Activity');

            const crossGroupRows = [crossGroupCsvHeaders.join(',')];

            Array.from(memberActivityAcrossGroups.values()).forEach(member => {
                const row = [`"${member.name}"`, `"${member.phone}"`];
                
                let totalGroups = 0;
                let overallActivity = 0;

                Object.keys(targetGroups).forEach(groupName => {
                    const groupActivity = member.groups[groupName];
                    if (groupActivity) {
                        totalGroups++;
                        overallActivity += groupActivity.totalActivity;
                        const role = groupActivity.isSuperAdmin ? 'Super Admin' : groupActivity.isAdmin ? 'Admin' : 'Member';
                        row.push(
                            groupActivity.totalActivity,
                            groupActivity.messages, 
                            groupActivity.reactionsGiven,
                            groupActivity.reactionsReceived,
                            `"${role}"`
                        );
                    } else {
                        row.push(0, 0, 0, 0, '""');
                    }
                });

                row.push(totalGroups, overallActivity);
                crossGroupRows.push(row.join(','));
            });

            // Sort cross-group data by overall activity
            const dataRows = crossGroupRows.slice(1);
            dataRows.sort((a, b) => {
                const aActivity = parseInt(a.split(',').pop());
                const bActivity = parseInt(b.split(',').pop());
                return bActivity - aActivity;
            });

            const sortedCrossGroupRows = [crossGroupRows[0], ...dataRows];
            const outputPath = path.join(__dirname, '../outputs/cross_group_activity_analysis.csv');
        fs.writeFileSync(outputPath, sortedCrossGroupRows.join('\n'));

            // Generate summary report
            console.log('\n📊 MULTI-GROUP ACTIVITY EXTRACTION COMPLETE!');
            console.log('='.repeat(60));
            console.log(`📂 Analyzed ${allGroupsData.length} groups`);
            console.log(`👥 Found ${memberActivityAcrossGroups.size} unique members across all groups`);
            
            allGroupsData.forEach(group => {
                console.log(`📊 ${group.groupName}: ${group.participantCount} members, ${group.messageCount} messages`);
            });

            console.log('\n✅ Files Generated:');
            allGroupsData.forEach(group => {
                console.log(`📄 ${group.groupName.toLowerCase()}_activity_report.csv`);
            });
            console.log('📊 cross_group_activity_analysis.csv');
            
            console.log('\n💡 The cross_group_activity_analysis.csv file shows:');
            console.log('   • Each person\'s activity across all 9 groups');
            console.log('   • Total groups they\'re in');
            console.log('   • Overall activity score');
            console.log('   • Perfect for Excel cross-referencing!');

        } catch (error) {
            console.error('❌ Error during extraction:', error);
        } finally {
            await client.destroy();
            process.exit(0);
        }
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Authentication failed:', msg);
        process.exit(1);
    });

    client.on('disconnected', (reason) => {
        console.log('📱 WhatsApp disconnected:', reason);
        process.exit(0);
    });

    console.log('🚀 Initializing WhatsApp Web connection...');
    client.initialize();
}

// Run the extraction
extractMultiGroupActivity(); 