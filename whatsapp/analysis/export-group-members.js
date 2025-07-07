const { Client, LocalAuth } = require('../index');
const fs = require('fs').promises;

// Configuration
const TARGET_GROUP_ID = '120363199877384683@g.us'; // MIT AI Hacks group
const MEMBERS_FILE = 'group_members.json';

// Initialize client with authentication
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "member-exporter"
    }),
    puppeteer: { 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Function to export group members
async function exportGroupMembers() {
    try {
        console.log('📋 Fetching group information...');
        
        // Get the target group/chat
        const chat = await client.getChatById(TARGET_GROUP_ID);
        
        if (!chat.isGroup) {
            console.error('❌ Target chat is not a group!');
            return;
        }

        console.log(`📍 Group: ${chat.name}`);
        console.log(`👥 Total participants: ${chat.participants.length}`);
        
        // Get detailed information for each participant
        const members = [];
        console.log('\n🔍 Fetching detailed member information...');
        
        for (let i = 0; i < chat.participants.length; i++) {
            const participant = chat.participants[i];
            
            try {
                // Get contact details
                const contact = await client.getContactById(participant.id._serialized);
                
                const memberInfo = {
                    id: participant.id._serialized,
                    name: contact.name || contact.pushname || 'Unknown',
                    number: contact.number,
                    isAdmin: participant.isAdmin,
                    isSuperAdmin: participant.isSuperAdmin,
                    profilePicUrl: null, // We'll try to get this
                    about: null, // We'll try to get this
                    isMyContact: contact.isMyContact,
                    isGroup: contact.isGroup,
                    isUser: contact.isUser,
                    isWAContact: contact.isWAContact
                };

                // Try to get profile picture URL
                try {
                    memberInfo.profilePicUrl = await contact.getProfilePicUrl();
                } catch (error) {
                    // Profile pic might not be available
                    memberInfo.profilePicUrl = null;
                }

                // Try to get about/status
                try {
                    const about = await contact.getAbout();
                    memberInfo.about = about;
                } catch (error) {
                    // About might not be available
                    memberInfo.about = null;
                }

                members.push(memberInfo);
                
                // Progress indicator
                const progress = Math.round(((i + 1) / chat.participants.length) * 100);
                process.stdout.write(`\r   Progress: ${progress}% (${i + 1}/${chat.participants.length})`);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`\n❌ Error fetching details for ${participant.id._serialized}:`, error.message);
                
                // Add basic info even if detailed fetch fails
                members.push({
                    id: participant.id._serialized,
                    name: 'Unknown',
                    number: participant.id._serialized.replace('@c.us', ''),
                    isAdmin: participant.isAdmin,
                    isSuperAdmin: participant.isSuperAdmin,
                    profilePicUrl: null,
                    about: null,
                    isMyContact: false,
                    isGroup: false,
                    isUser: true,
                    isWAContact: false,
                    error: 'Failed to fetch contact details'
                });
            }
        }
        
        console.log('\n\n📊 Group Member Summary:');
        console.log('='.repeat(50));
        
        // Sort members by role and name
        members.sort((a, b) => {
            if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
            if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
            if (a.isAdmin && !b.isAdmin) return -1;
            if (!a.isAdmin && b.isAdmin) return 1;
            return a.name.localeCompare(b.name);
        });

        // Count by role
        const superAdmins = members.filter(m => m.isSuperAdmin);
        const admins = members.filter(m => m.isAdmin && !m.isSuperAdmin);
        const regularMembers = members.filter(m => !m.isAdmin && !m.isSuperAdmin);

        console.log(`👑 Super Admins: ${superAdmins.length}`);
        console.log(`⭐ Admins: ${admins.length}`);
        console.log(`👤 Regular Members: ${regularMembers.length}`);
        console.log(`📱 Total Members: ${members.length}`);

        // Display member list
        console.log('\n👑 SUPER ADMINS:');
        console.log('-'.repeat(30));
        superAdmins.forEach(member => {
            console.log(`   ${member.name} (${member.number})`);
        });

        console.log('\n⭐ ADMINS:');
        console.log('-'.repeat(30));
        admins.forEach(member => {
            console.log(`   ${member.name} (${member.number})`);
        });

        console.log('\n👤 REGULAR MEMBERS:');
        console.log('-'.repeat(30));
        regularMembers.slice(0, 10).forEach(member => {
            console.log(`   ${member.name} (${member.number})`);
        });
        
        if (regularMembers.length > 10) {
            console.log(`   ... and ${regularMembers.length - 10} more members`);
        }

        // Prepare export data
        const exportData = {
            groupInfo: {
                id: chat.id._serialized,
                name: chat.name,
                description: chat.description,
                createdAt: chat.createdAt,
                totalMembers: members.length,
                exportedAt: new Date().toISOString()
            },
            statistics: {
                superAdmins: superAdmins.length,
                admins: admins.length,
                regularMembers: regularMembers.length,
                totalMembers: members.length,
                membersWithNames: members.filter(m => m.name !== 'Unknown').length,
                membersWithProfilePics: members.filter(m => m.profilePicUrl).length,
                membersWithAbout: members.filter(m => m.about).length
            },
            members: members
        };

        // Save to file
        await fs.writeFile(MEMBERS_FILE, JSON.stringify(exportData, null, 2));
        
        console.log(`\n💾 Group members exported to: ${MEMBERS_FILE}`);
        console.log('✅ Export completed successfully!');
        
        // Disconnect
        await client.destroy();
        
    } catch (error) {
        console.error('❌ Error exporting group members:', error.message);
        await client.destroy();
    }
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
    console.log('📋 Starting group member export...');
    
    // Start the export process
    await exportGroupMembers();
});

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});

// Initialize the client
console.log('🚀 Starting WhatsApp Group Member Exporter...');
console.log('📍 Target Group: MIT AI Hacks');
console.log('💡 This will open WhatsApp Web - please keep the browser window open');
console.log('');

client.initialize(); 