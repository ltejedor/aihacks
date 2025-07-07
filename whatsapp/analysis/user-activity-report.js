const fs = require('fs');

async function generateUserActivityReport() {
    try {
        console.log('📊 Loading reactions data...');
        const data = JSON.parse(fs.readFileSync('reactions_data.json', 'utf8'));
        
        // Data structures to track user activity
        const users = new Map(); // userId -> user info
        const reactionActivity = new Map(); // userId -> reaction count
        const messageActivity = new Map(); // userId -> message count
        const emojiUsage = new Map(); // userId -> {emoji: count}
        
        console.log(`📈 Processing ${data.length} reaction entries...`);
        
        // Process each reaction entry
        data.forEach(entry => {
            // Track users who sent reactions
            if (entry.sender && entry.sender.id) {
                const senderId = entry.sender.id;
                
                // Store user info
                if (!users.has(senderId)) {
                    users.set(senderId, {
                        id: senderId,
                        name: entry.sender.name || 'Unknown',
                        number: entry.sender.number || 'Unknown'
                    });
                }
                
                // Count reactions sent
                reactionActivity.set(senderId, (reactionActivity.get(senderId) || 0) + 1);
                
                // Track emoji usage
                if (entry.emoji) {
                    if (!emojiUsage.has(senderId)) {
                        emojiUsage.set(senderId, {});
                    }
                    const userEmojis = emojiUsage.get(senderId);
                    userEmojis[entry.emoji] = (userEmojis[entry.emoji] || 0) + 1;
                }
            }
            
            // Track users who authored original messages
            if (entry.originalMessage && entry.originalMessage.author) {
                const authorId = entry.originalMessage.author;
                
                // Store basic user info (we might not have full details for message authors)
                if (!users.has(authorId)) {
                    users.set(authorId, {
                        id: authorId,
                        name: 'Unknown', // We don't have name info for message authors
                        number: authorId.replace('@c.us', '') // Extract number from ID
                    });
                }
                
                // Count messages authored (we count each time their message gets a reaction)
                messageActivity.set(authorId, (messageActivity.get(authorId) || 0) + 1);
            }
        });
        
        // Convert to arrays and sort
        const allUsers = Array.from(users.values());
        const userActivityData = allUsers.map(user => {
            const reactions = reactionActivity.get(user.id) || 0;
            const messages = messageActivity.get(user.id) || 0;
            const totalActivity = reactions + messages;
            const emojis = emojiUsage.get(user.id) || {};
            
            return {
                ...user,
                reactions,
                messages,
                totalActivity,
                emojiUsage: emojis,
                favoriteEmoji: Object.keys(emojis).length > 0 ? 
                    Object.entries(emojis).sort(([,a], [,b]) => b - a)[0][0] : null
            };
        });
        
        // Sort by total activity (descending)
        userActivityData.sort((a, b) => b.totalActivity - a.totalActivity);
        
        // Generate report
        console.log('\n' + '='.repeat(80));
        console.log('📋 WHATSAPP CHAT ACTIVITY REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n👥 TOTAL USERS FOUND: ${allUsers.length}`);
        console.log(`📊 TOTAL REACTIONS ANALYZED: ${data.length}`);
        
        // Most active users
        console.log('\n🏆 TOP 10 MOST ACTIVE USERS:');
        console.log('-'.repeat(80));
        console.log('Rank | Name/Number               | Reactions | Messages* | Total | Fav Emoji');
        console.log('-'.repeat(80));
        
        userActivityData.slice(0, 10).forEach((user, index) => {
            const name = user.name !== 'Unknown' ? user.name : user.number;
            const displayName = name.length > 20 ? name.substring(0, 17) + '...' : name;
            console.log(
                `${(index + 1).toString().padStart(4)} | ` +
                `${displayName.padEnd(25)} | ` +
                `${user.reactions.toString().padStart(9)} | ` +
                `${user.messages.toString().padStart(9)} | ` +
                `${user.totalActivity.toString().padStart(5)} | ` +
                `${user.favoriteEmoji || 'N/A'}`
            );
        });
        
        // Least active users (those with 0 activity)
        const inactiveUsers = userActivityData.filter(user => user.totalActivity === 0);
        console.log(`\n😴 COMPLETELY INACTIVE USERS: ${inactiveUsers.length}`);
        if (inactiveUsers.length > 0) {
            console.log('-'.repeat(50));
            inactiveUsers.forEach(user => {
                const name = user.name !== 'Unknown' ? user.name : user.number;
                console.log(`   ${name}`);
            });
        }
        
        // Activity categories
        const veryActive = userActivityData.filter(user => user.totalActivity >= 10);
        const moderatelyActive = userActivityData.filter(user => user.totalActivity >= 3 && user.totalActivity < 10);
        const slightlyActive = userActivityData.filter(user => user.totalActivity >= 1 && user.totalActivity < 3);
        
        console.log('\n📈 ACTIVITY BREAKDOWN:');
        console.log('-'.repeat(40));
        console.log(`🔥 Very Active (10+ activities):    ${veryActive.length} users`);
        console.log(`📊 Moderately Active (3-9):        ${moderatelyActive.length} users`);
        console.log(`📈 Slightly Active (1-2):          ${slightlyActive.length} users`);
        console.log(`😴 Inactive (0):                   ${inactiveUsers.length} users`);
        
        // Reaction-only vs Message-only users
        const reactionOnlyUsers = userActivityData.filter(user => user.reactions > 0 && user.messages === 0);
        const messageOnlyUsers = userActivityData.filter(user => user.messages > 0 && user.reactions === 0);
        const bothActivities = userActivityData.filter(user => user.reactions > 0 && user.messages > 0);
        
        console.log('\n🎭 ACTIVITY TYPE BREAKDOWN:');
        console.log('-'.repeat(40));
        console.log(`👍 Reaction-only users:            ${reactionOnlyUsers.length}`);
        console.log(`💬 Message-only users:             ${messageOnlyUsers.length}`);
        console.log(`🎯 Both reactions & messages:      ${bothActivities.length}`);
        
        // Top emoji usage
        const allEmojis = {};
        userActivityData.forEach(user => {
            Object.entries(user.emojiUsage).forEach(([emoji, count]) => {
                allEmojis[emoji] = (allEmojis[emoji] || 0) + count;
            });
        });
        
        const topEmojis = Object.entries(allEmojis)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
        console.log('\n😀 TOP 5 MOST USED EMOJIS:');
        console.log('-'.repeat(30));
        topEmojis.forEach(([emoji, count]) => {
            console.log(`${emoji} ${count} times`);
        });
        
        console.log('\n📝 NOTES:');
        console.log('* Messages count = number of times user\'s messages received reactions');
        console.log('* Users with "Unknown" names are identified by their phone numbers');
        console.log('* This analysis is based on reaction data only');
        
        // Save detailed report to file
        const detailedReport = {
            summary: {
                totalUsers: allUsers.length,
                totalReactions: data.length,
                veryActiveUsers: veryActive.length,
                moderatelyActiveUsers: moderatelyActive.length,
                slightlyActiveUsers: slightlyActive.length,
                inactiveUsers: inactiveUsers.length
            },
            userActivity: userActivityData,
            emojiStats: allEmojis
        };
        
        fs.writeFileSync('user-activity-detailed-report.json', JSON.stringify(detailedReport, null, 2));
        console.log('\n💾 Detailed report saved to: user-activity-detailed-report.json');
        
        console.log('\n' + '='.repeat(80));
        
    } catch (error) {
        console.error('❌ Error generating report:', error.message);
    }
}

// Run the report
generateUserActivityReport(); 