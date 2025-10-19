import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import winGoController from "./winGoController";

import querystring from "querystring"

const qs = require('qs');
const CryptoJS = require('crypto-js');


const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

let timeNow = Date.now();



const getCurrentDateTime = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};



const giftUsesHistory = async(req, res) => {
    return res.render("manage/giftUsesHistory.ejs");
}

const getGiftHistory = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [users] = await connection.query(`SELECT g.*,u.id_user as uid FROM redenvelopes_used as g LEFT JOIN users as u ON g.phone_used = u.phone WHERE 1 ORDER BY  g.id DESC LIMIT  ${pageno}, ${limit}`);
    const [total_users] = await connection.query(`SELECT * FROM redenvelopes_used WHERE 1`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: users,
        page_total: Math.ceil(total_users.length / limit)
    });
}


const BusinessStatics = async(req, res) => {
    return res.render("manage/BusinessStatics.ejs");
}
const socialCampaignsPage = async(req, res) => {
    return res.render("manage/socialCampaign.ejs");
}
const adminPage = async(req, res) => {
    return res.render("manage/index.ejs");
}

const adminPage3 = async(req, res) => {
    return res.render("manage/a-index-bet/index3.ejs");
}

const adminPage5 = async(req, res) => {
    return res.render("manage/a-index-bet/index5.ejs");
}

const adminPage10 = async(req, res) => {
    return res.render("manage/a-index-bet/index10.ejs");
}

const adminPage5d = async(req, res) => {
    return res.render("manage/5d.ejs");
}

const adminPageK3 = async(req, res) => {
    return res.render("manage/k3.ejs");
}

const ctvProfilePage = async(req, res) => {
    var phone = req.params.phone;
    return res.render("manage/profileCTV.ejs", { phone });
}

const giftPage = async(req, res) => {
    return res.render("manage/giftPage.ejs");
}

const membersPage = async(req, res) => {
        return res.render("manage/members.ejs");
    }
    // Report Start

const referralBonus = async(req, res) => {
    return res.render("manage/referralBonus.ejs");
}
const DailySalaryIncome = async(req, res) => {
    return res.render("manage/DailySalaryIncome.ejs");
}
const WeeklySalaryIncome = async(req, res) => {
    return res.render("manage/WeeklySalaryIncome.ejs");
}
const MonthlySalaryIncome = async(req, res) => {
    return res.render("manage/MonthlySalaryIncome.ejs");
}
const DailyTradeVolumeIncome = async(req, res) => {
    return res.render("manage/DailyTradeVolumeIncome.ejs");
}

const depositBonusPage = async(req, res) => {
    return res.render("manage/depositBonus.ejs");
}

const extraBonusPage = async(req, res) => {
    return res.render("manage/extraBonus.ejs");
}

// Report End

const ctvPage = async(req, res) => {
    return res.render("manage/ctv.ejs");
}

const infoMember = async(req, res) => {
    let phone = req.params.id;
    return res.render("manage/profileMember.ejs", { phone });
}

const statistical = async(req, res) => {
    return res.render("manage/statistical.ejs");
}

const rechargePage = async(req, res) => {
    return res.render("manage/recharge.ejs");
}

const rechargeRecord = async(req, res) => {
    return res.render("manage/rechargeRecord.ejs");
}

const withdraw = async(req, res) => {
    return res.render("manage/withdraw.ejs");
}

const levelSetting = async(req, res) => {
    return res.render("manage/levelSetting.ejs");
}

const CreatedSalaryRecord = async(req, res) => {
    return res.render("manage/CreatedSalaryRecord.ejs");
}

const withdrawRecord = async(req, res) => {
    return res.render("manage/withdrawRecord.ejs");
}
const settings = async(req, res) => {
    return res.render("manage/settings.ejs");
}
const aviatorSettings = async(req, res) => {
    return res.render("manage/aviatorSettings.ejs");
}
const aviSettings = async(req, res) => {
    let auth = req.cookies.auth;
    let avi_status = req.body.game_status;
    let min_bet_amount = req.body.min_bet_amount;
    let max_bet_amount = req.body.max_bet_amount;
    let aviator_profit_pool = req.body.aviator_profit_pool;




    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    await connection.query(`UPDATE settings SET value = ? WHERE category ='avi_status'`, [avi_status]);
    await connection.query(`UPDATE settings SET value = ? WHERE category ='min_bet_amount'`, [min_bet_amount]);
    await connection.query(`UPDATE settings SET value = ? WHERE category ='max_bet_amount'`, [max_bet_amount]);
    await connection.query(`UPDATE settings SET value = ? WHERE category ='aviator_profit_pool'`, [aviator_profit_pool]);


    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}

// xác nhận admin
const middlewareAdminController = async(req, res, next) => {
    // xác nhận token
    const auth = req.cookies.auth;
    if (!auth) {
        return res.redirect("/login");
    }
    const [rows] = await connection.execute('SELECT `token`,`level`, `status` FROM `users` WHERE `token` = ? AND veri = 1', [auth]);
    if (!rows) {
        return res.redirect("/login");
    }
    try {
        if (auth == rows[0].token && rows[0].status == 1) {
            if (rows[0].level == 1) {
                next();
            } else {
                return res.redirect("/home");
            }
        } else {
            return res.redirect("/login");
        }
    } catch (error) {
        return res.redirect("/login");
    }
}

const totalJoin = async(req, res) => {
    let auth = req.cookies.auth;
    let typeid = req.body.typeid;
    if (!typeid) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let game = '';
    if (typeid == '1') game = 'wingo';
    if (typeid == '2') game = 'wingo3';
    if (typeid == '3') game = 'wingo5';
    if (typeid == '4') game = 'wingo10';

    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [auth]);

    if (rows.length > 0) {
        const [wingoall] = await connection.query(`SELECT * FROM minutes_1 WHERE game = "${game}" AND status = 0 AND level = 0 ORDER BY id ASC `, [auth]);
        const [winGo1] = await connection.execute(`SELECT * FROM wingo WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `, []);
        const [winGo10] = await connection.execute(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `, []);
        const [setting] = await connection.execute(`SELECT * FROM admin `, []);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: wingoall,
            lotterys: winGo1,
            list_orders: winGo10,
            setting: setting,
            timeStamp: timeNow,
        });
    } else {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
}

const listMember = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [users] = await connection.query(`SELECT * FROM users WHERE veri = 1 AND level != 2 ORDER BY id DESC LIMIT ${pageno}, ${limit} `);
    const [total_users] = await connection.query(`SELECT * FROM users WHERE veri = 1 AND level != 2`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: users,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listTardeLevel = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [users] = await connection.query(`SELECT L.*,u1.id_user as Uid , u2.id_user as Fid FROM inc_level as L LEFT JOIN users as u1 ON u1.phone = L.user_id LEFT JOIN users as u2 ON u2.phone = L.from_id WHERE 1 ORDER BY L.id DESC LIMIT  ${pageno}, ${limit} `);
    const [total_users] = await connection.query(`SELECT * FROM inc_level WHERE 1`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: users,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listDepositBonus = async(req, res) => {
    let auth = req.cookies.auth;
    let { page = 1, limit = 20, search = '' } = req.body;

    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE r.phone LIKE ?';
            queryParams.push(`%${search}%`);
        }

        const offset = (page - 1) * limit;
        queryParams.push(parseInt(limit), parseInt(offset));

        // Get deposit bonus records from recharge table with bonus information
        const [bonuses] = await connection.query(`
            SELECT
                r.id,
                r.phone,
                r.money as recharge_amount,
                CASE
                    WHEN r.type = 'wow_pay' THEN r.money * 0.05
                    WHEN r.type = 'upi_manual' THEN r.money * 0.05
                    WHEN r.type = 'usdt_manual' THEN r.money * 0.05
                    ELSE 0
                END as bonus_amount,
                CASE
                    WHEN r.type = 'wow_pay' THEN 'UPI Deposit Bonus'
                    WHEN r.type = 'upi_manual' THEN 'Manual UPI Bonus'
                    WHEN r.type = 'usdt_manual' THEN 'USDT Deposit Bonus'
                    ELSE 'Deposit Bonus'
                END as bonus_type,
                r.date_time,
                r.status
            FROM recharge r
            ${whereClause}
            ORDER BY r.id DESC
            LIMIT ? OFFSET ?
        `, queryParams);

        // Get total count for pagination
        const [totalCount] = await connection.query(`
            SELECT COUNT(*) as total FROM recharge r ${whereClause}
        `, search ? [`%${search}%`] : []);

        const totalPages = Math.ceil(totalCount[0].total / limit);

        return res.status(200).json({
            message: 'Success',
            status: true,
            data: bonuses,
            totalPages: totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error in listDepositBonus:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            status: false
        });
    }
}

const listExtraBonus = async(req, res) => {
    let auth = req.cookies.auth;
    let { page = 1, limit = 20, search = '' } = req.body;

    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE phone LIKE ?';
            queryParams.push(`%${search}%`);
        }

        const offset = (page - 1) * limit;
        queryParams.push(parseInt(limit), parseInt(offset));

        // Get extra bonus records from various bonus tables
        const [bonuses] = await connection.query(`
            SELECT
                id,
                phone,
                'Invite Bonus' as bonus_type,
                amount,
                description,
                date_time,
                1 as status
            FROM inc_invite_bonus
            ${whereClause}
            UNION ALL
            SELECT
                id,
                phone,
                'Referral Bonus' as bonus_type,
                net_amount as amount,
                'Referral commission' as description,
                date_time,
                1 as status
            FROM inc_direct
            ${whereClause.replace('phone', 'inc_direct.phone')}
            UNION ALL
            SELECT
                id,
                phone,
                'Level Bonus' as bonus_type,
                net_amount as amount,
                'Level commission' as description,
                date_time,
                1 as status
            FROM inc_level
            ${whereClause.replace('phone', 'inc_level.phone')}
            ORDER BY date_time DESC
            LIMIT ? OFFSET ?
        `, search ? [`%${search}%`, `%${search}%`, `%${search}%`, ...queryParams] : queryParams);

        // Get total count for pagination
        const [totalCount] = await connection.query(`
            SELECT COUNT(*) as total FROM (
                SELECT phone FROM inc_invite_bonus ${whereClause}
                UNION ALL
                SELECT phone FROM inc_direct ${whereClause.replace('phone', 'inc_direct.phone')}
                UNION ALL
                SELECT phone FROM inc_level ${whereClause.replace('phone', 'inc_level.phone')}
            ) as combined_bonuses
        `, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);

        const totalPages = Math.ceil(totalCount[0].total / limit);

        return res.status(200).json({
            message: 'Success',
            status: true,
            data: bonuses,
            totalPages: totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error in listExtraBonus:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            status: false
        });
    }
}

const listDailySalaryIncome = async(req, res) => {
    let { pageno, limit, type } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [rows] = await connection.query(`SELECT s.*, u.id_user as userId  FROM salary as s LEFT JOIN users as u ON u.phone = s.phone where s.type ='${type}' ORDER BY s.id  DESC LIMIT ${pageno}, ${limit}`);


    // const [users] = await connection.query(`SELECT * FROM commission WHERE 1 ORDER BY id DESC LIMIT ${pageno}, ${limit} `);
    const [total_users] = await connection.query(`SELECT * FROM salary WHERE type ='${type}'`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: rows,
        page_total: Math.ceil(total_users.length / limit)
    });
}
const listreferralBonus = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [rows] = await connection.query(` SELECT CONCAT(u1.phone ,'[',u1.id_user,']') AS _to, CONCAT(u2.phone ,'[',u2.id_user,']') AS _from, d.total_amount AS amount, d.returns, d.net_amount, d.date AS date_time FROM inc_direct AS d LEFT JOIN users AS u1 ON d.phone = u1.phone LEFT JOIN users AS u2 ON d.from_id = u2.phone ORDER BY d.id DESC LIMIT ${pageno}, ${limit}`);




    // const [users] = await connection.query(`SELECT * FROM commission WHERE 1 ORDER BY id DESC LIMIT ${pageno}, ${limit} `);
    const [total_users] = await connection.query(`SELECT * FROM inc_direct WHERE 1`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: rows,
        page_total: Math.ceil(total_users.length / limit)
    });
}
const listCTV = async(req, res) => {
    let { pageno, pageto } = req.body;

    if (!pageno || !pageto) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || pageto < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [wingo] = await connection.query(`SELECT * FROM users WHERE veri = 1 AND level = 2 ORDER BY id DESC LIMIT ${pageno}, ${pageto} `);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: wingo,
    });
}

function formateT2(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin2(params = '', addHours = 0) {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }

    date.setHours(date.getHours() + addHours);

    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = date.getHours() % 12;
    hours = hours === 0 ? 12 : hours;
    let ampm = date.getHours() < 12 ? "AM" : "PM";

    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());

    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}

const statistical2 = async(req, res) => {
    const [wingo] = await connection.query(`SELECT SUM(money) as total FROM minutes_1 WHERE status = 1 `);
    const [wingo2] = await connection.query(`SELECT SUM(money) as total FROM minutes_1 WHERE status = 2 `);
    const [users] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 1 `);
    const [users2] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 0 `);
    const [recharge] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 `);
    const [withdraw] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 `);

    const [recharge_today] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 AND today = ?`, [timerJoin2()]);
    const [withdraw_today] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 AND today = ?`, [timerJoin2()]);

    let win = wingo[0].total;
    let loss = wingo2[0].total;
    let usersOnline = users[0].total;
    let usersOffline = users2[0].total;
    let recharges = recharge[0].total;
    let withdraws = withdraw[0].total;
    return res.status(200).json({
        message: 'Success',
        status: true,
        win: win,
        loss: loss,
        usersOnline: usersOnline,
        usersOffline: usersOffline,
        recharges: recharges,
        withdraws: withdraws,
        rechargeToday: recharge_today[0].total,
        withdrawToday: withdraw_today[0].total,
    });
}

const changeAdmin = async(req, res) => {
    let auth = req.cookies.auth;
    let value = req.body.value;
    let type = req.body.type;
    let typeid = req.body.typeid;

    if (!value || !type || !typeid) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    let game = '';
    let bs = '';
    if (typeid == '1') {
        game = 'wingo1';
        bs = 'bs1';
    }
    if (typeid == '2') {
        game = 'wingo3';
        bs = 'bs3';
    }
    if (typeid == '3') {
        game = 'wingo5';
        bs = 'bs5';
    }
    if (typeid == '4') {
        game = 'wingo10';
        bs = 'bs10';
    }
    switch (type) {
        case 'change-wingo1':
            await connection.query(`UPDATE admin SET ${game} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing results successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;
        case 'change-win_rate':
            await connection.query(`UPDATE admin SET ${bs} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing win rate successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;

        default:
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
            break;
    }

}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

// Function to initialize default bonus configurations
const initializeBonusConfigs = async () => {
    try {
        const defaultConfigs = [
            { name: 'inr_bonus', value: '5' },      // 5% INR deposit bonus
            { name: 'usdt_bonus', value: '5' },     // 5% USDT deposit bonus
            { name: 'referral_bonus', value: '4' }, // 4% referral bonus
            { name: 'wingo_status', value: '1' },   // WinGo game enabled
            { name: 'block_second', value: '30' },  // 30 seconds block time
            { name: 'block_trx', value: '1' },      // TRX enabled
            // Trade level bonuses (19 levels)
            { name: 'recharge_level_1', value: '4' },   // Level 1: 4%
            { name: 'recharge_level_2', value: '2' },   // Level 2: 2%
            { name: 'recharge_level_3', value: '1' },   // Level 3: 1%
            { name: 'recharge_level_4', value: '0.5' }, // Level 4: 0.5%
            { name: 'recharge_level_5', value: '0.3' }, // Level 5: 0.3%
            { name: 'recharge_level_6', value: '0.2' }, // Level 6: 0.2%
            { name: 'recharge_level_7', value: '0.1' }, // Level 7: 0.1%
            { name: 'recharge_level_8', value: '0.1' }, // Level 8: 0.1%
            { name: 'recharge_level_9', value: '0.1' }, // Level 9: 0.1%
            { name: 'recharge_level_10', value: '0.1' }, // Level 10: 0.1%
            { name: 'recharge_level_11', value: '0.05' }, // Level 11: 0.05%
            { name: 'recharge_level_12', value: '0.05' }, // Level 12: 0.05%
            { name: 'recharge_level_13', value: '0.05' }, // Level 13: 0.05%
            { name: 'recharge_level_14', value: '0.05' }, // Level 14: 0.05%
            { name: 'recharge_level_15', value: '0.05' }, // Level 15: 0.05%
            { name: 'recharge_level_16', value: '0.02' }, // Level 16: 0.02%
            { name: 'recharge_level_17', value: '0.02' }, // Level 17: 0.02%
            { name: 'recharge_level_18', value: '0.02' }, // Level 18: 0.02%
            { name: 'recharge_level_19', value: '0.02' }, // Level 19: 0.02%
            // Self-trade bonuses
            { name: 'self_trade_bonus', value: '0.5' },   // 0.5% self-trade bonus
            { name: 'min_bet_amount', value: '50' },      // Minimum bet amount for bonuses
            { name: 'loss_rebate', value: '1' },          // 1% rebate on losing bets
            { name: 'p2p_min_transfer', value: '100' },   // Minimum P2P transfer amount
            { name: 'p2p_max_transfer', value: '50000' }, // Maximum P2P transfer amount
            { name: 'p2p_daily_limit', value: '100000' }, // Daily P2P transfer limit
            // Trade level bonuses (20 levels)
            { name: 'trade_level_1', value: '0.3' },   // Level 1: 0.3%
            { name: 'trade_level_2', value: '0.2' },   // Level 2: 0.2%
            { name: 'trade_level_3', value: '0.1' },   // Level 3: 0.1%
            { name: 'trade_level_4', value: '0.05' },  // Level 4: 0.05%
            { name: 'trade_level_5', value: '0.05' },  // Level 5: 0.05%
            { name: 'trade_level_6', value: '0.03' },  // Level 6: 0.03%
            { name: 'trade_level_7', value: '0.03' },  // Level 7: 0.03%
            { name: 'trade_level_8', value: '0.03' },  // Level 8: 0.03%
            { name: 'trade_level_9', value: '0.03' },  // Level 9: 0.03%
            { name: 'trade_level_10', value: '0.03' }, // Level 10: 0.03%
            { name: 'trade_level_11', value: '0.02' }, // Level 11: 0.02%
            { name: 'trade_level_12', value: '0.02' }, // Level 12: 0.02%
            { name: 'trade_level_13', value: '0.02' }, // Level 13: 0.02%
            { name: 'trade_level_14', value: '0.02' }, // Level 14: 0.02%
            { name: 'trade_level_15', value: '0.02' }, // Level 15: 0.02%
            { name: 'trade_level_16', value: '0.01' }, // Level 16: 0.01%
            { name: 'trade_level_17', value: '0.01' }, // Level 17: 0.01%
            { name: 'trade_level_18', value: '0.01' }, // Level 18: 0.01%
            { name: 'trade_level_19', value: '0.01' }, // Level 19: 0.01%
            { name: 'trade_level_20', value: '0.01' }, // Level 20: 0.01%
            // Daily attendance bonuses
            { name: 'attendance_day_1', value: '10' },   // Day 1: ₹10
            { name: 'attendance_day_2', value: '15' },   // Day 2: ₹15
            { name: 'attendance_day_3', value: '20' },   // Day 3: ₹20
            { name: 'attendance_day_4', value: '25' },   // Day 4: ₹25
            { name: 'attendance_day_5', value: '30' },   // Day 5: ₹30
            { name: 'attendance_day_6', value: '40' },   // Day 6: ₹40
            { name: 'attendance_day_7', value: '50' },   // Day 7: ₹50 (weekly bonus)
            { name: 'max_attendance_days', value: '7' }  // Maximum consecutive days
        ];

        for (const config of defaultConfigs) {
            await connection.query(`
                INSERT INTO tbl_config (name, value) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE value = COALESCE(value, ?)
            `, [config.name, config.value, config.value]);
        }

        // Create daily attendance table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS daily_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                consecutive_days INT DEFAULT 1,
                bonus_amount DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_phone_date (phone, date),
                INDEX idx_phone (phone),
                INDEX idx_date (date)
            )
        `);

        console.log('Bonus configurations and tables initialized successfully');
    } catch (error) {
        console.error('Error initializing bonus configurations:', error);
    }
}

function timerJoin(params = '', addHours = 0) {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }

    date.setHours(date.getHours() + addHours);

    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = date.getHours() % 12;
    hours = hours === 0 ? 12 : hours;
    let ampm = date.getHours() < 12 ? "AM" : "PM";

    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());

    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}

const userInfo = async(req, res) => {
    let auth = req.cookies.auth;
    let phone = req.body.phone;
    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = user[0];
    // direct subordinate all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }
    // console.log("TOTAL_F_TODAY:" + f_all_today);
    // console.log("F1: " + f1s.length);
    // console.log("F2: " + f2);
    // console.log("F3: " + f3);
    // console.log("F4: " + f4);

    const [recharge] = await connection.query('SELECT SUM(`money`) as total FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
    const [withdraw] = await connection.query('SELECT SUM(`money`) as total FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
    const [bank_user] = await connection.query('SELECT * FROM user_bank WHERE phone = ? ', [phone]);
    const [telegram_ctv] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ? ', [userInfo.ctv]);
    const [ng_moi] = await connection.query('SELECT `phone` FROM users WHERE code = ? ', [userInfo.invite]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: user,
        total_r: recharge,
        total_w: withdraw,
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        bank_user: bank_user,
        telegram: telegram_ctv[0],
        ng_moi: ng_moi[0],
        daily: userInfo.ctv,
    });
}



const recharge = async(req, res) => {
    let auth = req.cookies.auth;

    let type = req.body.type;


    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [recharge] = await connection.query('SELECT * FROM recharge WHERE status = 0  order by id desc');


    let recharge2;


    if (type === 'upi') {
        [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 and type = "wow_pay" order by id desc');
    } else if (type === 'mupi') {
        [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 and type = "upi_manual" order by id desc');
    } else if (type === 'usdt') {
        [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 and type = "usdt_manual" order by id desc');
    } else {
        [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 order by id desc');
    }


    const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE status = 0  order by id desc');
    const [withdraw2] = await connection.query('SELECT * FROM withdraw WHERE status != 0 order by id desc ');


    const sqlQue1 = 'SELECT SUM(money)as total  FROM `recharge` WHERE status = ? AND type= ?';
    const [rowUpi] = await connection.execute(sqlQue1, ['1', 'wow_pay']);
    const UPISuccess = rowUpi[0].total || 0;


    const sqlQue2 = 'SELECT SUM(money)as total  FROM `recharge` WHERE status = ? AND type= ?';
    const [rowmUpi] = await connection.execute(sqlQue2, ['1', 'upi_manual']);
    const mUPISuccess = rowmUpi[0].total || 0;

    const sqlQue3 = 'SELECT SUM(money)as total  FROM `recharge` WHERE status = ? AND type= ?';
    const [rowUsdt] = await connection.execute(sqlQue3, ['1', 'usdt_manual']);
    const mUSDTSuccess = rowUsdt[0].total || 0;


    let TotalAmount = parseFloat(UPISuccess + mUPISuccess + mUSDTSuccess);





    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: recharge,

        UPISuccess: UPISuccess,
        mUPISuccess: mUPISuccess,
        mUSDTSuccess: mUSDTSuccess,
        TotalAmount: TotalAmount,


        datas2: recharge2,
        datas3: withdraw,
        datas4: withdraw2,
    });
}

const settingGet = async(req, res) => {
    try {


        let auth = req.cookies.auth;
        if (!auth) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [bank_recharge] = await connection.query("SELECT * FROM bank_recharge");
        const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'momo'");
        const [settings] = await connection.query('SELECT * FROM admin ');
        const [block_second] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'block_second'");
        const [block_trx] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'block_trx'");


        // Initialize default bonus configurations if they don't exist
        // await initializeBonusConfigs();

        const [inr_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'inr_bonus'");
        const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
        const [referral_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'referral_bonus'");
        const [wingo_status] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'wingo_status'");

        let inrBonus = inr_bonus.length > 0 && inr_bonus[0].value !== null ? inr_bonus[0].value : '5';
        let usdtBonus = usdt_bonus.length > 0 && usdt_bonus[0].value !== null ? usdt_bonus[0].value : '5';
        let referralBonus = referral_bonus.length > 0 && referral_bonus[0].value !== null ? referral_bonus[0].value : '4';

        let wingoStatus = wingo_status.length > 0 && wingo_status[0].value !== null ? wingo_status[0].value : 'N';



        let blockSecond = block_second.length > 0 && block_second[0].value !== null ? parseFloat(block_second[0].value) : '';
        let blockTrx = block_trx.length > 0 && block_trx[0].value !== null ? block_trx[0].value : 'N';


        const [avi_game_status] = await connection.query("SELECT `value` FROM `settings` WHERE `category` = 'avi_status'");
        const [avi_min_bet_amount] = await connection.query("SELECT `value` FROM `settings` WHERE `category` = 'min_bet_amount'");
        const [avi_max_bet_amount] = await connection.query("SELECT `value` FROM `settings` WHERE `category` = 'max_bet_amount'");
        const [avi_aviator_profit_pool] = await connection.query("SELECT `value` FROM `settings` WHERE `category` = 'aviator_profit_pool'");




        let game_status = avi_game_status.length > 0 && avi_game_status[0].value !== null ? avi_game_status[0].value : 'N';
        let min_bet_amount = avi_min_bet_amount.length > 0 && avi_min_bet_amount[0].value !== null ? parseFloat(avi_min_bet_amount[0].value) : '';
        let max_bet_amount = avi_max_bet_amount.length > 0 && avi_max_bet_amount[0].value !== null ? parseFloat(avi_max_bet_amount[0].value) : '';
        let aviator_profit_pool = avi_aviator_profit_pool.length > 0 && avi_aviator_profit_pool[0].value !== null ? parseFloat(avi_aviator_profit_pool[0].value) : '';


        let bank_recharge_momo_data
        if (bank_recharge_momo.length) {
            bank_recharge_momo_data = bank_recharge_momo[0]
        }
        return res.status(200).json({
            message: 'Success',
            status: true,
            settings: settings,
            blockSecond: blockSecond,
            blockTrx: blockTrx,
            wingoStatus: wingoStatus,
            datas: bank_recharge,

            inr_bonus: inrBonus,
            usdt_bonus: usdtBonus,
            referral_bonus: referralBonus,


            game_status: game_status,
            min_bet_amount: min_bet_amount,
            max_bet_amount: max_bet_amount,
            aviator_profit_pool:aviator_profit_pool,


            momo: {
                bank_name: bank_recharge_momo_data ?.name_bank || "",
                username: bank_recharge_momo_data ?.name_user || "",
                upi_id: bank_recharge_momo_data ?.stk || "",
                usdt_wallet_address: bank_recharge_momo_data ?.stk || "",
            }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Failed',
            status: false,
        });
    }
}
const rechargeDuyet = async(req, res) => {
    const { auth } = req.cookies;
    const { id, type } = req.body;

    if (!auth || !id || !type) {
        return res.status(400).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: new Date(),
        });
    }

    try {
        if (type === 'confirm') {
            await connection.query(`UPDATE recharge SET status = 1 WHERE id = ?`, [id]);
            const [info] = await connection.query(`SELECT * FROM recharge WHERE id = ?`, [id]);

            if (!info.length) {
                return res.status(404).json({ message: 'Recharge not found', status: false });
            }

            let amountAdd = info[0].money;

            // Get bonus configurations with default values
            const [inr_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'inr_bonus'");
            const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
            const [referral_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'referral_bonus'");

            // Parse bonus values with fallback to 0 if not configured
            const inrBonus = parseFloat(inr_bonus[0]?.value || '0');
            const usdtBonus = parseFloat(usdt_bonus[0]?.value || '0');
            const referralBonus = parseFloat(referral_bonus[0]?.value || '0');

            console.log('Bonus values:', { inrBonus, usdtBonus, referralBonus });

            if (info[0].type === 'usdt_manual') {
                amountAdd += (info[0].money * usdtBonus) / 100;
            } else {
                amountAdd += (info[0].money * inrBonus) / 100;
            }

            await connection.query(
                'UPDATE users SET temp_money = temp_money + ?, money = money + ?  WHERE phone = ?', [amountAdd, amountAdd , info[0].phone]
            );

            const [userInfo] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [info[0].phone]);

            if (!userInfo.length) {
                return res.status(404).json({ message: 'User not found', status: false });
            }

            const parentId = userInfo[0] ?.invite;

            if (parentId) {
                const [parentInfo] = await connection.query(`SELECT * FROM users WHERE code = ?`, [parentId]);
                const parentPhone = parentInfo[0] ?.phone;

                if (parentPhone) {
                    const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);

                    if (process.length > 0) {
                        const { id: Pid, date: Pdate } = process[0];
                        const amountSponsor = (info[0].money * referralBonus) / 100;

                        await connection.query(
                            "INSERT INTO inc_direct SET process_id = ?, phone = ?, from_id = ?, total_amount = ?, returns = ?, net_amount = ?, date = ?", [Pid, parentPhone, info[0].phone, info[0].money, referralBonus, amountSponsor, Pdate]
                        );

                        await connection.query(
                            'UPDATE users SET money = money + ?  WHERE phone = ?', [amountSponsor,   parentPhone]
                        );

                        // Optionally handle further invite bonuses.
                        // if (parentInfo[0].id) {
                        //     await winGoController.handleInviteBonus(parentInfo[0].id);
                        // }
                    }
                }
            }
            
            let currentInviteCode = parentId; // Direct inviter code
            for (let level = 1; level <= 19; level++) {
                if (!currentInviteCode) break;
            
                const [parentUser] = await connection.query(
                    "SELECT * FROM users WHERE code = ?", 
                    [currentInviteCode]
                );
                
                if (!parentUser.length) break;
            
                const parent = parentUser[0];
                currentInviteCode = parent.invite; // Move to next level up
            
                const [levelConfig] = await connection.query(
                    "SELECT value FROM tbl_config WHERE name = ?", 
                    [`recharge_level_${level}`]
                );
                const levelPercent = parseFloat(levelConfig[0]?.value || '0');
            
                if (levelPercent > 0) {
                    const levelAmount = (info[0].money * levelPercent) / 100;
            
                    // Insert into inc_level
                    await connection.query(
                        `INSERT INTO inc_level 
                        (process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date, date_time) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            process[0]?.id || 0,                     // process_id
                            0,                                       // bet_id (not applicable here)
                            parent.id,                               // user_id (who receives)
                            userInfo[0].id,                          // from_id (who recharged)
                            level,                                   // level number
                            info[0].money,                           // base amount
                            levelPercent,                            // percentage
                            levelAmount,                             // net amount
                            process[0]?.date || new Date(),          // date
                            new Date()                               // current timestamp
                        ]
                    );
            
                    // Update balance
                    await connection.query(
                        `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE id = ?`,
                        [levelAmount, levelAmount, parent.id]
                    );
                }
            }
            

            return res.status(200).json({
                message: 'Recharge confirmed successfully',
                status: true,
                data: info,
            });

        } else if (type === 'delete') {
            await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

            return res.status(200).json({
                message: 'Recharge canceled successfully',
                status: true,
            });
        } else {
            return res.status(400).json({ message: 'Invalid type provided', status: false });
        }

    } catch (error) {
        console.error('Error during recharge confirmation or cancellation:', error);
        return res.status(500).json({
            message: 'An internal error occurred while processing the request',
            status: false,
        });
    }
};

const updateLevel = async(req, res) => {
    try {
        let id = req.body.id;
        let f1 = req.body.f1;
        let f2 = req.body.f2;
        let f3 = req.body.f3;
        let f4 = req.body.f4;

        console.log("level : " + id, f1, f2, f3, f4);

        await connection.query(
            'UPDATE `level` SET `f1`= ? ,`f2`= ? ,`f3`= ? ,`f4`= ?  WHERE `id` = ?', [f1, f2, f3, f4, id]
        );

        // Send a success response to the client
        res.status(200).json({
            message: 'Update successful',
            status: true,
        });
    } catch (error) {
        console.error('Error updating level:', error);

        // Send an error response to the client
        res.status(500).json({
            message: 'Update failed',
            status: false,
            error: error.message,
        });
    }
};


const handlWithdraw = async(req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id || !type) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'confirm') {
        // Get withdrawal details
        const [withdrawalInfo] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);

        // Check if it's a USDT withdrawal
        if (withdrawalInfo.length > 0 && withdrawalInfo[0].mode === 'USDT') {
            // For USDT withdrawals, redirect to the crypto processing endpoint
            return res.status(200).json({
                message: 'USDT withdrawals must be processed using the Crypto button',
                status: false,
                timeStamp: timeNow,
            });
        }

        // For regular withdrawals, proceed as normal
        await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [id]);
        return res.status(200).json({
            message: 'Successful application confirmation',
            status: true,
            datas: withdrawalInfo,
        });
    }

    if (type == 'Crypto') {


        const [rows21] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        const amounts = rows21[0].money;

        // Divide by 90 and remove the decimal part
        const amount = Math.floor(amounts / 90);

        const uID = id;

        const address = rows21[0].address;;


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

            // Success response from CoinPayments API
            if (response.data.error === 'ok') {
                const result = response.data.result;

                // Update the withdraw status in the database
                await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [id]);

                // Send success response to the client
                return res.status(200).json({
                    message: 'Withdrawal Request successfully sent',
                    status: true
                });
            } else {
                // Send error response if CoinPayments API returns an error
                return res.status(400).json({
                    message: response.data.error,
                    status: false
                });
            }
        } catch (error) {
            // Handle any errors during the API request
            return res.status(500).json({
                message: 'Error processing withdrawal',
                error: error.message,
                status: false
            });
        }


        // const [rows21] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        // let parentId = rows21[0].invite;


        // await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [id]);
        // const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        // return res.status(200).json({
        //     message: 'Successful application confirmation',
        //     status: true,
        //     datas: recharge,
        // });
    }





    if (type == 'delete') {
        await connection.query(`UPDATE withdraw SET status = 2 WHERE id = ?`, [id]);
        const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [info[0].money, info[0].phone]);
        return res.status(200).json({
            message: 'Cancel successfully',
            status: true,
            datas: recharge,
        });
    }
}

const settingBank = async(req, res) => {
    try {


        let auth = req.cookies.auth;
        let name_bank = req.body.name_bank;
        let name = req.body.name;
        let info = req.body.info;
        let qr = req.body.qr;
        let typer = req.body.typer;

        if (!auth || !typer) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (typer == 'bank') {
            await connection.query(`UPDATE bank_recharge SET  stk = ? WHERE type = 'bank'`, [info]);
            return res.status(200).json({
                message: 'Success',
                status: true,
                datas: info,
            });
        }

        if (typer == 'momo') {
            // const [bank_recharge] = await connection.query(`SELECT * FROM bank_recharge WHERE type = 'momo'`);

            // const deleteRechargeQueries = bank_recharge.map(recharge => {
            //     return deleteBankRechargeById(recharge.id)
            // });

            // await Promise.all(deleteRechargeQueries)

            // await connection.query(`UPDATE bank_recharge SET name_bank = ?, name_user = ?, stk = ?, qr_code_image = ? WHERE type = 'upi'`, [name_bank, name, info, qr]);

            const bankName = req.body.bank_name
            const username = req.body.username
            const upiId = req.body.upi_id
            const usdtWalletAddress = req.body.usdt_wallet_address

            // await connection.query("INSERT INTO bank_recharge SET name_bank = ?, name_user = ?, stk = ?, qr_code_image = ?, type = 'momo'", [
            //     bankName, username, upiId, usdtWalletAddress
            // ])

            await connection.query(`UPDATE bank_recharge SET  stk = ? WHERE type = 'momo'`, [usdtWalletAddress]);

            return res.status(200).json({
                message: 'Successfully changed',
                status: true,
                datas: recharge,
            });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Something went wrong!',
            status: false,
        });
    }
}

const deleteBankRechargeById = async(id) => {
    const [recharge] = await connection.query("DELETE FROM bank_recharge WHERE type = 'momo' AND id = ?", [id]);

    return recharge
}

const settingCskh = async(req, res) => {
    let auth = req.cookies.auth;
    let telegram = req.body.telegram;
    let cskh = req.body.cskh;
    let myapp_web = req.body.myapp_web;
    if (!auth || !cskh || !telegram) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    await connection.query(`UPDATE admin SET telegram = ?, cskh = ?, app = ?`, [telegram, cskh, myapp_web]);
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}

const banned = async(req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'open') {
        await connection.query(`UPDATE users SET status = 1 WHERE id = ?`, [id]);
    }
    if (type == 'close') {
        await connection.query(`UPDATE users SET status = 2 WHERE id = ?`, [id]);
    }
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}


const createBonus = async(req, res) => {
    const randomString = (length) => {
        var result = '';
        var characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }

    function timerJoin(params = '', addHours = 0) {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }

        date.setHours(date.getHours() + addHours);

        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());

        let hours = date.getHours() % 12;
        hours = hours === 0 ? 12 : hours;
        let ampm = date.getHours() < 12 ? "AM" : "PM";

        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());

        return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }
    const d = new Date();
    const time = d.getTime();

    let auth = req.cookies.auth;
    let money = req.body.money;
    let type = req.body.type;
    let numberOfUsers = req.body.numberOfUsers;

    if (!money || !auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [user] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = user[0];

    if (type == 'all') {
        let select = req.body.select;
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2`, [money]);
        } else {
            await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2`, [money]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'two') {
        let select = req.body.select;
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2`, [money]);
        } else {
            await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2`, [money]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'one') {
        let select = req.body.select;
        let phone = req.body.phone;
        const [user] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
        if (user.length == 0) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2 and phone = ?`, [money, phone]);
        } else {
            await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2 and phone = ?`, [money, phone]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'three') {
        let select = req.body.select;
        let phone = req.body.phone;
        const [user] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
        if (user.length == 0) {
            return res.status(200).json({
                message: 'account does not exist',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2 and phone = ?`, [money, phone]);
        } else {
            await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2 and phone = ?`, [money, phone]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (!type) {
        let id_redenvelops = randomString(16);
        let sql = `INSERT INTO redenvelopes SET id_redenvelope = ?, phone = ?, money = ?, used = ?, amount = ?, status = ?, time = ?`;
        await connection.query(sql, [id_redenvelops, userInfo.phone, money, numberOfUsers, 1, 0, time]);
        return res.status(200).json({
            message: 'Successful change',
            status: true,
            id: id_redenvelops,
        });
    }
}

const listRedenvelops = async(req, res) => {
    let auth = req.cookies.auth;

    let [redenvelopes] = await connection.query('SELECT * FROM redenvelopes WHERE status = 0 ');
    return res.status(200).json({
        message: 'Successful change',
        status: true,
        redenvelopes: redenvelopes,
    });
}

const settingbuff = async(req, res) => {
    try {
        const { id_user, buff_acc, money_value } = req.body;
        const auth = req.cookies.auth;
        const timeNow = getCurrentDateTime();

        if (!id_user || !buff_acc || !money_value) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [user_id] = await connection.query(`SELECT * FROM users WHERE id_user = ?`, [id_user]);

        if (user_id.length === 0) {
            return res.status(200).json({
                message: 'User not found',
                status: false,
            });
        }

        const userRow = user_id[0];
        const phone = userRow.phone;
        const dateTimes = getCurrentDateTime();

        if (buff_acc == '1') {
            await connection.query(`UPDATE users SET  temp_money = temp_money + ? ,  money = money + ? WHERE id_user = ?`, [money_value, money_value, id_user]);
            await connection.query('INSERT INTO admin_txn (phone, amount, type, date_time) VALUES (?, ?, ?, ?)', [phone, money_value, 'Add', dateTimes]);

            const parentId = userRow.invite;
            const [rows3] = await connection.query(`SELECT * FROM users WHERE code = ?`, [parentId]);
            const parentPhone = rows3.length > 0 ? rows3[0].phone : '';

            if (parentPhone) {
                const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);

                if (process.length > 0) {
                    const Pdate = process[0].date;
                    const Pid = process[0].id;
                    const amountSponsor = (money_value / 100) * 4;
                    const sql = "INSERT INTO inc_direct (process_id, phone, from_id, total_amount, returns, net_amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)";
                    await connection.query(sql, [Pid, parentPhone, phone, money_value, 4, amountSponsor, Pdate]);
                    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [amountSponsor, amountSponsor, parentPhone]);
                }
            }
        } else if (buff_acc == '2') {
            await connection.query(`UPDATE users SET money = money - ? WHERE id_user = ?`, [money_value, id_user]);
            await connection.query('INSERT INTO admin_txn (phone, amount, type, date_time) VALUES (?, ?, ?, ?)', [phone, money_value, 'Minus', dateTimes]);
        }

        return res.status(200).json({
            message: 'Successful change',
            status: true,
        });
    } catch (error) {
        console.error('Error in settingbuff:', error.message);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: false,
        });
    }
}
const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

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



const register = async(req, res) => {
    let { username, password, invitecode } = req.body;
    let id_user = randomNumber(10000, 99999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time = timeCreate();

    invitecode = '2cOCs36373';

    if (!username || !password || !invitecode) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    if (!username) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    try {
        const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ? ', [username]);
        if (check_u.length == 1) {
            return res.status(200).json({
                message: 'register account', //Số điện thoại đã được đăng ký
                status: false
            });
        } else {
            const sql = `INSERT INTO users SET
            id_user = ?,
            phone = ?,
            name_user = ?,
            password = ?,
            money = ?,
            level = ?,
            code = ?,
            invite = ?,
            veri = ?,
            ip_address = ?,
            status = ?,
            time = ?`;
            await connection.execute(sql, [id_user, username, name_user, md5(password), 0, 2, code, invitecode, 1, ip, 1, time]);
            await connection.execute('INSERT INTO point_list SET phone = ?, level = 2', [username]);
            return res.status(200).json({
                message: 'registration success', //Register Sucess
                status: true
            });
        }
    } catch (error) {
        if (error) console.log(error);
    }

}

const profileUser = async(req, res) => {
    let phone = req.body.phone;
    if (!phone) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    let [user] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    let [recharge] = await connection.query(`SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC LIMIT 10`, [phone]);
    let [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC LIMIT 10`, [phone]);
    return res.status(200).json({
        message: 'Get success',
        status: true,
        recharge: recharge,
        withdraw: withdraw,
    });
}

const infoCtv = async(req, res) => {
    const phone = req.body.phone;

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = user[0];
    // cấp dưới trực tiếp all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }

    const [list_mem] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    const [list_mem_baned] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 2 AND veri = 1 ', [phone]);
    let total_recharge = 0;
    let total_withdraw = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge] = await connection.query('SELECT SUM(money) as money FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw] = await connection.query('SELECT SUM(money) as money FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        if (recharge[0].money) {
            total_recharge += Number(recharge[0].money);
        }
        if (withdraw[0].money) {
            total_withdraw += Number(withdraw[0].money);
        }
    }

    let total_recharge_today = 0;
    let total_withdraw_today = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                total_recharge_today += recharge_today[i].money;
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                total_withdraw_today += withdraw_today[i].money;
            }
        }
    }

    let win = 0;
    let loss = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [wins] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 1 ', [phone]);
        const [losses] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 2 ', [phone]);
        for (let i = 0; i < wins.length; i++) {
            let today = timerJoin();
            let time = timerJoin(wins[i].time);
            if (time == today) {
                win += wins[i].money;
            }
        }
        for (let i = 0; i < losses.length; i++) {
            let today = timerJoin();
            let time = timerJoin(losses[i].time);
            if (time == today) {
                loss += losses[i].money;
            }
        }
    }
    let list_mems = [];
    const [list_mem_today] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timerJoin();
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    const [point_list] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
    let moneyCTV = point_list[0].money;

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [phone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timerJoin();
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [phone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timerJoin();
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }


    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: user,
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        list_mems: list_mems,
        total_recharge: total_recharge,
        total_withdraw: total_withdraw,
        total_recharge_today: total_recharge_today,
        total_withdraw_today: total_withdraw_today,
        list_mem_baned: list_mem_baned.length,
        win: win,
        loss: loss,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        moneyCTV: moneyCTV,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const infoCtv2 = async(req, res) => {
    const phone = req.body.phone;
    const timeDate = req.body.timeDate;

    function timerJoin(params = '', addHours = 0) {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }

        date.setHours(date.getHours() + addHours);

        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());

        let hours = date.getHours() % 12;
        hours = hours === 0 ? 12 : hours;
        let ampm = date.getHours() < 12 ? "AM" : "PM";

        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());

        return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = user[0];
    const [list_mem] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);

    let list_mems = [];
    const [list_mem_today] = await connection.query('SELECT * FROM users WHERE ctv = ? AND status = 1 AND veri = 1 ', [phone]);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timeDate;
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [phone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timeDate;
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [phone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timeDate;
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: user,
        list_mems: list_mems,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const listRechargeMem = async(req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM recharge WHERE phone = ?`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: recharge,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listWithdrawMem = async(req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM withdraw WHERE phone = ?`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: withdraw,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listRedenvelope = async(req, res) => {
        let auth = req.cookies.auth;
        let phone = req.params.phone;
        let { pageno, limit } = req.body;

        if (!pageno || !limit) {
            return res.status(200).json({
                code: 0,
                msg: "No more data",
                data: {
                    gameslist: [],
                },
                status: false
            });
        }

        if (pageno < 0 || limit < 0) {
            return res.status(200).json({
                code: 0,
                msg: "No more data",
                data: {
                    gameslist: [],
                },
                status: false
            });
        }

        if (!phone) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
        const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

        if (user.length == 0 || auths.length == 0) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        let { token, password, otp, level, ...userInfo } = user[0];

        const [redenvelopes_used] = await connection.query(`SELECT * FROM redenvelopes_used WHERE phone_used = ? ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
        const [total_users] = await connection.query(`SELECT * FROM redenvelopes_used WHERE phone_used = ?`, [phone]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: redenvelopes_used,
            page_total: Math.ceil(total_users.length / limit)
        });
    }
    // Level Setting get

const getLevelInfo = async(req, res) => {

    const [rows] = await connection.query('SELECT * FROM `level`');

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    console.log("asdasdasd : " + rows)
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    });

    // const [recharge] = await connection.query('SELECT * FROM recharge WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalRecharge = 0;
    // recharge.forEach((data) => {
    //     totalRecharge += data.money;
    // });
    // const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalWithdraw = 0;
    // withdraw.forEach((data) => {
    //     totalWithdraw += data.money;
    // });

    // const { id, password, ip, veri, ip_address, status, time, token, ...others } = rows[0];
    // return res.status(200).json({
    //     message: 'Success',
    //     status: true,
    //     data: {
    //         code: others.code,
    //         id_user: others.id_user,
    //         name_user: others.name_user,
    //         phone_user: others.phone,
    //         money_user: others.money,
    //     },
    //     totalRecharge: totalRecharge,
    //     totalWithdraw: totalWithdraw,
    //     timeStamp: timeNow,
    // });


}

const listBet = async(req, res) => {
    let auth = req.cookies.auth;
    let phone = req.params.phone;
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!phone) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT * FROM users WHERE phone = ? ', [phone]);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0 || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let { token, password, otp, level, ...userInfo } = user[0];

    const [listBet] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND status != 0 ORDER BY id DESC LIMIT ${pageno}, ${limit} `, [phone]);
    const [total_users] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND status != 0`, [phone]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: listBet,
        page_total: Math.ceil(total_users.length / limit)
    });
}

const listOrderOld = async(req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const [k5d] = await connection.query(`SELECT * FROM 5d WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM 5d WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, amount, bet FROM result_5d WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Get success",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const listOrderOldK3 = async(req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const [k5d] = await connection.query(`SELECT * FROM k3 WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM k3 WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, typeGame, amount, bet FROM result_k3 WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Get Success",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const editResult = async(req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Editing is successful', //Register Sucess
        status: true
    });

}

const editResult2 = async(req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Editing is successful', //Register Sucess
        status: true
    });

}

const CreatedSalary = async(req, res) => {
    try {
        const phone = req.body.phone;
        const amount = req.body.amount;
        const type = req.body.type;
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

        // Check if the phone number is a 10-digit number
        // if (!/^\d{10}$/.test(phone)) {
        //     return res.status(400).json({
        //         message: 'ERROR!!! Invalid phone number. Please provide a 10-digit phone number.',
        //         status: false
        //     });
        // }

        // Check if user with the given phone number exists
        const checkUserQuery = 'SELECT * FROM `users` WHERE phone = ? or id_user = ?';
        const [existingUser] = await connection.execute(checkUserQuery, [phone, phone]);
        let user = existingUser[0];
        if (existingUser.length === 0) {
            // If user doesn't exist, return an error
            return res.status(400).json({
                message: 'ERROR!!! User with the provided phone number does not exist.',
                status: false
            });
        }

        // If user exists, update the 'users' table
        const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
        await connection.execute(updateUserQuery, [amount, user.phone]);


        // Insert record into 'salary' table
        const insertSalaryQuery = 'INSERT INTO salary (phone, amount, type, time) VALUES (?, ?, ?, ?)';
        await connection.execute(insertSalaryQuery, [user.phone, amount, type, formattedTime]);

        res.status(200).json({ message: 'Salary record created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getSalary = async(req, res) => {
    const [rows] = await connection.query(`SELECT s.*, u.id_user as userId  FROM salary as s LEFT JOIN users as u ON u.phone = s.phone ORDER BY s.id  DESC`);

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    console.log("asdasdasd : " + rows)
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    })
};

const commissionSetting = async(req, res) => {
    let auth = req.cookies.auth;
    let inr_bonus = req.body.inr_bonus || '0';
    let usdt_bonus = req.body.usdt_bonus || '0';
    let referral_bonus = req.body.referral_bonus || '0';
    let loss_rebate = req.body.loss_rebate || '1';
    let timeNow = new Date().toISOString();

    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE to ensure records exist
        await connection.query(`
            INSERT INTO tbl_config (name, value) VALUES ('inr_bonus', ?)
            ON DUPLICATE KEY UPDATE value = ?
        `, [inr_bonus, inr_bonus]);

        await connection.query(`
            INSERT INTO tbl_config (name, value) VALUES ('usdt_bonus', ?)
            ON DUPLICATE KEY UPDATE value = ?
        `, [usdt_bonus, usdt_bonus]);

        await connection.query(`
            INSERT INTO tbl_config (name, value) VALUES ('referral_bonus', ?)
            ON DUPLICATE KEY UPDATE value = ?
        `, [referral_bonus, referral_bonus]);

        await connection.query(`
            INSERT INTO tbl_config (name, value) VALUES ('loss_rebate', ?)
            ON DUPLICATE KEY UPDATE value = ?
        `, [loss_rebate, loss_rebate]);

        return res.status(200).json({
            message: 'Commission settings updated successfully',
            status: true,
        });
    } catch (error) {
        console.error('Commission setting error:', error);
        return res.status(500).json({
            message: 'Database error',
            status: false,
            error: error.message,
        });
    }
}


const blockSecond = async(req, res) => {
    let auth = req.cookies.auth;
    let block_second = req.body.block_second;
    let block_trx = req.body.block_trx;
    let wingo_status = req.body.wingo_status;
    if (!auth || !block_second) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='block_second'`, [block_second]);
    await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='block_trx'`, [block_trx]);
    await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='wingo_status'`, [wingo_status]);
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}
const businessStaticsList = async(req, res) => {
    let { pageno, limit, type } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [rows] = await connection.query(`SELECT *  FROM business_statics where  1   ORDER BY  id  DESC LIMIT ${pageno}, ${limit}`);

    const [que1] = await connection.query('SELECT SUM(temp_money) as temp, SUM(money) as total FROM `users` WHERE 1');

    // Safely parse the query results
    let totalTemp = que1.length > 0 && que1[0].temp !== null ? parseFloat(que1[0].temp) : 0;
    let totalAmt = que1.length > 0 && que1[0].total !== null ? parseFloat(que1[0].total) : 0;

    // Calculate total amounts
    let totalAmount = totalAmt.toFixed(2);
    let totalWining = (totalAmt - totalTemp).toFixed(2);
    let totalRecharge = totalTemp.toFixed(2);



    // const [users] = await connection.query(`SELECT * FROM commission WHERE 1 ORDER BY id DESC LIMIT ${pageno}, ${limit} `);
    const [total_users] = await connection.query(`SELECT * FROM business_statics WHERE  1`);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: rows,

        totalAmount: totalAmount,
        totalWining: totalWining,
        totalRecharge: totalRecharge,


        page_total: Math.ceil(total_users.length / limit)
    });
}

const commissionSettingRechrage = async(req, res) => {
    let auth = req.cookies.auth;


    let recharge_level_1 = req.body.recharge_level_1;
    let recharge_level_2 = req.body.recharge_level_2;
    let recharge_level_3 = req.body.recharge_level_3;
    let recharge_level_4 = req.body.recharge_level_4;
    let recharge_level_5 = req.body.recharge_level_5;
    let recharge_level_6 = req.body.recharge_level_6;
    let recharge_level_7 = req.body.recharge_level_7;
    let recharge_level_8 = req.body.recharge_level_8;
    let recharge_level_9 = req.body.recharge_level_9;
    let recharge_level_10 = req.body.recharge_level_10;
    let recharge_level_11 = req.body.recharge_level_11;
    let recharge_level_12 = req.body.recharge_level_12;
    let recharge_level_13 = req.body.recharge_level_13;
    let recharge_level_14 = req.body.recharge_level_14;
    let recharge_level_15 = req.body.recharge_level_15;
    let recharge_level_16 = req.body.recharge_level_16;
    let recharge_level_17 = req.body.recharge_level_17;
    let recharge_level_18 = req.body.recharge_level_18;
    let recharge_level_19 = req.body.recharge_level_19;
    let recharge_level_20 = req.body.recharge_level_20;

    try {



        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_1'`, [recharge_level_1]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_2'`, [recharge_level_2]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_3'`, [recharge_level_3]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_4'`, [recharge_level_4]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_5'`, [recharge_level_5]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_6'`, [recharge_level_6]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_7'`, [recharge_level_7]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_8'`, [recharge_level_8]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_9'`, [recharge_level_9]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_10'`, [recharge_level_10]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_11'`, [recharge_level_11]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_12'`, [recharge_level_12]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_13'`, [recharge_level_13]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_14'`, [recharge_level_14]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_15'`, [recharge_level_15]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_16'`, [recharge_level_16]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_17'`, [recharge_level_17]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_18'`, [recharge_level_18]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_19'`, [recharge_level_19]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='recharge_level_20'`, [recharge_level_20]);



        return res.status(200).json({
            message: 'Successfully changed',
            status: true,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const commissionSettingTrade = async(req, res) => {
    let auth = req.cookies.auth;


    let trade_level_1 = req.body.trade_level_1;
    let trade_level_2 = req.body.trade_level_2;
    let trade_level_3 = req.body.trade_level_3;
    let trade_level_4 = req.body.trade_level_4;
    let trade_level_5 = req.body.trade_level_5;
    let trade_level_6 = req.body.trade_level_6;
    let trade_level_7 = req.body.trade_level_7;
    let trade_level_8 = req.body.trade_level_8;
    let trade_level_9 = req.body.trade_level_9;
    let trade_level_10 = req.body.trade_level_10;
    let trade_level_11 = req.body.trade_level_11;
    let trade_level_12 = req.body.trade_level_12;
    let trade_level_13 = req.body.trade_level_13;
    let trade_level_14 = req.body.trade_level_14;
    let trade_level_15 = req.body.trade_level_15;
    let trade_level_16 = req.body.trade_level_16;
    let trade_level_17 = req.body.trade_level_17;
    let trade_level_18 = req.body.trade_level_18;
    let trade_level_19 = req.body.trade_level_19;
    let trade_level_20 = req.body.trade_level_20;

    try {



        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_1'`, [trade_level_1]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_2'`, [trade_level_2]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_3'`, [trade_level_3]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_4'`, [trade_level_4]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_5'`, [trade_level_5]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_6'`, [trade_level_6]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_7'`, [trade_level_7]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_8'`, [trade_level_8]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_9'`, [trade_level_9]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_10'`, [trade_level_10]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_11'`, [trade_level_11]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_12'`, [trade_level_12]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_13'`, [trade_level_13]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_14'`, [trade_level_14]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_15'`, [trade_level_15]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_16'`, [trade_level_16]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_17'`, [trade_level_17]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_18'`, [trade_level_18]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_19'`, [trade_level_19]);
        await connection.query(`UPDATE tbl_config SET value = ? WHERE name ='trade_level_20'`, [trade_level_20]);



        return res.status(200).json({
            message: 'Successfully changed',
            status: true,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}
const getLevelSettingData = async(req, res) => {
    try {


        let auth = req.cookies.auth;
        if (!auth) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }


        const rechargeLevelsQuery = `
    SELECT \`name\`, \`value\`
    FROM \`tbl_config\`
    WHERE \`name\` IN (
        'recharge_level_1', 'recharge_level_2', 'recharge_level_3', 'recharge_level_4', 'recharge_level_5',
        'recharge_level_6', 'recharge_level_7', 'recharge_level_8', 'recharge_level_9', 'recharge_level_10',
        'recharge_level_11', 'recharge_level_12', 'recharge_level_13', 'recharge_level_14', 'recharge_level_15',
        'recharge_level_16', 'recharge_level_17', 'recharge_level_18', 'recharge_level_19', 'recharge_level_20'
    );
`;

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

        const [rechargeLevels] = await connection.query(rechargeLevelsQuery);
        const [tradeLevels] = await connection.query(tradeLevelsQuery);

        // Create a map to easily retrieve values by name
        const rechargeMap = Object.fromEntries(rechargeLevels.map(item => [item.name, item.value || '0']));
        const tradeMap = Object.fromEntries(tradeLevels.map(item => [item.name, item.value || '0']));

        // Prepare the response object dynamically
        let response = {
            message: 'Success',
            status: true,
        };

        // Add recharge levels to the response
        for (let i = 1; i <= 20; i++) {
            response[`rechargeLevel_${i}`] = rechargeMap[`recharge_level_${i}`];
        }

        // Add trade levels to the response
        for (let i = 1; i <= 20; i++) {
            response[`tradeLevel_${i}`] = tradeMap[`trade_level_${i}`];
        }

        return res.status(200).json(response);
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Failed',
            status: false,
        });
    }
}
const levelSetupPage = async(req, res) => {
    return res.render("manage/levelSetup.ejs");
}

// Function to set admin wallet private key
const setAdminPrivateKey = async(req, res) => {
    try {
        let auth = req.cookies.auth;
        let adminPrivateKey = req.body.adminPrivateKey;

        if (!auth || !adminPrivateKey) {
            return res.status(200).json({
                message: 'Missing required parameters',
                status: false
            });
        }

            await connection.query("UPDATE `admin` SET `pkey` = ? WHERE `id` = 1", [adminPrivateKey]);
       
        return res.status(200).json({
            message: 'Admin private key updated successfully',
            status: true
        });
    } catch (error) {
        console.error('Error setting admin private key:', error);
        return res.status(500).json({
            message: 'Error setting admin private key: ' + error.message,
            status: false
        });
    }
}

// News Management Functions
const newsPage = async(req, res) => {
    return res.render("manage/news.ejs");
}

const listNews = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                newslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                newslist: [],
            },
            status: false
        });
    }

    try {
        const [news] = await connection.query(`SELECT * FROM news ORDER BY created_at DESC LIMIT ${pageno}, ${limit}`);
        const [total_news] = await connection.query(`SELECT * FROM news`);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: news,
            page_total: Math.ceil(total_news.length / limit)
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching news',
            status: false,
            error: error.message
        });
    }
}

const createNews = async(req, res) => {
    let auth = req.cookies.auth;
    let { title, content, type } = req.body;

    if (!auth || !title || !content || !type) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `INSERT INTO news SET title = ?, content = ?, type = ?, status = 1, views = 0, is_new = 1, created_by = 'admin', created_at = NOW()`;
        await connection.execute(sql, [title, content, type]);

        return res.status(200).json({
            message: 'News created successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error creating news',
            status: false,
            error: error.message
        });
    }
}

const updateNews = async(req, res) => {
    let auth = req.cookies.auth;
    let { id, title, content, type, status } = req.body;

    if (!auth || !id) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `UPDATE news SET title = ?, content = ?, type = ?, status = ?, updated_at = NOW() WHERE id = ?`;
        await connection.execute(sql, [title, content, type, status, id]);

        return res.status(200).json({
            message: 'News updated successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error updating news',
            status: false,
            error: error.message
        });
    }
}

const deleteNews = async(req, res) => {
    let auth = req.cookies.auth;
    let { id } = req.body;

    if (!auth || !id) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `DELETE FROM news WHERE id = ?`;
        await connection.execute(sql, [id]);

        return res.status(200).json({
            message: 'News deleted successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error deleting news',
            status: false,
            error: error.message
        });
    }
}

const getNewsById = async(req, res) => {
    let { id } = req.params;

    if (!id) {
        return res.status(200).json({
            message: 'Missing news ID',
            status: false,
        });
    }

    try {
        const [news] = await connection.query(`SELECT * FROM news WHERE id = ?`, [id]);

        if (news.length === 0) {
            return res.status(200).json({
                message: 'News not found',
                status: false,
            });
        }

        return res.status(200).json({
            message: 'Success',
            status: true,
            data: news[0]
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching news',
            status: false,
            error: error.message
        });
    }
}

// Public API for user-side news
const getPublicNews = async(req, res) => {
    try {
        const [news] = await connection.query(`
            SELECT id, title, content, type, views, is_new, created_at
            FROM news
            WHERE status = 1
            ORDER BY created_at DESC
            LIMIT 50
        `);

        // Format the news data to match the frontend expectations
        const formattedNews = news.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            type: item.type,
            views: item.views,
            isNew: item.is_new === 1,
            date: new Date(item.created_at).toISOString().split('T')[0],
            time: new Date(item.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        }));

        return res.status(200).json({
            message: 'Success',
            status: true,
            news: formattedNews
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching news',
            status: false,
            news: []
        });
    }
}

// Support Management Functions
const supportPage = async(req, res) => {
    return res.render("manage/support.ejs");
}

const p2pTransfersPage = async(req, res) => {
    return res.render("manage/p2p-transfers.ejs");
}

const listP2PTransfers = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false,
        });
    }

    const [p2p_transfers] = await connection.query(`
        SELECT bt.*,
               u1.name_user as sender_name,
               u2.name_user as receiver_name,
               DATE_FORMAT(FROM_UNIXTIME(bt.datetime/1000), '%Y-%m-%d %H:%i:%s') as transfer_time
        FROM balance_transfer bt
        LEFT JOIN users u1 ON bt.sender_phone = u1.phone
        LEFT JOIN users u2 ON bt.receiver_phone = u2.phone
        ORDER BY bt.datetime DESC
        LIMIT ${pageno}, ${limit}
    `);

    const [total_count] = await connection.query('SELECT COUNT(*) as total FROM balance_transfer');

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: p2p_transfers,
        total: total_count[0].total,
    });
}

// Support Tickets Management
const listSupportTickets = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: { ticketlist: [] },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: { ticketlist: [] },
            status: false
        });
    }

    try {
        const [tickets] = await connection.query(`
            SELECT st.*, u.name_user
            FROM support_tickets st
            LEFT JOIN users u ON st.user_phone = u.phone
            ORDER BY st.created_at DESC
            LIMIT ${pageno}, ${limit}
        `);
        const [total_tickets] = await connection.query(`SELECT * FROM support_tickets`);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: tickets,
            page_total: Math.ceil(total_tickets.length / limit)
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching tickets',
            status: false,
            error: error.message
        });
    }
}

const updateTicketStatus = async(req, res) => {
    let auth = req.cookies.auth;
    let { id, status, admin_response } = req.body;

    if (!auth || !id || !status) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        let updateFields = 'status = ?';
        let updateValues = [status, id];

        if (admin_response) {
            updateFields += ', admin_response = ?';
            updateValues.splice(-1, 0, admin_response);
        }

        if (status === 'resolved' || status === 'closed') {
            updateFields += ', resolved_at = NOW()';
        }

        const sql = `UPDATE support_tickets SET ${updateFields}, updated_at = NOW() WHERE id = ?`;
        await connection.execute(sql, updateValues);

        return res.status(200).json({
            message: 'Ticket updated successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error updating ticket',
            status: false,
            error: error.message
        });
    }
}

// FAQ Management
const listFAQs = async(req, res) => {
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: { faqlist: [] },
            status: false
        });
    }

    try {
        const [faqs] = await connection.query(`
            SELECT * FROM support_faqs
            ORDER BY display_order ASC, created_at DESC
            LIMIT ${pageno}, ${limit}
        `);
        const [total_faqs] = await connection.query(`SELECT * FROM support_faqs`);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: faqs,
            page_total: Math.ceil(total_faqs.length / limit)
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching FAQs',
            status: false,
            error: error.message
        });
    }
}

const createFAQ = async(req, res) => {
    let auth = req.cookies.auth;
    let { question, answer, category, display_order } = req.body;

    if (!auth || !question || !answer) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `INSERT INTO support_faqs SET question = ?, answer = ?, category = ?, display_order = ?, created_by = 'admin', created_at = NOW()`;
        await connection.execute(sql, [question, answer, category || 'general', display_order || 0]);

        return res.status(200).json({
            message: 'FAQ created successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error creating FAQ',
            status: false,
            error: error.message
        });
    }
}

const updateFAQ = async(req, res) => {
    let auth = req.cookies.auth;
    let { id, question, answer, category, display_order, status } = req.body;

    if (!auth || !id) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `UPDATE support_faqs SET question = ?, answer = ?, category = ?, display_order = ?, status = ?, updated_at = NOW() WHERE id = ?`;
        await connection.execute(sql, [question, answer, category, display_order, status, id]);

        return res.status(200).json({
            message: 'FAQ updated successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error updating FAQ',
            status: false,
            error: error.message
        });
    }
}

const deleteFAQ = async(req, res) => {
    let auth = req.cookies.auth;
    let { id } = req.body;

    if (!auth || !id) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `DELETE FROM support_faqs WHERE id = ?`;
        await connection.execute(sql, [id]);

        return res.status(200).json({
            message: 'FAQ deleted successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error deleting FAQ',
            status: false,
            error: error.message
        });
    }
}

// Contact Methods Management
const listContacts = async(req, res) => {
    try {
        const [contacts] = await connection.query(`
            SELECT * FROM support_contacts
            ORDER BY display_order ASC, created_at DESC
        `);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: contacts
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching contacts',
            status: false,
            error: error.message
        });
    }
}

const updateContact = async(req, res) => {
    let auth = req.cookies.auth;
    let { id, title, value, description, status, display_order, is_active } = req.body;

    if (!auth || !id) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        const sql = `UPDATE support_contacts SET title = ?, value = ?, description = ?, status = ?, display_order = ?, is_active = ?, updated_at = NOW() WHERE id = ?`;
        await connection.execute(sql, [title, value, description, status, display_order, is_active, id]);

        return res.status(200).json({
            message: 'Contact updated successfully',
            status: true,
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error updating contact',
            status: false,
            error: error.message
        });
    }
}

// Public APIs for user-side support
const getPublicFAQs = async(req, res) => {
    try {
        const [faqs] = await connection.query(`
            SELECT question, answer, category
            FROM support_faqs
            WHERE status = 1
            ORDER BY display_order ASC, created_at DESC
        `);

        return res.status(200).json({
            message: 'Success',
            status: true,
            faqs: faqs
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching FAQs',
            status: false,
            faqs: []
        });
    }
}

const getPublicContacts = async(req, res) => {
    try {
        const [contacts] = await connection.query(`
            SELECT type, title, value, description, status
            FROM support_contacts
            WHERE is_active = 1
            ORDER BY display_order ASC
        `);

        return res.status(200).json({
            message: 'Success',
            status: true,
            contacts: contacts
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error fetching contacts',
            status: false,
            contacts: []
        });
    }
}

const submitSupportTicket = async(req, res) => {
    let { category, subject, description, priority } = req.body;
    let user_phone = null;

    // Try to get user phone from auth token if available
    try {
        let auth = req.cookies.auth;
        if (auth) {
            const [user] = await connection.query('SELECT phone FROM users WHERE token = ? AND veri = 1', [auth]);
            if (user.length > 0) {
                user_phone = user[0].phone;
            }
        }
    } catch (error) {
        // Continue without user phone if auth fails
    }

    if (!category || !subject || !description) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
        });
    }

    try {
        // Generate unique ticket ID
        const ticket_id = 'WINGO' + Date.now() + Math.floor(Math.random() * 1000);

        const sql = `INSERT INTO support_tickets SET ticket_id = ?, user_phone = ?, category = ?, subject = ?, description = ?, priority = ?, status = 'open', created_at = NOW()`;
        await connection.execute(sql, [ticket_id, user_phone, category, subject, description, priority || 'normal']);

        return res.status(200).json({
            message: 'Support ticket submitted successfully',
            status: true,
            ticketId: ticket_id
        });
    } catch (error) {
        return res.status(200).json({
            message: 'Error submitting ticket',
            status: false,
            error: error.message
        });
    }
}

const loginAsUser = async(req, res) => {
    let { phone } = req.params;

    if (!phone) {
        return res.status(400).send("Phone number is required.");
    }

    try {
        const [rows] = await connection.query('SELECT * FROM users WHERE phone = ?', [phone]);
        if (rows.length == 1) {
            if (rows[0].status == 1) {
                const user = rows[0];
                const { password, money, ip, veri, ip_address, status, time, ...others } = user;
                const accessToken = jwt.sign({
                    user: { ...others },
                    timeNow: timeNow
                }, process.env.JWT_ACCESS_TOKEN, { expiresIn: "1d" });
                
                const md5Token = md5(accessToken);
                await connection.execute('UPDATE `users` SET `token` = ? WHERE `phone` = ? ', [md5Token, phone]);
                
                res.cookie('auth', md5Token, { maxAge: 86400000, httpOnly: true }); // 1 day
                res.cookie('token', accessToken, { maxAge: 86400000, httpOnly: true }); // 1 day
                
                return res.redirect('/');
            } else {
                return res.status(403).send("User account is locked.");
            }
        } else {
            return res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Login as user error:", error);
        return res.status(500).send("Internal server error.");
    }
}

module.exports = {
    businessStaticsList,
    adminPage,
    adminPage3,
    adminPage5,
    adminPage10,
    totalJoin,
    middlewareAdminController,
    changeAdmin,
    membersPage,
    DailySalaryIncome,
    WeeklySalaryIncome,
    MonthlySalaryIncome,
    DailyTradeVolumeIncome,
    depositBonusPage,
    extraBonusPage,
    listDepositBonus,
    listExtraBonus,
    listMember,
    infoMember,
    userInfo,
    statistical,
    statistical2,
    rechargePage,
    recharge,
    rechargeDuyet,
    rechargeRecord,
    withdrawRecord,
    withdraw,
    levelSetting,
    handlWithdraw,
    settings,
    aviatorSettings,
    aviSettings,
    BusinessStatics,
    editResult2,
    listDailySalaryIncome,
    settingBank,
    settingGet,
    settingCskh,
    settingbuff,
    register,
    ctvPage,
    listCTV,
    profileUser,
    ctvProfilePage,
    infoCtv,
    infoCtv2,
    giftPage,
    createBonus,
    listRedenvelops,
    banned,
    listRechargeMem,
    listWithdrawMem,
    getLevelInfo,
    listRedenvelope,
    listBet,
    adminPage5d,
    listOrderOld,
    listOrderOldK3,
    editResult,
    adminPageK3,
    updateLevel,
    CreatedSalaryRecord,
    CreatedSalary,
    getSalary,
    referralBonus,
    listTardeLevel,
    listreferralBonus,
    giftUsesHistory,
    getGiftHistory,
    blockSecond,
    commissionSetting,
    commissionSettingRechrage,
    commissionSettingTrade,
    getLevelSettingData,
    levelSetupPage,
    socialCampaignsPage,
    setAdminPrivateKey,
    newsPage,
    listNews,
    createNews,
    updateNews,
    deleteNews,
    getNewsById,
    getPublicNews,
    supportPage,
    listSupportTickets,
    updateTicketStatus,
    listFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    listContacts,
    updateContact,
    getPublicFAQs,
    getPublicContacts,
    submitSupportTicket,
    p2pTransfersPage,
    listP2PTransfers,
    loginAsUser
}