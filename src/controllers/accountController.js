import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import e from "express";
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
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

// Function to initialize daily bonus column
const initializeDailyBonus = async () => {
    try {
        // Check if column exists
        const [columnCheck] = await connection.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'last_daily_bonus_date'
        `);

        if (columnCheck[0].count === 0) {
            // Add the column if it doesn't exist
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN last_daily_bonus_date DATE DEFAULT NULL
            `);
            console.log('Daily bonus column added successfully');
        } else {
            console.log('Daily bonus column already exists');
        }
    } catch (error) {
        console.error('Error initializing daily bonus column:', error);
    }
}

// Function to process invitation bonus when someone registers
const processInvitationBonus = async (inviterPhone, inviterId) => {
    try {
        // Initialize invitation bonus tables if they don't exist
        await initializeInvitationBonusTables();

        // Get current process information
        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N' LIMIT 1`);
        if (!process.length) {
            console.log('No active process found for invitation bonus');
            return;
        }

        const processId = process[0].id;
        const processDate = process[0].date;

        // Count total referrals with deposits > 300 INR
        const [totalCounts] = await connection.query(`
            SELECT COUNT(*) as total
            FROM recharge
            WHERE status = '1'
            AND money > 300
            AND phone IN (SELECT phone FROM users WHERE invite = (SELECT code FROM users WHERE phone = ?))
        `, [inviterPhone]);

        const totalReferrals = Number(totalCounts[0].total);

        // Get invitation bonus configurations
        const [bonuses] = await connection.query(`
            SELECT id, threshold, amount
            FROM invite_bonus
            ORDER BY threshold ASC
        `);

        // Check which bonuses the inviter is eligible for
        for (const bonus of bonuses) {
            if (totalReferrals >= bonus.threshold) {
                // Check if bonus already claimed
                const [existingBonus] = await connection.query(`
                    SELECT 1 FROM inc_invite_bonus
                    WHERE phone = ? AND bonus_id = ?
                `, [inviterPhone, bonus.id]);

                if (existingBonus.length === 0) {
                    // Credit invitation bonus
                    await connection.query(`
                        INSERT INTO inc_invite_bonus (process_id, bonus_id, phone, amount, date_time)
                        VALUES (?, ?, ?, ?, ?)
                    `, [processId, bonus.id, inviterPhone, bonus.amount, new Date()]);

                    // Update user's balance
                    await connection.query(`
                        UPDATE users SET money = money + ?, temp_money = temp_money + ?, total_money = total_money + ?
                        WHERE phone = ?
                    `, [bonus.amount, bonus.amount, bonus.amount, inviterPhone]);

                    console.log(`Invitation bonus ₹${bonus.amount} credited to ${inviterPhone} for ${totalReferrals} referrals`);
                }
            }
        }
    } catch (error) {
        console.error('Error processing invitation bonus:', error);
    }
}

// Function to initialize invitation bonus tables
const initializeInvitationBonusTables = async () => {
    try {
        // Create invite_bonus table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS invite_bonus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                threshold INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                description VARCHAR(255),
                status TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_threshold (threshold)
            )
        `);

        // Create inc_invite_bonus table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS inc_invite_bonus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                process_id INT,
                bonus_id INT,
                phone VARCHAR(20) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_phone (phone),
                INDEX idx_bonus_id (bonus_id),
                UNIQUE KEY unique_phone_bonus (phone, bonus_id)
            )
        `);

        // Insert default invitation bonus configurations
        const defaultBonuses = [
            { threshold: 5, amount: 100, description: '5 referrals bonus' },
            { threshold: 10, amount: 300, description: '10 referrals bonus' },
            { threshold: 20, amount: 800, description: '20 referrals bonus' },
            { threshold: 50, amount: 2000, description: '50 referrals bonus' },
            { threshold: 100, amount: 5000, description: '100 referrals bonus' },
            { threshold: 200, amount: 12000, description: '200 referrals bonus' },
            { threshold: 500, amount: 30000, description: '500 referrals bonus' }
        ];

        for (const bonus of defaultBonuses) {
            await connection.query(`
                INSERT INTO invite_bonus (threshold, amount, description)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), description = VALUES(description)
            `, [bonus.threshold, bonus.amount, bonus.description]);
        }

        console.log('Invitation bonus tables initialized successfully');
    } catch (error) {
        console.error('Error initializing invitation bonus tables:', error);
    }
}

const loginPage = async (req, res) => {
    return res.render("account/login.ejs");
}

const registerPage = async (req, res) => {
    return res.render("account/register.ejs");
}

const forgotPage = async (req, res) => {
    return res.render("account/forgot.ejs");
}

const login = async (req, res) => {
    let { username, pwd } = req.body;

    if (!username || !pwd || !username) {//!isNumber(username)
        return res.status(200).json({
            message: 'ERROR!!!'
        });
    }

    // Initialize daily bonus column if needed
    await initializeDailyBonus();

    try {
        const [rows] = await connection.query('SELECT *, DATE_FORMAT(last_daily_bonus_date, "%Y-%m-%d") as last_bonus_str FROM users WHERE phone = ? AND password = ? ', [username, md5(pwd)]);
        if (rows.length == 1) {
            if (rows[0].status == 1) {
                const user = rows[0];
                const today = new Date().toISOString().split('T')[0];
                const lastBonusDateStr = user.last_bonus_str || null;

                console.log(`User: ${username}, Today: ${today}, Last Bonus: ${lastBonusDateStr}`); // Debug log

                // Check and credit daily login bonus
                if (!lastBonusDateStr || lastBonusDateStr !== today) {
                    await connection.query(`
                        UPDATE users 
                        SET money = money + 10, temp_money = temp_money + 10, total_money = total_money + 10, last_daily_bonus_date = ? 
                        WHERE phone = ?
                    `, [today, username]);
                    console.log(`Daily login bonus ₹10 credited to ${username} on ${today}`);
                } else {
                    console.log(`No daily bonus for ${username} - already claimed today`);
                }

                const { password, money, ip, veri, ip_address, status, time, last_bonus_str, ...others } = user;
                const accessToken = jwt.sign({
                    user: { ...others },
                    timeNow: timeNow
                }, process.env.JWT_ACCESS_TOKEN, { expiresIn: "1d" });
                await connection.execute('UPDATE `users` SET `token` = ? WHERE `phone` = ? ', [md5(accessToken), username]);
                return res.status(200).json({
                    message: 'Login Successfully!',
                    status: true,
                    token: accessToken,
                    value: md5(accessToken)
                });
            } else {
                return res.status(200).json({
                    message: 'Account has been locked',
                    status: false
                });
            }
        } else {
            return res.status(200).json({
                message: 'Incorrect Username or Password',
                status: false,
                
            });
        }
    } catch (error) {
        // if (error) console.log(error);
          return res.status(200).json({
                message: error,
                status: false,
                
            });
    }

}


const publicKey = '58d3a653787d6d6a9a498c421218221f1c3e50bd8155afd386d12187818d2b34';
const privateKey = 'bCddd3d603aA24769a6daA9bf35D77E94d8437F49b42e59C21c846f6a46018b9';

// const publicKey = 'b2a084e0e736f93556939dcc736e62a35af78aabeb2af2b634a503062a395528';
// const privateKey = 'DBf33e6C8B5E33DE3F13a970c87A5f4029C575e53e2992d99205454839Bce763';

// August 30, 2024 07:02:33pm	Key Name: daman20.
// Public Key: 58d3a653787d6d6a9a498c421218221f1c3e50bd8155afd386d12187818d2b34
// Private Key: bCddd3d603aA24769a6daA9bf35D77E94d8437F49b42e59C21c846f6a46018b9

// Your Merchant ID:	213bc856cfb1fd6fa705ba01cc1c90ad


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



const register = async (req, res) => {
    let now = new Date().getTime();
    let { username, pwd, invitecode } = req.body;
    let id_user = randomNumber(10000, 99999);
    let otp2 = randomNumber(100000, 999999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time =  timeCreate();

    if (!username || !pwd || !invitecode) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    if (username.length < 9 || username.length > 10 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    try {
        const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ?', [username]);
        const [check_i] = await connection.query('SELECT * FROM users WHERE code = ? ', [invitecode]);
        const [check_ip] = await connection.query('SELECT * FROM users WHERE ip_address = ? ', [ip]);

        if (check_u.length == 1 && check_u[0].veri == 1) {
            return res.status(200).json({
                message: 'Registered phone number',
                status: false
            });
        } else {
            if (check_i.length == 1) {
                if (check_ip.length <= 300) {
                    let ctv = '';
                    if (check_i[0].level == 2) {
                        ctv = check_i[0].phone;
                    } else {
                        ctv = check_i[0].ctv;
                    }
                    
                    
        const [rows22] = await connection.query('  SELECT * FROM `users` WHERE code = ? ' , [invitecode]);
        let parentId = rows22.length > 0 ? rows22[0].id : 0;
         
         
            const currency = 'USDT.BEP20';
            
            const getNewAddressInfo = await coinpaymentsApiCall('get_callback_address', {
            currency,
            ipn_url: `https://daman20.com/verifyCoinPaymet`,
            label: username
            });
         
         
         
         
      
                    const sql = "INSERT INTO users SET parent_id = ? , usdt_bep20 = ? , id_user = ?,phone = ?,name_user = ?,password = ?, plain_password = ?, money = ?,temp_money = ?,code = ?,invite = ?,ctv = ?,veri = ?,otp = ?,ip_address = ?,status = ?,time = ?";
                   
                   
                    await connection.execute(sql, [parentId,getNewAddressInfo.result.address , id_user, username, name_user, md5(pwd), pwd, 50,50, code, invitecode, ctv, 1, otp2, ip, 1, time]);
                    await connection.execute('INSERT INTO point_list SET phone = ?', [username]);

                    let [check_code] = await connection.query('SELECT * FROM users WHERE invite = ? ', [invitecode]);

                    if(check_i.name_user !=='Admin'){
                        let levels = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44];

                        for (let i = 0; i < levels.length; i++) {
                            if (check_code.length >= levels[i]) {
                                await connection.execute('UPDATE users SET user_level = ? WHERE code = ?', [i + 1, invitecode]);
                            } else {
                                break;
                            }
                        }
                    }

                    // Process invitation bonus for the inviter
                    await processInvitationBonus(check_i[0].phone, check_i[0].id);

                    return res.status(200).json({
                        message: "Registered successfully",
                        status: true
                    });
                } else {
                    return res.status(200).json({
                        message: 'Registered IP address',
                        status: false
                    });
                }
            } else {
                return res.status(200).json({
                    message: 'Referrer code does not exist',
                    status: false
                });
            }
        }
    } catch (error) {
        if (error) console.log(error);
        return res.status(200).json({
                    message: error.message,
                    status: false
                });
    }

}

const verifyCode = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);

    if (phone.length < 9 || phone.length > 10 || !isNumber(phone)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ?', [phone]);
    if (rows.length == 0) {
        await request(`http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${phone}&msg=Your verification code is ${otp}&extend=${now}`, async (error, response, body) => {
            let data = JSON.parse(body);
            if (data.code == '00000') {
                await connection.execute("INSERT INTO users SET phone = ?, otp = ?, veri = 0, time_otp = ? ", [phone, otp, timeEnd]);
                return res.status(200).json({
                    message: 'Submitted successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            }
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now <= 0) {
            request(`http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${phone}&msg=Your verification code is ${otp}&extend=${now}`, async (error, response, body) => {
                let data = JSON.parse(body);
                if (data.code == '00000') {
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Submitted successfully',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                }
            });
        } else {
            return res.status(200).json({
                message: 'Send SMS regularly',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const verifyCodePass = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);

    if (phone.length < 9 || phone.length > 10 || !isNumber(phone)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [phone]);
    if (rows.length == 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now <= 0) {
            request(`http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${phone}&msg=Your verification code is ${otp}&extend=${now}`, async (error, response, body) => {
                let data = JSON.parse(body);
                if (data.code == '00000') {
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Submitted successfully',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                }
            });
        } else {
            return res.status(200).json({
                message: 'Send SMS regularly',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const forGotPassword = async (req, res) => {
    let username = req.body.username;
    let otp = req.body.otp;
    let pwd = req.body.pwd;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp2 = randomNumber(100000, 999999);

    if (username.length < 9 || username.length > 10 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [username]);
    if (rows.length == 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now > 0) {
            if (user.otp == otp) {
                await connection.execute("UPDATE users SET password = ?, otp = ?, time_otp = ? WHERE phone = ? ", [md5(pwd), otp2, timeEnd, username]);
                return res.status(200).json({
                    message: 'Change password successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            } else {
                return res.status(200).json({
                    message: 'OTP code is incorrect',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        } else {
            return res.status(200).json({
                message: 'OTP code has expired',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const keFuMenu = async(req, res) => {
    let auth = req.cookies.auth;

    const [users] = await connection.query('SELECT `level`, `ctv` FROM users WHERE token = ?', [auth]);

    let telegram = '';
    if (users.length == 0) {
        let [settings] = await connection.query('SELECT `telegram`, `cskh` FROM admin');
        telegram = settings[0].telegram;
    } else {
        if (users[0].level != 0) {
            var [settings] = await connection.query('SELECT * FROM admin');
        } else {
            var [check] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            if (check.length == 0) {
                var [settings] = await connection.query('SELECT * FROM admin');
            } else {
                var [settings] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            }
        }
        telegram = settings[0].telegram;
    }
    
    return res.render("keFuMenu.ejs", {telegram}); 
}
const logout = async(req, res) => {
    try {
        let auth = req.cookies.auth;

        if (auth) {
            await connection.execute('UPDATE `users` SET `token` = ? WHERE `token` = ?', [null, auth]);
        }

        res.clearCookie('auth', { path: '/' });
        res.clearCookie('token', { path: '/' });

        return res.status(200).json({
            message: 'Logout successful',
            status: true,
            timeStamp: Date.now()
        });
    } catch (error) {
        console.error('Logout error:', error);
        
        res.clearCookie('auth', { path: '/' });
        res.clearCookie('token', { path: '/' });

        return res.status(200).json({
            message: 'Logout failed but cookies cleared',
            status: false,
            timeStamp: Date.now()
        });
    }
}

module.exports = {
    login,
    register,
    loginPage,
    registerPage,
    forgotPage,
    verifyCode,
    verifyCodePass,
    forGotPassword,
    keFuMenu,
    logout
}