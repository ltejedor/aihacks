const fs = require('fs');

function generateActivityCSV() {
    try {
        console.log('📊 Generating Comprehensive Activity CSV Report...');
        console.log('='.repeat(60));

        // Load all data sources
        console.log('📥 Loading data sources...');
        
        const messageData = JSON.parse(fs.readFileSync('/Users/leandratejedor/Documents/social-exp/whatsapp-web.js/messages_history_full.json', 'utf8'));
        console.log(`📱 Messages: ${messageData.messages.length}`);
        
        const reactionReport = JSON.parse(fs.readFileSync('/Users/leandratejedor/Documents/social-exp/whatsapp-web.js/user-activity-detailed-report.json', 'utf8'));
        console.log(`👍 Reaction users: ${reactionReport.userActivity.length}`);
        
        const groupData = JSON.parse(fs.readFileSync('/Users/leandratejedor/Documents/social-exp/whatsapp-web.js/group_members.json', 'utf8'));
        console.log(`👥 Group members: ${groupData.members.length}`);

        // Create user mapping
        console.log('\n🗂️ Creating user mappings...');
        const userProfiles = new Map(); // id -> complete user profile
        const phoneToId = new Map(); // phone -> id mapping
        const nameToId = new Map(); // name -> id mapping

        // Initialize all group members
        groupData.members.forEach(member => {
            userProfiles.set(member.id, {
                id: member.id,
                name: member.name,
                number: member.number,
                role: member.isSuperAdmin ? 'Super Admin' : member.isAdmin ? 'Admin' : 'Member',
                isCurrentMember: true,
                messagesByMonth: {},
                totalMessages: 0,
                reactionsGiven: 0,
                reactionsReceived: 0,
                favoriteEmoji: null,
                totalActivity: 0
            });
            
            phoneToId.set(member.number, member.id);
            nameToId.set(member.name, member.id);
        });

        // Process message data by month
        console.log('📅 Processing messages by month...');
        const messagesByMonth = {};
        const allMonths = new Set();

        messageData.messages.forEach(message => {
            const date = new Date(message.timestamp * 1000);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            allMonths.add(monthKey);
            
            if (!messagesByMonth[monthKey]) {
                messagesByMonth[monthKey] = {};
            }
            
            const senderId = message.sender.id;
            let userId = senderId;
            
            // Try to map sender to a group member
            if (!userProfiles.has(senderId)) {
                // Try by phone number
                const phoneMatch = phoneToId.get(message.sender.number);
                if (phoneMatch) {
                    userId = phoneMatch;
                } else {
                    // Try by name
                    const nameMatch = nameToId.get(message.sender.name);
                    if (nameMatch) {
                        userId = nameMatch;
                    } else {
                        // Create profile for former member
                        userProfiles.set(senderId, {
                            id: senderId,
                            name: message.sender.name || 'Unknown',
                            number: message.sender.number || 'Unknown',
                            role: 'Former Member',
                            isCurrentMember: false,
                            messagesByMonth: {},
                            totalMessages: 0,
                            reactionsGiven: 0,
                            reactionsReceived: 0,
                            favoriteEmoji: null,
                            totalActivity: 0
                        });
                        userId = senderId;
                    }
                }
            }
            
            // Count the message
            if (!messagesByMonth[monthKey][userId]) {
                messagesByMonth[monthKey][userId] = 0;
            }
            messagesByMonth[monthKey][userId]++;
            
            // Update user profile
            const user = userProfiles.get(userId);
            if (user) {
                if (!user.messagesByMonth[monthKey]) {
                    user.messagesByMonth[monthKey] = 0;
                }
                user.messagesByMonth[monthKey]++;
                user.totalMessages++;
            }
        });

        // Process reaction data
        console.log('👍 Processing reaction data...');
        reactionReport.userActivity.forEach(reactionUser => {
            // Find corresponding user profile
            let userId = reactionUser.id;
            
            // Try to match by phone number first
            const phoneMatch = phoneToId.get(reactionUser.number);
            if (phoneMatch) {
                userId = phoneMatch;
            } else if (!userProfiles.has(userId)) {
                // Create profile for user not in current members (might have left)
                userProfiles.set(userId, {
                    id: userId,
                    name: reactionUser.name || 'Unknown',
                    number: reactionUser.number || 'Unknown',
                    role: 'Former Member',
                    isCurrentMember: false,
                    messagesByMonth: {},
                    totalMessages: 0,
                    reactionsGiven: 0,
                    reactionsReceived: 0,
                    favoriteEmoji: null,
                    totalActivity: 0
                });
            }
            
            const user = userProfiles.get(userId);
            if (user) {
                user.reactionsGiven = reactionUser.reactions || 0;
                user.reactionsReceived = reactionUser.messages || 0; // In the report, "messages" = reactions received
                user.favoriteEmoji = reactionUser.favoriteEmoji || '';
            }
        });

        // Calculate total activity for all users
        console.log('📊 Calculating total activity...');
        userProfiles.forEach(user => {
            user.totalActivity = user.totalMessages + user.reactionsGiven + user.reactionsReceived;
        });

        // Sort months chronologically
        const sortedMonths = Array.from(allMonths).sort();
        console.log(`📅 Found ${sortedMonths.length} months: ${sortedMonths.join(', ')}`);

        // Generate CSV content
        console.log('📄 Generating CSV content...');
        
        // Create headers
        const headers = [
            'Name',
            'Phone Number',
            'Role',
            'Is Current Member',
            ...sortedMonths.map(month => `Messages ${month}`),
            'Total Messages',
            'Reactions Given',
            'Reactions Received',
            'Favorite Emoji',
            'Total Activity',
            'Activity Level'
        ];

        // Convert user profiles to sorted array
        const allUsers = Array.from(userProfiles.values());
        allUsers.sort((a, b) => b.totalActivity - a.totalActivity);

        // Determine activity levels
        allUsers.forEach(user => {
            if (user.totalActivity >= 100) {
                user.activityLevel = 'Super Active';
            } else if (user.totalActivity >= 50) {
                user.activityLevel = 'Very Active';
            } else if (user.totalActivity >= 20) {
                user.activityLevel = 'Active';
            } else if (user.totalActivity >= 5) {
                user.activityLevel = 'Moderately Active';
            } else if (user.totalActivity >= 1) {
                user.activityLevel = 'Slightly Active';
            } else {
                user.activityLevel = 'Inactive';
            }
        });

        // Generate CSV rows
        const csvRows = [headers.join(',')];
        
        allUsers.forEach(user => {
            const row = [
                `"${user.name}"`,
                `"${user.number}"`,
                `"${user.role}"`,
                user.isCurrentMember ? 'Yes' : 'No',
                ...sortedMonths.map(month => user.messagesByMonth[month] || 0),
                user.totalMessages,
                user.reactionsGiven,
                user.reactionsReceived,
                `"${user.favoriteEmoji}"`,
                user.totalActivity,
                `"${user.activityLevel}"`
            ];
            csvRows.push(row.join(','));
        });

        // Write to CSV file
        const csvContent = csvRows.join('\n');
        const csvFilename = 'mit_ai_hacks_activity_report.csv';
        fs.writeFileSync(csvFilename, csvContent);

        // Generate summary statistics
        console.log('\n📊 ACTIVITY REPORT SUMMARY:');
        console.log('='.repeat(50));
        console.log(`👥 Total Users: ${allUsers.length}`);
        console.log(`📱 Total Messages: ${allUsers.reduce((sum, u) => sum + u.totalMessages, 0)}`);
        console.log(`👍 Total Reactions Given: ${allUsers.reduce((sum, u) => sum + u.reactionsGiven, 0)}`);
        console.log(`❤️ Total Reactions Received: ${allUsers.reduce((sum, u) => sum + u.reactionsReceived, 0)}`);

        // Activity level breakdown
        const activityLevels = {};
        allUsers.forEach(user => {
            activityLevels[user.activityLevel] = (activityLevels[user.activityLevel] || 0) + 1;
        });

        console.log('\n🏆 ACTIVITY LEVEL BREAKDOWN:');
        console.log('-'.repeat(40));
        Object.entries(activityLevels)
            .sort(([,a], [,b]) => b - a)
            .forEach(([level, count]) => {
                const percentage = ((count / allUsers.length) * 100).toFixed(1);
                console.log(`${level}: ${count} users (${percentage}%)`);
            });

        // Monthly activity summary
        console.log('\n📅 MONTHLY MESSAGE ACTIVITY:');
        console.log('-'.repeat(40));
        sortedMonths.forEach(month => {
            const monthlyTotal = allUsers.reduce((sum, user) => sum + (user.messagesByMonth[month] || 0), 0);
            const activeUsers = allUsers.filter(user => (user.messagesByMonth[month] || 0) > 0).length;
            console.log(`${month}: ${monthlyTotal} messages from ${activeUsers} users`);
        });

        // Top performers
        console.log('\n🏅 TOP 15 MOST ACTIVE USERS:');
        console.log('-'.repeat(60));
        console.log('Name                    | Messages | Reactions | Total | Role');
        console.log('-'.repeat(60));
        allUsers.slice(0, 15).forEach(user => {
            const name = user.name.length > 20 ? user.name.substring(0, 17) + '...' : user.name;
            console.log(
                `${name.padEnd(23)} | ` +
                `${user.totalMessages.toString().padStart(8)} | ` +
                `${user.reactionsGiven.toString().padStart(9)} | ` +
                `${user.totalActivity.toString().padStart(5)} | ` +
                `${user.role}`
            );
        });

        console.log(`\n✅ CSV report generated: ${csvFilename}`);
        console.log('📊 The CSV includes:');
        console.log('   • User details (name, phone, role)');
        console.log('   • Monthly message counts');
        console.log('   • Reaction statistics');
        console.log('   • Activity levels');
        console.log('   • All 1024+ group members (including inactive ones)');

        // Additional insights
        const currentMembers = allUsers.filter(u => u.isCurrentMember);
        const formerMembers = allUsers.filter(u => !u.isCurrentMember);
        const activeCurrentMembers = currentMembers.filter(u => u.totalActivity > 0);
        const inactiveCurrentMembers = currentMembers.filter(u => u.totalActivity === 0);

        console.log('\n💡 KEY INSIGHTS:');
        console.log('-'.repeat(40));
        console.log(`• ${currentMembers.length} current members, ${formerMembers.length} former members`);
        console.log(`• ${activeCurrentMembers.length} current members are active (${(activeCurrentMembers.length/currentMembers.length*100).toFixed(1)}%)`);
        console.log(`• ${inactiveCurrentMembers.length} current members are completely inactive (${(inactiveCurrentMembers.length/currentMembers.length*100).toFixed(1)}%)`);
        console.log(`• Data spans ${sortedMonths.length} months: ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length-1]}`);

    } catch (error) {
        console.error('❌ Error generating CSV:', error.message);
        console.error(error.stack);
    }
}

// Run the CSV generation
generateActivityCSV(); 