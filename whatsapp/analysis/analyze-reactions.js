const fs = require('fs').promises;
const path = require('path');

const REACTIONS_FILE = 'reactions_data.json';

// Load reactions data
async function loadReactionsData() {
    try {
        const data = await fs.readFile(REACTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('❌ No reactions data file found. Run the reaction monitor first.');
            return [];
        }
        throw error;
    }
}

// Analyze reactions data
function analyzeReactions(reactions) {
    if (reactions.length === 0) {
        console.log('📊 No reactions data to analyze.');
        return;
    }

    console.log('📊 REACTION ANALYSIS REPORT');
    console.log('=' .repeat(50));
    console.log(`📈 Total reactions: ${reactions.length}`);
    
    // Date range
    const timestamps = reactions.map(r => r.timestamp).sort((a, b) => a - b);
    const startDate = new Date(timestamps[0] * 1000);
    const endDate = new Date(timestamps[timestamps.length - 1] * 1000);
    console.log(`📅 Date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    console.log('\n🎭 EMOJI STATISTICS');
    console.log('-'.repeat(30));
    
    // Emoji frequency
    const emojiCount = {};
    reactions.forEach(r => {
        emojiCount[r.emoji] = (emojiCount[r.emoji] || 0) + 1;
    });
    
    const sortedEmojis = Object.entries(emojiCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    sortedEmojis.forEach(([emoji, count], index) => {
        const percentage = ((count / reactions.length) * 100).toFixed(1);
        console.log(`${index + 1}. ${emoji} - ${count} times (${percentage}%)`);
    });
    
    console.log('\n👥 USER STATISTICS');
    console.log('-'.repeat(30));
    
    // User activity
    const userCount = {};
    reactions.forEach(r => {
        const userName = r.sender.name;
        userCount[userName] = (userCount[userName] || 0) + 1;
    });
    
    const sortedUsers = Object.entries(userCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    sortedUsers.forEach(([user, count], index) => {
        const percentage = ((count / reactions.length) * 100).toFixed(1);
        console.log(`${index + 1}. ${user} - ${count} reactions (${percentage}%)`);
    });
    
    console.log('\n⏰ TIME ANALYSIS');
    console.log('-'.repeat(30));
    
    // Hourly distribution
    const hourlyCount = {};
    reactions.forEach(r => {
        const hour = new Date(r.timestamp * 1000).getHours();
        hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    });
    
    console.log('Peak hours:');
    const sortedHours = Object.entries(hourlyCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    sortedHours.forEach(([hour, count], index) => {
        const percentage = ((count / reactions.length) * 100).toFixed(1);
        const timeRange = `${hour.padStart(2, '0')}:00-${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`;
        console.log(`${index + 1}. ${timeRange} - ${count} reactions (${percentage}%)`);
    });
    
    // Daily distribution
    const dailyCount = {};
    reactions.forEach(r => {
        const date = new Date(r.timestamp * 1000).toDateString();
        dailyCount[date] = (dailyCount[date] || 0) + 1;
    });
    
    console.log('\nMost active days:');
    const sortedDays = Object.entries(dailyCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    sortedDays.forEach(([date, count], index) => {
        console.log(`${index + 1}. ${date} - ${count} reactions`);
    });
    
    console.log('\n💬 MESSAGE ANALYSIS');
    console.log('-'.repeat(30));
    
    // Messages with most reactions
    const messageReactions = {};
    reactions.forEach(r => {
        if (r.originalMessage) {
            const msgId = r.originalMessage.id;
            if (!messageReactions[msgId]) {
                messageReactions[msgId] = {
                    message: r.originalMessage,
                    reactions: []
                };
            }
            messageReactions[msgId].reactions.push(r);
        }
    });
    
    const popularMessages = Object.values(messageReactions)
        .sort((a, b) => b.reactions.length - a.reactions.length)
        .slice(0, 5);
    
    console.log('Most reacted messages:');
    popularMessages.forEach((msgData, index) => {
        const msg = msgData.message;
        const reactionCount = msgData.reactions.length;
        const preview = msg.body.substring(0, 80) + (msg.body.length > 80 ? '...' : '');
        const date = new Date(msg.timestamp * 1000).toLocaleDateString();
        console.log(`${index + 1}. "${preview}" (${date}) - ${reactionCount} reactions`);
        
        // Show reactions breakdown for this message
        const msgEmojiCount = {};
        msgData.reactions.forEach(r => {
            msgEmojiCount[r.emoji] = (msgEmojiCount[r.emoji] || 0) + 1;
        });
        const emojiBreakdown = Object.entries(msgEmojiCount)
            .map(([emoji, count]) => `${emoji}(${count})`)
            .join(' ');
        console.log(`   Reactions: ${emojiBreakdown}`);
        console.log('');
    });
}

// Export data to CSV format
async function exportToCSV(reactions) {
    if (reactions.length === 0) {
        console.log('❌ No data to export');
        return;
    }

    const csvData = [
        'Timestamp,DateTime,Emoji,SenderName,SenderNumber,MessagePreview,MessageDateTime'
    ];

    reactions.forEach(r => {
        const row = [
            r.timestamp,
            r.dateTime,
            r.emoji,
            `"${r.sender.name.replace(/"/g, '""')}"`,
            r.sender.number,
            r.originalMessage ? `"${r.originalMessage.body.replace(/"/g, '""').substring(0, 100)}"` : '""',
            r.originalMessage ? r.originalMessage.dateTime : ''
        ];
        csvData.push(row.join(','));
    });

    const csvFileName = 'reactions_export.csv';
    await fs.writeFile(csvFileName, csvData.join('\n'));
    console.log(`📄 Data exported to ${csvFileName}`);
}

// Main function
async function main() {
    try {
        const reactions = await loadReactionsData();
        
        if (process.argv.includes('--export')) {
            await exportToCSV(reactions);
        } else {
            analyzeReactions(reactions);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
} 