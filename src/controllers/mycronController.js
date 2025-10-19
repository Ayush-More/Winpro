import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import e from "express";
import winGoController from "./winGoController";
//  import moment from "moment";
//  import crypto from "crypto";
 import querystring from "querystring"
 
 const qs = require('qs');
 

// const express = require('express');
// const fs = require('fs');
// const bodyParser = require('body-parser');
// const app = express();
 
 
 
 
 const CryptoJS = require('crypto-js');


const axios = require('axios');
const crypto = require('crypto');


require('dotenv').config();
 
    const moment = require('moment');

 
let timeNow = Date.now();

const randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}


const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
} 

const isNumber = (params) => {
    let pattern = /^[0-9]*\d$/;
    return pattern.test(params);
}

const ipAddress = (req) => {
    let ip = '';
    if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(",")[0];
    } else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    } else {
        ip = req.ip;
    }
    return ip;
}

const timeCreate = () => {
    const d = new Date();
    const time = d.getTime();
    return time;
}
const getDateFormat = (Reqdate) => {
    let dateObj = new Date(Reqdate);
    dateObj.setDate(dateObj.getDate() + 1);
    let formattedNewDate = dateObj.toISOString().slice(0, 10);
    return formattedNewDate;
};

 
 // Function to process invite bonus for users
const processInviteBonus = async (req, res) => {
    try {
        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (!process.length) {
            return res.status(404).json({
                message: 'No active process found',
                status: false
            });
        }

        let Pdate = process[0].date;
        let Pid = process[0].id;

        // Get all users who have made referrals
        const [users] = await connection.query(`
            SELECT DISTINCT u.id, u.phone, u.code
            FROM users u
            WHERE u.status = 1
            AND EXISTS (
                SELECT 1 FROM users ref
                WHERE ref.invite = u.code
                AND ref.phone IN (
                    SELECT phone FROM recharge
                    WHERE status = '1' AND money > 300
                )
            )
        `);

        for (const user of users) {
            // Count total referrals with deposits > 300 INR
            const [totalCounts] = await connection.query(`
                SELECT COUNT(*) as total
                FROM recharge
                WHERE status = '1'
                AND money > 300
                AND phone IN (SELECT phone FROM users WHERE invite = ?)
            `, [user.code]);

            const totalReferrals = Number(totalCounts[0].total);

            if (totalReferrals > 0) {
                // Get invitation bonus configurations from database
                const [bonuses] = await connection.query(`
                    SELECT id, threshold, amount, description
                    FROM invite_bonus
                    WHERE threshold IS NOT NULL AND amount IS NOT NULL
                    ORDER BY threshold ASC
                `);

                // Check which bonuses the user is eligible for
                for (const bonus of bonuses) {
                    if (totalReferrals >= bonus.threshold) {
                        // Check if bonus already claimed
                        const [existingBonus] = await connection.query(`
                            SELECT 1 FROM inc_invite_bonus
                            WHERE phone = ? AND bonus_id = ?
                        `, [user.phone, bonus.id]);

                        if (existingBonus.length === 0) {
                            // Credit invitation bonus
                            await connection.query(`
                                INSERT INTO inc_invite_bonus (process_id, bonus_id, phone, amount, date_time)
                                VALUES (?, ?, ?, ?, ?)
                            `, [Pid, bonus.id, user.phone, bonus.amount, new Date()]);

                            // Update user's balance
                            await connection.query(`
                                UPDATE users SET money = money + ?, total_money = total_money + ?
                                WHERE phone = ?
                            `, [bonus.amount, bonus.amount, user.phone]);

                            console.log(`Invitation bonus ₹${bonus.amount} credited to ${user.phone} for ${totalReferrals} referrals (${bonus.description})`);
                        }
                    }
                }
            }
        }

        return res.status(200).json({
            message: 'Invite bonus processing completed successfully',
            status: true
        });
    } catch (error) {
        console.error('Error processing invite bonus:', error.message);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
};

const rechargeSalaryIncome = async(req, res) => {

  try {

        const [process] = await connection.query(`SELECT id, date FROM tbl_process  WHERE status = 'N'`);
        let Pdate = process[0].date;
        let Pid   = process[0].id;
        // Query to fetch users with id > 1 and group by invite
        const [rows] = await connection.query('SELECT * FROM `users` WHERE `today` BETWEEN DATE_SUB(NOW(), INTERVAL 48 HOUR) AND NOW() AND phone IN ( SELECT phone FROM recharge WHERE date_time BETWEEN DATE_SUB(users.today, INTERVAL 24 HOUR) AND DATE_ADD(users.today, INTERVAL 24 HOUR) GROUP BY phone  )');
        // Iterate over the result set and print each id value
        for (const row of rows) {


          let user_id   = row.id;
          let user_code = row.code;
          let user_phone = row.phone;
          let date_time = row.today;


    const [rows2] = await connection.query(`SELECT count(*) as total FROM users WHERE invite = ?  AND today BETWEEN DATE_SUB(NOW(), INTERVAL 48 HOUR) AND NOW() AND phone IN ( SELECT phone FROM recharge WHERE date_time BETWEEN DATE_SUB(users.today, INTERVAL 24 HOUR) AND DATE_ADD(users.today, INTERVAL 24 HOUR) GROUP BY phone HAVING SUM(money) >= 1000 ) `, [user_code]);


    if (rows2[0].total >= 2) {
         const [existingPhones] = await connection.query(` SELECT phone  FROM inc_recharge_salary  WHERE phone = ?  `, [user_phone]);

    if (existingPhones.length === 0) {

        const sql = "INSERT INTO inc_recharge_salary SET process_id = ? , phone = ?,amount = ?,date_time = ? ";
        await connection.execute(sql, [Pid, user_phone, 1000,Pdate   ]);


         let totals = parseInt(1000);

        const sql22 = 'UPDATE `users` SET `money` = money + ? , `temp_money` = temp_money + ? WHERE `phone` = ?';
        await connection.execute(sql22, [totals,totals, user_phone]);


        // update credit amount in wallet
    }
    }

        }

        // // Send a success response
        return res.status(200).json({
            message:   'recharge Salary Income successfully',
            status: true
        });
    } catch (error) {
        console.error('Error fetchingrecharge Salary Income ', error.message);
        // Send an error response
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }

} // Done
 
  
const setupDailySalachiever = async(req, res) => {
    try {
        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (!process.length) {
            return res.status(404).json({
                message: 'No process found with status N',
                status: false
            });
        }
        
        let Pdate = getDateFormat(process[0].date);
        let Pid = process[0].id;

        const updateUserQuerys = 'UPDATE users SET total_recharge = 0, today_bet = 0 WHERE 1';
        await connection.execute(updateUserQuerys);

        const [rows] = await connection.query('SELECT * FROM users WHERE 1');

        for (const row of rows) {
            let user_id = row.id;
            let phone = row.phone;
            let balance = row.money !== null ? parseFloat(row.money) : 0;

            const [que1] = await connection.query('SELECT SUM(amount) as total FROM minutes_1 WHERE phone = ? and today LIKE ?', [phone, `${Pdate}%`]);
            let totalPlay = que1.length > 0 && que1[0].total !== null ? parseFloat(que1[0].total) : 0;

            const [que2] = await connection.query("SELECT SUM(money) as total FROM recharge WHERE phone = ? AND status = '1' AND date(date_time) = ?", [phone, `${Pdate}%`]);
            let totalRecharge = que2.length > 0 && que2[0].total !== null ? parseFloat(que2[0].total) : 0;

            if (balance > 0 || totalPlay > 0 || totalRecharge > 0) {
                const sql = "INSERT INTO user_statics SET process_id = ?, phone = ?, balance = ?, total_bet = ?, total_recharge = ?, date = ?";
                await connection.execute(sql, [Pid, phone, balance.toFixed(2), totalPlay.toFixed(2), totalRecharge.toFixed(2), Pdate]);
            }

            const [que3] = await connection.query("SELECT SUM(money) as total FROM recharge WHERE phone = ? AND status = '1'", [phone]);
            let totalRechargeAll = que3.length > 0 && que3[0].total !== null ? parseFloat(que3[0].total) : 0;

            const updateUserQueries = 'UPDATE users SET total_recharge = ?, today_bet = ? WHERE phone = ?';
            await connection.execute(updateUserQueries, [totalRechargeAll, totalPlay, phone]);
        }

        return res.status(200).json({
            message: Pdate,
            status: true
        });
    } catch (error) {
        console.error('Error processing daily salary achiever:', error.message);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
}

const dailySalaryIncome = async (req, res) => {
    try {
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (!process.length) {
            const message = 'No process found with status N';
            console.log(message);
            if (res) {
                return res.status(404).json({
                    message: message,
                    status: false
                });
            }
            return;
        }

        let Pdate = getDateFormat(process[0].date);
        let Pid = process[0].id;

        // Get all users for daily salary calculation
        const [rows] = await connection.query('SELECT * FROM `users` WHERE `status` = 1');
        if (rows.length === 0) {
            const message = 'No users found';
            console.log(message);
            if (res) {
                return res.status(200).json({
                    message: message,
                    status: true
                });
            }
            return;
        }

        for (const row of rows) {
            let uid = row.id;
            let phone = row.phone;
            console.log(phone);
            let total_recharge = row.total_recharge !== null ? parseFloat(row.total_recharge) : 0;

            // Count active direct referrals with minimum total recharge
            const [que1] = await connection.query(`
                SELECT COUNT(*) as total
                FROM users
                WHERE parent_id = ?
                AND status = 1
                AND total_recharge >= 1000
            `, [uid]);

            let activePlayers = que1.length > 0 && que1[0].total !== null ? parseFloat(que1[0].total) : 0;
            console.log(que1)
            let level = 0;
            let amount = 0;
            let minRecharge = 0;

            // Daily Salary Income as per specifications
            if (activePlayers >= 2560 ) {
                level = 10;
                amount = 256000;
                minRecharge = 2560000;
            } else if (activePlayers >= 1280 ) {
                level = 9;
                amount = 128000;
                minRecharge = 1280000;
            } else if (activePlayers >= 640 ) {
                level = 8;
                amount = 64000;
                minRecharge = 640000;
            } else if (activePlayers >= 320 ) {
                level = 7;
                amount = 32000;
                minRecharge = 320000;
            } else if (activePlayers >= 160 ) {
                level = 6;
                amount = 16000;
                minRecharge = 160000;
            } else if (activePlayers >= 80 ) {
                level = 5;
                amount = 8000;
                minRecharge = 80000;
            } else if (activePlayers >= 40 ) {
                level = 4;
                amount = 4000;
                minRecharge = 40000;
            } else if (activePlayers >= 20 ) {
                level = 3;
                amount = 2000;
                minRecharge = 20000;
            } else if (activePlayers >= 10 ) {
                level = 2;
                amount = 1000;
                minRecharge = 10000;
            } else if (activePlayers >= 5 ) {
                level = 1;
                amount = 500;
                minRecharge = 5000;
                console.log("yha aya milna hai 500")
            }

            if (level > 0 && amount > 0) {
                const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
                await connection.execute(updateUserQuery, [amount, phone]);

                const insertSalaryQuery = 'INSERT INTO salary (process_id, phone, amount, type, level, active_players, min_recharge, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                await connection.execute(insertSalaryQuery, [Pid, phone, amount, 'daily', level, activePlayers, minRecharge, formattedTime]);

                console.log(`Daily salary ₹${amount} credited to ${phone} (Level ${level}, ${activePlayers} active players, ₹${total_recharge} total recharge)`);
            }
        }

        const message = `Daily salary processing completed for ${rows.length} eligible users`;
        console.log(message);

        if (res) {
            return res.status(200).json({
                message: message,
                status: true
            });
        }
        return;
    } catch (error) {
        console.error('Error processing daily salary income:', error.message);
        if (res) {
            return res.status(500).json({
                message: error.message,
                error: error,
                status: false
            });
        }
        throw error;
    }
};

// Weekly Salary Income Function - Fixed for continuous achievement conditions
const weeklySalaryIncome = async (req, res) => {
    try {
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (!process.length) {
            const message = 'No process found with status N';
            console.log(message);
            if (res) {
                return res.status(404).json({
                    message: message,
                    status: false
                });
            }
            return;
        }

        let Pdate = getDateFormat(process[0].date);
        let Pid = process[0].id;

        // Get all users for weekly salary calculation
        const [rows] = await connection.query('SELECT * FROM `users` WHERE `status` = 1');
        if (rows.length === 0) {
            const message = 'No users found';
            console.log(message);
            if (res) {
                return res.status(200).json({
                    message: message,
                    status: true
                });
            }
            return;
        }

        // Weekly salary levels with minimum daily team recharge requirements
        const weeklyLevels = [
            { activePlayers: 5, minDailyRecharge: 5000/7, weeklyIncome: 1000, level: 1 },
            { activePlayers: 10, minDailyRecharge: 10000/7, weeklyIncome: 2000, level: 2 },
            { activePlayers: 20, minDailyRecharge: 20000/7, weeklyIncome: 4000, level: 3 },
            { activePlayers: 40, minDailyRecharge: 40000/7, weeklyIncome: 8000, level: 4 },
            { activePlayers: 80, minDailyRecharge: 80000/7, weeklyIncome: 16000, level: 5 },
            { activePlayers: 160, minDailyRecharge: 160000/7, weeklyIncome: 32000, level: 6 },
            { activePlayers: 320, minDailyRecharge: 320000/7, weeklyIncome: 64000, level: 7 },
            { activePlayers: 640, minDailyRecharge: 640000/7, weeklyIncome: 128000, level: 8 },
            { activePlayers: 1280, minDailyRecharge: 1280000/7, weeklyIncome: 256000, level: 9 },
            { activePlayers: 2560, minDailyRecharge: 2560000/7, weeklyIncome: 512000, level: 10 }
        ];

        for (const row of rows) {
            let uid = row.uid;
            let phone = row.phone;

            // Count current active direct referrals
            const [activePlayersQuery] = await connection.query(`
                SELECT COUNT(*) as total
                FROM users
                WHERE invite = ?
                AND status = 1
                AND total_recharge >= 1000
            `, [row.code]);

            let currentActivePlayers = activePlayersQuery.length > 0 && activePlayersQuery[0].total !== null ? parseFloat(activePlayersQuery[0].total) : 0;

            // Check for continuous 7-day achievement
            let qualifiedLevel = null;

            for (let i = weeklyLevels.length - 1; i >= 0; i--) {
                const levelReq = weeklyLevels[i];

                if (currentActivePlayers >= levelReq.activePlayers) {
                    // Get team recharge for last 7 days in one query
                    const [teamRechargeData] = await connection.query(`
                        SELECT DATE(r.today) as recharge_date, COALESCE(SUM(r.money), 0) as daily_total
                        FROM recharge r
                        INNER JOIN users u ON r.phone = u.phone
                        WHERE u.invite = ?
                        AND r.status = 1
                        AND DATE(r.today) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                        GROUP BY DATE(r.today)
                        ORDER BY recharge_date DESC
                    `, [row.code]);

                    // Check if all 7 consecutive days meet the requirement
                    let consecutiveDays = 0;
                    let allDaysQualified = true;

                    for (let day = 0; day < 7; day++) {
                        const checkDate = new Date();
                        checkDate.setDate(checkDate.getDate() - day);
                        const dateStr = checkDate.toISOString().split('T')[0];

                        const dayData = teamRechargeData.find(d => d.recharge_date === dateStr);
                        const dailyTotal = parseFloat(dayData?.daily_total || 0);

                        if (dailyTotal >= levelReq.minDailyRecharge) {
                            consecutiveDays++;
                        } else {
                            allDaysQualified = false;
                            break;
                        }
                    }

                    if (allDaysQualified && consecutiveDays === 7) {
                        qualifiedLevel = levelReq;
                        break;
                    }
                }
            }

            if (qualifiedLevel) {
                // Check if already received weekly salary for this week
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);

                const [existingSalary] = await connection.query(`
                    SELECT id FROM salary
                    WHERE phone = ?
                    AND type = 'weekly'
                    AND level = ?
                    AND DATE(time) >= ?
                `, [phone, qualifiedLevel.level, weekStart.toISOString().split('T')[0]]);

                if (existingSalary.length === 0) {
                    // Credit weekly salary
                    const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
                    await connection.execute(updateUserQuery, [qualifiedLevel.weeklyIncome, phone]);

                    const insertSalaryQuery = 'INSERT INTO salary (process_id, phone, amount, type, level, active_players, min_recharge, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                    await connection.execute(insertSalaryQuery, [
                        Pid,
                        phone,
                        qualifiedLevel.weeklyIncome,
                        'weekly',
                        qualifiedLevel.level,
                        currentActivePlayers,
                        qualifiedLevel.minDailyRecharge * 7,
                        formattedTime
                    ]);

                    console.log(`Weekly salary ₹${qualifiedLevel.weeklyIncome} credited to ${phone} (Level ${qualifiedLevel.level}, ${currentActivePlayers} active players, 7 consecutive days qualified)`);
                }
            }
        }

        const message = `Weekly salary processing completed for ${rows.length} users`;
        console.log(message);

        if (res) {
            return res.status(200).json({
                message: message,
                status: true
            });
        }
        return;
    } catch (error) {
        console.error('Error processing weekly salary income:', error.message);
        if (res) {
            return res.status(500).json({
                message: error.message,
                error: error,
                status: false
            });
        }
        throw error;
    }
};

// Monthly Salary Income Function - Fixed for continuous achievement conditions
const monthlySalaryIncome = async (req, res) => {
    try {
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (!process.length) {
            const message = 'No process found with status N';
            console.log(message);
            if (res) {
                return res.status(404).json({
                    message: message,
                    status: false
                });
            }
            return;
        }

        let Pdate = getDateFormat(process[0].date);
        let Pid = process[0].id;

        // Get all users for monthly salary calculation
        const [rows] = await connection.query('SELECT * FROM `users` WHERE `status` = 1');
        if (rows.length === 0) {
            const message = 'No users found';
            console.log(message);
            if (res) {
                return res.status(200).json({
                    message: message,
                    status: true
                });
            }
            return;
        }

        // Monthly salary levels with minimum daily team recharge requirements
        const monthlyLevels = [
            { activePlayers: 5, minDailyRecharge: 5000/30, monthlyIncome: 5000, level: 1 },
            { activePlayers: 10, minDailyRecharge: 10000/30, monthlyIncome: 10000, level: 2 },
            { activePlayers: 20, minDailyRecharge: 20000/30, monthlyIncome: 20000, level: 3 },
            { activePlayers: 40, minDailyRecharge: 40000/30, monthlyIncome: 40000, level: 4 },
            { activePlayers: 80, minDailyRecharge: 80000/30, monthlyIncome: 80000, level: 5 },
            { activePlayers: 160, minDailyRecharge: 160000/30, monthlyIncome: 160000, level: 6 },
            { activePlayers: 320, minDailyRecharge: 320000/30, monthlyIncome: 320000, level: 7 },
            { activePlayers: 640, minDailyRecharge: 640000/30, monthlyIncome: 640000, level: 8 },
            { activePlayers: 1280, minDailyRecharge: 1280000/30, monthlyIncome: 1280000, level: 9 },
            { activePlayers: 2560, minDailyRecharge: 2560000/30, monthlyIncome: 2560000, level: 10 }
        ];

        for (const row of rows) {
            let uid = row.uid;
            let phone = row.phone;

            // Count current active direct referrals
            const [activePlayersQuery] = await connection.query(`
                SELECT COUNT(*) as total
                FROM users
                WHERE invite = ?
                AND status = 1
                AND total_recharge >= 5000
            `, [row.code]);

            let currentActivePlayers = activePlayersQuery.length > 0 && activePlayersQuery[0].total !== null ? parseFloat(activePlayersQuery[0].total) : 0;

            // Check for continuous 30-day achievement
            let qualifiedLevel = null;

            for (let i = monthlyLevels.length - 1; i >= 0; i--) {
                const levelReq = monthlyLevels[i];

                if (currentActivePlayers >= levelReq.activePlayers) {
                    // Get team recharge for last 30 days in one query
                    const [teamRechargeData] = await connection.query(`
                        SELECT DATE(r.today) as recharge_date, COALESCE(SUM(r.money), 0) as daily_total
                        FROM recharge r
                        INNER JOIN users u ON r.phone = u.phone
                        WHERE u.invite = ?
                        AND r.status = 1
                        AND DATE(r.today) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                        GROUP BY DATE(r.today)
                        ORDER BY recharge_date DESC
                    `, [row.code]);

                    // Check if all 30 consecutive days meet the requirement
                    let consecutiveDays = 0;
                    let allDaysQualified = true;

                    for (let day = 0; day < 30; day++) {
                        const checkDate = new Date();
                        checkDate.setDate(checkDate.getDate() - day);
                        const dateStr = checkDate.toISOString().split('T')[0];

                        const dayData = teamRechargeData.find(d => d.recharge_date === dateStr);
                        const dailyTotal = parseFloat(dayData?.daily_total || 0);

                        if (dailyTotal >= levelReq.minDailyRecharge) {
                            consecutiveDays++;
                        } else {
                            allDaysQualified = false;
                            break;
                        }
                    }

                    if (allDaysQualified && consecutiveDays === 30) {
                        qualifiedLevel = levelReq;
                        break;
                    }
                }
            }

            if (qualifiedLevel) {
                // Check if already received monthly salary for this month
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                const [existingSalary] = await connection.query(`
                    SELECT id FROM salary
                    WHERE phone = ?
                    AND type = 'monthly'
                    AND level = ?
                    AND DATE(time) >= ?
                `, [phone, qualifiedLevel.level, monthStart.toISOString().split('T')[0]]);

                if (existingSalary.length === 0) {
                    // Credit monthly salary
                    const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
                    await connection.execute(updateUserQuery, [qualifiedLevel.monthlyIncome, phone]);

                    const insertSalaryQuery = 'INSERT INTO salary (process_id, phone, amount, type, level, active_players, min_recharge, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                    await connection.execute(insertSalaryQuery, [
                        Pid,
                        phone,
                        qualifiedLevel.monthlyIncome,
                        'monthly',
                        qualifiedLevel.level,
                        currentActivePlayers,
                        qualifiedLevel.minDailyRecharge * 30,
                        formattedTime
                    ]);

                    console.log(`Monthly salary ₹${qualifiedLevel.monthlyIncome} credited to ${phone} (Level ${qualifiedLevel.level}, ${currentActivePlayers} active players, 30 consecutive days qualified)`);
                }
            }
        }

        const message = `Monthly salary processing completed for ${rows.length} users`;
        console.log(message);

        if (res) {
            return res.status(200).json({
                message: message,
                status: true
            });
        }
        return;
    } catch (error) {
        console.error('Error processing monthly salary income:', error.message);
        if (res) {
            return res.status(500).json({
                message: error.message,
                error: error,
                status: false
            });
        }
        throw error;
    }
};





 // Query to fetch users with id > 1 and group by invite
        // const [rows] = await connection.query('SELECT u1.id as uid , u.* FROM `user_statics` as u LEFT JOIN users as u1 ON u.phone = u1.phone WHERE u.process_id =  ?  AND (u.balance + u.total_bet ) >= 1000 AND u.total_bet >= 500 ' , [Pid]);
        // // Iterate over the result set and print each id value
        // for (const row of rows) {
        //   let uid            = row.uid;
        //   let phone          = row.phone;
        //   let balance        = row.balance;
        //   let total_bet      = row.total_bet;
        //   let total_recharge = row.total_recharge;
          
          
          
          
          
        // //   const [que1] = await connection.query('SELECT COUNT(*) as total FROM `users` WHERE parent_id = ? AND phone in (SELECT phone FROM `user_statics` WHERE process_id = ? AND (balance + total_bet ) >= 1000 AND total_bet >= 500)',[uid,Pid]);
        // //   let totalDirect = que1.length > 0 && que1[0].total !== null ? parseFloat(que1[0].total) : 0;
 
        // //   if(totalDirect >= 5  )
        // //   {
        // //         const updateUserQuery = 'UPDATE `users` SET `money` = `money` +  400  WHERE phone = ?';
        // //         await connection.execute(updateUserQuery, [  user.phone]);    
        // //         const insertSalaryQuery = 'INSERT INTO salary  (process_id , phone, amount, type, time) VALUES (?,?, ?, ?, ?)';
        // //         await connection.execute(insertSalaryQuery, [Pid,phone, '400', 'daily', formattedTime]);
        // //   }
          

      
          
        // }

// 

        // const [process] = await connection.query(`SELECT id, date FROM tbl_process  WHERE status = 'N' `); // 
        
        // let Pid   = process[0].id;
        // // If user exists, update the 'users' table
        // const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
        // await connection.execute(updateUserQuery, [amount, user.phone]);
        
        
        // // Insert record into 'salary' table
        // const insertSalaryQuery = 'INSERT INTO salary (process_id , phone, amount, type, time) VALUES (?,?, ?, ?, ?)';
        // await connection.execute(insertSalaryQuery, [Pid,user.phone, amount, type, formattedTime]);
 
 
 
 const DailyTradeLevelIncome = async (req, res) => {
  try {
    const [process] = await connection.query(
      `SELECT id, date FROM tbl_process WHERE  status ='N'`
    );  // status = 'N'

    if (process.length === 0) {
      return res.status(400).json({ message: 'No active process found.', status: false });
    }

    const Pdate = process[0].date;
    const Pid = process[0].id;
    const formattedNewDate = getDateFormat(Pdate);

    // Fetch trade levels
    const tradeLevelsQuery = `
      SELECT \`name\`, \`value\`
      FROM \`tbl_config\`
      WHERE \`name\` LIKE 'trade_level_%';
    `;
    const [tradeLevels] = await connection.query(tradeLevelsQuery);
    const tradeMap = Object.fromEntries(tradeLevels.map((item) => [item.name, parseFloat(item.value) || 0]));

    // Fetch users from minutes_1 - fixed date query
    const sqlSelect = `
      SELECT u.id as uid, m.*
      FROM \`minutes_1\` as m
      LEFT JOIN users as u ON u.phone = m.phone
      WHERE DATE(m.today) = ?;
    `;
    const [rows] = await connection.query(sqlSelect, [formattedNewDate]);



//   return res.status(200).json({ message:rows, status: false });
     
    
    
    for (const row of rows) {
      const { id: betId, uid: userId, phone, amount } = row;

      // Fetch user's hierarchy
      const UserListQ = `
        WITH RECURSIVE hierarchy AS (
          SELECT id, parent_id, phone, code, invite, money, temp_money
          FROM users
          WHERE id = ?
          UNION ALL
          SELECT u.id, u.parent_id, u.phone, u.code, u.invite, u.money, u.temp_money
          FROM users u
          INNER JOIN hierarchy h ON u.id = h.parent_id
        )
        SELECT id, parent_id, phone, code, invite, money, temp_money FROM hierarchy;
      `;
      const [UserList] = await connection.query(UserListQ, [userId]);

      for (let i = 1; i <= Math.min(UserList.length, 21); i++) {
        const user = UserList[i-1];
        const returns = tradeMap[`trade_level_${i-1}`] || 0;
        if(i > 1 )
        {
        if (returns > 0) {
          const netAmount = parseFloat((amount * returns) / 100).toFixed(4);
    //          return res.status(200).json({
    //   message: UserList,
    //   status: true,
    // });
 
          // Fetch recharge information
        //   const [existRecharge] = await connection.query(
        //     `SELECT SUM(money) AS totalRecharge FROM recharge WHERE phone = ? AND status = '1'`,
        //     [user.phone]
        //   );
        //   const totalRecharge = parseFloat(existRecharge[0]?.totalRecharge || 0);

        //   const [existAdminRecharge] = await connection.query(
        //     `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Add'`,
        //     [user.phone]
        //   );
        //   const totalAdminRecharge = parseFloat(existAdminRecharge[0]?.total || 0);

        //   const [existAminusRecharge] = await connection.query(
        //     `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Minus'`,
        //     [user.phone]
        //   );
        //   const totalAmRecharge = parseFloat(existAminusRecharge[0]?.total || 0);

        //   const netRecharge = totalRecharge + totalAdminRecharge - totalAmRecharge;

          // Conditional check for netRecharge (example condition used here)  
        //   netRecharge >= 0
          if (true) {
            // Insert data into inc_level
            const insertQuery = `
              INSERT INTO inc_level (type , process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?);
            `;
            await connection.execute(insertQuery, [ 'Win',
              Pid,
              betId,
              user.phone,
              phone,
              i-1,
              amount,
              returns,
              netAmount,
              formattedNewDate,
            ]);
   
            
            const updatedMoney = parseFloat(user.money) + parseFloat(netAmount);
            const updatedTempMoney = parseFloat(user.temp_money) + parseFloat(netAmount);

            const updateUserQuery = `
              UPDATE users
              SET money = ?, temp_money = ?
              WHERE phone = ?;
            `;
            await connection.execute(updateUserQuery, [updatedMoney, updatedTempMoney, user.phone]);
          }
        }
        }
      }
    }

    return res.status(200).json({
      message: 'Daily trade level income processed successfully.',
      status: true,
    });
  } catch (error) {
    console.error('Error processing daily trade level income:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: false,
    });
  }
};  // wingo
 const DailyTradeLevelIncomeTrx = async (req, res) => {
  try {
    const [process] = await connection.query(
      `SELECT id, date FROM tbl_process WHERE status = 'N'`
    );  // status = 'N'

    if (process.length === 0) {
      return res.status(400).json({ message: 'No active process found.', status: false });
    }

    const Pdate = process[0].date;
    const Pid = process[0].id;
    const formattedNewDate = getDateFormat(Pdate);

    // Fetch trade levels
    const tradeLevelsQuery = `
      SELECT \`name\`, \`value\`
      FROM \`tbl_config\`
      WHERE \`name\` LIKE 'trade_level_%';
    `;
    const [tradeLevels] = await connection.query(tradeLevelsQuery);
    const tradeMap = Object.fromEntries(tradeLevels.map((item) => [item.name, parseFloat(item.value) || 0]));

    // Fetch users from trx_result - fixed date query
      const trxQuery = `
      SELECT u.id AS uid, m.*
      FROM trx_result AS m
      LEFT JOIN users AS u ON u.phone = m.phone
      WHERE DATE(m.today) = ?
    `;
    const [rows] = await connection.query(trxQuery, [formattedNewDate]);

    // Process each transaction
    for (const row of rows) {
      const { id: betId, uid: userId, phone, amount } = row;

      // Fetch user's hierarchy
      const UserListQ = `
        WITH RECURSIVE hierarchy AS (
          SELECT id, parent_id, phone, code, invite, money, temp_money
          FROM users
          WHERE id = ?
          UNION ALL
          SELECT u.id, u.parent_id, u.phone, u.code, u.invite, u.money, u.temp_money
          FROM users u
          INNER JOIN hierarchy h ON u.id = h.parent_id
        )
        SELECT id, parent_id, phone, code, invite, money, temp_money FROM hierarchy;
      `;
      const [UserList] = await connection.query(UserListQ, [userId]);

      for (let i = 1; i <= Math.min(UserList.length, 21); i++) {
        const user = UserList[i-1];
        const returns = tradeMap[`trade_level_${i-1}`] || 0;
        if(i > 1 )
        {
        if (returns > 0) {
          const netAmount = parseFloat((amount * returns) / 100).toFixed(4);
    //          return res.status(200).json({
    //   message: UserList,
    //   status: true,
    // });
 
          // Fetch recharge information
        //   const [existRecharge] = await connection.query(
        //     `SELECT SUM(money) AS totalRecharge FROM recharge WHERE phone = ? AND status = '1'`,
        //     [user.phone]
        //   );
        //   const totalRecharge = parseFloat(existRecharge[0]?.totalRecharge || 0);

        //   const [existAdminRecharge] = await connection.query(
        //     `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Add'`,
        //     [user.phone]
        //   );
        //   const totalAdminRecharge = parseFloat(existAdminRecharge[0]?.total || 0);

        //   const [existAminusRecharge] = await connection.query(
        //     `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Minus'`,
        //     [user.phone]
        //   );
        //   const totalAmRecharge = parseFloat(existAminusRecharge[0]?.total || 0);

        //   const netRecharge = totalRecharge + totalAdminRecharge - totalAmRecharge;

          // Conditional check for netRecharge (example condition used here)  
        //   netRecharge >= 0
          if (true) {
            // Insert data into inc_level
            const insertQuery = `
              INSERT INTO inc_level (type , process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?);
            `;
            await connection.execute(insertQuery, [ 'Trx',
              Pid,
              betId,
              user.phone,
              phone,
              i-1,
              amount,
              returns,
              netAmount,
              formattedNewDate,
            ]);
   
            
            const updatedMoney = parseFloat(user.money) + parseFloat(netAmount);
            const updatedTempMoney = parseFloat(user.temp_money) + parseFloat(netAmount);

            const updateUserQuery = `
              UPDATE users
              SET money = ?, temp_money = ?
              WHERE phone = ?;
            `;
            await connection.execute(updateUserQuery, [updatedMoney, updatedTempMoney, user.phone]);
          }
        }
        }
      }
    }

    return res.status(200).json({
      message: 'Daily trade level income processed successfully.',
      status: true,
    });
  } catch (error) {
    console.error('Error processing daily trade level income:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: false,
    });
  }
};  // TRX
 const DailyTradeLevelIncome__  = async(req, res) => {
 
  try {
        const [process] = await connection.query(`SELECT id, date FROM tbl_process  WHERE status = 'N'`);
        let Pdate = process[0].date;
        let Pid   = process[0].id;
        let formattedNewDate = getDateFormat(Pdate);
 
 
 
 
 
 
 
 const tradeLevelsQuery = `
    SELECT \`name\`, \`value\` 
    FROM \`tbl_config\` 
    WHERE \`name\` IN (
        'trade_level_1', 'trade_level_2', 'trade_level_3', 'trade_level_4', 'trade_level_5',
        'trade_level_6', 'trade_level_7', 'trade_level_8', 'trade_level_9', 'trade_level_10',
        'trade_level_11', 'trade_level_12', 'trade_level_13', 'trade_level_14', 'trade_level_15',
        'trade_level_16', 'trade_level_17', 'trade_level_18', 'trade_level_19', 'trade_level_20'
    );
`;
const [tradeLevels] = await connection.query(tradeLevelsQuery);
const tradeMap = Object.fromEntries(tradeLevels.map(item => [item.name, item.value || '0']));

 
let tradeLevel_1  = tradeMap[`trade_level_1`];
let tradeLevel_2  = tradeMap[`trade_level_2`];
let tradeLevel_3  = tradeMap[`trade_level_3`];
let tradeLevel_4  = tradeMap[`trade_level_4`];
let tradeLevel_5  = tradeMap[`trade_level_5`];
let tradeLevel_6  = tradeMap[`trade_level_6`];
let tradeLevel_7  = tradeMap[`trade_level_7`];
let tradeLevel_8  = tradeMap[`trade_level_8`];
let tradeLevel_9  = tradeMap[`trade_level_9`];
let tradeLevel_10  = tradeMap[`trade_level_10`];
let tradeLevel_11  = tradeMap[`trade_level_11`];
let tradeLevel_12  = tradeMap[`trade_level_12`];
let tradeLevel_13  = tradeMap[`trade_level_13`];
let tradeLevel_14  = tradeMap[`trade_level_14`];
let tradeLevel_15  = tradeMap[`trade_level_15`];
let tradeLevel_16  = tradeMap[`trade_level_16`];
let tradeLevel_17  = tradeMap[`trade_level_17`];
let tradeLevel_18  = tradeMap[`trade_level_18`];
let tradeLevel_19  = tradeMap[`trade_level_19`];
let tradeLevel_20  = tradeMap[`trade_level_20`];
 


 
 
 
 
        
        
        const sqlSelect = "SELECT u.id as uid , m.* FROM `minutes_1` as m LEFT JOIN users as u on u.phone = m.phone  WHERE m.today LIKE ?";
        const [rows]    = await connection.query(sqlSelect, [`${formattedNewDate}%`]);
        
        for (const row of rows) {
          
          let id        = row.id;
          let user_id   = row.uid;
          let user_code = row.code;
          let phone     = row.phone;
          let amount    = row.amount;
          
          const UserListQ = "WITH RECURSIVE hierarchy AS ( SELECT id, parent_id, phone, code, invite,money,temp_money FROM users WHERE id = ? UNION ALL SELECT u.id, u.parent_id, u.phone, u.code, u.invite,u.money,u.temp_money FROM users u INNER JOIN hierarchy h ON u.id = h.parent_id ) SELECT id, parent_id, phone, code, invite,money,temp_money FROM hierarchy";
          const [UserList] = await connection.query(UserListQ, [user_id]);
         for (let i = 0; i < Math.min(UserList.length, 21); i++) {
         const user = UserList[i];
         if(i > 0 )
         {
             
             
                // tradeLevel_1
                // tradeLevel_2
                // tradeLevel_3
                // tradeLevel_4
                // tradeLevel_5
                // tradeLevel_6
                // tradeLevel_7
                // tradeLevel_8
                // tradeLevel_9
                // tradeLevel_10
                // tradeLevel_11
                // tradeLevel_12
                // tradeLevel_13
                // tradeLevel_14
                // tradeLevel_15
                // tradeLevel_16
                // tradeLevel_17
                // tradeLevel_18
                // tradeLevel_19
                // tradeLevel_20
             
           let returns = 0 ;
           if(i == 1 )
           {
              returns = tradeLevel_1 ;
           }
           if(i == 2 )
           {
              returns = tradeLevel_2;
           }
           if(i == 3 )
           {
             returns = tradeLevel_3;
           }
           if(i == 4 )
           {
            returns = tradeLevel_4;
           }
           if(i == 5 )
           {
            returns = tradeLevel_5;
           }
           if(i == 6 )
           {
            returns = tradeLevel_6;
           }
           if(i == 7 )
           {
            returns = tradeLevel_7;
           }
           if(i == 8 )
           {
            returns = tradeLevel_8;
           }
           if(i == 9 )
           {
            returns = tradeLevel_9;
           }
           if(i == 10 )
           {
            returns = tradeLevel_10;
           }
           
           if(i == 11 )
           {
            returns = tradeLevel_11;
           }
           if(i == 12 )
           {
            returns = tradeLevel_12;
           }
           if(i == 13 )
           {
            returns = tradeLevel_13;
           }
           if(i == 14 )
           {
            returns = tradeLevel_14;
           }
           if(i == 15 )
           {
            returns = tradeLevel_15;
           }
           if(i == 16 )
           {
            returns = tradeLevel_16;
           }
           if(i == 17 )
           {
            returns = tradeLevel_17;
           }
           if(i == 18 )
           {
            returns = tradeLevel_18;
           }
           if(i == 19 )
           {
            returns = tradeLevel_19;
           }
           if(i == 20 )
           {
            returns = tradeLevel_20;
           }
           
           
           
           
           
           
           
           
           
           if(returns > 0 )
           {
// 1 st Level 0.50%
// 2 nd Level 0.65% 
// 3rd Level 0.70% 
// 4th Level 0.75% 
// 5th Level 0.80% 
// 6th To 8th Level 0.85% 
// 9th To 10th Level 1.00%
          
           let netAmount = parseFloat(amount * returns / 100).toFixed(4); 
          
          
        //     const [existRecharge] = await connection.query( `SELECT SUM(money) AS totalRecharge FROM recharge WHERE phone = ? AND status = '1'`,   [user.phone]);
        //     let totalRecharge = existRecharge.length > 0 && existRecharge[0].totalRecharge !== null ? existRecharge[0].totalRecharge : 0;
            
            
 
            
            
        //     const [existAdminRecharge] = await connection.query( `SELECT SUM(amount) as total  FROM admin_txn  WHERE  phone =  ?  AND type = 'Add'`,   [user.phone]);
        //     let totalAdminRecharge = existAdminRecharge.length > 0 && existAdminRecharge[0].total !== null ? existAdminRecharge[0].total : 0;
            
        //     const [existAminusRecharge] = await connection.query( `SELECT SUM(amount) as total  FROM admin_txn  WHERE  phone =  ?  AND type = 'Minus'`,   [user.phone]);
        //     let totalAmRecharge = existAminusRecharge.length > 0 && existAminusRecharge[0].total !== null ? existAminusRecharge[0].total : 0;
            
            
            
        //     const [existBet] = await connection.query( `SELECT SUM(amount) as totalBet FROM minutes_1 WHERE today LIKE  ?  AND phone = ?`,   [`${formattedNewDate}%` ,user.phone]);
        //     let totalBet = existBet.length > 0 && existBet[0].totalBet !== null ? existBet[0].totalBet : 0;
            
        //     let TotalAdmin = totalAdminRecharge - totalAmRecharge
        //     totalRecharge = totalRecharge + TotalAdmin ; 
        //   // add one more dily bet 10 and 100 Recharge
          
        //   if(totalRecharge >= 100 && existBet >= 10 )
        //   {
        
        
        
        
        
        
        
        
        
const [existRecharge] = await connection.query(`SELECT SUM(money) AS totalRecharge FROM recharge WHERE phone = ? AND status = '1'`,    [user.phone]);
let totalRecharge = existRecharge.length > 0 && existRecharge[0].totalRecharge !== null ? parseFloat(existRecharge[0].totalRecharge) : 0;

const [existAdminRecharge] = await connection.query(    `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Add'`,    [user.phone]);
let totalAdminRecharge = existAdminRecharge.length > 0 && existAdminRecharge[0].total !== null ? parseFloat(existAdminRecharge[0].total) : 0;

const [existAminusRecharge] = await connection.query(    `SELECT SUM(amount) as total FROM admin_txn WHERE phone = ? AND type = 'Minus'`,    [user.phone]);
let totalAmRecharge = existAminusRecharge.length > 0 && existAminusRecharge[0].total !== null ? parseFloat(existAminusRecharge[0].total) : 0;

// const [existBet] = await connection.query(    `SELECT SUM(amount) as totalBet FROM minutes_1 WHERE today LIKE ? AND phone = ?`,    [`${formattedNewDate}%`, user.phone]);
// let totalBet = existBet.length > 0 && existBet[0].totalBet !== null ? parseFloat(existBet[0].totalBet) : 0;

let totalAdmin = totalAdminRecharge - totalAmRecharge;
totalRecharge = totalRecharge + totalAdmin;

// add one more condition for daily bet 10 and 100 Recharge  && totalBet >= 10
if (totalRecharge >= 100 ) {
        
        
        
        
        
           const sql = "INSERT INTO inc_level SET process_id = ?,bet_id = ?,user_id = ?,from_id = ?,level = ?, amount = ?, returns = ?,net_amount = ?,date = ? ";
           await connection.execute(sql, [Pid,id, user.phone, phone, i, amount, returns, netAmount , formattedNewDate]);
           
           let totals = (parseFloat(user.money)  +  parseFloat(netAmount)).toFixed(4);
           let tempMoney = (parseFloat(user.temp_money)  +  parseFloat(netAmount)).toFixed(4);
           
           const sql22 = 'UPDATE `users` SET `money` = ? WHERE `phone` = ? '; //  , temp_money =  ? tempMoney
           await connection.execute(sql22, [totals, user.phone]);
           }

           

         }
         }
         // id	process_id	user_id	from_id	level	amount	returns	net_amount	date	date_time	

         
         // Process the user record here
         }
           
         
//     const [rows2] = await connection.query(`
//     SELECT COUNT(*) as count 
//     FROM users 
//     WHERE today BETWEEN DATE_SUB(NOW(), INTERVAL 30 HOUR) AND NOW()
//     AND id IN (
//         SELECT user_id 
//         FROM recharge 
//         WHERE date BETWEEN DATE_SUB(users.today, INTERVAL 30 HOUR) AND DATE_ADD(users.today, INTERVAL 30 HOUR)
//     )
// `);
  
     // const sql = "INSERT INTO users SET id_user = ?,phone = ?,name_user = ?,password = ?, plain_password = ?, money = ?,code = ?,invite = ?,ctv = ?,veri = ?,otp = ?,ip_address = ?,status = ?,time = ?";
     // await connection.execute(sql, [id_user, username, name_user, md5(pwd), pwd, 0, code, invitecode, ctv, 1, otp2, ip, 1, time]);
  
          
        }
 
        // Send a success response
        return res.status(200).json({
            message:   'User IDs printed successfully',
            status: true,
            // data: rows
        });
        
           // let htmlRows = rows.map(row => `<tr><td>${row.id}</td><td>${row.code}</td><td>${row.invite}</td></tr>`).join('');
           //  let htmlResponse = `
           //      <!DOCTYPE html>
           //      <html>
           //      <head>
           //          <title>User IDs</title>
           //      </head>
           //      <body>
           //          <h1>User IDs printed successfully</h1>
           //          <table border="1">
           //              <tr>
           //                  <th>ID</th>
           //                  <th>Today</th>
           //                  <th>Invite</th>
           //              </tr>
           //              ${htmlRows}
           //          </table>
           //      </body>
           //      </html>
           //  `;

           //  // Send the HTML response
           //  return res.status(200).send(htmlResponse);
    } catch (error) {
        console.error('Error fetching user IDs:', error.message);
        // Send an error response
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
 
}
 const setupBusinessStatics = async(req, res) => {

  try {
      
      
        const [process1] = await connection.query(`SELECT id, date FROM tbl_process  WHERE status = 'N'  `); // status = 'N'

        if (!process1 || process1.length === 0) {
            console.log('No active process found with status N');
            if (res) {
                return res.status(200).json({
                    message: 'No active process found',
                    status: false
                });
            }
            return { success: false, message: 'No active process found' };
        }

        let Pid1   =  parseFloat(process1[0].id) - 1 ;

        const [process] = await connection.query(`SELECT id, date FROM tbl_process  WHERE id =  ?   ` ,[Pid1]); // status = 'N'

        if (!process || process.length === 0) {
            console.log(`No process found with id ${Pid1}`);
            if (res) {
                return res.status(200).json({
                    message: 'Previous process not found',
                    status: false
                });
            }
            return { success: false, message: 'Previous process not found' };
        }

        let Pdate = getDateFormat(process[0].date);
        let Pid   = process[0].id;

        console.log(`Processing business statistics for Process ID: ${Pid}, Date: ${Pdate}`);
        
        
      
      
        // Fixed date queries - use proper date format without %
        const [que1] = await connection.query('SELECT SUM(money) as total FROM `recharge` WHERE DATE(date_time) = ? AND status = 1', [Pdate]);
        let totalRecharge = que1.length > 0 && que1[0].total !== null ? parseFloat(que1[0].total) : 0;

        const [que2] = await connection.query('SELECT SUM(amount) as total FROM `admin_txn` WHERE DATE(date_time) = ? AND type = "Add"', [Pdate]);
        let totalRechargeAdmin = que2.length > 0 && que2[0].total !== null ? parseFloat(que2[0].total) : 0;

        const [que3] = await connection.query('SELECT SUM(amount) as total, SUM(`get`) as win FROM `minutes_1` WHERE DATE(date_time) = ?', [Pdate]);
        let totalBet = que3.length > 0 && que3[0].total !== null ? parseFloat(que3[0].total) : 0;
        let totalWin = que3.length > 0 && que3[0].win !== null ? parseFloat(que3[0].win) : 0;
        
        const [que4] = await connection.query('SELECT SUM(amount) as total FROM `inc_recharge_salary` WHERE process_id = ?',[Pid]);
        let totalRechargeSalary = que4.length > 0 && que4[0].total !== null ? parseFloat(que4[0].total) : 0;
        
        const [que5] = await connection.query('SELECT SUM(net_amount) as total FROM `inc_level` WHERE process_id =  ?',[Pid]);
        let totalLevel = que5.length > 0 && que5[0].total !== null ? parseFloat(que5[0].total) : 0;
        
        const [que6] = await connection.query('SELECT SUM(net_amount) as total FROM `inc_direct` WHERE process_id = ?',[Pid]);
        let totalDirect = que6.length > 0 && que6[0].total !== null ? parseFloat(que6[0].total) : 0;
        
        const [que7] = await connection.query('SELECT SUM(amount) as total FROM `salary` WHERE DATE(date_time) = ?', [Pdate]);
        let totalSalary = que7.length > 0 && que7[0].total !== null ? parseFloat(que7[0].total) : 0;
  



 
						

          
          // Check if statistics already exist for this process
          const [existingStats] = await connection.query('SELECT id FROM business_statics WHERE process_id = ?', [Pid]);
          if (existingStats.length === 0) {
              const sql = "INSERT INTO business_statics SET process_id = ?, recharge = ?, admin_recharge = ?, total_bet = ?, total_win = ?, recharge_bonus = ?, total_direct = ?, total_level = ?, total_salary = ?, date_time = ?";
              await connection.execute(sql, [
                  Pid,
                  totalRecharge.toFixed(2),
                  totalRechargeAdmin.toFixed(2),
                  totalBet.toFixed(2),
                  totalWin.toFixed(2),
                  totalRechargeSalary.toFixed(2),
                  totalDirect.toFixed(2),
                  totalLevel.toFixed(2),
                  totalSalary.toFixed(2),
                  Pdate
              ]);
              console.log(`Business statistics created for process ${Pid} on ${Pdate}`);
              console.log(`Data: Recharge=${totalRecharge}, AdminRecharge=${totalRechargeAdmin}, Bet=${totalBet}, Win=${totalWin}, Salary=${totalSalary}`);
          } else {
              console.log(`Business statistics already exist for process ${Pid} on ${Pdate}`);
          }
			

        // Send a success response (only if called via API)
        if (res) {
            return res.status(200).json({
                message: Pdate,
                status: true
            });
        } else {
            console.log(`Business statistics completed for date: ${Pdate}`);
            return { success: true, date: Pdate };
        }
    } catch (error) {
        console.error('Error in business statistics:', error.message);
        // Send an error response (only if called via API)
        if (res) {
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error,
                status: false
            });
        } else {
            console.error('Business statistics failed:', error);
            return { success: false, error: error.message };
        }
    }
 
}

// DailyTradeLevelIncome
// DailyTradeLevelIncomeTrx
 const setupClosing = async (req, res) => {
  try {
    // Get the earliest pending process (lowest date with status N)
    const [process] = await connection.query(
      `SELECT id, date FROM tbl_process WHERE status = 'N' ORDER BY date ASC LIMIT 1`
    );

    if (process.length > 0) {
      let Pdate = process[0].date;
      let Pid = process[0].id;

      // Update the status to 'Y' for the selected process
      await connection.query("UPDATE tbl_process SET status = 'Y' WHERE id = ?", [Pid]);

      // Increment the date by one day
      let newDate = new Date(Pdate);
      newDate.setDate(newDate.getDate() + 1);
      let formattedDate = newDate.toISOString().slice(0, 10);

       await connection.query(
        `INSERT INTO tbl_process (date, status)
         SELECT DATE_ADD(?, INTERVAL 1 DAY), 'N'
         FROM DUAL
         WHERE NOT EXISTS (
            SELECT 1 FROM tbl_process WHERE date = DATE_ADD(?, INTERVAL 1 DAY)
         )`,
        [Pdate, Pdate]
      );

      await setupBusinessStatics();

      return res.status(200).json({
        message: "Closing successfully",
        status: true,
      });
    }
  } catch (error) {
    console.error("Error in setupClosing:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      status: false,
    });
  }
};

 const registerUser = async (req, res) => {
  
  try {
        // Query to fetch users with id > 1 and group by invite
        const [rows] = await connection.query('SELECT * FROM `users` WHERE code  =  "fBcop19833"  GROUP BY id');
        
        // Iterate over the result set and print each id value
        for (const row of rows) {
           console.log("User ID:", row.id);
         
           let now = new Date().getTime();
        
           let username       = randomNumber(5000000000, 6000000000);
           let pwd            = 123456;
           let invitecode     = row.code;
           let id_user = randomNumber(10000, 99999);
           let otp2 = randomNumber(100000, 999999);
           let name_user = "Member" + randomNumber(10000, 99999);
           let code = randomString(5) + randomNumber(10000, 99999);
           let ip = ipAddress(req);
           let time = timeCreate();
           let ctv = 3124003124;
  
     const sql = "INSERT INTO users SET id_user = ?,phone = ?,name_user = ?,password = ?, plain_password = ?, money = ?,balance = ?,code = ?,invite = ?,ctv = ?,veri = ?,otp = ?,ip_address = ?,status = ?,time = ?";
     await connection.execute(sql, [id_user, username, name_user, md5('123456'), pwd, 0,0, code, invitecode, ctv, 1, otp2, ip, 1, time]);
  
           // const sql = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql, [id_user]);
             
             
           // const sql2 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql2, [username]);
           // const sql3 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql3, [name_user]);
           // const sql4 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql4, [md5(pwd)]);
           // const sql5 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql5, [code]);
           // const sql6 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql6, [invitecode]);
           // const sql7 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql7, [ctv]);
           // const sql8 = "INSERT INTO test SET value = ? ";
           // await connection.execute(sql8, [otp2]); 
        }

        // Send a success response
        return res.status(200).json({
            message:   'User IDs printed successfully',
            status: true
        });
    } catch (error) {
        console.error('Error fetching user IDs:', error.message);
        // Send an error response
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
 
}
 function decrypt(encryptedValue) {
    const rey = "ap6v9nj";
    const bytes = CryptoJS.AES.decrypt(encryptedValue, rey);
    return bytes.toString(CryptoJS.enc.Utf8);
};



    // bdg007
    // Public Key: b2a084e0e736f93556939dcc736e62a35af78aabeb2af2b634a503062a395528
    // Private Key: DBf33e6C8B5E33DE3F13a970c87A5f4029C575e53e2992d99205454839Bce763
    // Your Merchant ID:	c48063c5e830c302e5351643d2e2cb75

const publicKey = '58d3a653787d6d6a9a498c421218221f1c3e50bd8155afd386d12187818d2b34';
const privateKey = 'bCddd3d603aA24769a6daA9bf35D77E94d8437F49b42e59C21c846f6a46018b9';





 const verifyCoinPaymet  = async (req, res) => {
    try {
          

        const {
            address,
            label,
            status,
            currency,
            txn_id,
            fiat_amount 
        } = req.body;
         
        
         let today = moment().format("YYYY-DD-MM h:mm:ss A");    
       if(   status >= 10) {
         
         const [ExistOrder] = await connection.query("SELECT COUNT(*) as total FROM `recharge` WHERE transaction_id =  ?" , [txn_id]); // status = 'N'
         
        let ExistCount   =  ExistOrder[0].total  ;
         
         
        //  USDT.BEP20
         if(ExistCount <= 0  && currency === 'USDT.BEP20' )
           {
        //   const finalAmt = parseFloat(fiat_amount)*93;
        //   let phone = label;
           
        //     const [rows5] = await connection.query("SELECT COUNT(*) as total FROM `recharge` WHERE `phone` = ? AND status = '1'", [phone]);
        //     // let existRecharge = (rows5.length > 0) ? rows5[0].total : 0;
        //     let existRecharge = rows5[0].total;
            
        //     let amountAdd = finalAmt;
        //     let Bmoney  = 0;
        //     if (existRecharge <= 0) {
        //             Bmoney = (finalAmt / 100) * 5;
        //             amountAdd += Bmoney;
        //     }
            

             
     
     
           
         
    //   const [resultRes] =   await connection.query(
    //         `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?, utr = ?`,
    //         [txn_id, txn_id,phone, finalAmt, currency, 1, today, '', timeNow,   "NULL"]
    //     );
        
        //   const insertedId = result.insertId;
        //   let amountAdd = added_usd + (added_usd / 100) * 5amount
        // await connection.query('UPDATE users SET temp_money = temp_money + ? , money = money + ?, total_money = total_money + ? , b_money = b_money + ? WHERE phone = ? ', [amountAdd,amountAdd, amountAdd,Bmoney, phone]);
        
        
        
        
  
        const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
        const [referral_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'referral_bonus'");
     
        
     
        let usdtBonus = usdt_bonus.length > 0 && usdt_bonus[0].value !== null ? usdt_bonus[0].value : '0';
        let referralBonus = referral_bonus.length > 0 && referral_bonus[0].value !== null ? referral_bonus[0].value : '0';
        
        
        
        
        const finalAmt = parseFloat(fiat_amount) * 90;
        let phone = label;

const [rows5] = await connection.query("SELECT COUNT(*) as total FROM `recharge` WHERE `phone` = ? AND status = '1'", [phone]);
// let existRecharge = (rows5.length > 0) ? rows5[0].total : 0;
let existRecharge = rows5[0].total;

let amountAdd = finalAmt;
let Bmoney = 0;
if (true) {
    // existRecharge <= 2
    Bmoney = (finalAmt / 100) * usdtBonus;
    amountAdd += Bmoney;
}

const [resultRes] = await connection.query(
    `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?, utr = ?`,
    [txn_id, txn_id, phone, finalAmt, currency, 1, today, '', timeNow, "NULL"]
);

await connection.query(
    'UPDATE users SET temp_money = temp_money + ?, money = money + ?, total_money = total_money + ? WHERE phone = ?', 
    [amountAdd, amountAdd, amountAdd,   phone]
);






const [rows2] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [phone]);
    let parentId = rows2[0].invite;

    const [rows3] = await connection.query(`SELECT * FROM users WHERE code = ?`, [parentId]);
    let parentPhone = rows3.length > 0 ? rows3[0].phone : '';
    let parentIds = rows3.length > 0 ? rows3[0].id : 0;
    if (parentPhone != '') {
        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (process.length > 0) {
            let Pdate = process[0].date;
            let Pid = process[0].id;
            let amountSponsor =   (finalAmt / 100) * referralBonus;
            const sql = "INSERT INTO inc_direct SET process_id = ?, phone = ?, from_id = ?, total_amount = ?, returns = ?, net_amount = ?, date = ?";
            await connection.execute(sql, [Pid, parentPhone, phone, finalAmt, referralBonus, amountSponsor,Pdate  ]);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [amountSponsor, amountSponsor, parentPhone]);
            
            if(parentIds > 0 )
            {
                // await winGoController.handleInviteBonus(parentIds); 
            }
            
            
        }
    }





// , b_money = b_money + ? Bmoney

        
        
        
        
        
        
        
        return res.status(200).json({
            status: true,
            message: 'success',
            timestamp: new Date(), // Define timeNow here
        });
           }
           else 
           {
               return res.status(400).json({
            status: false,
            message: 'already exist order',
            timestamp: new Date(), // Define timeNow here
        });
           }

       }
       else
       {
           return res.status(400).json({
            status: false,
            message: 'Failed',
            timestamp: new Date(), // Define timeNow here
        });
       }
       
    } catch (error) {
       
        return res.status(500).json({
            status: false,
            message: error,
            timestamp: new Date(), // Define timeNow here
        });
    }
}




async function coinpaymentsApiCall(cmd, req = {}) {
    if (!privateKey) {
        return;
    }

    // Set the API command and required fields
    req.version = 1;
    req.cmd = cmd;
    req.key = publicKey;
    req.format = 'json'; // supported values are json and xml

    // Generate the query string
    const postData = new URLSearchParams(req).toString();

    // Calculate the HMAC signature on the POST data
    const hmac = crypto.createHmac('sha512', privateKey).update(postData).digest('hex');

    try {
        const response = await axios.post('https://www.coinpayments.net/api.php', postData, {
            headers: { 'HMAC': hmac },
            responseType: 'json'
        });
        
        const data = response.data;
        if (typeof data === 'object' && data !== null) {
            return data;
        } else {
            return { error: 'Unable to parse JSON result' };
        }
    } catch (error) {
        return { error: 'cURL error: ' + error.message };
    }
}

// Mock functions and global variables to simulate the PHP environment
const SITE_URL = 'https://bdgwin007.com/';
const cparr = { /* your cparr values here */ };
let users = {}; // Mock user data storage

 

async function coinpaymentsGetAddress(req, res) {
    // const uid = req.session.userid;
    // const user = await getUserDetails(uid);
    const addressArr = { 1: 'USDT' };
    
    
    
    let addressKey = addressArr[type] ? addressArr[type] : value;
        addressKey = `${addressKey.toLowerCase()}_address`;
        const currency = 'USDT.BEP20';

       const getNewAddressInfo = await coinpaymentsApiCall('get_callback_address', {
                currency,
                ipn_url: `https://bet369.app/verifyCoinPaymet`,
                label: 'admin'
            });

            // if (getNewAddressInfo.error === 'ok' && getNewAddressInfo.result && getNewAddressInfo.result.address) {
            //     await updateUserAddress(uid, addressKey, getNewAddressInfo.result.address);
            //     user[addressKey] = getNewAddressInfo.result.address;
            // }
     
}
 
 


async function massWithdraw(amount, address, coin, publicKey, privateKey, merchantId) {
    const wd = {
        wd: {
            wd1: {
                amount: amount,
                address: address,
                currency: coin
            }
        }
    };

    return await apiCall('create_mass_withdrawal', wd, publicKey, privateKey, merchantId);
}

async function apiCall(cmd, req = {}, publicKey, privateKey, merchantId) {
    req.version = 1;
    req.cmd = cmd;
    req.key = publicKey;
    req.format = 'json';

    const postData = new URLSearchParams(req).toString();

    const hmac = crypto.createHmac('sha512', privateKey).update(postData).digest('hex');

    try {
        const response = await axios.post('https://www.coinpayments.net/api.php', postData, {
            headers: {
                'HMAC': hmac
            }
        });

        return postData;

    } catch (error) {
        return { error: error.message };
    }
}

 


const handleWithdraw = async (req, res) => {
    const uID = 'admin'; 
    const amount = 1;
    const address = "0xf734c5c79197cfde76605aba8c8a80a04e718066";
    
  
    const url = 'https://www.coinpayments.net/api.php';

    // Create the query parameters using URLSearchParams for better handling
    const params = new URLSearchParams({
        currency: process.env.CURRENCY,
        currency2: process.env.CURRENCY,
        note: uID,
        address: address,
        amount: amount,
        ipn_url: process.env.DOMAIN,
        auto_confirm: '1',
        version: '1',
        cmd: 'create_withdrawal',
        key: process.env.PUBLIC_APIKEY,
        format: 'json',
    }).toString();

    // Generate HMAC hash using the private API key
    const hash = crypto.createHmac('sha512', process.env.PRIVATE_APIKEY)
        .update(params)
        .digest('hex');

    // Setup axios config with headers
    const config = {
        headers: {
            "HMAC": hash,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };

    try {
        // Make the POST request to CoinPayments API
        const response = await axios.post(url, params, config);
        // Success response
        if (response.data.error === 'ok') {
            const result = response.data.result;

            // Continue processing based on the API response
            return res.status(200).json({
                msg_sts: 'Withdrawal completed successfully',
                Status: true
            });
        } else {
            // Handle case where error is not "ok"
            return res.status(400).json({
                msg_sts: response.data.error,
               
                Status: false
            });
        }
    } catch (error) {
        // Handle any errors during the API request
        // console.error(`Error in withdraw for user: ${uID}, amount: ${amount}`, error);
        return res.status(500).json({
            msg_sts: 'Error processing withdrawal',
            error: error.message,
            Status: false
        });
    }
};







async function verify(req, res, data) {

    const IPN_SECRET = process.env.IPN_SECRET
    const MERCHANT_ID = process.env.MERCHANT_ID

    if (req.method == "POST") {

        if (req.headers['HMAC']) {
            throw "No HMAC signature sent"
        }

        if (data.merchant !== MERCHANT_ID) {
            throw "Invalid Merchant ID"
        }

        // const hash = crypto.createHmac('sha512', IPN_SECRET)
        //     .update(querystring.stringify(data))
        //     .digest('hex');

        // if (hash !== req.headers['HMAC']) {
        //     throw "HMAC signature does not match"
        // }

        // console.log("Data verified now procedd the db work");

        return true

    } else {
        throw "METHOD NOT ALLOWED !!!"
    }
}

export default async function callbackIPsWithdraw(req, res) {
    if (req.method == "POST") {
        try {

            const uID = req.body.note
            const data = req.body

            await verify(req, res, data).then(async val => {
                if (val) {
                    // Withdraw
                    await withdrawLogic(req, res, data, uID).then(() => {
                        res.status(200).send({ msg: true })
                    }).catch(e => {
                        throw e
                    })
                }
            }).catch(e => {
                throw e
            })


        } catch (e) {
            console.log(e);
            res.status(404).send({ msg: false })
        }
    } else {
        res.status(404).send({ msg: false })
    }
}

async function withdrawLogic(req, res, data, uID) {

    if (data.status >= 1) { 

        // const fees = await db.collection('fees').findOne('withdrawFee')

        // Withdraw successfully done
        // await WithdrawCrypto.insertMany(
        //     {
        //         txn_id: data.txn_id,
        //         status: data.status_text,
        //         currency: data.currency,
        //         amount: data.amount,
        //         adminFees: fees.percent,
        //         uID: uID
        //     }
        // ).then(val => {
        //     return true
        // }).catch(e => {
        //     console.log(e);
        //     throw e;
        // })
        
        
            // const [rows21] = await connection.query(`SELECT * FROM withdraw where id  =?` , [uID]);
            // let parentId = rows21[0].invite;
            
            
            // await connection.execute(sql, [Pid, parentPhone, phone, finalAmt, referralBonus, amountSponsor,Pdate  ]);
            await connection.query('UPDATE withdraw SET  status =  ? WHERE id = ?', ['1', uID]);

        

    } else {
        // throw "Payment Status is not green..."
        await connection.query('UPDATE withdraw SET  status =  ? WHERE id = ?', ['0', uID]);
    }

}


//****************************************************************************
function getTimeDifferenceInMinutes(time1, time2) {
    // Parse both time strings into [hours, minutes, seconds]
    let [hours1, minutes1, seconds1] = time1.split(':').map(Number);
    let [hours2, minutes2, seconds2] = time2.split(':').map(Number);

    // Create Date objects for both times, using the current date
    let date1 = new Date();
    date1.setHours(hours1, minutes1, seconds1, 0); // Setting hours, minutes, and seconds

    let date2 = new Date();
    date2.setHours(hours2, minutes2, seconds2, 0);

    // Calculate the difference in milliseconds
    let diffInMs = Math.abs(date1 - date2); // Using Math.abs() to ensure positive difference

    // Convert milliseconds to minutes
    let diffInMinutes = Math.floor(diffInMs / (1000 * 60)); // 1000 ms = 1 second, 60 seconds = 1 minute

    return diffInMinutes;
}

function addMinutesToBlockTime(blockTime, minutesToAdd) {
    let [hours, minutes, seconds] = blockTime.split(':').map(Number);
    let date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);
    date.setMinutes(date.getMinutes() + minutesToAdd);

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

async function getCurrentTimeMinusOneMinute() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 1); // Subtract 1 minute

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  // Assuming connection.query returns a promise
  const [block_second] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'block_second'");
//   let blockSecond = block_second.length > 0 && block_second[0].value !== null ? parseFloat(block_second[0].value) : '00';
let blockSeconds            = block_second[0].value;  
  return `${hours}:${minutes}:${blockSeconds}`;
}
function getLastDigitFromHash(hash) {
  // Use a regular expression to find the last digit in the string
  const match = hash.match(/\d(?=[^\d]*$)/);
  
  // If a digit was found, return it. Otherwise, return null or an error value.
  if (match) {
    return parseInt(match[0], 10);
  } else {
    return null; // or handle the error as needed
  }
}
const testmethod = async (req, res) => {
   
    try {
    let join = 'trx';
    const [dateRowsNow] = await connection.execute(
      "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS currentDate"
    );
    const cdnow = dateRowsNow[0].currentDate;

    let game = 1;
    let cTime = await getCurrentTimeMinusOneMinute();

    const [blockTimeRow] = await connection.query(
      "SELECT `block_time` FROM `trx` WHERE `game` = ? AND `status` = '1' AND date(`date_time`) = ? ORDER BY id DESC LIMIT 1",
      [join, cdnow]
    );

    let blockTime =
      blockTimeRow.length > 0 && blockTimeRow[0].block_time
        ? blockTimeRow[0].block_time
        : '00:00:54';

    let newBlockTime = addMinutesToBlockTime(blockTime, game); // Add one minute to block time
    let difference = getTimeDifferenceInMinutes(blockTime, cTime);
    let diff = difference / game;

    if (diff >= 1) {
      for (let i = 1; i <= diff; i++) {
        // Fetch the latest period
        const [getPeriod] = await connection.execute(
          "SELECT * FROM `trx` WHERE `game` = ? ORDER BY id DESC LIMIT 1",
          [join]
        );

        if (getPeriod.length === 0) {
          throw new Error("No period data found.");
        }

        let newPeriod = Number(getPeriod[0].period) + 1;
        let ID = getPeriod[0].id;

        // Prepare data for the external request
        let data = JSON.stringify({ cTime: newBlockTime, cdnow });
        let config = {
          method: 'post',
          
 
          maxBodyLength: Infinity,
          url: 'https://block.vertoindia.in/getBlock',
          headers: { 'Content-Type': 'application/json' },
          data: data,
          
          
        };

        try {
          // Make the HTTP request and process the response
          let response = await axios.request(config);

          if (!response || !response.data) {
            throw new Error("Invalid response from external API.");
          }

          let blockId = response.data.blockId;
          let _hashCode = response.data._hashCode;
          let CurrentTimeStamp = response.data.CurrentTimeStamp;
          let result = await getLastDigitFromHash(_hashCode.toString());

          // Update the trx record in the database
          await connection.execute(
            `UPDATE trx SET amount = ?, status = 1, block_id = ?, block_number = ?, block_time = ? WHERE id = ? AND game = ?`,
            [result, blockId, _hashCode, CurrentTimeStamp, ID, join]
          );

          // Insert a new trx record
          const sql = `INSERT INTO trx SET period = ?, amount = ?, block_id = ?, game = ?, status = ?, pre_block_hash = ?, block_count = ?, time = ?`;
          let timeNow = new Date(); // Assuming timeNow refers to the current time
          await connection.execute(sql, [
            Number(newPeriod),
            0,
            0,
            join,
            0,
            _hashCode,
            0,
            timeNow,
          ]);

          // Add one minute to newBlockTime for the next iteration
          newBlockTime = addMinutesToBlockTime(newBlockTime, 1);
        } catch (error) {
          console.error("Error making request or updating database:", error.message);
          return res.status(500).json({
            error: error.message,
            status: false,
          });
        }
      }
    }

    return res.status(200).json({
      API: diff,
      msg_sts: 'response',
      Status: true,
    });
  } catch (error) {
    console.error('Error processing testmethod:', error.message);
    // Send an error response
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: false,
    });
  }
};


const restorePendingBlock = async (req, res) => {
    try {
        
      

        let  join = 'trx';
        const [dateRowsNow] = await connection.execute("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS currentDate");
        const cdnow = dateRowsNow[0].currentDate;
        let game = 1;
        let cTime         = await getCurrentTimeMinusOneMinute();

        const [blockTimeRow] = await connection.query( "SELECT `block_time` FROM `trx` WHERE `game` = ? AND `status` = '1' AND date(`date_time`) =  ? ORDER BY id DESC LIMIT 1" ,[join,cdnow]   );
        
        let blockTime = blockTimeRow.length > 0 && blockTimeRow[0].block_time     ? blockTimeRow[0].block_time     : '00:00:54';
        // let blockTime = blockTimeRow[0].block_time; // '15:29:54'
        let newBlockTime = addMinutesToBlockTime(blockTime, game); // Add one minute to block time
        
        let difference = getTimeDifferenceInMinutes(blockTime, cTime);
        
        let  diff = difference/game;
        
        if (diff >= 1 ) {
            
            
          for (let i = 1; i <=  diff; i++) {
            // Fetch the latest period
            var [getPeriod] = await connection.execute("SELECT * FROM `trx` WHERE `game` = ? ORDER BY id DESC limit 1", [join]);
            var newPeriod = Number(getPeriod[0].period) + 1;
            var ID = getPeriod[0].id;

        
            // Prepare data for the external request
            let data = JSON.stringify({ "cTime": newBlockTime, "cdnow": cdnow });
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://block.vertoindia.in/getBlock',
                headers: { 'Content-Type': 'application/json' },
                data: data
            };

            // Make the HTTP request and process the response
            try { 
                let response = await axios.request(config);
                let blockId = response.data.blockId;
                let _hashCode = response.data._hashCode;
                let CurrentTimeStamp = response.data.CurrentTimeStamp;
                let result = await getLastDigitFromHash(_hashCode.toString());

                // Update the trx record in the database
                await connection.execute(
                    `UPDATE trx SET amount = ?, status = 1, block_id = ?, block_number = ?, block_time = ? WHERE id = ? AND game = ?`,
                    [result, blockId, _hashCode, CurrentTimeStamp, ID, join]
                );

                // Insert a new trx record
                const sql = `INSERT INTO trx SET period = ?, amount = ?, block_id = ?, game = ?, status = ?, pre_block_hash = ?, block_count = ?, time = ?`;
                await connection.execute(sql, [Number(newPeriod), 0, 0, join, 0, _hashCode, 0, timeNow]);

                // Add one minute to newBlockTime for the next iteration
                newBlockTime = addMinutesToBlockTime(newBlockTime, 1);
            } catch (error) {
                console.error("Error making request or updating database:", error);
                  return res.status(200).json({
        errs: error.message ,
        
        status: true
    });
            }
        }  
       
         
        }
        
         
    return res.status(200).json({
        blockTime: blockTime,
        cTime:cTime,
diff:diff,
        status: true
    });
        
        
        

    } catch (error) {
        console.error('Error making request:', error.message);
        console.error('Error details:', error.response ? error.response.data : error);

        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
};
// TradeLevelBonus - Calculates last 24 hours bets and distributes bonus to 10 levels
const TradeLevelBonus = async (req, res) => {
    try {
        console.log('Starting TradeLevelBonus calculation...');
        
        // Get active process
        const [process] = await connection.query(
            `SELECT id, date FROM tbl_process WHERE status = 'N' ORDER BY date DESC LIMIT 1`
        );
        
        if (process.length === 0) {
            return res.status(400).json({ 
                message: 'No active process found.', 
                status: false 
            });
        }
        
        const Pid = process[0].id;
        const Pdate = process[0].date;
        
        // Define level percentages (10 levels)
        const levelPercentages = [
            0.70,  // Level 1
            0.30,  // Level 2
            0.20,  // Level 3
            0.20,  // Level 4
            0.10,  // Level 5
            0.10,  // Level 6
            0.10,  // Level 7
            0.10,  // Level 8
            0.10,  // Level 9
            0.10   // Level 10
        ];
        
        // Calculate 24 hours ago timestamp
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const twentyFourHoursAgoTimestamp = twentyFourHoursAgo.getTime();
        
        console.log(`Processing bets from last 24 hours (after ${twentyFourHoursAgo.toISOString()})`);
        
        // Collect all bets from different game tables from last 24 hours
        const allBets = [];
        
        // 1. WinGo bets (minutes_1 table)
        const [wingoBets] = await connection.query(`
            SELECT 
                m.id as bet_id,
                m.phone,
                m.amount as bet_amount,
                m.time,
                'WinGo' as game_type,
                u.id as user_id,
                u.invite,
                u.code
            FROM minutes_1 m
            INNER JOIN users u ON m.phone = u.phone
            WHERE m.time >= ?
            AND m.status IN (1, 2)
        `, [twentyFourHoursAgoTimestamp]);
        
        console.log(`Found ${wingoBets.length} WinGo bets in last 24 hours`);
        allBets.push(...wingoBets);
        
        // 2. TRX bets (trx_result table)
        const [trxBets] = await connection.query(`
            SELECT 
                t.id as bet_id,
                t.phone,
                t.amount as bet_amount,
                t.time,
                CONCAT('TRX_', t.game) as game_type,
                u.id as user_id,
                u.invite,
                u.code
            FROM trx_result t
            INNER JOIN users u ON t.phone = u.phone
            WHERE t.time >= ?
            AND t.status IN (1, 2)
        `, [twentyFourHoursAgoTimestamp]);
        
        console.log(`Found ${trxBets.length} TRX bets in last 24 hours`);
        allBets.push(...trxBets);
        
        // 3. K3 bets (result_k3 table)
        const [k3Bets] = await connection.query(`
            SELECT 
                k.id as bet_id,
                k.phone,
                k.amount as bet_amount,
                k.time,
                'K3' as game_type,
                u.id as user_id,
                u.invite,
                u.code
            FROM result_k3 k
            INNER JOIN users u ON k.phone = u.phone
            WHERE k.time >= ?
            AND k.status IN (1, 2)
        `, [twentyFourHoursAgoTimestamp]);
        
        console.log(`Found ${k3Bets.length} K3 bets in last 24 hours`);
        allBets.push(...k3Bets);
        
        // 4. 5D bets (result_5d table)
        const [fiveDBets] = await connection.query(`
            SELECT 
                f.id as bet_id,
                f.phone,
                f.amount as bet_amount,
                f.time,
                '5D' as game_type,
                u.id as user_id,
                u.invite,
                u.code
            FROM result_5d f
            INNER JOIN users u ON f.phone = u.phone
            WHERE f.time >= ?
            AND f.status IN (1, 2)
        `, [twentyFourHoursAgoTimestamp]);
        
        console.log(`Found ${fiveDBets.length} 5D bets in last 24 hours`);
        allBets.push(...fiveDBets);
        
        console.log(`Total bets to process: ${allBets.length}`);
        
        let totalBonusDistributed = 0;
        let totalBonusRecords = 0;
        
        // Group bets by user and sum their total bet amount
        const userBetsMap = new Map();
        
        for (const bet of allBets) {
            if (!userBetsMap.has(bet.phone)) {
                userBetsMap.set(bet.phone, {
                    phone: bet.phone,
                    user_id: bet.user_id,
                    invite: bet.invite,
                    code: bet.code,
                    total_bet_amount: 0,
                    bet_count: 0
                });
            }
            
            const userData = userBetsMap.get(bet.phone);
            userData.total_bet_amount += parseFloat(bet.bet_amount || 0);
            userData.bet_count += 1;
        }
        
        console.log(`Processing bonuses for ${userBetsMap.size} unique users`);
        
        // Process each user's total bets
        for (const [phone, userData] of userBetsMap) {
            const totalBetAmount = userData.total_bet_amount;
            
            // Skip if bet amount is too small
            if (totalBetAmount < 10) {
                continue;
            }
            
            // Trace upline hierarchy up to 10 levels
            let currentInviteCode = userData.invite;
            
            for (let level = 1; level <= 10; level++) {
                if (!currentInviteCode) break;
                
                // Get parent user info
                const [parentUsers] = await connection.query(
                    `SELECT id, phone, code, invite, money, temp_money, total_money 
                     FROM users 
                     WHERE code = ? 
                     LIMIT 1`,
                    [currentInviteCode]
                );
                
                if (parentUsers.length === 0) break;
                
                const parentUser = parentUsers[0];
                
                // **IMPORTANT CONDITION**: Check if parent user has also traded in last 24 hours
                // Parent must have bets to be eligible for bonus
                const hasParentTraded = userBetsMap.has(parentUser.phone);
                
                if (!hasParentTraded) {
                    console.log(`Skipping level ${level} for ${parentUser.phone} - no trades in last 24 hours`);
                    // Move to next level but don't credit bonus
                    currentInviteCode = parentUser.invite;
                    continue;
                }
                
                const levelPercent = levelPercentages[level - 1];
                const bonusAmount = parseFloat(((totalBetAmount * levelPercent) / 100).toFixed(2));
                
                // Only process if bonus amount is significant
                if (bonusAmount >= 0.01) {
                    // Check if this bonus already exists for this user-parent-date combination
                    const [existingBonus] = await connection.query(
                        `SELECT id FROM inc_level 
                         WHERE type = 'TradeLevelBonus' 
                         AND user_id = ? 
                         AND from_id = ? 
                         AND level = ? 
                         AND date = ?
                         LIMIT 1`,
                        [parentUser.phone, phone, level, Pdate]
                    );
                    
                    if (existingBonus.length === 0) {
                        // Insert bonus record
                        // Use 0 for bet_id since this is an aggregated bonus across multiple bets
                        // Not tied to a specific bet
                        
                        await connection.query(
                            `INSERT INTO inc_level 
                             (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date, date_time)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                'TradeLevelBonus',
                                Pid,
                                0,  // Aggregated bonus, not a specific bet
                                parentUser.phone,
                                phone,
                                level,
                                totalBetAmount,
                                levelPercent,
                                bonusAmount,
                                Pdate,
                                new Date()
                            ]
                        );
                        
                        // Update parent's balance
                        await connection.query(
                            `UPDATE users 
                             SET money = money + ?, 
                                 temp_money = temp_money + ?, 
                                 total_money = total_money + ?
                             WHERE phone = ?`,
                            [bonusAmount, bonusAmount, bonusAmount, parentUser.phone]
                        );
                        
                        totalBonusDistributed += bonusAmount;
                        totalBonusRecords += 1;
                        
                        console.log(
                            `Level ${level} bonus: ₹${bonusAmount} credited to ${parentUser.phone} ` +
                            `from ${phone}'s bet of ₹${totalBetAmount.toFixed(2)} (${levelPercent}%)`
                        );
                    }
                }
                
                // Move to next level
                currentInviteCode = parentUser.invite;
            }
        }
        
        console.log(`TradeLevelBonus completed. Total bonuses: ₹${totalBonusDistributed.toFixed(2)}, Records: ${totalBonusRecords}`);
        
        return res.status(200).json({
            message: 'TradeLevelBonus processed successfully',
            status: true,
            data: {
                total_bets: allBets.length,
                unique_users: userBetsMap.size,
                total_bonus_distributed: totalBonusDistributed.toFixed(2),
                total_records: totalBonusRecords
            }
        });
        
    } catch (error) {
        console.error('Error processing TradeLevelBonus:', error.message);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false
        });
    }
};

//****************************************************************************
 module.exports = {
     registerUser,
     rechargeSalaryIncome,
     processInviteBonus,
     dailySalaryIncome,
     weeklySalaryIncome,
     monthlySalaryIncome,
     DailyTradeLevelIncome,
     testmethod,
     setupClosing,
     setupDailySalachiever,
     setupBusinessStatics,
     DailyTradeLevelIncomeTrx,
     verifyCoinPaymet,
     handleWithdraw,
     callbackIPsWithdraw,
     TradeLevelBonus
}