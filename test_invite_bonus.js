// Test script to verify invite bonus functionality
// Run this with: node test_invite_bonus.js

const mysql = require('mysql2/promise');

// Database configuration - update with your actual database credentials
const dbConfig = {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database_name'
};

async function testInviteBonus() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');

        // 1. Check invite_bonus table structure
        console.log('\n=== CHECKING INVITE_BONUS TABLE ===');
        const [bonuses] = await connection.query('SELECT * FROM invite_bonus ORDER BY threshold ASC');
        console.log('Invite bonus configurations:');
        console.table(bonuses);

        // 2. Check for NULL values
        const [nullRecords] = await connection.query(`
            SELECT * FROM invite_bonus 
            WHERE level IS NULL OR invite_user IS NULL OR total_user IS NULL 
               OR recharge IS NULL OR threshold IS NULL OR amount IS NULL
        `);
        
        if (nullRecords.length > 0) {
            console.log('\n❌ FOUND RECORDS WITH NULL VALUES:');
            console.table(nullRecords);
            console.log('Please run the fix_invite_bonus_table.sql script to fix these issues.');
        } else {
            console.log('\n✅ No NULL values found in invite_bonus table');
        }

        // 3. Check users with referrals
        console.log('\n=== CHECKING USERS WITH REFERRALS ===');
        const [usersWithReferrals] = await connection.query(`
            SELECT 
                u.phone as inviter_phone,
                u.code as inviter_code,
                COUNT(ref.id) as total_referrals,
                COUNT(CASE WHEN r.money > 300 THEN 1 END) as qualifying_referrals
            FROM users u
            LEFT JOIN users ref ON ref.invite = u.code
            LEFT JOIN recharge r ON r.phone = ref.phone AND r.status = '1'
            WHERE u.status = 1
            GROUP BY u.id, u.phone, u.code
            HAVING total_referrals > 0
            ORDER BY qualifying_referrals DESC
            LIMIT 10
        `);
        
        console.log('Top 10 users with referrals:');
        console.table(usersWithReferrals);

        // 4. Check missing bonuses
        console.log('\n=== CHECKING MISSING BONUSES ===');
        const [missingBonuses] = await connection.query(`
            SELECT DISTINCT
                u.phone as inviter_phone,
                COUNT(CASE WHEN r.money > 300 THEN 1 END) as qualifying_referrals,
                ib.id as bonus_id,
                ib.threshold,
                ib.amount,
                ib.description
            FROM users u
            LEFT JOIN users ref ON ref.invite = u.code
            LEFT JOIN recharge r ON r.phone = ref.phone AND r.status = '1' AND r.money > 300
            CROSS JOIN invite_bonus ib
            LEFT JOIN inc_invite_bonus iib ON iib.phone = u.phone AND iib.bonus_id = ib.id
            WHERE u.status = 1 
                AND ib.threshold IS NOT NULL 
                AND ib.amount IS NOT NULL
                AND iib.id IS NULL
            GROUP BY u.id, u.phone, u.code, ib.id, ib.threshold, ib.amount, ib.description
            HAVING qualifying_referrals >= ib.threshold
            ORDER BY u.phone, ib.threshold
            LIMIT 20
        `);

        if (missingBonuses.length > 0) {
            console.log('❌ USERS MISSING BONUSES THEY SHOULD HAVE:');
            console.table(missingBonuses);
            console.log('\nThese users should receive their bonuses. Run /processInviteBonus endpoint to fix this.');
        } else {
            console.log('✅ No missing bonuses found');
        }

        // 5. Check current process status
        console.log('\n=== CHECKING PROCESS STATUS ===');
        const [process] = await connection.query("SELECT * FROM tbl_process WHERE status = 'N' LIMIT 1");
        if (process.length > 0) {
            console.log('✅ Active process found:');
            console.table(process);
        } else {
            console.log('❌ No active process found. This might prevent bonus processing.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed');
        }
    }
}

// Run the test
testInviteBonus();
