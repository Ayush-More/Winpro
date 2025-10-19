import connection from "../config/connectDB";
import winGoController from "./winGoController";
import k5Controller from "./k5Controller";
import k3Controller from "./k3Controller";
import trxController from "./trxController";
import mycronController from "./mycronController";
import cron from 'node-cron';

const cronJobGame1p = (io) => {
    
    cron.schedule('*/30 * * * * *', async() => {




        await winGoController.addWinGo(10);
        await winGoController.handlingWinGo1P(10);
        const [winGo1] = await connection.execute('SELECT * FROM `wingo` WHERE `game` = "wingo10" ORDER BY `id` DESC LIMIT 2', []);
        const data = winGo1; // Cầu mới chưa có kết quả
        io.emit('data-server', { data: data });




    });

    // Synchronized 1-minute games - run at the start of each minute
    cron.schedule('0 * * * * *', async() => {
        console.log('Running 1-minute games at:', new Date().toISOString());

        // TRX 1 minute game
        await trxController.addTRXGo(1);
        await trxController.handlingTRX1P(1);
        const [trxWin] = await connection.execute('SELECT * FROM `trx` WHERE `game` = "trx" ORDER BY `id` DESC LIMIT 2 ', []);
        const trxWindata = trxWin; // Cầu mới chưa có kết quả
        if (trxWindata && trxWindata.length > 0) {
            io.emit('data-server-trx', { data: trxWindata });
        }

        await winGoController.addWinGo(1);
        await winGoController.handlingWinGo1P(1);
        const [winGo1] = await connection.execute('SELECT * FROM `wingo` WHERE `game` = "wingo" ORDER BY `id` DESC LIMIT 2 ', []);
        const data = winGo1; // Cầu mới chưa có kết quả
        io.emit('data-server', { data: data });

        await k5Controller.add5D(1);
        await k5Controller.handling5D(1);
        const [k5D] = await connection.execute('SELECT * FROM 5d WHERE `game` = 1 ORDER BY `id` DESC LIMIT 2 ', []);
        const data2 = k5D; // Cầu mới chưa có kết quả
        io.emit('data-server-5d', { data: data2, 'game': '1' });

        await k3Controller.addK3(1);
        await k3Controller.handlingK3(1);
        const [k3] = await connection.execute('SELECT * FROM k3 WHERE `game` = 1 ORDER BY `id` DESC LIMIT 2 ', []);
        const data3 = k3; // Cầu mới chưa có kết quả
        io.emit('data-server-k3', { data: data3, 'game': '1' });



        // await sleep(2000);

        // TRX 1 minute game
        // await trxController.addTRXGo(1);
        // await trxController.handlingTRX1P(1);
        // const [trxWin] = await connection.execute('SELECT * FROM `trx` WHERE `game` = "trx" ORDER BY `id` DESC LIMIT 2 ', []);
        // const trxWindata = trxWin; // Cầu mới chưa có kết quả
        // if (trxWindata && trxWindata.length > 0) {
        //     console.log('Emitting TRX 1min data:', trxWindata.length, 'records');
        //     io.emit('data-server-trx', { data: trxWindata });
        // } else {
        //     console.log('No TRX 1min data to emit');
        // }


    });

    // Synchronized 3-minute games - run at 0, 3, 6, 9... minutes
    cron.schedule('0 */3 * * * *', async() => {
        console.log('Running 3-minute games at:', new Date().toISOString());

        // TRX 3 minute game
        await trxController.addTRXGo(3);
        await trxController.handlingTRX1P(3);
        const [trxWin] = await connection.execute('SELECT * FROM `trx` WHERE `game` = "trx3" ORDER BY `id` DESC LIMIT 2 ', []);
        const trxWindata = trxWin; // Cầu mới chưa có kết quả
        if (trxWindata && trxWindata.length > 0) {
            io.emit('data-server-trx', { data: trxWindata });
        }

        await winGoController.addWinGo(3);
        await winGoController.handlingWinGo1P(3);
        const [winGo1] = await connection.execute('SELECT * FROM `wingo` WHERE `game` = "wingo3" ORDER BY `id` DESC LIMIT 2 ', []);
        const data = winGo1; // Cầu mới chưa có kết quả
        io.emit('data-server', { data: data });

        await k5Controller.add5D(3);
        await k5Controller.handling5D(3);
        const [k5D] = await connection.execute('SELECT * FROM 5d WHERE `game` = 3 ORDER BY `id` DESC LIMIT 2 ', []);
        const data2 = k5D; // Cầu mới chưa có kết quả
        io.emit('data-server-5d', { data: data2, 'game': '3' });

        await k3Controller.addK3(3);
        await k3Controller.handlingK3(3);
        const [k3] = await connection.execute('SELECT * FROM k3 WHERE `game` = 3 ORDER BY `id` DESC LIMIT 2 ', []);
        const data3 = k3; // Cầu mới chưa có kết quả
        io.emit('data-server-k3', { data: data3, 'game': '3' });
    });

    // Synchronized 5-minute games - run at 0, 5, 10, 15... minutes
    cron.schedule('0 */5 * * * *', async() => {
        console.log('Running 5-minute games at:', new Date().toISOString());

        // TRX 5 minute game
        await trxController.addTRXGo(5);
        await trxController.handlingTRX1P(5);
        const [trxWin] = await connection.execute('SELECT * FROM `trx` WHERE `game` = "trx5" ORDER BY `id` DESC LIMIT 2 ', []);
        const trxWindata = trxWin; // Cầu mới chưa có kết quả
        if (trxWindata && trxWindata.length > 0) {
            io.emit('data-server-trx', { data: trxWindata });
        }

        await winGoController.addWinGo(5);
        await winGoController.handlingWinGo1P(5);
        const [winGo1] = await connection.execute('SELECT * FROM `wingo` WHERE `game` = "wingo5" ORDER BY `id` DESC LIMIT 2 ', []);
        const data = winGo1; // Cầu mới chưa có kết quả
        io.emit('data-server', { data: data });

        await k5Controller.add5D(5);
        await k5Controller.handling5D(5);
        const [k5D] = await connection.execute('SELECT * FROM 5d WHERE `game` = 5 ORDER BY `id` DESC LIMIT 2 ', []);
        const data2 = k5D; // Cầu mới chưa có kết quả
        io.emit('data-server-5d', { data: data2, 'game': '5' });

        await k3Controller.addK3(5);
        await k3Controller.handlingK3(5);
        const [k3] = await connection.execute('SELECT * FROM k3 WHERE `game` = 5 ORDER BY `id` DESC LIMIT 2 ', []);
        const data3 = k3; // Cầu mới chưa có kết quả
        io.emit('data-server-k3', { data: data3, 'game': '5' });
    });
    cron.schedule('*/10 * * * *', async() => {
        console.log('Running 10-minute games cron job...');

        // TRX 10 minute game
        await trxController.addTRXGo(10);
        await trxController.handlingTRX1P(10);
        const [trxWin] = await connection.execute('SELECT * FROM `trx` WHERE `game` = "trx10" ORDER BY `id` DESC LIMIT 2 ', []);
        const trxWindata = trxWin; // Cầu mới chưa có kết quả
        if (trxWindata && trxWindata.length > 0) {
            io.emit('data-server-trx', { data: trxWindata });
        }



        // K5D 10 minute game
        await k5Controller.add5D(10);
        await k5Controller.handling5D(10);
        const [k5D] = await connection.execute('SELECT * FROM 5d WHERE `game` = 10 ORDER BY `id` DESC LIMIT 2 ', []);
        const data2 = k5D; // Cầu mới chưa có kết quả
        io.emit('data-server-5d', { data: data2, 'game': '10' });

        // K3 10 minute game
        await k3Controller.addK3(10);
        await k3Controller.handlingK3(10);
        const [k3] = await connection.execute('SELECT * FROM k3 WHERE `game` = 10 ORDER BY `id` DESC LIMIT 2 ', []);
        const data3 = k3; // Cầu mới chưa có kết quả
        io.emit('data-server-k3', { data: data3, 'game': '10' });
    });

    // WinGo 10-minute game is handled by the 10-minute cron job above
    // Removed this 30-second cron job to prevent conflicts

    cron.schedule('* * 0 * * *', async() => {
        await connection.execute('UPDATE users SET roses_today = ?', [0]);
        await connection.execute('UPDATE point_list SET money = ?', [0]);
    });
    // every day at 11:45 PM
    // cron.schedule('45 23 * * *', async() => {
    //     await mycronController.stakingIncome();
    // });

    // // every day at 11:52 PM - Daily Staking Level Income
    // cron.schedule('52 23 * * *', async() => {
    //     await mycronController.DailyStakingLevelIncome();
    // });

    // every day at 12:05 AM - Daily Salary Distribution
    cron.schedule('5 0 * * *', async() => {
        console.log('Running daily salary distribution...');
        try {
            await mycronController.dailySalaryIncome();
            console.log('Daily salary distribution completed successfully');
        } catch (error) {
            console.error('Error in daily salary distribution:', error);
        }
    });

    // every day at 12:10 AM - Setup Daily Salary Achiever
    cron.schedule('10 0 * * *', async() => {
        console.log('Setting up daily salary achievers...');
        try {
            await mycronController.setupDailySalachiever();
            console.log('Daily salary achiever setup completed successfully');
        } catch (error) {
            console.error('Error in daily salary achiever setup:', error);
        }
    });

    // every day at 12:30 AM - Closing Generation
    cron.schedule('30 0 * * *', async() => {
        console.log('Generating business statistics...');
        try {
            await mycronController.setupClosing(null, null);
            console.log('Business statistics generation completed successfully');
        } catch (error) {
            console.error('Error in business statistics generation:', error);
        }
    });

    // every Sunday at 12:15 AM - Weekly Salary Distribution
    cron.schedule('15 0 * * 0', async() => {
        console.log('Running weekly salary distribution...');
        try {
            await mycronController.weeklySalaryIncome();
            console.log('Weekly salary distribution completed successfully');
        } catch (error) {
            console.error('Error in weekly salary distribution:', error);
        }
    });

    // every 1st day of month at 12:20 AM - Monthly Salary Distribution
    cron.schedule('20 0 1 * *', async() => {
        console.log('Running monthly salary distribution...');
        try {
            await mycronController.monthlySalaryIncome();
            console.log('Monthly salary distribution completed successfully');
        } catch (error) {
            console.error('Error in monthly salary distribution:', error);
        }
    });
    
    // every day at 2:00 AM - Trade Level Bonus Distribution (Last 24 Hours)
    cron.schedule('0 2 * * *', async() => {
        console.log('Running TradeLevelBonus distribution at:', new Date().toISOString());
        try {
            // Create a fake req/res object for the function
            const fakeReq = {};
            const fakeRes = {
                status: (code) => ({
                    json: (data) => {
                        if (data.status) {
                            console.log('TradeLevelBonus completed successfully:', data);
                        } else {
                            console.error('TradeLevelBonus failed:', data);
                        }
                    }
                })
            };
            await mycronController.TradeLevelBonus(fakeReq, fakeRes);
        } catch (error) {
            console.error('Error in TradeLevelBonus distribution:', error);
        }
    });
    
    
    cron.schedule('0 1 * * *', async () => {
        console.log('Running daily betting bonus distribution at:', new Date().toISOString());
        try {
            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Query to find users who placed at least 5 bets of 50+ INR yesterday across all games
            // Assuming bets are in minutes_1 (WinGo) and trx_result (TRX); adjust if more tables
            const [qualifyingUsers] = await connection.query(`
                SELECT DISTINCT u.phone, u.money, u.total_money
                FROM users u
                INNER JOIN (
                    SELECT phone, COUNT(*) as bet_count
                    FROM minutes_1
                    WHERE DATE(FROM_UNIXTIME(time / 1000)) = ? AND amount >= 50 AND status IN (1, 2)
                    GROUP BY phone
                    HAVING bet_count >= 5
                    UNION
                    SELECT phone, COUNT(*) as bet_count
                    FROM trx_result
                    WHERE DATE(FROM_UNIXTIME(time / 1000)) = ? AND amount >= 50 AND status IN (1, 2)
                    GROUP BY phone
                    HAVING bet_count >= 5
                ) bets ON u.phone = bets.phone
                WHERE u.status = 1
            `, [yesterdayStr, yesterdayStr]);

            // Award 25 INR bonus to qualifying users
            for (const user of qualifyingUsers) {
                await connection.query(`
                    UPDATE users 
                    SET money = money + 25, total_money = total_money + 25, last_daily_bonus_date = ?
                    WHERE phone = ?
                `, [yesterdayStr, user.phone]);

                console.log(`Daily betting bonus ₹25 credited to ${user.phone} for ${yesterdayStr}`);
            }

            console.log(`Daily betting bonus distribution completed: ${qualifyingUsers.length} users rewarded`);
        } catch (error) {
            console.error('Error in daily betting bonus distribution:', error);
        }
    });
    
}
// Removed conflicting cron job that was running every minute for all games
// This was causing period mismatch between betting and trend periods
module.exports = {
    cronJobGame1p
};