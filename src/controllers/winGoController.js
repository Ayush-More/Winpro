import connection from "../config/connectDB";
// import jwt from 'jsonwebtoken'
// import md5 from "md5";
// import e from "express";
require('dotenv').config();

const getDateFormat = (Reqdate) => {
    let dateObj = new Date(Reqdate);
    dateObj.setDate(dateObj.getDate() + 1);
    let formattedNewDate = dateObj.toISOString().slice(0, 10);
    return formattedNewDate;
};
const winGoPage = async (req, res) => {
    return res.render("bet/wingo/win.ejs");
}

const winGoPage3 = async (req, res) => {
    return res.render("bet/wingo/win3.ejs");
}

const winGoPage5 = async (req, res) => {
    return res.render("bet/wingo/win5.ejs");
}

const winGoPage10 = async (req, res) => {
    return res.render("bet/wingo/win10.ejs");
}


const isNumber = (params) => {
    let pattern = /^[0-9]*\d$/;
    return pattern.test(params);
}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
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

const rosesPlus = async (auth, money) => {
    const [level] = await connection.query('SELECT * FROM level ');

    const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `user_level`, `total_money` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ', [auth]);
    let userInfo = user[0];
    const [f1] = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level`, `total_money` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [userInfo.invite]);

    if (userInfo.total_money >= 100) {
        if (f1.length > 0) {
            let infoF1 = f1[0];
            for (let levelIndex = 1; levelIndex <= 6; levelIndex++) {
                let rosesF = 0;
                if (infoF1.user_level >= levelIndex && infoF1.total_money >= 100) {
                    rosesF = (money / 100) * level[levelIndex - 1].f1;
                    if (rosesF > 0) {
                        await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF, rosesF, rosesF, infoF1.phone]);
                        let timeNow = Date.now();
                        const sql2 = `INSERT INTO roses SET 
                            phone = ?,
                            code = ?,
                            invite = ?,
                            f1 = ?,
                            time = ?`;
                        await connection.execute(sql2, [infoF1.phone, infoF1.code, infoF1.invite, rosesF, timeNow]);

                        const sql3 = `
                            INSERT INTO turn_over (phone, code, invite, daily_turn_over, total_turn_over)
                            VALUES (?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                            daily_turn_over = daily_turn_over + VALUES(daily_turn_over),
                            total_turn_over = total_turn_over + VALUES(total_turn_over)
                            `;

                        await connection.execute(sql3, [infoF1.phone, infoF1.code, infoF1.invite, money, money]);
                    }
                }
                const [fNext] = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level`, `total_money` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [infoF1.invite]);
                if (fNext.length > 0) {
                    infoF1 = fNext[0];
                } else {
                    break;
                }
            }
        }
    }
}



// const rosesPlus = async (auth, money) => {
//     const [level] = await connection.query('SELECT * FROM level ');
//     let level0 = level[0];

//     const [user] = await connection.query('SELECT `phone`, `code`, `invite` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
//     let userInfo = user[0];
//     const [f1] = await connection.query('SELECT `phone`, `code`, `invite`, `rank` FROM users WHERE code = ? AND veri = 1  LIMIT 1 ', [userInfo.invite]);
//     if (money >= 10000) {
//         if (f1.length > 0) {
//             let infoF1 = f1[0];
//             let rosesF1 = (money / 100) * level0.f1;
//             await connection.query('UPDATE users SET money = money + ?, roses_f1 = roses_f1 + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF1, rosesF1, rosesF1, rosesF1, infoF1.phone]);
//             const [f2] = await connection.query('SELECT `phone`, `code`, `invite`, `rank` FROM users WHERE code = ? AND veri = 1  LIMIT 1 ', [infoF1.invite]);
//             if (f2.length > 0) {
//                 let infoF2 = f2[0];
//                 let rosesF2 = (money / 100) * level0.f2;
//                 await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF2, rosesF2, rosesF2, infoF2.phone]);
//                 const [f3] = await connection.query('SELECT `phone`, `code`, `invite`, `rank` FROM users WHERE code = ? AND veri = 1  LIMIT 1 ', [infoF2.invite]);
//                 if (f3.length > 0) {
//                     let infoF3 = f3[0];
//                     let rosesF3 = (money / 100) * level0.f3;
//                     await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF3, rosesF3, rosesF3, infoF3.phone]);
//                     const [f4] = await connection.query('SELECT `phone`, `code`, `invite`, `rank` FROM users WHERE code = ? AND veri = 1  LIMIT 1 ', [infoF3.invite]);
//                     if (f4.length > 0) {
//                         let infoF4 = f4[0];
//                         let rosesF4 = (money / 100) * level0.f4;
//                         await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF4, rosesF4, rosesF4, infoF4.phone]);
//                     }
//                 }
//             }

//         }
//     }
// }


// const rosesPlus = async (auth, money) => {
//     const [level] = await connection.query('SELECT * FROM level ');

//     const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `user_level` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ', [auth]);
//     let userInfo = user[0];
//     const [f1] = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [userInfo.invite]);

//     if (money < 300) {
//         return; // No need to proceed if money is less than 300
//     }

//     if (f1.length === 0) {
//         return; // No referrer found
//     }

//     let infoF1 = f1[0];

//     const f2 = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [infoF1.invite]);
//     if (f2.length > 0) {
//         let infoF2 = f2[0];
//         if (infoF2.user_level >= 2) {
//             let rosesF2 = (money / 100) * level[1].f1;
//             await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF2, rosesF2, rosesF2, infoF2.phone]);
//         }

//         const f3 = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [infoF2.invite]);
//         if (f3.length > 0) {
//             let infoF3 = f3[0];
//             if (infoF3.user_level >= 3) {
//                 let rosesF3 = (money / 100) * level[2].f1;
//                 await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF3, rosesF3, rosesF3, infoF3.phone]);
//             }

//             const f4 = await connection.query('SELECT `phone`, `code`, `invite`, `rank`, `user_level` FROM users WHERE code = ? AND veri = 1 LIMIT 1 ', [infoF3.invite]);
//             if (f4.length > 0) {
//                 let infoF4 = f4[0];
//                 if (infoF4.user_level >= 4) {
//                     let rosesF4 = (money / 100) * level[3].f1;
//                     await connection.query('UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF4, rosesF4, rosesF4, infoF4.phone]);
//                 }
//             }
//         }
//     }
// }


// const rosesPlus = async (auth, money) => {
//     const [level] = await connection.query('SELECT * FROM level ');
//     const [user] = await connection.query('SELECT `phone`, `code`, `invite` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
//     let userInfo = user[0];
//     const [f1] = await connection.query('SELECT `phone`, `code`, `invite`, `rank` FROM users WHERE code = ? AND veri = 1  LIMIT 1 ', [userInfo.invite]);
//     let infoF1 = f1[0];

//     const [check_invite] = await connection.query('SELECT * FROM users WHERE invite = ?', [userInfo.invite]);
//     if (money >= 300) {
//         let levels = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44];
//         let levelIndex = levels.findIndex(levelThreshold => check_invite.length < levelThreshold);

//         if (levelIndex !== -1) {
//             let rosesF1 = (money / 100) * level[levelIndex].f1;
//             await connection.query('UPDATE users SET money = money + ?, roses_f1 = roses_f1 + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ? ', [rosesF1, rosesF1, rosesF1, rosesF1, infoF1.phone]);
//         }
//     }
// }


const betWinGo = async (req, res) => {
    let { typeid, join, x, money } = req.body;
    let auth = req.cookies.auth;

    if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
        return res.status(200).json({
            message: 'Error!!!',
            status: true
        });
    }

    const [wingo_status] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'wingo_status'");
    
    let wingoStatus            = wingo_status[0].value;  
            
            if(wingoStatus !='Y')
            {
            return res.status(200).json({
            message: 'Please try some time later!',
            status: true
            });
            }
            
            
            
    let gameJoin = '';
    if (typeid == 1) gameJoin = 'wingo';
    if (typeid == 3) gameJoin = 'wingo3';
    if (typeid == 5) gameJoin = 'wingo5';
    if (typeid == 10) gameJoin = 'wingo10';
    const [winGoNow] = await connection.query(`SELECT period FROM wingo WHERE status = 0 AND game = '${gameJoin}' ORDER BY id DESC LIMIT 1 `);
    const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `level`, `money` , `temp_money` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
    if (!winGoNow[0] || !user[0] || !isNumber(x) || !isNumber(money)) {
        return res.status(200).json({
            message: 'Error!',
            status: true
        });
    }

    let userInfo = user[0];
    let period = winGoNow[0].period;
    let fee = (x * money) * 0.02;
    let total = (x * money) - fee;
    let timeNow = Date.now();
    let check = userInfo.money - total;

    fee = parseFloat(fee.toFixed(2));
    total = parseFloat(total.toFixed(2));
    let amount = (x * money);

    let date = new Date();
    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());
    let id_product = years + months + days + Math.floor(Math.random() * 1000000000000000);

    let formatTime = timerJoin();

    let color = '';
    if (join == 'l') {
        color = 'big';
    } else if (join == 'n') {
        color = 'small';
    } else if (join == 't') {
        color = 'violet';
    } else if (join == 'd') {
        color = 'red';
    } else if (join == 'x') {
        color = 'green';
    } else if (join == '0') {
        color = 'red-violet';
    } else if (join == '5') {
        color = 'green-violet';
    } else if (join % 2 == 0) {
        color = 'red';
    } else if (join % 2 != 0) {
        color = 'green';
    }

    let checkJoin = '';

    if (!isNumber(join) && join == 'l' || join == 'n') {
        checkJoin = `
        <div data-v-a9660e98="" class="van-image" style="width: 30px; height: 30px;">
            <img src="/images/${(join == 'n') ? 'small' : 'big'}.png" class="van-image__img">
        </div>
        `
    } else {
        checkJoin =
            `
        <span data-v-a9660e98="">${(isNumber(join)) ? join : ''}</span>
        `
    }


    let result = `
    <div data-v-a9660e98="" issuenumber="${period}" addtime="${formatTime}" rowid="1" class="hb">
        <div data-v-a9660e98="" class="item c-row">
            <div data-v-a9660e98="" class="result">
                <div data-v-a9660e98="" class="select select-${(color)}">
                    ${checkJoin}
                </div>
            </div>
            <div data-v-a9660e98="" class="c-row c-row-between info">
                <div data-v-a9660e98="">
                    <div data-v-a9660e98="" class="issueName">
                        ${period}
                    </div>
                    <div data-v-a9660e98="" class="tiem">${formatTime}</div>
                </div>
            </div>
        </div>
        <!---->
    </div>
    `;

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
    let checkTime = timerJoin(date.getTime());

    if (check >= 0) {
        const sql = "INSERT INTO minutes_1 SET  id_product = ?,        phone = ?,        code = ?,        invite = ?,        stage = ?,        level = ?,        money = ?,        amount = ?,        fee = ?,        `get` = ?,        game = ?,        bet = ?,        status = ?,        today = ?,        time = ?";
        // amount
        await connection.execute(sql, [id_product, userInfo.phone, userInfo.code, userInfo.invite, period, userInfo.level, total, amount, fee, 0, gameJoin, join, 0, checkTime, timeNow]);
        // await connection.execute(sql, [id_product, userInfo.phone, userInfo.code, userInfo.invite, period, userInfo.level, total, x, fee, 0, gameJoin, join, 0, checkTime, timeNow]);
        await connection.execute('UPDATE `users` SET `money` = `money` - ? WHERE `token` = ? ', [money * x, auth]);
        
        let tempMoney = userInfo.temp_money;
        let updateAmt;
        
        if (tempMoney >= money * x) 
        {
            updateAmt = tempMoney - money * x;
        } 
        else {
            updateAmt = 0;
        }
        
         await connection.execute('UPDATE `users` SET `temp_money` = ? WHERE `token` = ?', [updateAmt, auth]);
        
        
        
        const [users] = await connection.query('SELECT `money`, `level` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);
        await rosesPlus(auth, money * x);
        // const [level] = await connection.query('SELECT * FROM level ');
        // let level0 = level[0];
        // const sql2 = `INSERT INTO roses SET 
        // phone = ?,
        // code = ?,
        // invite = ?,
        // f1 = ?,
        // f2 = ?,
        // f3 = ?,
        // f4 = ?,
        // time = ?`;
        // let total_m = money * x;
        // let f1 = (total_m / 100) * level0.f1;
        // let f2 = (total_m / 100) * level0.f2;
        // let f3 = (total_m / 100) * level0.f3;
        // let f4 = (total_m / 100) * level0.f4;
        // await connection.execute(sql2, [userInfo.phone, userInfo.code, userInfo.invite, f1, f2, f3, f4, timeNow]);
        // console.log(level);
        return res.status(200).json({
            message: 'Successful bet',
            status: true,
            data: result,
            change: users[0].level,
            money: users[0].money,
        });
    } else {
        return res.status(200).json({
            message: 'The amount is not enough',
            status: false
        });
    }
}

const listOrderOld = async (req, res) => {
    let { typeid, pageno, pageto } = req.body;

    if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
        return res.status(200).json({
            message: 'Error!',
            status: true
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
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ', [auth]);

    let game = '';
    if (typeid == 1) game = 'wingo';
    if (typeid == 3) game = 'wingo3';
    if (typeid == 5) game = 'wingo5';
    if (typeid == 10) game = 'wingo10';

    const [wingo] = await connection.query(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT ${pageno}, ${pageto} `);
    const [wingoAll] = await connection.query(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' `);
    const [period] = await connection.query(`SELECT period FROM wingo WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    if (!wingo[0]) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!pageno || !pageto || !user[0] || !wingo[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: true
        });
    }
    let page = Math.ceil(wingoAll.length / 10);
    return res.status(200).json({
        code: 0,
        msg: "Receive success",
        data: {
            gameslist: wingo,
        },
        period: period[0].period,
        page: page,
        status: true
    });
}

const GetMyEmerdList = async (req, res) => {
    let { typeid, pageno, pageto } = req.body;

    // if (!pageno || !pageto) {
    //     pageno = 0;
    //     pageto = 10;
    // }

    if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
        return res.status(200).json({
            message: 'Error!',
            status: true
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
    let auth = req.cookies.auth;

    let game = '';
    if (typeid == 1) game = 'wingo';
    if (typeid == 3) game = 'wingo3';
    if (typeid == 5) game = 'wingo5';
    if (typeid == 10) game = 'wingo10';

    const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ', [auth]);
    const [minutes_1] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND game = '${game}' ORDER BY id DESC LIMIT ${Number(pageno) + ',' + Number(pageto)}`, [user[0].phone]);
    const [minutes_1All] = await connection.query(`SELECT * FROM minutes_1 WHERE phone = ? AND game = '${game}' ORDER BY id DESC `, [user[0].phone]);

    if (!minutes_1[0]) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!pageno || !pageto || !user[0] || !minutes_1[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: true
        });
    }
    let page = Math.ceil(minutes_1All.length / 10);

    let datas = minutes_1.map((data) => {
        let { id, phone, code, invite, level, game, ...others } = data;
        return others;
    });

    return res.status(200).json({
        code: 0,
        msg: "Receive success",
        data: {
            gameslist: datas,
        },
        page: page,
        status: true
    });
}

const addWinGo = async (game) => {
    try {
        let join = '';
        if (game == 1) join = 'wingo';
        if (game == 3) join = 'wingo3';
        if (game == 5) join = 'wingo5';
        if (game == 10) join = 'wingo10';

        const [winGoNow] = await connection.query(`SELECT period FROM wingo WHERE status = 0 AND game = "${join}" ORDER BY id DESC LIMIT 1 `);
        const [setting] = await connection.query('SELECT * FROM `admin` ');
        
        // Check if winGoNow has any results before accessing the first element
        if (!winGoNow || winGoNow.length === 0) {
            console.log(`No wingo data found for game: ${join}`);
            return; // Exit early if no data found
        }
        
        let period = winGoNow[0].period; // cầu hiện tại
        let amount = Math.floor(Math.random() * 10);
        const [minPlayers] = await connection.query(`SELECT * FROM minutes_1 WHERE status = 0 AND game = "${join}"`);
        if (minPlayers.length >= 2) {
            const betColumns = [
                // red_small 
                { name: 'red_0', bets: ['0', 't', 'd', 'n'] },
                { name: 'red_2', bets: ['2', 'd', 'n'] },
                { name: 'red_4', bets: ['4', 'd', 'n'] },
                // green small 
                { name: 'green_1', bets: ['1', 'x', 'n'] },
                { name: 'green_3', bets: ['3', 'x', 'n'] },
                // green big 
                { name: 'green_5', bets: ['5', 'x', 't', 'l'] },
                { name: 'green_7', bets: ['7', 'x', 'l'] },
                { name: 'green_9', bets: ['9', 'x', 'l'] },
                // red big 
                { name: 'red_6', bets: ['6', 'd', 'l'] },
                { name: 'red_8', bets: ['8', 'd', 'l'] }
            ];

            const totalMoneyPromises = betColumns.map(async column => {
                const [result] = await connection.query(`
                SELECT SUM(money) AS total_money
                FROM minutes_1
                WHERE game = "${join}" AND status = 0 AND bet IN (${column.bets.map(bet => `"${bet}"`).join(',')})
            `);
                return { name: column.name, total_money: result[0].total_money ? parseInt(result[0].total_money) : 0 };
            });

            const categories = await Promise.all(totalMoneyPromises);
            let smallestCategory = categories.reduce((smallest, category) =>
                (smallest === null || category.total_money < smallest.total_money) ? category : smallest
                , null);
            const colorBets = {
                red_6: [6],
                red_8: [8],
                red_2: [2], //0 removed 
                red_4: [4],
                green_3: [3],
                green_7: [7], //5 removed
                green_9: [9], //
                green_1: [1],
                green_5: [5],
                red_0: [0],
            };

            const betsForCategory = colorBets[smallestCategory.name] || [];
            const availableBets = betsForCategory.filter(bet =>
                !categories.find(category => category.name === smallestCategory.name && category.total_money < smallestCategory.total_money)
            );
            let lowestBet;
            if (availableBets.length > 0) {
                lowestBet = availableBets[0];
            } else {
                lowestBet = betsForCategory.reduce((lowest, bet) =>
                    (bet < lowest) ? bet : lowest
                );
            }

            amount = lowestBet;
        } else if (minPlayers.length === 1 && parseFloat(minPlayers[0].money) >= 20) {
            const betColumns = [
                { name: 'red_small', bets: ['0', '2', '4', 'd', 'n'] },
                { name: 'red_big', bets: ['6', '8', 'd', 'l'] },
                { name: 'green_big', bets: ['5', '7', '9', 'x', 'l'] },
                { name: 'green_small', bets: ['1', '3', 'x', 'n'] },
                { name: 'violet_small', bets: ['0', 't', 'n'] },
                { name: 'violet_big', bets: ['5', 't', 'l'] }
            ];

            const categories = await Promise.all(betColumns.map(async column => {
                const [result] = await connection.query(`
                    SELECT SUM(money) AS total_money
                    FROM minutes_1
                    WHERE game = "${join}" AND status = 0 AND bet IN (${column.bets.map(bet => `"${bet}"`).join(',')})
                `);
                return { name: column.name, total_money: parseInt(result[0]?.total_money) || 0 };
            }));

            const colorBets = {
                red_big: [6, 8],
                red_small: [2, 4], //0 removed 
                green_big: [7, 9], //5 removed
                green_small: [1, 3],
                violet_big: [5],
                violet_small: [0],
            };

            const smallestCategory = categories.reduce((smallest, category) =>
                (!smallest || category.total_money < smallest.total_money) ? category : smallest
            );

            const betsForCategory = colorBets[smallestCategory.name] || [];
            const availableBets = betsForCategory.filter(bet =>
                !categories.find(category => category.name === smallestCategory.name && category.total_money < smallestCategory.total_money)
            );

            const lowestBet = availableBets.length > 0 ? availableBets[0] : Math.min(...betsForCategory);
            amount = lowestBet;
        }

        // xanh đỏ tím
        let timeNow = Date.now();

        let nextResult = '';
        if (game == 1) nextResult = setting[0].wingo1;
        if (game == 3) nextResult = setting[0].wingo3;
        if (game == 5) nextResult = setting[0].wingo5;
        if (game == 10) nextResult = setting[0].wingo10;

        let newArr = '';
        if (nextResult == '-1') {
            await connection.execute(`UPDATE wingo SET amount = ?,status = ? WHERE period = ? AND game = "${join}"`, [amount, 1, period]);
            newArr = '-1';
        } else {
            let result = '';
            let arr = nextResult.split('|');
            let check = arr.length;
            if (check == 1) {
                newArr = '-1';
            } else {
                for (let i = 1; i < arr.length; i++) {
                    newArr += arr[i] + '|';
                }
                newArr = newArr.slice(0, -1);
            }
            result = arr[0];
            await connection.execute(`UPDATE wingo SET amount = ?,status = ? WHERE period = ? AND game = "${join}"`, [result, 1, period]);
        }
        const sql = `INSERT INTO wingo SET 
        period = ?,
        amount = ?,
        game = ?,
        status = ?,
        time = ?`;

        await connection.execute(sql, [Number(period) + 1, 0, join, 0, timeNow]);

        if (game == 1) join = 'wingo1';
        if (game == 3) join = 'wingo3';
        if (game == 5) join = 'wingo5';
        if (game == 10) join = 'wingo10';

        await connection.execute(`UPDATE admin SET ${join} = ?`, [newArr]);
    } catch (error) {
        if (error) {
            console.log(error);
        }
    }
}



const handlingWinGo1P = async (typeid) => {

    let game = '';
    if (typeid == 1) game = 'wingo';
    if (typeid == 3) game = 'wingo3';
    if (typeid == 5) game = 'wingo5';
    if (typeid == 10) game = 'wingo10';

    const [winGoNow] = await connection.query(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);

    // update ket qua
    await connection.execute(`UPDATE minutes_1 SET result = ? WHERE status = 0 AND game = '${game}'`, [winGoNow[0].amount]);
    let result = Number(winGoNow[0].amount);
    switch (result) {
        case 0:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "0" AND bet != "t" `, []);
            break;
        case 1:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "1" `, []);
            break;
        case 2:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "2" `, []);
            break;
        case 3:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "3" `, []);
            break;
        case 4:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "4" `, []);
            break;
        case 5:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "5" AND bet != "t" `, []);
            break;
        case 6:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "6" `, []);
            break;
        case 7:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "7" `, []);
            break;
        case 8:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "8" `, []);
            break;
        case 9:
            await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "9" `, []);
            break;
        default:
            break;
    }

    if (result < 5) {
        await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet = "l" `, []);
    } else {        
        await connection.execute(`UPDATE minutes_1 SET status = 2 WHERE status = 0 AND game = "${game}" AND bet = "n" `, []);
    }

    // lấy ra danh sách đặt cược chưa xử lý
    const [order] = await connection.execute(`SELECT * FROM minutes_1 WHERE status = 0 AND game = '${game}' `);
    for (let i = 0; i < order.length; i++) {
        let orders = order[i];
        let result = orders.result;
        let bet = orders.bet;
        let total = orders.money;
        let id = orders.id;
        let phone = orders.phone;
        var nhan_duoc = 0;
        
        let amount = orders.amount;
        
        
        // x - green
        // t - Violet
        // d - red 

        // Sirf 1-4 aur 6-9 tk hi *9 aana chahiye
        // Aur 0 aur 5 pe *4.5
        // Aur red aur green pe *2
        // 1,2,3,4,6,7,8,9


        if (bet == 'l' || bet == 'n') {
            nhan_duoc = total * 2;
        } else {
            if (result == 0 || result == 5) {
                if (bet == 'd' || bet == 'x') {
                    nhan_duoc = total * 1.5;
                } else if (bet == 't') {
                    nhan_duoc = total * 4.5;
                } else if (bet == "0" || bet == "5") {
                    nhan_duoc = total * 4.5;
                }
            } else {
                if (result == 1 && bet == "1") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 1 && bet == 'x') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 2 && bet == "2") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 2 && bet == 'd') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 3 && bet == "3") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 3 && bet == 'x') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 4 && bet == "4") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 4 && bet == 'd') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 6 && bet == "6") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 6 && bet == 'd') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 7 && bet == "7") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 7 && bet == 'x') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 8 && bet == "8") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 8 && bet == 'd') {
                        nhan_duoc = total * 2;
                    }
                }
                if (result == 9 && bet == "9") {
                    nhan_duoc = total * 9;
                } else {
                    if (result == 9 && bet == 'x') {
                        nhan_duoc = total * 2;
                    }
                }
            }
        }
        const [users] = await connection.execute('SELECT `money`,`temp_money` FROM `users` WHERE `phone` = ?', [phone]);
        // let totals = parseFloat(users[0].money) + parseFloat(nhan_duoc);
                let totals = (parseFloat(users[0].money) + parseFloat(nhan_duoc)).toFixed(2);
                totals = parseFloat(totals);
                
                let tempMoney = parseFloat(users[0].temp_money);  // Fixed the missing parenthesis
                
                if (tempMoney > 0) 
                {
                tempMoney = (tempMoney + parseFloat(amount)).toFixed(2);
                tempMoney = parseFloat(tempMoney);  // Convert back to float
                }           
         
    
        await connection.execute('UPDATE `minutes_1` SET `get` = ?, `status` = 1 WHERE `id` = ? ', [parseFloat(nhan_duoc), id]);
        const sql = 'UPDATE `users` SET `money` = ?   WHERE `phone` = ? '; // ,`temp_money` = ? 
        await connection.execute(sql, [totals, phone]); // tempMoney
    }
}


const handleInviteBonus = async (parentId) => {
 
    const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
    let Pdate = getDateFormat(process[0].date);
    let Pid = process[0].id;
    // let parentId = 1;

    const [totalCounts] = await connection.query(` SELECT COUNT(*) as total   FROM recharge  WHERE status = '1'  AND money > 300  AND phone IN (SELECT phone FROM users WHERE parent_id = ?)         LIMIT 1`, [parentId]);

    let totalReferral = Number(totalCounts[0].total);

    if (totalReferral > 0) {
        await connection.execute(`UPDATE users SET referral_count = ? WHERE id = ?`, [totalReferral, parentId]);

        const [row] = await connection.query(`SELECT phone FROM users WHERE id = ?`, [parentId]);
        let phone = row[0].phone;

        const [existRow] = await connection.query(`SELECT bonus_id FROM inc_invite_bonus WHERE phone = ?`, [phone]);
        let bonus_id = (existRow.length > 0 && existRow[0].bonus_id) ? existRow[0].bonus_id : 0;

        const bonuses = [
            { id: 1, amount: 55, threshold: 1 },
            { id: 2, amount: 155, threshold: 4 },
            { id: 3, amount: 555, threshold: 14 },
            { id: 4, amount: 1555, threshold: 44 },
            { id: 5, amount: 2955, threshold: 104 },
            { id: 6, amount: 5655, threshold: 204 },
            { id: 7, amount: 11555, threshold: 404 },
            { id: 8, amount: 28555, threshold: 904 },
            { id: 9, amount: 58555, threshold: 1904 },
            { id: 10, amount: 365555, threshold: 6904 },
            { id: 11, amount: 765555, threshold: 16904 },
            { id: 12, amount: 1655555, threshold: 36904 },
            { id: 13, amount: 3655555, threshold: 86904 },
        ];

        for (const bonus of bonuses) {
            if (bonus_id === (bonus.id - 1) && totalReferral >= bonus.threshold) {
                const [existingBonus] = await connection.query(`SELECT 1 FROM inc_invite_bonus WHERE phone = ? AND bonus_id = ?`, [phone, bonus.id]);
                if (existingBonus.length === 0) {
                    const sql = `INSERT INTO inc_invite_bonus (process_id, bonus_id, phone, amount, date_time) VALUES (?, ?, ?, ?, ?)`;
                    await connection.execute(sql, [Pid, bonus.id, phone, bonus.amount, Pdate]);
                    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [bonus.amount, bonus.amount, phone]);
                    bonus_id = bonus.id;
                }
            }
        }
   
} 
 
}

const processWinGoTradeLevelBonus = async (userInfo, betAmount, timeNow) => {
    try {
        // Only process if bet amount is significant (>= 50)
        if (betAmount < 50) return;

        let currentInviteCode = userInfo.invite;

        // Process up to 19 levels of referral bonuses
        for (let level = 1; level <= 19; level++) {
            if (!currentInviteCode) break;

            const [parentUser] = await connection.query(
                "SELECT phone, invite, total_money FROM users WHERE code = ?",
                [currentInviteCode]
            );

            if (!parentUser.length) break;

            const parent = parentUser[0];

            // Check if parent has minimum deposit requirement (100 INR)
            if (parent.total_money < 100) {
                currentInviteCode = parent.invite;
                continue;
            }

            // Get level percentage from configuration
            const [levelConfig] = await connection.query(
                "SELECT value FROM tbl_config WHERE name = ?",
                [`recharge_level_${level}`]
            );
            const levelPercent = parseFloat(levelConfig[0]?.value || '0');

            if (levelPercent > 0) {
                const levelAmount = (betAmount * levelPercent) / 100;

                // Insert level income record
                await connection.query(
                    `INSERT INTO inc_level (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['WinGo_Trade', 'WG_' + Date.now(), userInfo.phone, parent.phone, userInfo.phone, level, betAmount, levelPercent, levelAmount, new Date()]
                );

                // Credit bonus to parent's account
                await connection.query(
                    `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?`,
                    [levelAmount, levelAmount, parent.phone]
                );

                console.log(`WinGo Trade Level ${level} bonus: ₹${levelAmount} credited to ${parent.phone}`);
            }

            // Move to next level up
            currentInviteCode = parent.invite;
        }
    } catch (error) {
        console.error('Error processing WinGo trade level bonus:', error);
    }
}





module.exports = {
    winGoPage,
    betWinGo,
    listOrderOld,
    GetMyEmerdList,
    handlingWinGo1P,
    addWinGo,
    winGoPage3,
    winGoPage5,
    winGoPage10,
    processWinGoTradeLevelBonus,
    handleInviteBonus
}