import connection from "../config/connectDB";
// import jwt from 'jsonwebtoken'
// import md5 from "md5";
// import e from "express";
require("dotenv").config();

const CryptoJS = require("crypto-js");
const TronWeb = require("tronweb");
const axios = require("axios");

import moment from "moment";
import crypto from "crypto";
import querystring from "querystring";

const momentz = require("moment-timezone");
const indiaTime = momentz.tz("Asia/Kolkata");

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io", // You can use a different full node
  headers: { "TRON-PRO-API-KEY": "ed87edee-e471-4306-a4d2-d6901ca3c413" }, // Optional, if you have an API key
});

function formateT(params) {
  let result = params < 10 ? "0" + params : params;
  return result;
}

// Function to process loss rebate for losing bets
const processLossRebate = async (userPhone, betAmount, timeNow) => {
  try {
    // Get minimum bet amount and loss rebate percentage
    const [minBetConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'min_bet_amount'"
    );
    const [lossRebateConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'loss_rebate'"
    );

    const minBetAmount = parseFloat(minBetConfig[0]?.value || "50");
    const lossRebatePercent = parseFloat(lossRebateConfig[0]?.value || "1");

    // Only process if bet amount meets minimum requirement
    if (betAmount < minBetAmount || lossRebatePercent <= 0) return;

    // Calculate loss rebate
    const rebateAmount = (betAmount * lossRebatePercent) / 100;

    // Credit rebate to user's roses_f and roses_today
    await connection.query(
      `UPDATE users SET roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ?`,
      [rebateAmount, rebateAmount, userPhone]
    );

    // Record the rebate transaction
    await connection.query(
      `INSERT INTO roses (phone, code, invite, f1, f2, f3, f4, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userPhone, "", "", rebateAmount, 0, 0, 0, timeNow]
    );

    console.log(
      `TRX Loss rebate processed: ${rebateAmount} for phone ${userPhone}`
    );
  } catch (error) {
    console.error("Error processing TRX loss rebate:", error);
  }
};

// Function to process self-trade bonus for the betting user
const processSelfTradeBonus = async (userInfo, betAmount, timeNow) => {
  try {
    // Get minimum bet amount and self-trade bonus percentage
    const [minBetConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'min_bet_amount'"
    );
    const [selfBonusConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'self_trade_bonus'"
    );

    const minBetAmount = parseFloat(minBetConfig[0]?.value || "50");
    const selfBonusPercent = parseFloat(selfBonusConfig[0]?.value || "0.5");

    // Only process if bet amount meets minimum requirement
    if (betAmount < minBetAmount || selfBonusPercent <= 0) return;

    // Calculate self-trade bonus
    const selfBonus = (betAmount * selfBonusPercent) / 100;

    // Credit self-trade bonus to user's roses_f and roses_today
    await connection.query(
      `UPDATE users SET roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ?`,
      [selfBonus, selfBonus, userInfo.phone]
    );

    // Insert self-trade bonus record
    await connection.query(
      `INSERT INTO roses (phone, code, invite, f1, time) VALUES (?, ?, ?, ?, ?)`,
      [userInfo.phone, userInfo.code, userInfo.invite, selfBonus, timeNow]
    );

    console.log(
      `TRX Self-trade bonus: ₹${selfBonus} credited to ${userInfo.phone}`
    );
  } catch (error) {
    console.error("Error processing self-trade bonus:", error);
  }
};

// Function to process trade level bonuses
const processTradeLevelBonus = async (userInfo, totalAmount, timeNow) => {
  try {
    // Only process if bet amount is significant (>= 100)
    if (totalAmount < 100) return;

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
      const levelPercent = parseFloat(levelConfig[0]?.value || "0");

      if (levelPercent > 0) {
        const levelAmount = (totalAmount * levelPercent) / 100;

        // Insert level income record
        await connection.query(
          `INSERT INTO inc_level (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "TRX_Trade",
            "TRX_" + Date.now(),
            userInfo.phone,
            parent.phone,
            userInfo.phone,
            level,
            totalAmount,
            levelPercent,
            levelAmount,
            new Date(),
          ]
        );

        // Credit bonus to parent's account
        await connection.query(
          `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?`,
          [levelAmount, levelAmount, parent.phone]
        );

        console.log(
          `TRX Trade Level ${level} bonus: ₹${levelAmount} credited to ${parent.phone}`
        );
      }

      // Move to next level up
      currentInviteCode = parent.invite;
    }
  } catch (error) {
    console.error("Error processing trade level bonus:", error);
  }
};

const isNumber = (params) => {
  let pattern = /^[0-9]*\d$/;
  return pattern.test(params);
};
const blockPage = async (req, res) => {
  const blockId = req.params.blockId;

  return res.render("bet/trx/blockPage.ejs", { blockId });
};

const trxPage = async (req, res) => {
  return res.render("bet/trx/trx1.ejs");
};

const trxPage3 = async (req, res) => {
  return res.render("bet/trx/trx3.ejs");
};

const trxPage5 = async (req, res) => {
  return res.render("bet/trx/trx5.ejs");
};

const trxPage10 = async (req, res) => {
  return res.render("bet/trx/trx10.ejs");
};
const bettrx = async (req, res) => {
  let { typeid, join, x, money } = req.body;
  let auth = req.cookies.auth;

  if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
    return res.status(200).json({
      message: "Error!",
      status: true,
    });
  }

  let gameJoin = "";
  if (typeid == 1) gameJoin = "trx";
  if (typeid == 3) gameJoin = "trx3";
  if (typeid == 5) gameJoin = "trx5";
  if (typeid == 10) gameJoin = "trx10";

  const [block_trx] = await connection.query(
    "SELECT `value` FROM `tbl_config` WHERE `name` = 'block_trx'"
  );

  let blockTRX = block_trx[0].value;

  if (blockTRX != "Y") {
    return res.status(200).json({
      message: "Please try some time later!",
      status: true,
    });
  }

  //   if(gameJoin !='trx')
  //   {
  //         return res.status(200).json({
  //             message: 'Error!',
  //             status: true
  //         });
  //   }

  const [winGoNow] = await connection.query(
    `SELECT period FROM trx WHERE status = 0 AND game = '${gameJoin}' ORDER BY id DESC LIMIT 1 `
  );
  console.log(winGoNow);
  const [user] = await connection.query(
    "SELECT `phone`, `code`, `invite`, `level`, `money` , `temp_money` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ",
    [auth]
  );

  if (!winGoNow[0] || !user[0] || !isNumber(x) || !isNumber(money)) {
    return res.status(200).json({
      message: "Error hai!",
      status: true,
    });
  }
  const [alreadyBet] = await connection.query(
    "SELECT id FROM trx_result WHERE phone = ? AND stage = ? AND game = ? LIMIT 1",
    [user[0].phone, winGoNow[0].period, gameJoin]
  );

  // if (alreadyBet.length > 0) {
  //     return res.status(200).json({
  //         message: 'You have already placed a bet for this round!',
  //         status: false
  //     });
  // }

  let userInfo = user[0];
  let period = winGoNow[0].period;
  let fee = x * money * 0.02;
  let total = x * money - fee;
  let timeNow = Date.now();
  let check = userInfo.money - total;

  fee = parseFloat(fee);
  total = parseFloat(total);
  let amount = x * money;

  let date = new Date();
  let years = formateT(date.getFullYear());
  let months = formateT(date.getMonth() + 1);
  let days = formateT(date.getDate());
  let id_product =
    years + months + days + Math.floor(Math.random() * 1000000000000000);

  let formatTime = timerJoin();

  let color = "";
  if (join == "l") {
    color = "big";
  } else if (join == "n") {
    color = "small";
  } else if (join == "t") {
    color = "violet";
  } else if (join == "d") {
    color = "red";
  } else if (join == "x") {
    color = "green";
  } else if (join == "0") {
    color = "red-violet";
  } else if (join == "5") {
    color = "green-violet";
  } else if (join % 2 == 0) {
    color = "red";
  } else if (join % 2 != 0) {
    color = "green";
  }

  let checkJoin = "";

  if ((!isNumber(join) && join == "l") || join == "n") {
    checkJoin = `
        <div data-v-a9660e98="" class="van-image" style="width: 30px; height: 30px;">
            <img src="/images/${
              join == "n" ? "small" : "big"
            }.png" class="van-image__img">
        </div>
        `;
  } else {
    checkJoin = `
        <span data-v-a9660e98="">${isNumber(join) ? join : ""}</span>
        `;
  }

  let result = `
    <div data-v-a9660e98="" issuenumber="${period}" addtime="${formatTime}" rowid="1" class="hb">
        <div data-v-a9660e98="" class="item c-row">
            <div data-v-a9660e98="" class="result">
                <div data-v-a9660e98="" class="select select-${color}">
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

  function timerJoin(params = "", addHours = 0) {
    let date = "";
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

    return (
      years +
      "-" +
      months +
      "-" +
      days +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds +
      " " +
      ampm
    );
  }
  let checkTime = timerJoin(date.getTime());

  if (check >= 0) {
    const sql =
      "INSERT INTO trx_result SET  id_product = ?,        phone = ?,        code = ?,       invite = ?,        stage = ?,        level = ?,        money = ?,        amount = ?,        fee = ?,       `get` = ?,        game = ?,        bet = ?,        status = ?,        today = ?,        time = ?";

    // amount
    await connection.execute(sql, [
      id_product,
      userInfo.phone,
      userInfo.code,
      userInfo.invite,
      period,
      userInfo.level,
      total,
      amount,
      fee,
      0,
      gameJoin,
      join,
      0,
      checkTime,
      timeNow,
    ]);
    // await connection.execute(sql, [id_product, userInfo.phone, userInfo.code, userInfo.invite, period, userInfo.level, total, x, fee, 0, gameJoin, join, 0, checkTime, timeNow]);
    await connection.execute(
      "UPDATE `users` SET `money` = `money` - ? WHERE `token` = ? ",
      [money * x, auth]
    );

    let tempMoney = userInfo.temp_money;
    let updateAmt;

    if (tempMoney >= money * x) {
      updateAmt = tempMoney - money * x;
    } else {
      updateAmt = 0;
    }

    await connection.execute(
      "UPDATE `users` SET `temp_money` = ? WHERE `token` = ?",
      [updateAmt, auth]
    );

    const [users] = await connection.query(
      "SELECT `money`, `level` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ",
      [auth]
    );
    // await rosesPlus(auth, money * x);

    // Update turn_over table for bet tracking
    const betAmount = money * x;
    const sql_turnover = `
      INSERT INTO turn_over (phone, code, invite, daily_turn_over, total_turn_over)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      daily_turn_over = daily_turn_over + VALUES(daily_turn_over),
      total_turn_over = total_turn_over + VALUES(total_turn_over)
    `;
    await connection.execute(sql_turnover, [
      userInfo.phone,
      userInfo.code,
      userInfo.invite,
      betAmount,
      betAmount
    ]);

    // Process self-trade bonus for the user
    await processSelfTradeBonus(userInfo, money, timeNow);

    // Process trade level bonuses for TRX betting
    // await processTradeLevelBonus(userInfo, money * x, timeNow);
    return res.status(200).json({
      message: "Successful bet",
      status: true,
      data: result,
      change: users[0].level,
      money: users[0].money,
    });
  } else {
    return res.status(200).json({
      message: "The amount is not enough",
      status: false,
    });
  }
};
const listOrderOld = async (req, res) => {
  let { typeid, pageno, pageto } = req.body;

  if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
    return res.status(200).json({
      message: "Error!",
      status: true,
    });
  }
  if (pageno < 0 || pageto < 0) {
    return res.status(200).json({
      code: 0,
      msg: "No more data",
      data: {
        gameslist: [],
      },
      status: false,
    });
  }
  let auth = req.cookies.auth;
  const [user] = await connection.query(
    "SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1  LIMIT 1 ",
    [auth]
  );

  let game = "";
  if (typeid == 1) game = "trx";
  if (typeid == 3) game = "trx3";
  if (typeid == 5) game = "trx5";
  if (typeid == 10) game = "trx10";

  const [wingo] = await connection.query(
    `SELECT * FROM trx WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT ${pageno}, ${pageto} `
  );
  const [wingoAll] = await connection.query(
    `SELECT * FROM trx WHERE status != 0 AND game = '${game}' `
  );
  const [period] = await connection.query(
    `SELECT period,pre_block_hash FROM trx WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `
  );
  if (!wingo[0]) {
    return res.status(200).json({
      code: 0,
      msg: "No more data",
      data: {
        gameslist: [],
      },
      status: false,
    });
  }
  if (!pageno || !pageto || !user[0] || !wingo[0] || !period[0]) {
    return res.status(200).json({
      message: "Error!",
      status: true,
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
    pre_block_hash: period[0].pre_block_hash,
    page: page,
    status: true,
  });
};

// const GetMyEmerdList = async (req, res) => {
//     let { typeid, pageno, pageto } = req.body;

//     // if (!pageno || !pageto) {
//     //     pageno = 0;
//     //     pageto = 10;
//     // }

//     if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
//         return res.status(200).json({
//             message: 'Error!',
//             status: true
//         });
//     }

//     if (pageno < 0 || pageto < 0) {
//         return res.status(200).json({
//             code: 0,
//             msg: "No more data",
//             data: {
//                 gameslist: [],
//             },
//             status: false
//         });
//     }
//     let auth = req.cookies.auth;

//     let game = '';
//     if (typeid == 1) game = 'trx';
//     if (typeid == 3) game = 'trx3';
//     if (typeid == 5) game = 'trx5';
//     if (typeid == 10) game = 'trx10';

//     const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ', [auth]);
//     const [minutes_1] = await connection.query(`SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC LIMIT ${Number(pageno) + ',' + Number(pageto)}`, [user[0].phone]);
//     const [minutes_1All] = await connection.query(`SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC `, [user[0].phone]);

//     if (!minutes_1[0]) {
//         return res.status(200).json({
//             code: 0,
//             msg: "No more data",
//             data: {
//                 gameslist: [],
//             },
//             status: false
//         });
//     }
//     if (!pageno || !pageto || !user[0] || !minutes_1[0]) {
//         return res.status(200).json({
//             message: 'Error!',
//             status: true
//         });
//     }
//     let page = Math.ceil(minutes_1All.length / 10);

//     let datas = minutes_1.map((data) => {
//         let { id, phone, code, invite, level, game, ...others } = data;
//         return others;
//     });

//     return res.status(200).json({
//         code: 0,
//         msg: "Receive success",
//         data: {
//             gameslist: datas,
//         },
//         page: page,
//         status: true
//     });
// }

// const GetMyEmerdList = async (req, res) => {
//     let { typeid, pageno, pageto } = req.body;

//     if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
//         return res.status(200).json({
//             message: 'Error!',
//             status: true
//         });
//     }

//     // Default values if not provided
//     pageno = Number(pageno) || 0;
//     pageto = Number(pageto) || 10;

//     if (pageno < 0 || pageto < 0) {
//         return res.status(200).json({
//             code: 0,
//             msg: "No more data",
//             data: {
//                 gameslist: [],
//             },
//             status: false
//         });
//     }

//     let auth = req.cookies.auth;

//     let game = '';
//     if (typeid == 1) game = 'trx';
//     if (typeid == 3) game = 'trx3';
//     if (typeid == 5) game = 'trx5';
//     if (typeid == 10) game = 'trx10';

//     const [user] = await connection.query('SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ', [auth]);

//     if (!user[0]) {
//         return res.status(200).json({
//             message: 'Error!',
//             status: true
//         });
//     }

//     const [minutes_1] = await connection.query(`SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC LIMIT ${pageno}, ${pageto}`, [user[0].phone]);
//     const [minutes_1All] = await connection.query(`SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC `, [user[0].phone]);

//     if (minutes_1.length === 0) {
//         return res.status(200).json({
//             code: 0,
//             msg: "No more data",
//             data: {
//                 gameslist: [],
//             },
//             status: false
//         });
//     }

//     let total_pages = Math.ceil(minutes_1All.length / pageto);
//     let current_page = Math.floor(pageno / pageto) + 1;

//     let datas = minutes_1.map((data) => {
//         let { id, phone, code, invite, level, game, ...others } = data;
//         return others;
//     });

//     return res.status(200).json({
//         code: 0,
//         msg: "Receive success",
//         data: {
//             gameslist: datas,
//         },
//         page: total_pages,  // total pages
//         current_page: current_page,  // current page number
//         status: true
//     });
// }

const GetMyEmerdList = async (req, res) => {
  let { typeid, pageno } = req.body;

  if (typeid != 1 && typeid != 3 && typeid != 5 && typeid != 10) {
    return res.status(200).json({
      message: "Error!",
      status: true,
    });
  }

  // Default values if not provided
  pageno = Number(pageno) || 0;
  let pageto = 100; // Always fixed to 100, ignore input

  if (pageno < 0) {
    return res.status(200).json({
      code: 0,
      msg: "No more data",
      data: {
        gameslist: [],
      },
      status: false,
    });
  }

  let auth = req.cookies.auth;

  let game = "";
  if (typeid == 1) game = "trx";
  if (typeid == 3) game = "trx3";
  if (typeid == 5) game = "trx5";
  if (typeid == 10) game = "trx10";

  const [user] = await connection.query(
    "SELECT `phone`, `code`, `invite`, `level`, `money` FROM users WHERE token = ? AND veri = 1 LIMIT 1 ",
    [auth]
  );

  if (!user[0]) {
    return res.status(200).json({
      message: "Error!",
      status: true,
    });
  }

  const [minutes_1] = await connection.query(
    `SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC LIMIT ${pageno}, ${pageto}`,
    [user[0].phone]
  );
  const [minutes_1All] = await connection.query(
    `SELECT * FROM trx_result WHERE phone = ? AND game = '${game}' ORDER BY id DESC `,
    [user[0].phone]
  );

  if (minutes_1.length === 0) {
    return res.status(200).json({
      code: 0,
      msg: "No more data",
      data: {
        gameslist: [],
      },
      status: false,
    });
  }

  let total_pages = Math.ceil(minutes_1All.length / pageto);
  let current_page = Math.floor(pageno / pageto) + 1;

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
    page: total_pages, // total pages
    current_page: current_page, // current page number
    status: true,
  });
};
async function hashBlockByNumber(blockNumber, res) {
  try {
    // Fetch the block by its number
    const block = await tronWeb.trx.getBlockByNumber(blockNumber);
    let dataReturn = {
      blockTimeStamp: block.block_header.raw_data.timestamp,
      blockId: block.blockID,
    };

    return dataReturn;
    // Convert block data to a string for hashing
    // const blockDataString = JSON.stringify(block);

    // Create a hash of the block data
    // const hash = crypto.createHash('sha256').update(blockDataString).digest('hex');
    // return block.blockID;

    // Return the response with the hash
    // return res.status(200).json({
    //   message: 'Block hash generated successfully',
    //   hash: block.blockID,
    //   status: true
    // });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching block or hashing data",
      error: err.message,
      status: false,
    });
  }
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
function convertToIST(timestamp) {
  // Create a Date object from the timestamp
  let date = new Date(timestamp);

  // Get the UTC time
  let utcTime = date.getTime() + date.getTimezoneOffset() * 60000;

  // Convert to IST (UTC + 5:30)
  let istOffset = 5.5 * 60 * 60000; // 5 hours 30 minutes in milliseconds
  let istTime = new Date(utcTime + istOffset);

  // Format the time in HH:MM:SS format
  let hours = istTime.getHours().toString().padStart(2, "0");
  let minutes = istTime.getMinutes().toString().padStart(2, "0");
  let seconds = istTime.getSeconds().toString().padStart(2, "0");

  let formattedTime = `${hours}:${minutes}:${seconds}`;

  return formattedTime;
}
async function getCurrentTimeMinusOneMinute(game) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 1); // Subtract 1 minute

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const [block_second] = await connection.query(
    "SELECT `value` FROM `tbl_config` WHERE `name` = 'block_second'"
  );
  let blockSeconds = block_second[0].value;

  let addedTime = `${hours}:${minutes}:${blockSeconds}`;

  //  const sql = `INSERT INTO block_test SET   block_time = ? ,game = ?  `;
  //  await connection.execute(sql, [addedTime,game]);

  return `${hours}:${minutes}:${blockSeconds}`;
}

// SELECT * FROM `trx` WHERE `game` = 'trx' and `status` = '1' ORDER BY `id` DESC LIMIT 1

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const getMinutesPastSinceMidnight = () => {
  const now = new Date(); // Get the current date and time

  // Create a new Date object for today at 12:00 AM
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  // Calculate the difference in milliseconds
  const diffInMilliseconds = now - midnight;

  // Convert the difference from milliseconds to minutes
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

  return diffInMinutes;
};
function addMinutesToBlockTime(blockTime, minutesToAdd) {
  let [hours, minutes, seconds] = blockTime.split(":").map(Number);
  let date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(seconds);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}
function getTimeDifferenceInMinutes(time1, time2) {
  // Parse both time strings into [hours, minutes, seconds]
  let [hours1, minutes1, seconds1] = time1.split(":").map(Number);
  let [hours2, minutes2, seconds2] = time2.split(":").map(Number);

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

const addTRXGo = async (game) => {
  try {
    let join = "";
    let newBlockId = "";
    if (game == 1) join = "trx";
    if (game == 3) join = "trx3";
    if (game == 5) join = "trx5";
    if (game == 10) join = "trx10";
    console.log("join", join);
    const [winGoNow] = await connection.query(
      `SELECT period,block_id ,  block_count FROM trx WHERE status = 0 AND game = "${join}" ORDER BY id DESC LIMIT 1 `
    );
    const [setting] = await connection.query("SELECT * FROM `admin` ");
    console.log(winGoNow);

    // Check if winGoNow has results
    if (!winGoNow || winGoNow.length === 0) {
      console.log("No active game period found");
      return false;
    }

    let period = winGoNow[0].period; // cầu hiện tại
    let block_id = winGoNow[0].block_id;
    let block_count = winGoNow[0].block_count;

    if (game == 1) {
      if (block_count == 360) {
        newBlockId = parseFloat(block_id) + 18;
        block_count = 0;
      } else {
        newBlockId = parseFloat(block_id) + 20;
      }
    }
    if (game == 3) {
      if (block_count == 120) {
        newBlockId = parseFloat(block_id) + 58;
        block_count = 0;
      } else {
        newBlockId = parseFloat(block_id) + 60;
      }
    }
    if (game == 5) {
      if (block_count == 72) {
        newBlockId = parseFloat(block_id) + 98;
        block_count = 0;
      } else {
        newBlockId = parseFloat(block_id) + 100;
      }
    }
    if (game == 10) {
      if (block_count == 36) {
        newBlockId = parseFloat(block_id) + 198;
        block_count = 0;
      } else {
        newBlockId = parseFloat(block_id) + 200;
      }
    }

    //   let currentDate   = await getCurrentDates();

    let cTime = await getCurrentTimeMinusOneMinute(game);
    const [dateRowsNow] = await connection.execute(
      "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS currentDate"
    );
    const cdnow = dateRowsNow[0].currentDate;

    let open_sts = "Y";

    if (join === "trx") {
      const [blockTimeRow] = await connection.query(
        "SELECT `block_time` FROM `trx` WHERE `game` = ? AND `status` = '1' AND date(`date_time`) =  ? ORDER BY id DESC LIMIT 1",
        [join, cdnow]
      );

      if (blockTimeRow.length > 0) {
        let blockTime = blockTimeRow[0].block_time; // '15:29:54'
        let newBlockTime = addMinutesToBlockTime(blockTime, game); // Add one minute to block time

        let difference = getTimeDifferenceInMinutes(blockTime, cTime);
        let diff = difference / game;

        if (diff > 1 && join === "trx") {
          // open_sts = 'N';
          // Set open_sts to 'N' if conditions are met
        }
      }
    }
    if (open_sts === "Y") {
      //   const [getletestBloack] = await connection.query( `SELECT * FROM blocks WHERE currenttime = '${cTime}' AND DATE(added_date_time) = '${cdnow}'` );

      //     let blockId            = getletestBloack[0].blockId;
      //     let _hashCode          = getletestBloack[0]._hashcode;
      //     let CurrentTimeStamp   = getletestBloack[0].currenttime;

      let data = JSON.stringify({
        cTime: cTime,
        cdnow: cdnow,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://block.vertoindia.in/getBlock",
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      // Make the HTTP request
      let response = await axios.request(config);
      let blockId = response.data.blockId;
      let _hashCode = response.data._hashCode;
      let CurrentTimeStamp = response.data.CurrentTimeStamp;

      // let blocks = await hashBlockByNumber(block_id);

      // let timeStamp = blocks.blockTimeStamp;
      // let _hashCode = blocks.blockId;

      // let CurrentTimeStamp = await convertToIST(timeStamp);

      let result = await getLastDigitFromHash(_hashCode.toString());
      await connection.execute(
        `UPDATE trx SET amount = ?,status = ? ,block_id =  "${blockId}" ,block_number =  "${_hashCode}" , block_time =  ?   WHERE period = ? AND game = "${join}"`,
        [result, 1, CurrentTimeStamp, period]
      );

      let timeNow = Date.now();
      let currentDate = new Date();

      // Get year, month, and day
      let year = currentDate.getFullYear();
      let month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-based
      let day = currentDate.getDate().toString().padStart(2, "0");

      // Format the date as YYYYMMDD
      let formattedDate = `${year}${month}${day}`;

      // Convert the number to a string to extract the date part
      let originalString = period.toString();

      // Extract the date part (first 8 digits)
      let datePart = originalString.slice(0, 8);
      let remainingPart = originalString.slice(8);

      const minutesPast = getMinutesPastSinceMidnight();

      const minutesPast3 = Math.floor(minutesPast / 3);
      const minutesPast5 = Math.floor(minutesPast / 5);
      const minutesPast10 = Math.floor(minutesPast / 10);

      if (game == 1) {
        remainingPart = 130000 + minutesPast;
        // if (datePart !== formattedDate) { remainingPart = "130000"; }
      }
      if (game == 3) {
        remainingPart = 140000 + minutesPast3;
        // if (datePart !== formattedDate) { remainingPart = "140000"; }
      }
      if (game == 5) {
        remainingPart = 150000 + minutesPast5;

        // if (datePart !== formattedDate) { remainingPart = "150000"; }
      }
      if (game == 10) {
        remainingPart = 160000 + minutesPast10;
        // if (datePart !== formattedDate) { remainingPart = "160000"; }
      }

      // Convert the remaining part to a number, increment it, and convert it back to a string
      // let incrementedRemainingPart = (parseInt(remainingPart) + 1).toString().padStart(6, '0');
      let incrementedRemainingPart = (parseInt(remainingPart) + 1).toString();
      // Combine the formatted date with the incremented remaining part
      period = `${formattedDate}${incrementedRemainingPart}`;

      let nextBlockCount = parseInt(block_count) + 1;

      const sql = `INSERT INTO trx SET 
        period = ?,
        amount = ?,
        block_id = ?,
        game = ?,
        status = ?,
        pre_block_hash = ? , 
        block_count = ? ,
        time = ?`;

      await connection.execute(sql, [
        Number(period),
        0,
        newBlockId,
        join,
        0,
        _hashCode,
        nextBlockCount,
        timeNow,
      ]);
    } else {
      return true;
    }
  } catch (error) {
    if (error) {
      console.log(error);
    }
  }
};
const handlingTRX1P = async (typeid) => {
  let game = "";
  if (typeid == 1) game = "trx";
  if (typeid == 3) game = "trx3";
  if (typeid == 5) game = "trx5";
  if (typeid == 10) game = "trx10";

  const [winGoNow] = await connection.query(
    `SELECT * FROM trx WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `
  );

  // update ket qua
  await connection.execute(
    `UPDATE trx_result SET result = ? WHERE status = 0 AND game = '${game}'`,
    [winGoNow[0].amount]
  );
  let result = Number(winGoNow[0].amount);
  switch (result) {
    case 0:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "0" AND bet != "t" `,
        []
      );
      break;
    case 1:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "1" `,
        []
      );
      break;
    case 2:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "2" `,
        []
      );
      break;
    case 3:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "3" `,
        []
      );
      break;
    case 4:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "4" `,
        []
      );
      break;
    case 5:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "5" AND bet != "t" `,
        []
      );
      break;
    case 6:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "6" `,
        []
      );
      break;
    case 7:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "7" `,
        []
      );
      break;
    case 8:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "d" AND bet != "8" `,
        []
      );
      break;
    case 9:
      await connection.execute(
        `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet != "l" AND bet != "n" AND bet != "x" AND bet != "9" `,
        []
      );
      break;
    default:
      break;
  }

  if (result < 5) {
    await connection.execute(
      `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet = "l" `,
      []
    );
  } else {
    await connection.execute(
      `UPDATE trx_result SET status = 2 WHERE status = 0 AND game = "${game}" AND bet = "n" `,
      []
    );
  }

  // lấy ra danh sách đặt cược chưa xử lý
  const [order] = await connection.execute(
    `SELECT * FROM trx_result WHERE status = 0 AND game = '${game}' `
  );
  for (let i = 0; i < order.length; i++) {
    let orders = order[i];
    let result = orders.result;
    let bet = orders.bet;
    let total = orders.money;
    let id = orders.id;
    let phone = orders.phone;
    var nhan_duoc = 0;
    // x - green
    // t - Violet
    // d - red

    // Sirf 1-4 aur 6-9 tk hi *9 aana chahiye
    // Aur 0 aur 5 pe *4.5
    // Aur red aur green pe *2
    // 1,2,3,4,6,7,8,9

    if (bet == "l" || bet == "n") {
      nhan_duoc = total * 2;
    } else {
      if (result == 0 || result == 5) {
        if (bet == "d" || bet == "x") {
          nhan_duoc = total * 1.5;
        } else if (bet == "t") {
          nhan_duoc = total * 4.5;
        } else if (bet == "0" || bet == "5") {
          nhan_duoc = total * 4.5;
        }
      } else {
        if (result == 1 && bet == "1") {
          nhan_duoc = total * 9;
        } else {
          if (result == 1 && bet == "x") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 2 && bet == "2") {
          nhan_duoc = total * 9;
        } else {
          if (result == 2 && bet == "d") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 3 && bet == "3") {
          nhan_duoc = total * 9;
        } else {
          if (result == 3 && bet == "x") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 4 && bet == "4") {
          nhan_duoc = total * 9;
        } else {
          if (result == 4 && bet == "d") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 6 && bet == "6") {
          nhan_duoc = total * 9;
        } else {
          if (result == 6 && bet == "d") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 7 && bet == "7") {
          nhan_duoc = total * 9;
        } else {
          if (result == 7 && bet == "x") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 8 && bet == "8") {
          nhan_duoc = total * 9;
        } else {
          if (result == 8 && bet == "d") {
            nhan_duoc = total * 2;
          }
        }
        if (result == 9 && bet == "9") {
          nhan_duoc = total * 9;
        } else {
          if (result == 9 && bet == "x") {
            nhan_duoc = total * 2;
          }
        }
      }
    }
    // Mark result and credit winnings atomically to avoid race conditions
    await connection.execute(
      "UPDATE `trx_result` SET `get` = ?, `status` = 1 WHERE `id` = ? ",
      [parseFloat(nhan_duoc), id]
    );
    await connection.execute(
      "UPDATE `users` SET `money` = `money` + ?, `total_money` = `total_money` + ? WHERE `phone` = ? ",
      [parseFloat(nhan_duoc), parseFloat(nhan_duoc), phone]
    );
  }
};
const addNewBlocks = async (req, res) => {
  try {
    const [getBlocks] = await connection.query(
      "SELECT * FROM `blocks` WHERE 1 ORDER BY id DESC LIMIT 1"
    );
    let blockId = getBlocks[0].blockId;
    let currenttime = getBlocks[0].currenttime;

    for (let i = 0; i < 100; i++) {
      blockId = parseInt(blockId) + 1;
      let blocks = await hashBlockByNumber(blockId);
      let timeStamp = blocks.blockTimeStamp;
      let _hashCode = blocks.blockId;
      let CurrentTimeStamp = await convertToIST(timeStamp);

      const sql =
        "INSERT INTO blocks SET blockId = ?,_hashcode =? ,currenttime = ?";
      await connection.execute(sql, [blockId, _hashCode, CurrentTimeStamp]);
    }
  } catch (error) {
    if (error) {
      console.log(error);
    }
  }
};

module.exports = {
  bettrx,
  listOrderOld,
  GetMyEmerdList,
  handlingTRX1P,
  addTRXGo,
  trxPage,
  trxPage3,
  trxPage5,
  trxPage10,
  addNewBlocks,
  blockPage,
};
