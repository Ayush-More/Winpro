import connection from "../config/connectDB";
import jwt from "jsonwebtoken";
import md5 from "md5";
import request from "request";

const axios = require("axios");
let timeNow = Date.now();

const randomNumber = (min, max) => {
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

const verifyCode = async (req, res) => {
  let auth = req.cookies.auth;
  let now = new Date().getTime();
  let timeEnd = +new Date() + 1000 * (60 * 2 + 0) + 500;
  let otp = randomNumber(100000, 999999);

  conswit[rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows) {
    return res.status(200).json({
      message: "Account does not exist",
      status: false,
      timeStamp: timeNow,
    });
  }
  let user = rows[0];
  if (user.time_otp - now <= 0) {
    request(
      `http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${user.phone}&msg=Your verification code is ${otp}&extend=${now}`,
      async (error, response, body) => {
        let data = JSON.parse(body);
        if (data.code == "00000") {
          await connection.execute(
            "UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ",
            [otp, timeEnd, user.phone]
          );
          return res.status(200).json({
            message: "Submitted successfully",
            status: true,
            timeStamp: timeNow,
            timeEnd: timeEnd,
          });
        }
      }
    );
  } else {
    return res.status(200).json({
      message: "Send SMS regularly.",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const aviator = async (req, res) => {
  try {
    // Get the auth token from the cookies
    let auth = req.cookies.auth;

    // Check if the token exists
    if (!auth) {
      // Redirect to a login page or show an error message if auth token is missing
      return res.redirect("/login"); // Replace '/login' with your actual login route
    }

    // Redirect to the external URL with the token
    return res.redirect(
      `https://avi.dubaideck.com/auth/loginByToken?action=loginandregisterbyauth&token=${auth}`
    );
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error during redirection:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addBank = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    let name_bank = req.body.name_bank || "default";
    let name_user = req.body.name_user;
    let stk = req.body.stk;
    let email = req.body.email;
    let tinh = req.body.tinh || "default";
    let cryptoAdd = req.body.cryptoAdd;
    let timeNow = Date.now(); // ✅ fix

    // Validation
    if (!auth || !name_user || !stk || !email) {
      return res.status(200).json({
        message: "Failed - missing required fields",
        status: false,
        timeStamp: timeNow,
      });
    }

    // Check user
    const [userRows] = await connection.execute(
      "SELECT phone, code, invite FROM users WHERE token = ?",
      [auth]
    );

    if (userRows.length === 0) {
      return res.status(200).json({
        message: "Failed - invalid auth token",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = userRows[0];

    // Check if user already has bank details
    const [bankByPhone] = await connection.execute(
      "SELECT * FROM user_bank WHERE phone = ?",
      [userInfo.phone]
    );

    if (bankByPhone.length === 0) {
      // Insert new bank details for user
      const sql = `INSERT INTO user_bank
        (phone, name_bank, name_user, stk, email, tinh, cryptoAdd, time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      await connection.execute(sql, [
        userInfo.phone,
        name_bank,
        name_user,
        stk,
        email,
        tinh,
        cryptoAdd,
        timeNow,
      ]);

      return res.status(200).json({
        message: "Successfully added bank details",
        status: true,
        timeStamp: timeNow,
      });
    } else {
      // Update existing bank details for this user
      await connection.execute(
        "UPDATE user_bank SET name_bank = ?, name_user = ?, stk = ?, email = ?, tinh = ?, cryptoAdd = ?, time = ? WHERE phone = ?",
        [
          name_bank,
          name_user,
          stk,
          email,
          tinh,
          cryptoAdd,
          timeNow,
          userInfo.phone,
        ]
      );
      return res.status(200).json({
        message: "Bank details updated successfully",
        status: true,
        timeStamp: timeNow,
      });
    }
  } catch (err) {
    console.error("addBank error:", err);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      error: err.message,
    });
  }
};

const userInfo = async (req, res) => {
  let auth = req.cookies.auth;

  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );

  if (!rows) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [bank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ? ",
    [rows[0].phone]
  );

  let banks = bank[0];

  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );
  let totalRecharge = 0;
  recharge.forEach((data) => {
    totalRecharge += data.money;
  });
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ? AND status = 1",
    [rows[0].phone]
  );
  let totalWithdraw = 0;
  withdraw.forEach((data) => {
    totalWithdraw += data.money;
  });

  const { id, password, ip, veri, ip_address, status, time, token, ...others } =
    rows[0];
  return res.status(200).json({
    message: "Success",
    status: true,
    data: {
      code: others.code,
      id_user: others.id_user,
      name_user: others.name_user,
      phone_user: others.phone,
      money_user: others.money.toFixed(2),
      banks: banks,
      earning_balance: (others.money - others.temp_money).toFixed(2),
    },
    totalRecharge: totalRecharge,
    totalWithdraw: totalWithdraw,
    timeStamp: timeNow,
  });
};

const changeUser = async (req, res) => {
  let auth = req.cookies.auth;
  let name = req.body.name;
  let type = req.body.type;

  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows || !type || !name)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  switch (type) {
    case "editname":
      await connection.query(
        "UPDATE users SET name_user = ? WHERE `token` = ? ",
        [name, auth]
      );
      return res.status(200).json({
        message: "Username modification successful",
        status: true,
        timeStamp: timeNow,
      });
      break;

    default:
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
      break;
  }
};

const changePassword = async (req, res) => {
  let auth = req.cookies.auth;
  let password = req.body.password;
  let newPassWord = req.body.newPassWord;
  // let otp = req.body.otp;

  if (!password || !newPassWord)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? AND `password` = ? ",
    [auth, md5(password)]
  );
  if (rows.length == 0)
    return res.status(200).json({
      message: "Incorrect password",
      status: false,
      timeStamp: timeNow,
    });

  // let getTimeEnd = Number(rows[0].time_otp);
  // let tet = new Date(getTimeEnd).getTime();
  // var now = new Date().getTime();
  // var timeRest = tet - now;
  // if (timeRest <= 0) {
  //     return res.status(200).json({
  //         message: 'Mã OTP đã hết hiệu lực',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // }

  // const [check_otp] = await connection.query('SELECT * FROM users WHERE `token` = ? AND `password` = ? AND otp = ? ', [auth, md5(password), otp]);
  // if(check_otp.length == 0) return res.status(200).json({
  //     message: 'Mã OTP không chính xác',
  //     status: false,
  //     timeStamp: timeNow,
  // });;

  await connection.query(
    "UPDATE users SET otp = ?, password = ?, plain_password = ? WHERE `token` = ? ",
    [randomNumber(100000, 999999), md5(newPassWord), newPassWord, auth]
  );
  return res.status(200).json({
    message: "Password modification successful",
    status: true,
    timeStamp: timeNow,
  });
};

// Daily attendance check-in system
const dailyAttendance = async (req, res) => {
  let auth = req.cookies.auth;

  if (!auth) {
    return res.status(200).json({
      message: "Authentication failed",
      status: false,
      timeStamp: Date.now(),
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT * FROM users WHERE token = ?",
      [auth]
    );
    if (!user.length) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: Date.now(),
      });
    }

    const userInfo = user[0];
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    // Check if user already checked in today
    const [todayAttendance] = await connection.query(
      "SELECT * FROM daily_attendance WHERE phone = ? AND date = ?",
      [userInfo.phone, today]
    );

    if (todayAttendance.length > 0) {
      return res.status(200).json({
        message: "You have already checked in today",
        status: false,
        timeStamp: Date.now(),
      });
    }

    // Get user's attendance streak
    const [lastAttendance] = await connection.query(
      "SELECT * FROM daily_attendance WHERE phone = ? ORDER BY date DESC LIMIT 1",
      [userInfo.phone]
    );

    let consecutiveDays = 1;
    if (lastAttendance.length > 0) {
      const lastDate = new Date(lastAttendance[0].date);
      const todayDate = new Date(today);
      const diffTime = todayDate - lastDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        consecutiveDays = lastAttendance[0].consecutive_days + 1;
      } else if (diffDays > 1) {
        // Streak broken, reset to 1
        consecutiveDays = 1;
      }
    }

    // Get maximum attendance days and reset if exceeded
    const [maxDaysConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'max_attendance_days'"
    );
    const maxDays = parseInt(maxDaysConfig[0]?.value || "7");

    if (consecutiveDays > maxDays) {
      consecutiveDays = 1; // Reset cycle
    }

    // Get attendance bonus for this day
    const [bonusConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = ?",
      [`attendance_day_${consecutiveDays}`]
    );
    const bonusAmount = parseFloat(bonusConfig[0]?.value || "10");

    // Record attendance
    await connection.query(
      "INSERT INTO daily_attendance (phone, date, consecutive_days, bonus_amount, created_at) VALUES (?, ?, ?, ?, ?)",
      [userInfo.phone, today, consecutiveDays, bonusAmount, new Date()]
    );

    // Credit bonus to user
    await connection.query(
      "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?",
      [bonusAmount, bonusAmount, userInfo.phone]
    );

    return res.status(200).json({
      message: `Daily check-in successful! You received ₹${bonusAmount} for day ${consecutiveDays}`,
      status: true,
      consecutiveDays: consecutiveDays,
      bonusAmount: bonusAmount,
      timeStamp: Date.now(),
    });
  } catch (error) {
    console.error("Daily attendance error:", error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      timeStamp: Date.now(),
    });
  }
};

const checkInHandling = async (req, res) => {
  let auth = req.cookies.auth;
  let data = req.body.data;

  if (!auth)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  const [rows] = await connection.query(
    "SELECT * FROM users WHERE `token` = ? ",
    [auth]
  );
  if (!rows)
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  if (!data) {
    const [point_list] = await connection.query(
      "SELECT * FROM point_list WHERE `phone` = ? ",
      [rows[0].phone]
    );
    return res.status(200).json({
      message: "No More Data",
      datas: point_list,
      status: true,
      timeStamp: timeNow,
    });
  }
  if (data) {
    if (data == 1) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 300;
      if (check >= data && point_list.total1 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total1, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total1 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total1}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total1 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 300 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total1 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 2) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 3000;
      if (check >= get && point_list.total2 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total2, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total2 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total2}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total2 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 3000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total2 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 3) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 6000;
      if (check >= get && point_list.total3 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total3, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total3 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total3}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total3 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 6000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total3 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 4) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 12000;
      if (check >= get && point_list.total4 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total4, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total4 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total4}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total4 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 12000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total4 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 5) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 28000;
      if (check >= get && point_list.total5 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total5, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total5 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total5}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total5 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 28000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total5 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 6) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 100000;
      if (check >= get && point_list.total6 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total6, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total6 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total6}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total6 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹ 100000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total6 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
    if (data == 7) {
      const [point_lists] = await connection.query(
        "SELECT * FROM point_list WHERE `phone` = ? ",
        [rows[0].phone]
      );
      let check = rows[0].money;
      let point_list = point_lists[0];
      let get = 200000;
      if (check >= get && point_list.total7 != 0) {
        await connection.query(
          "UPDATE users SET money = money + ? WHERE phone = ? ",
          [point_list.total7, rows[0].phone]
        );
        await connection.query(
          "UPDATE point_list SET total7 = ? WHERE phone = ? ",
          [0, rows[0].phone]
        );
        return res.status(200).json({
          message: `You just received ₹ ${point_list.total7}.00`,
          status: true,
          timeStamp: timeNow,
        });
      } else if (check < get && point_list.total7 != 0) {
        return res.status(200).json({
          message: "Please Recharge ₹200000 to claim gift.",
          status: false,
          timeStamp: timeNow,
        });
      } else if (point_list.total7 == 0) {
        return res.status(200).json({
          message: "You have already received this gift",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  }
};

function formateT(params) {
  let result = params < 10 ? "0" + params : params;
  return result;
}

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

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const returnLevel2 = async (member_id, from_level) => {
  member_id = [member_id];

  let i = 0;
  let k = 1;
  let level = 0;
  let dataSet = [];

  while (k > i) {
    let data = await gettotalLev1(member_id, level);
    member_id = data.data_list;
    dataSet.push(data);
    k = data.total;
    level = data.level;

    if (level == from_level) {
      return data;
    }

    if (level == 50) {
      return dataSet;
    }
  }

  return dataSet;
};
const gameHistory = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  try {
    // Get user information
    const [user] = await connection.query(
      "SELECT id, `phone`, `code`, `invite` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    let phone = userInfo.phone;

    // Get pagination parameters
    let {
      page = 1,
      limit = 50,
      game = "",
      startDate = "",
      endDate = "",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = ["phone = ?"];
    let queryParams = [phone];

    if (game && game !== "all") {
      whereConditions.push("game = ?");
      queryParams.push(game);
    }

    if (startDate) {
      whereConditions.push("DATE(date_time) >= ?");
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push("DATE(date_time) <= ?");
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get game history with pagination
    const [gameData] = await connection.query(
      `
            SELECT
                id,
                id_product,
                phone,
                code,
                invite,
                stage,
                result,
                more,
                level,
                money,
                amount,
                fee,
                \`get\`,
                game,
                bet,
                status,
                today,
                time,
                date_time
            FROM minutes_1
            WHERE ${whereClause}
            ORDER BY date_time DESC
            LIMIT ? OFFSET ?
        `,
      [...queryParams, limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await connection.query(
      `
            SELECT COUNT(*) as total
            FROM minutes_1
            WHERE ${whereClause}
        `,
      queryParams
    );

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      message: "Success",
      status: true,
      timeStamp: timeNow,
      data: gameData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching game history:", error);
    return res.status(200).json({
      message: "Database error",
      status: false,
      timeStamp: timeNow,
      error: error.message,
    });
  }
};

// const AllgameStatistics = async (req, res) => {
//   let auth = req.cookies.auth;
//   if (!auth) {
//     return res.status(200).json({
//       message: "Failed",
//       status: false,
//       timeStamp: timeNow,
//     });
//   }

//   try {
//     // Get user information
//     const [user] = await connection.query(
//       "SELECT id, `phone`, `code`, `invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
//       [auth]
//     );

//     if (!user || user.length === 0) {
//       return res.status(200).json({
//         message: "User not found",
//         status: false,
//         timeStamp: timeNow,
//       });
//     }

//     let userInfo = user[0];
//     let phone = userInfo.phone;

//     // Get game statistics from minutes_1 table for this user
//     const [gameData] = await connection.query(
//       `
//             SELECT
//                 id,
//                 id_product,
//                 phone,
//                 code,
//                 invite,
//                 stage,
//                 result,
//                 more,
//                 level,
//                 money,
//                 amount,
//                 fee,
//                 \`get\`,
//                 game,
//                 bet,
//                 status,
//                 today,
//                 time,
//                 date_time
//             FROM minutes_1
//             WHERE phone = ?
//             ORDER BY date_time DESC
//             LIMIT 100
//         `,
//       [phone]
//     );

//     // Calculate overall statistics
//     const totalGames = gameData.length;
//     const totalBetAmount = gameData.reduce(
//       (sum, game) => sum + parseFloat(game.amount || 0),
//       0
//     );
//     const totalWinAmount = gameData.reduce((sum, game) => {
//       return sum + parseFloat(game.get);
//     }, 0);
//     const totalFees = gameData.reduce(
//       (sum, game) => sum + parseFloat(game.fee || 0),
//       0
//     );
//     const wins = gameData.filter((game) => game.get > 0).length;
//     const losses = gameData.filter(
//       (game) => game.get <= 0 && game.status === 2
//     ).length;
//     const pending = gameData.filter((game) => game.status === 1).length;
//     const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : 0;
//     const netProfit = totalWinAmount - totalBetAmount;

//     // Group by game types for detailed stats
//     const gameTypes = ["wingo", "wingo3", "wingo5", "wingo10", "wingo30"];
//     const gameTypeStats = {};

//     gameTypes.forEach((gameType) => {
//       const typeGames = gameData.filter((game) => game.game === gameType);
//       const typeTotalBet = typeGames.reduce(
//         (sum, game) => sum + parseFloat(game.amount || 0),
//         0
//       );
//       const typeTotalWin = typeGames.reduce((sum, game) => {
//         return sum + parseFloat(game.get);
//       }, 0);
//       const typeWins = typeGames.filter((game) => game.get >= 1).length;
//       const typeWinRate =
//         typeGames.length > 0
//           ? ((typeWins / typeGames.length) * 100).toFixed(2)
//           : 0;

//       gameTypeStats[gameType] = {
//         totalGames: typeGames.length,
//         totalBet: typeTotalBet,
//         totalWin: typeTotalWin,
//         netProfit: typeTotalWin - typeTotalBet,
//         wins: typeWins,
//         losses: typeGames.filter(
//           (game) => game.level === 0 && game.status === 2
//         ).length,
//         winRate: typeWinRate,
//         games: typeGames.slice(0, 20), // Latest 20 games for each type
//       };
//     });

//     // Get today's statistics
//     const today = new Date().toISOString().split("T")[0];
//     const todayGames = gameData.filter((game) => {
//       const gameDate = new Date(game.date_time).toISOString().split("T")[0];
//       return gameDate === today;
//     });

//     const todayStats = {
//       totalGames: todayGames.length,
//       totalBet: todayGames.reduce(
//         (sum, game) => sum + parseFloat(game.amount || 0),
//         0
//       ),
//       totalWin: todayGames.reduce((sum, game) => {
//         return sum + parseFloat(game.get);
//       }, 0),
//       wins: todayGames.filter((game) => game.get >= 1).length,
//       winRate:
//         todayGames.length > 0
//           ? (
//               (todayGames.filter((game) => game.get >= 1).length /
//                 todayGames.length) *
//               100
//             ).toFixed(2)
//           : 0,
//     };

//     // Get this week's statistics
//     const weekAgo = new Date();
//     weekAgo.setDate(weekAgo.getDate() - 7);
//     const weekGames = gameData.filter((game) => {
//       const gameDate = new Date(game.date_time);
//       return gameDate >= weekAgo;
//     });

//     const weekStats = {
//       totalGames: weekGames.length,
//       totalBet: weekGames.reduce(
//         (sum, game) => sum + parseFloat(game.amount || 0),
//         0
//       ),
//       totalWin: weekGames.reduce((sum, game) => {
//         return sum + parseFloat(game.get);
//       }, 0),
//       wins: weekGames.filter((game) => game.level === 1).length,
//       winRate:
//         weekGames.length > 0
//           ? (
//               (weekGames.filter((game) => game.get >= 1).length /
//                 weekGames.length) *
//               100
//             ).toFixed(2)
//           : 0,
//     };

//     return res.status(200).json({
//       message: "Success",
//       status: true,
//       timeStamp: timeNow,
//       data: gameData,
//       statistics: {
//         overall: {
//           totalGames,
//           totalBetAmount,
//           totalWinAmount,
//           totalFees,
//           netProfit,
//           wins,
//           losses,
//           pending,
//           winRate,
//         },
//         today: todayStats,
//         week: weekStats,
//         gameTypes: gameTypeStats,
//       },
//       userInfo: {
//         phone: userInfo.phone,
//         code: userInfo.code,
//         invite: userInfo.invite,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching game statistics:", error);
//     return res.status(200).json({
//       message: "Database error",
//       status: false,
//       timeStamp: timeNow,
//       error: error.message,
//     });
//   }
// };

const AllgameStatistics = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  try {
    // Get game name from query parameter
    const gameName = req.query.game || "wingo";

    console.log("gameName", gameName);

    // Map game names to their respective tables
    const gameTableMap = {
      wingo: "minutes_1",
      trx: "trx_result",
      k3: "result_k3",
      "5d": "result_5d",
    };

    // Get the table name for the requested game
    const tableName = gameTableMap[gameName];

    if (!tableName) {
      return res.status(200).json({
        message: "Invalid game name",
        status: false,
        timeStamp: timeNow,
      });
    }

    // Get user information
    const [user] = await connection.query(
      "SELECT id, `phone`, `code`, `invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    let phone = userInfo.phone;

    // Get all game data for this user
    const [gameData] = await connection.query(
      `
            SELECT 
                id,
                id_product,
                phone,
                code,
                invite,
                stage,
                result,  
                level,
                money,
                amount,
                fee,
                \`get\`,
                game,
                bet,
                status,
                time
            FROM ${tableName}
            WHERE phone = ? 
            ORDER BY time DESC 
            LIMIT 100
        `,
      [phone]
    );

    console.log("games", gameData);

    // Calculate today's start timestamp (midnight today in milliseconds)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    // Get today's data only
    const [todayGameData] = await connection.query(
      `
            SELECT 
                id,
                id_product,
                phone,
                code,
                invite,
                stage,
                result,  
                level,
                money,
                amount,
                fee,
                \`get\`,
                game,
                bet,
                status,
                time
            FROM ${tableName}
            WHERE phone = ? 
              AND CAST(time AS UNSIGNED) >= ?
            ORDER BY time DESC 
            LIMIT 100
        `,
      [phone, todayStartTimestamp]
    );

    console.log("Today's games", todayGameData);

    // Calculate overall statistics (all data)
    const totalGames = gameData.length;
    const totalBetAmount = gameData.reduce(
      (sum, game) => sum + parseFloat(game.amount || 0),
      0
    );
    const totalWinAmount = gameData.reduce((sum, game) => {
      return sum + parseFloat(game.get || 0);
    }, 0);
    const totalFees = gameData.reduce(
      (sum, game) => sum + parseFloat(game.fee || 0),
      0
    );
    const wins = gameData.filter((game) => game.get > 0).length;
    const losses = gameData.filter(
      (game) => game.get <= 0 && game.status === 2
    ).length;
    const pending = gameData.filter((game) => game.status === 1).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : 0;
    const netProfit = totalWinAmount - totalBetAmount;

    // Calculate today's statistics
    const todayTotalBet = todayGameData.reduce(
      (sum, game) => sum + parseFloat(game.amount || 0),
      0
    );
    const todayTotalWin = todayGameData.reduce((sum, game) => {
      return sum + parseFloat(game.get || 0);
    }, 0);
    const todayWins = todayGameData.filter((game) => game.get > 0).length;
    const todayLosses = todayGameData.filter(
      (game) => game.get <= 0 && game.status === 2
    ).length;

    const todayStats = {
      totalGames: todayGameData.length,
      totalBetAmount: todayTotalBet,
      totalWinAmount: todayTotalWin,
      netProfit: todayTotalWin - todayTotalBet,
      wins: todayWins,
      losses: todayLosses,
      winRate:
        todayGameData.length > 0
          ? ((todayWins / todayGameData.length) * 100).toFixed(2)
          : 0,
    };

    // Calculate week's statistics (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekAgoTimestamp = weekAgo.getTime();

    const weekGames = gameData.filter((game) => {
      const gameTimestamp = parseInt(game.time);
      return gameTimestamp >= weekAgoTimestamp;
    });

    const weekTotalBet = weekGames.reduce(
      (sum, game) => sum + parseFloat(game.amount || 0),
      0
    );
    const weekTotalWin = weekGames.reduce((sum, game) => {
      return sum + parseFloat(game.get || 0);
    }, 0);
    const weekWins = weekGames.filter((game) => game.get > 0).length;
    const weekLosses = weekGames.filter(
      (game) => game.get <= 0 && game.status === 2
    ).length;

    const weekStats = {
      totalGames: weekGames.length,
      totalBetAmount: weekTotalBet,
      totalWinAmount: weekTotalWin,
      netProfit: weekTotalWin - weekTotalBet,
      wins: weekWins,
      losses: weekLosses,
      winRate:
        weekGames.length > 0
          ? ((weekWins / weekGames.length) * 100).toFixed(2)
          : 0,
    };

    return res.status(200).json({
      message: "Success",
      status: true,
      timeStamp: timeNow,
      data: gameData,
      statistics: {
        overall: {
          totalGames,
          totalBetAmount,
          totalWinAmount,
          totalFees,
          netProfit,
          wins,
          losses,
          pending,
          winRate,
        },
        today: todayStats,
        week: weekStats,
      },
      userInfo: {
        phone: userInfo.phone,
        code: userInfo.code,
        invite: userInfo.invite,
      },
    });
  } catch (error) {
    console.error("Error fetching game statistics:", error);
    return res.status(200).json({
      message: "Database error",
      status: false,
      timeStamp: timeNow,
      error: error.message,
    });
  }
};

const gettotalLev1 = async (member_id, count = 1) => {
  const memberArray = [];
  const memberIdString = member_id.map((id) => connection.escape(id)).join(",");
  const query = `SELECT u.id, u.phone, u.today FROM users AS u WHERE u.parent_id IN (${memberIdString}) GROUP BY u.id`;
  console.log(query);

  try {
    const [rows] = await connection.query(query);
    rows.forEach((val) => {
      memberArray.push(val.id);
    });

    count++;
    return {
      total: rows.length,
      level: count,
      data_list: memberArray,
      data: rows,
    };
  } catch (error) {
    throw new Error(`Error executing query: ${error.message}`);
  }
};

const inviteBonus = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT id,`phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  let phone = user[0].phone;

  const [Record] = await connection.query(
    "SELECT invite_bonus.*, IF(inc_invite_bonus.id IS NOT NULL, 'success', 'pending') AS status FROM invite_bonus LEFT JOIN inc_invite_bonus ON invite_bonus.id = inc_invite_bonus.id and inc_invite_bonus.phone = ?",
    [phone]
  );

  return res.status(200).json({
    message: "Receive success",
    record: Record, // level,
    info: user,
    status: true,

    timeStamp: timeNow,
  });
};
const DailySalary = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT id, phone, code, invite, total_recharge FROM users WHERE token = ?",
      [auth]
    );
    if (!user.length) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    let phone = userInfo.phone;

    // Get daily salary records with detailed information
    const [records] = await connection.query(
      `
            SELECT
                amount,
                level,
                active_players,
                min_recharge,
                time as date_time,
                DATE(time) as salary_date
            FROM salary
            WHERE phone = ? AND type = 'daily'
            ORDER BY id DESC
            LIMIT 50
        `,
      [phone]
    );

    // Get current user's active players count
    const [activePlayers] = await connection.query(
      `
            SELECT COUNT(*) as total
            FROM users
            WHERE parent_id = ?
            AND status = 1
            AND total_recharge >= 5000
        `,
      [userInfo.id]
    );

    // Calculate total daily salary earned
    const [totalSalary] = await connection.query(
      `
            SELECT SUM(amount) as total
            FROM salary
            WHERE phone = ? AND type = 'daily'
        `,
      [phone]
    );

    // Get all salary records to calculate today and month earnings
    const [allSalaryRecords] = await connection.query(
      `
            SELECT amount, time
            FROM salary
            WHERE phone = ? AND type = 'daily'
            ORDER BY id DESC
        `,
      [phone]
    );

    // Calculate today's earnings
    const today = new Date();
    const todayDateStr = today.toDateString();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let todayEarned = 0;
    let monthEarned = 0;

    allSalaryRecords.forEach((record) => {
      try {
        // Parse the time string - handle the format "MM/DD/YYYY, HH:MM:SS AM/PM"
        const recordDate = new Date(record.time);

        // Check if the date is valid
        if (!isNaN(recordDate.getTime())) {
          const recordMonth = recordDate.getMonth();
          const recordYear = recordDate.getFullYear();

          // Check if it's today
          if (recordDate.toDateString() === todayDateStr) {
            todayEarned += parseFloat(record.amount || 0);
          }

          // Check if it's this month
          if (recordMonth === currentMonth && recordYear === currentYear) {
            monthEarned += parseFloat(record.amount || 0);
          }
        }
      } catch (error) {
        console.log(`Error parsing date: ${record.time}`, error);
      }
    });

    console.log(
      `Debug - Phone: ${phone}, Today Earned: ${todayEarned}, Month Earned: ${monthEarned}`
    );
    console.log(`Debug - Total records found: ${allSalaryRecords.length}`);
    if (allSalaryRecords.length > 0) {
      console.log(`Debug - Sample records:`, allSalaryRecords.slice(0, 3));
    } else {
      console.log(`Debug - No salary records found for phone: ${phone}`);
    }

    // Get current level based on active players and total recharge
    let currentLevel = 0;
    let nextLevelRequirement = null;
    let activePlayers_count = activePlayers[0].total || 0;
    let total_recharge = userInfo.total_recharge || 0;

    if (activePlayers_count >= 2560 && total_recharge >= 2560000) {
      currentLevel = 10;
    } else if (activePlayers_count >= 1280 && total_recharge >= 1280000) {
      currentLevel = 9;
      nextLevelRequirement = { players: 2560, recharge: 2560000 };
    } else if (activePlayers_count >= 640 && total_recharge >= 640000) {
      currentLevel = 8;
      nextLevelRequirement = { players: 1280, recharge: 1280000 };
    } else if (activePlayers_count >= 320 && total_recharge >= 320000) {
      currentLevel = 7;
      nextLevelRequirement = { players: 640, recharge: 640000 };
    } else if (activePlayers_count >= 160 && total_recharge >= 160000) {
      currentLevel = 6;
      nextLevelRequirement = { players: 320, recharge: 320000 };
    } else if (activePlayers_count >= 80 && total_recharge >= 80000) {
      currentLevel = 5;
      nextLevelRequirement = { players: 160, recharge: 160000 };
    } else if (activePlayers_count >= 40 && total_recharge >= 40000) {
      currentLevel = 4;
      nextLevelRequirement = { players: 80, recharge: 80000 };
    } else if (activePlayers_count >= 20 && total_recharge >= 20000) {
      currentLevel = 3;
      nextLevelRequirement = { players: 40, recharge: 40000 };
    } else if (activePlayers_count >= 10 && total_recharge >= 10000) {
      currentLevel = 2;
      nextLevelRequirement = { players: 20, recharge: 20000 };
    } else if (activePlayers_count >= 5 && total_recharge >= 5000) {
      currentLevel = 1;
      nextLevelRequirement = { players: 10, recharge: 10000 };
    } else {
      nextLevelRequirement = { players: 5, recharge: 5000 };
    }

    return res.status(200).json({
      message: "Daily salary data retrieved successfully",
      status: true,
      data: {
        records: records,
        currentLevel: currentLevel,
        activePlayers: activePlayers_count,
        totalRecharge: total_recharge,
        totalSalaryEarned: totalSalary[0].total || 0,
        todayEarned: todayEarned,
        monthEarned: monthEarned,
        nextLevelRequirement: nextLevelRequirement,
        salaryLevels: [
          { level: 0, players: 0, recharge: 0, dailyIncome: 0 },
          { level: 1, players: 5, recharge: 5000, dailyIncome: 500 },
          { level: 2, players: 10, recharge: 10000, dailyIncome: 1000 },
          { level: 3, players: 20, recharge: 20000, dailyIncome: 2000 },
          { level: 4, players: 40, recharge: 40000, dailyIncome: 4000 },
          { level: 5, players: 80, recharge: 80000, dailyIncome: 8000 },
          { level: 6, players: 160, recharge: 160000, dailyIncome: 16000 },
          { level: 7, players: 320, recharge: 320000, dailyIncome: 32000 },
          { level: 8, players: 640, recharge: 640000, dailyIncome: 64000 },
          { level: 9, players: 1280, recharge: 1280000, dailyIncome: 128000 },
          { level: 10, players: 2560, recharge: 2560000, dailyIncome: 256000 },
        ],
      },
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("Daily salary error:", error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};

// Get daily attendance history
const getAttendanceHistory = async (req, res) => {
  let auth = req.cookies.auth;

  if (!auth) {
    return res.status(200).json({
      message: "Authentication failed",
      status: false,
      timeStamp: Date.now(),
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT phone FROM users WHERE token = ?",
      [auth]
    );
    if (!user.length) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: Date.now(),
      });
    }

    const userInfo = user[0];

    // Get last 30 days of attendance
    const [attendanceHistory] = await connection.query(
      "SELECT date, consecutive_days, bonus_amount FROM daily_attendance WHERE phone = ? ORDER BY date DESC LIMIT 30",
      [userInfo.phone]
    );

    // Get current streak
    const [currentStreak] = await connection.query(
      "SELECT consecutive_days FROM daily_attendance WHERE phone = ? ORDER BY date DESC LIMIT 1",
      [userInfo.phone]
    );

    // Check if user can check in today
    const today = new Date().toISOString().slice(0, 10);
    const [todayAttendance] = await connection.query(
      "SELECT * FROM daily_attendance WHERE phone = ? AND date = ?",
      [userInfo.phone, today]
    );

    const canCheckInToday = todayAttendance.length === 0;
    const currentStreakDays =
      currentStreak.length > 0 ? currentStreak[0].consecutive_days : 0;

    return res.status(200).json({
      message: "Attendance history retrieved successfully",
      status: true,
      data: {
        history: attendanceHistory,
        currentStreak: currentStreakDays,
        canCheckInToday: canCheckInToday,
        totalDays: attendanceHistory.length,
      },
      timeStamp: Date.now(),
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      timeStamp: Date.now(),
    });
  }
};

const WeeklySalary = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT id, phone, code, invite, total_recharge FROM users WHERE token = ?",
      [auth]
    );
    if (!user.length) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    let phone = userInfo.phone;

    // Get weekly salary records with detailed information
    const [records] = await connection.query(
      `
            SELECT
                amount,
                level,
                active_players,
                min_recharge,
                time as date_time,
                DATE(time) as salary_date
            FROM salary
            WHERE phone = ? AND type = 'weekly'
            ORDER BY id DESC
            LIMIT 50
        `,
      [phone]
    );

    // Calculate total weekly salary earned
    const [totalSalary] = await connection.query(
      `
            SELECT SUM(amount) as total
            FROM salary
            WHERE phone = ? AND type = 'weekly'
        `,
      [phone]
    );

    return res.status(200).json({
      message: "Weekly salary data retrieved successfully",
      status: true,
      data: {
        records: records,
        totalSalaryEarned: totalSalary[0].total || 0,
        salaryLevels: [
          { level: 1, players: 5, recharge: 5000, weeklyIncome: 1000 },
          { level: 2, players: 10, recharge: 10000, weeklyIncome: 2000 },
          { level: 3, players: 20, recharge: 20000, weeklyIncome: 4000 },
          { level: 4, players: 40, recharge: 40000, weeklyIncome: 8000 },
          { level: 5, players: 80, recharge: 80000, weeklyIncome: 16000 },
          { level: 6, players: 160, recharge: 160000, weeklyIncome: 32000 },
          { level: 7, players: 320, recharge: 320000, weeklyIncome: 64000 },
          { level: 8, players: 640, recharge: 640000, weeklyIncome: 128000 },
          { level: 9, players: 1280, recharge: 1280000, weeklyIncome: 256000 },
          { level: 10, players: 2560, recharge: 2560000, weeklyIncome: 512000 },
        ],
      },
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("Weekly salary error:", error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};
const MonthlySalary = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT id, phone, code, invite, total_recharge FROM users WHERE token = ?",
      [auth]
    );
    if (!user.length) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    let phone = userInfo.phone;

    // Get monthly salary records with detailed information
    const [records] = await connection.query(
      `
            SELECT
                amount,
                level,
                active_players,
                min_recharge,
                time as date_time,
                DATE(time) as salary_date
            FROM salary
            WHERE phone = ? AND type = 'monthly'
            ORDER BY id DESC
            LIMIT 50
        `,
      [phone]
    );

    // Calculate total monthly salary earned
    const [totalSalary] = await connection.query(
      `
            SELECT SUM(amount) as total
            FROM salary
            WHERE phone = ? AND type = 'monthly'
        `,
      [phone]
    );

    return res.status(200).json({
      message: "Monthly salary data retrieved successfully",
      status: true,
      data: {
        records: records,
        totalSalaryEarned: totalSalary[0].total || 0,
        salaryLevels: [
          { level: 1, players: 5, recharge: 5000, monthlyIncome: 5000 },
          { level: 2, players: 10, recharge: 10000, monthlyIncome: 10000 },
          { level: 3, players: 20, recharge: 20000, monthlyIncome: 20000 },
          { level: 4, players: 40, recharge: 40000, monthlyIncome: 40000 },
          { level: 5, players: 80, recharge: 80000, monthlyIncome: 80000 },
          { level: 6, players: 160, recharge: 160000, monthlyIncome: 160000 },
          { level: 7, players: 320, recharge: 320000, monthlyIncome: 320000 },
          { level: 8, players: 640, recharge: 640000, monthlyIncome: 640000 },
          {
            level: 9,
            players: 1280,
            recharge: 1280000,
            monthlyIncome: 1280000,
          },
          {
            level: 10,
            players: 2560,
            recharge: 2560000,
            monthlyIncome: 2560000,
          },
        ],
      },
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("Monthly salary error:", error);
    return res.status(500).json({
      message: "Server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const DailyTrade = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT id,`phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  let userPhone = user[0].phone;

  // Filter trade level income including TradeLevelBonus
  // Trade types include: 'Win', 'Trx', 'TRX_Trade', 'TradeLevelBonus', etc.
  const [Record] = await connection.query(
    "SELECT U.id_user as fromId , L.level , L.amount as trade , L.returns , L.net_amount as amount , L.date, L.type, L.date_time FROM `inc_level` as L LEFT JOIN users as U ON L.from_id = U.phone WHERE L.user_id = ? AND L.type IS NOT NULL AND L.type != '' ORDER BY L.id DESC LIMIT 500",
    [userPhone]
  );

  return res.status(200).json({
    message: "Receive success",
    record: Record,
    info: user,
    status: true,
    timeStamp: timeNow,
  });
};
const referralBonus = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT id,`phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  let phone = user[0].phone;

  const [Record] = await connection.query(
    `
        SELECT
            U.id_user as fromId,
            U.phone as fromPhone,
            U.name_user as fromName,
            U.code as fromCode,
            D.total_amount as trade,
            D.returns,
            D.net_amount as amount,
            D.date_time,
            D.date
        FROM inc_direct as D
        LEFT JOIN users as U ON D.from_id = U.phone
        WHERE D.phone = ?
        ORDER BY D.id DESC
    `,
    [phone]
  );

  return res.status(200).json({
    message: "Receive success",
    record: Record, // level,
    info: user,
    status: true,

    timeStamp: timeNow,
  });
};
const rechargeBonus = async (req, res) => {
  const auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: Date.now(),
    });
  }

  try {
    const [user] = await connection.query(
      "SELECT id, phone, code, invite, roses_f, roses_f1, roses_today FROM users WHERE token = ?",
      [auth]
    );

    if (!user.length) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        timeStamp: Date.now(),
      });
    }

    const userInfo = user[0];
    const userId = userInfo.id;

    // Recharge salary (direct)
    const [RechargeSalary] = await connection.query(
      "SELECT amount, DATE(date_time) AS date FROM inc_recharge_salary WHERE phone = ?",
      [userInfo.phone]
    );

    // Level income with from_user details (only available fields)
    // Filter only recharge level income (where type is NULL or empty)
    const [LevelBonus] = await connection.query(
      `SELECT 
                l.level, 
                l.net_amount AS amount, 
                DATE(l.date_time) AS date,
                u.id AS from_id,
                u.phone AS from_phone,
                u.code AS from_code
            FROM inc_level l
            LEFT JOIN users u ON l.from_id = u.id
            WHERE l.user_id = ? AND (l.type IS NULL OR l.type = '')
            ORDER BY l.level ASC, l.date_time DESC`,
      [userId]
    );

    const formattedLevelBonus = LevelBonus.map((row) => ({
      level: row.level,
      amount: row.amount,
      date: row.date,
      from_user: {
        id: row.from_id,
        phone: row.from_phone || "",
        code: row.from_code || "",
      },
    }));

    return res.status(200).json({
      message: "Receive success",
      record: RechargeSalary,
      level_bonus: formattedLevelBonus,
      info: userInfo,
      status: true,
      timeStamp: Date.now(),
    });
  } catch (err) {
    console.error("Error in rechargeBonus:", err);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      timeStamp: Date.now(),
    });
  }
};

const LevelTurnOver = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT id,`phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );

  let userInfo = user[0];

  //----------------------------------------------------------------------------------

  let member_id = userInfo.id;
  let usersLevel = await returnLevel2(member_id, ""); // Assuming '3' is the target level
  let CurrentDate = getCurrentDate();

  let dataArray = [];

  // Iterate through usersLevel array
  for (let i = 0; i < usersLevel.length; i++) {
    let levelData = usersLevel[i];
    if (levelData.level <= 50) {
      let data = levelData.data;
      let dataObject = {}; // Initialize an empty object
      dataObject["amount"] = 0;
      dataObject["totalAmount"] = 0;
      for (let j = 0; j < data.length; j++) {
        let uData = data[j];
        let phone = uData.phone;

        if (phone) {
          const [recharge_today] = await connection.query(
            `SELECT SUM(money) as total FROM recharge WHERE status = 1 AND phone = ? AND date(date_time) = ?`,
            [phone, CurrentDate]
          );
          if (recharge_today.length > 0 && recharge_today[0].total !== null) {
            dataObject["amount"] += parseFloat(recharge_today[0].total);
          }
          const [recharge_Total] = await connection.query(
            `SELECT SUM(money) as total FROM recharge WHERE status = 1 AND phone = ?  `,
            [phone]
          );

          if (recharge_Total.length > 0 && recharge_Total[0].total !== null) {
            dataObject["totalAmount"] += parseFloat(recharge_Total[0].total);
          }
        }
      }

      // Assign level and total properties to the dataObject
      dataObject["level"] = levelData.level;
      dataObject["total"] = levelData.total;

      dataArray.push(dataObject); // Push the object into the dataArray
    }
  }

  //---------------------------------------------------------------------------------

  return res.status(200).json({
    message: "Receive success",
    level: dataArray, // level,
    info: user,
    status: true,

    timeStamp: timeNow,
  });
};

const commissionTotal = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: new Date(),
    });
  }

  try {
    const [userResult] = await connection.query(
      "SELECT id, phone, code, invite, roses_f, roses_f1, roses_today FROM users WHERE token = ?",
      [auth]
    );

    if (!userResult.length) {
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: new Date(),
      });
    }

    let userInfo = userResult[0];

    let type1 = "daily";
    let type2 = "weekly";
    let type3 = "monthly";

    const sqlSalaryd =
      'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "daily" ';
    const [rowsSalaryd] = await connection.execute(sqlSalaryd, [
      userInfo.phone,
    ]);
    const TotalDailySalary = rowsSalaryd[0].total || 0;

    const sqlSalaryW =
      'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "weekly"';
    const [rowsSalaryW] = await connection.execute(sqlSalaryW, [
      userInfo.phone,
    ]);
    const TotalWeeklySalary = rowsSalaryW[0].total || 0;

    const sqlSalaryM =
      'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "monthly"';
    const [rowsSalaryM] = await connection.execute(sqlSalaryM, [
      userInfo.phone,
    ]);
    const TotalMonthlySalary = rowsSalaryM[0].total || 0;

    // Remove invite bonus from commission calculation as requested
    // const sqlSalaryIB = 'SELECT SUM(amount) as total FROM inc_invite_bonus  WHERE phone = ? ';
    // const [rowsSalaryIB] = await connection.execute(sqlSalaryIB, [userInfo.phone]);
    // const inviteBonus = rowsSalaryIB[0].total || 0;

    const sqlLevelCom =
      "SELECT SUM(net_amount) as total FROM inc_level WHERE user_id = ?";
    const [rowsLevelCom] = await connection.execute(sqlLevelCom, [userInfo.id]);
    const TotalLevel = rowsLevelCom[0].total || 0;

    const sqlRefCom =
      "SELECT SUM(net_amount) as total FROM inc_direct WHERE phone = ?";
    const [rowsRefCom] = await connection.execute(sqlRefCom, [userInfo.phone]);
    const TotalRefCom = rowsRefCom[0].total || 0;

    const sqlRechargeCom =
      "SELECT SUM(amount) as total FROM inc_recharge_salary WHERE phone = ?";
    const [rowsRechargeCom] = await connection.execute(sqlRechargeCom, [
      userInfo.phone,
    ]);
    const TotalRechargeCom = rowsRechargeCom[0].total || 0;

    // Add recharge bonus amounts to commission calculation
    const sqlRechargeBonus =
      "SELECT SUM(money) as total FROM recharge WHERE phone = ? AND status = 1";
    const [rowsRechargeBonus] = await connection.execute(sqlRechargeBonus, [
      userInfo.phone,
    ]);
    const TotalRechargeBonus = rowsRechargeBonus[0].total || 0;

    // let TotalDailySalary = 0;
    // let TotalWeeklySalary = 0;
    // let TotalMonthlySalary = 0;

    // Today income (removed invite bonus, added recharge bonus)
    const sqlToday = `
SELECT (
    (SELECT IFNULL(SUM(amount),0) FROM salary WHERE phone = ? AND DATE(date_time) = CURDATE())
  + (SELECT IFNULL(SUM(net_amount),0) FROM inc_level WHERE user_id = ? AND DATE(date_time) = CURDATE())
  + (SELECT IFNULL(SUM(net_amount),0) FROM inc_direct WHERE phone = ? AND DATE(date_time) = CURDATE())
  + (SELECT IFNULL(SUM(amount),0) FROM inc_recharge_salary WHERE phone = ? AND DATE(date_time) = CURDATE())
  + (SELECT IFNULL(SUM(money),0) FROM recharge WHERE phone = ? AND DATE(time) = CURDATE() AND status = 1)
) AS totalToday`;

    const [rowsToday] = await connection.execute(sqlToday, [
      userInfo.phone,
      userInfo.id,
      userInfo.phone,
      userInfo.phone,
      userInfo.phone,
    ]);
    const totalTodayIncome = rowsToday[0].totalToday || 0;
    // Last 7 days income (removed invite bonus, added recharge bonus)
    const sqlWeek = `
SELECT (
    (SELECT IFNULL(SUM(amount),0) FROM salary WHERE phone = ? AND date_time >= NOW() - INTERVAL 7 DAY)
  + (SELECT IFNULL(SUM(net_amount),0) FROM inc_level WHERE user_id = ? AND date_time >= NOW() - INTERVAL 7 DAY)
  + (SELECT IFNULL(SUM(net_amount),0) FROM inc_direct WHERE phone = ? AND date_time >= NOW() - INTERVAL 7 DAY)
  + (SELECT IFNULL(SUM(amount),0) FROM inc_recharge_salary WHERE phone = ? AND date_time >= NOW() - INTERVAL 7 DAY)
  + (SELECT IFNULL(SUM(money),0) FROM recharge WHERE phone = ? AND time >= NOW() - INTERVAL 7 DAY AND status = 1)
) AS totalWeek`;

    const [rowsWeek] = await connection.execute(sqlWeek, [
      userInfo.phone,
      userInfo.id,
      userInfo.phone,
      userInfo.phone,
      userInfo.phone,
    ]);
    const totalWeekIncome = rowsWeek[0].totalWeek || 0;

    // Updated commission calculation: removed invite bonus, added recharge bonus
    let totalCommission = (
      TotalRechargeBonus +
      TotalRechargeCom +
      TotalRefCom +
      TotalLevel +
      TotalDailySalary +
      TotalWeeklySalary +
      TotalMonthlySalary
    ).toFixed(2);
    let levelCommission = TotalLevel.toFixed(2);
    let refCommission = TotalRefCom.toFixed(2);
    let rechargeCommission = TotalRechargeCom.toFixed(2);
    let rechargeBonusAmount = TotalRechargeBonus.toFixed(2);

    let totalDailySalary = TotalDailySalary.toFixed(2);
    let totalWeeklySalary = TotalWeeklySalary.toFixed(2);
    let totalMonthlySalary = TotalMonthlySalary.toFixed(2);
    // Removed invite bonus from response as requested
    // let inviteBonuss = inviteBonus.toFixed(2);

    return res.status(200).json({
      message: "Receive success",
      totalCommission: totalCommission,
      levelCommission: levelCommission,
      refCommission: refCommission,
      rechargeCommission: rechargeCommission,
      rechargeBonusAmount: rechargeBonusAmount, // Added recharge bonus amount
      totalDailySalary: totalDailySalary,
      totalWeeklySalary: totalWeeklySalary,
      totalMonthlySalary: totalMonthlySalary,
      // inviteBonuss removed as requested
      info: userInfo,

      totalTodayIncome: totalTodayIncome,
      totalWeekIncome: totalWeekIncome,
      status: true,
      timeStamp: new Date(),
    });
  } catch (error) {
    console.error("Database query error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      status: false,
      timeStamp: new Date(),
    });
  }
};
const promotion = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT id,`phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );
  const [level] = await connection.query("SELECT * FROM level");

  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  let userInfo = user[0];

  // Helper to check if a given timestamp (ms) is on the same calendar day as now
  const isSameDay = (ms) => {
    try {
      const dateToCheck = new Date(Number(ms));
      const now = new Date();
      return (
        dateToCheck.getFullYear() === now.getFullYear() &&
        dateToCheck.getMonth() === now.getMonth() &&
        dateToCheck.getDate() === now.getDate()
      );
    } catch (_) {
      return false;
    }
  };

  // Directly referred level-1 users
  const [f1s] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
    [userInfo.code]
  );

  // Directly referred users today (compare by date only)
  let f1_today = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_time = f1s[i].time;
    let check = isSameDay(f1_time);
    if (check) {
      f1_today += 1;
    }
  }

  // All referrals today across levels (compare by date only)
  let f_all_today = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code;
    const f1_time = f1s[i].time;
    let check_f1 = isSameDay(f1_time);
    if (check_f1) f_all_today += 1;

    // Total level-2 referrals today
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const f2_time = f2s[i].time;
      let check_f2 = isSameDay(f2_time);
      if (check_f2) f_all_today += 1;

      // Total level-3 referrals today
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let i = 0; i < f3s.length; i++) {
        const f3_code = f3s[i].code;
        const f3_time = f3s[i].time;
        let check_f3 = isSameDay(f3_time);
        if (check_f3) f_all_today += 1;

        // Total level-4 referrals today
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        for (let i = 0; i < f4s.length; i++) {
          const f4_code = f4s[i].code;
          const f4_time = f4s[i].time;
          let check_f4 = isSameDay(f4_time);
          if (check_f4) f_all_today += 1;
        }
      }
    }
  }

  // Total level-2 referrals
  let f2 = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code;
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    f2 += f2s.length;
  }

  // Total level-3 referrals
  let f3 = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code;
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      if (f3s.length > 0) f3 += f3s.length;
    }
  }

  // Total level-4 referrals
  let f4 = 0;
  for (let i = 0; i < f1s.length; i++) {
    const f1_code = f1s[i].code;
    const [f2s] = await connection.query(
      "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
      [f1_code]
    );
    for (let i = 0; i < f2s.length; i++) {
      const f2_code = f2s[i].code;
      const [f3s] = await connection.query(
        "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
        [f2_code]
      );
      for (let i = 0; i < f3s.length; i++) {
        const f3_code = f3s[i].code;
        const [f4s] = await connection.query(
          "SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ",
          [f3_code]
        );
        if (f4s.length > 0) f4 += f4s.length;
      }
    }
  }

  let selectedData = [];

  async function fetchInvitesByCode(code, depth = 1) {
    if (depth > 6) {
      return;
    }

    const [inviteData] = await connection.query(
      "SELECT `id_user`,`name_user`,`phone`, `code`, `invite`, `rank`, `user_level`, `total_money` FROM users WHERE `invite` = ?",
      [code]
    );

    if (inviteData.length > 0) {
      for (const invite of inviteData) {
        selectedData.push(invite);
        await fetchInvitesByCode(invite.code, depth + 1);
      }
    }
  }

  if (f1s.length > 0) {
    for (const initialInfoF1 of f1s) {
      selectedData.push(initialInfoF1);
      await fetchInvitesByCode(initialInfoF1.code);
    }
  }

  const sqlUsers =
    "WITH RECURSIVE descendants AS ( SELECT  id,  id_user, username,  name_user,  code,  invite,  0 AS depth                FROM  users WHERE  code = ? UNION ALL SELECT  u.id,  u.id_user,  u.username,  u.name_user,  u.code,  u.invite,  d.depth + 1 FROM  users u INNER JOIN descendants d  ON  u.invite = d.code ) SELECT COUNT(*) AS total_count FROM descendants WHERE depth > 0;         ";
  const [rowsUsers] = await connection.execute(sqlUsers, [userInfo.code]);
  const total_ff = rowsUsers[0].total_count;

  const sqlLevelCom =
    " SELECT SUM(net_amount) as total FROM `inc_level` WHERE user_id = ?  ";
  const [rowsLevelCom] = await connection.execute(sqlLevelCom, [
    userInfo.phone,
  ]);
  const TotalLevel = rowsLevelCom[0].total;

  const sqlRefCom =
    "SELECT SUM(net_amount) as total FROM `inc_direct` WHERE  phone = ?";
  const [rowsRefCom] = await connection.execute(sqlRefCom, [userInfo.phone]);
  const TotalRefCom = rowsRefCom[0].total;

  const sqlProcess =
    "SELECT * FROM `tbl_process` WHERE status =  ? ORDER BY id DESC LIMIT 1";
  const [rowProcess] = await connection.execute(sqlProcess, ["Y"]);
  const rowProcessId = rowProcess[0].id;

  const sqlLevelToday =
    " SELECT SUM(net_amount) as total FROM `inc_level` WHERE user_id = ?  and process_id = ?  ";
  const [rowsLevelToday] = await connection.execute(sqlLevelToday, [
    userInfo.phone,
    rowProcessId,
  ]);
  const TotalLevelToday = rowsLevelToday[0].total;

  const sqlRefToday =
    "SELECT SUM(net_amount) as total FROM `inc_direct` WHERE  phone = ?  and process_id = ? ";
  const [rowsRefToday] = await connection.execute(sqlRefToday, [
    userInfo.phone,
    rowProcessId,
  ]);
  const TotalRefToday = rowsRefToday[0].total;

  const sqlSalaryd =
    'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "daily" ';
  const [rowsSalaryd] = await connection.execute(sqlSalaryd, [userInfo.phone]);
  const TotalDailySalary = rowsSalaryd[0].total || 0;

  const sqlSalaryW =
    'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "weekly"';
  const [rowsSalaryW] = await connection.execute(sqlSalaryW, [userInfo.phone]);
  const TotalWeeklySalary = rowsSalaryW[0].total || 0;

  const sqlSalaryM =
    'SELECT SUM(amount) as total FROM salary WHERE phone = ? and type = "monthly"';
  const [rowsSalaryM] = await connection.execute(sqlSalaryM, [userInfo.phone]);
  const TotalMonthlySalary = rowsSalaryM[0].total || 0;

  const rosesF1 = parseFloat(userInfo.roses_f);
  const rosesAll = parseFloat(userInfo.roses_f1);
  const TotalLevelA = parseFloat(TotalLevel);
  const ReferralInc = TotalRefCom ? parseFloat(TotalRefCom) : 0;

  let rosesAdd = (
    rosesF1 +
    rosesAll +
    TotalLevelA +
    TotalDailySalary +
    TotalWeeklySalary +
    TotalMonthlySalary
  ).toFixed(2);
  let TodayCommission = (
    userInfo.roses_today +
    TotalLevelToday +
    TotalRefToday
  ).toFixed(2);
  TodayCommission = TodayCommission ? parseFloat(TodayCommission) : 0;

  return res.status(200).json({
    message: "Receive success",
    level: level,
    info: user,
    status: true,
    invite: {
      f1: f1s.length,
      // total_f: selectedData.length,
      total_f: total_ff,
      f1_today: f1_today,
      f_all_today: f_all_today,
      referralCommission: ReferralInc,
      roses_f1: userInfo.roses_f1,
      roses_f: userInfo.roses_f,
      roses_all: rosesAdd,
      roses_today: TodayCommission,
    },
    timeStamp: timeNow,
  });
};

const myTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  const [level] = await connection.query("SELECT * FROM level");
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  return res.status(200).json({
    message: "Receive success",
    level: level,
    info: user,
    status: true,
    timeStamp: timeNow,
  });
};

// const listMyTeam = async (req, res) => {
//   let auth = req.cookies.auth;
//   if (!auth) {
//     return res.status(200).json({
//       message: "Failed",
//       status: false,
//       timeStamp: timeNow,
//     });
//   }

//   const [user] = await connection.query(
//     "SELECT `phone`, `code`, `invite` FROM users WHERE `token` = ? ",
//     [auth]
//   );
//   if (!user) {
//     return res.status(200).json({
//       message: "Failed",
//       status: false,
//       timeStamp: timeNow,
//     });
//   }

//   let userInfo = user[0];
//   const [f1] = await connection.query(
//     "SELECT `id_user`, `phone`, `code`, `invite`,`roses_f`, `rank`, `name_user`,`status`,`total_money`, `time`,`today` FROM users WHERE `invite` = ? ORDER BY id DESC",
//     [userInfo.code]
//   );

//   const [mem] = await connection.query(
//     "SELECT `id_user`, `phone`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
//     [userInfo.code]
//   );

//   const [total_roses] = await connection.query(
//     "SELECT `f1`, `invite`, `code`, `phone`, `time` FROM roses WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
//     [userInfo.code]
//   );

//   const selectedData = [];

//   // Recursive function to fetch team data with deposit and turnover
//   async function fetchUserDataByCode(code, depth = 1) {
//     if (depth > 6) {
//       return;
//     }

//     const [userData] = await connection.query(
//       "SELECT `id_user`, `name_user`, `phone`, `code`, `invite`, `rank`, `total_money` FROM users WHERE `invite` = ?",
//       [code]
//     );

//     if (userData.length > 0) {
//       for (const user of userData) {
//         const [turnoverData] = await connection.query(
//           "SELECT `daily_turn_over`, `total_turn_over` FROM turn_over WHERE `phone` = ?",
//           [user.phone]
//         );
//         const [inviteCountData] = await connection.query(
//           "SELECT COUNT(*) as invite_count FROM users WHERE `invite` = ?",
//           [user.code]
//         );
//         const inviteCount = inviteCountData[0].invite_count;
//         const [times] = await connection.query(
//           "SELECT today FROM users WHERE `phone` = ?",
//           [user.phone]
//         );

//         const userObject = {
//           ...user,
//           invite_count: inviteCount,
//           user_level: depth,
//           time: times[0].today,
//           daily_turn_over: turnoverData[0]?.daily_turn_over || 0,
//           total_turn_over: turnoverData[0]?.total_turn_over || 0,
//         };

//         selectedData.push(userObject);
//         await fetchUserDataByCode(user.code, depth + 1);
//       }
//     }
//   }

//   await fetchUserDataByCode(userInfo.code);

//   // Calculate totals for all team members
//   let totalTeamDeposit = 0;
//   let totalTeamTurnover = 0;
//   let totalDirectDeposit = 0;
//   let totalDirectTurnover = 0;

//   // Calculate totals from all levels (f1 array contains all levels)
//   selectedData.forEach((member) => {
//     totalTeamDeposit += parseFloat(member.total_money || 0);
//     totalTeamTurnover += parseFloat(member.total_turn_over || 0);
//   });

//   // Calculate totals from direct referrals only (f1_direct)
//   f1.forEach((member) => {
//     totalDirectDeposit += parseFloat(member.total_money || 0);
//     totalDirectTurnover += parseFloat(member.total_turn_over || 0);
//   });

//   let newMem = [];
//   mem.map((data) => {
//     let objectMem = {
//       id_user: data.id_user,
//       phone:
//         "91" + data.phone.slice(0, 1) + "****" + String(data.phone.slice(-4)),
//       time: data.time,
//     };

//     return newMem.push(objectMem);
//   });
//   return res.status(200).json({
//     message: "Receive success",
//     f1: selectedData,
//     f1_direct: f1,
//     mem: newMem,
//     total_roses: total_roses,
//     // Add calculated totals to response
//     totals: {
//       team_deposit: totalTeamDeposit,
//       team_turnover: totalTeamTurnover,
//       direct_deposit: totalDirectDeposit,
//       direct_turnover: totalDirectTurnover,
//     },
//     status: true,
//     timeStamp: timeNow,
//   });
// };


const listMyTeam = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT `phone`, `code`, `invite` FROM users WHERE `token` = ? ",
    [auth]
  );

  if (!user || user.length === 0) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  let userInfo = user[0];

  // Get direct F1 members
  const [f1] = await connection.query(
    "SELECT `id_user`, `phone`, `code`, `invite`, `roses_f`, `rank`, `name_user`, `status`, `total_money`, `time`, `today` FROM users WHERE `invite` = ? ORDER BY id DESC",
    [userInfo.code]
  );

  const [mem] = await connection.query(
    "SELECT `id_user`, `phone`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );

  const [total_roses] = await connection.query(
    "SELECT `f1`, `invite`, `code`, `phone`, `time` FROM roses WHERE `invite` = ? ORDER BY id DESC LIMIT 100",
    [userInfo.code]
  );

  const selectedData = [];

  // Helper function to get yesterday's date
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Recursive function to fetch team data with deposit and turnover
  async function fetchUserDataByCode(code, depth = 1) {
    if (depth > 6) {
      return;
    }

    const [userData] = await connection.query(
      "SELECT `id_user`, `name_user`, `phone`, `code`, `invite`, `rank`, `total_money` FROM users WHERE `invite` = ?",
      [code]
    );

    if (userData.length > 0) {
      for (const user of userData) {
        // Get total recharge from recharge table (status = 1 for successful)
        const [rechargeData] = await connection.query(
          "SELECT IFNULL(SUM(money), 0) as total_deposit FROM recharge WHERE `phone` = ? AND `status` = 1",
          [user.phone]
        );

        // Get turnover data
        const [turnoverData] = await connection.query(
          "SELECT `daily_turn_over`, `total_turn_over` FROM turn_over WHERE `phone` = ?",
          [user.phone]
        );

        // Calculate yesterday's turnover from all bet tables
        const yesterdayDate = getYesterdayDate();
        const [yesterdayTurnover] = await connection.query(`
          SELECT IFNULL(SUM(total_bet), 0) as yesterday_turnover FROM (
            SELECT IFNULL(SUM(money), 0) as total_bet FROM minutes_1 
            WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
            UNION ALL
            SELECT IFNULL(SUM(money), 0) as total_bet FROM trx_result 
            WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
            UNION ALL
            SELECT IFNULL(SUM(money), 0) as total_bet FROM result_k3 
            WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
            UNION ALL
            SELECT IFNULL(SUM(money), 0) as total_bet FROM result_5d 
            WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
          ) as all_bets
        `, [
          user.phone, yesterdayDate,
          user.phone, yesterdayDate,
          user.phone, yesterdayDate,
          user.phone, yesterdayDate
        ]);

        // Count direct invites
        const [inviteCountData] = await connection.query(
          "SELECT COUNT(*) as invite_count FROM users WHERE `invite` = ?",
          [user.code]
        );

        const inviteCount = inviteCountData[0].invite_count;

        const [times] = await connection.query(
          "SELECT today FROM users WHERE `phone` = ?",
          [user.phone]
        );

        const userObject = {
          ...user,
          invite_count: inviteCount,
          user_level: depth,
          time: times[0].today,
          total_deposit: parseFloat(rechargeData[0].total_deposit) || 0,
          daily_turn_over: parseFloat(turnoverData[0]?.daily_turn_over) || 0,
          total_turn_over: parseFloat(turnoverData[0]?.total_turn_over) || 0,
          yesterday_turn_over: parseFloat(yesterdayTurnover[0]?.yesterday_turnover) || 0,
        };

        selectedData.push(userObject);
        await fetchUserDataByCode(user.code, depth + 1);
      }
    }
  }

 await fetchUserDataByCode(userInfo.code);

 // Process F1 direct members with deposit data
 const yesterdayDate = getYesterdayDate();
 const f1WithDeposit = await Promise.all(
   f1.map(async (member) => {
     // Get total recharge for F1 member
     const [rechargeData] = await connection.query(
       "SELECT IFNULL(SUM(money), 0) as total_deposit FROM recharge WHERE `phone` = ? AND `status` = 1",
       [member.phone]
     );

     // Get turnover for F1 member
     const [turnoverData] = await connection.query(
       "SELECT `daily_turn_over`, `total_turn_over` FROM turn_over WHERE `phone` = ?",
       [member.phone]
     );

     // Calculate yesterday's turnover for F1 member from all bet tables
     const [yesterdayTurnover] = await connection.query(`
       SELECT IFNULL(SUM(total_bet), 0) as yesterday_turnover FROM (
         SELECT IFNULL(SUM(money), 0) as total_bet FROM minutes_1 
         WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
         UNION ALL
         SELECT IFNULL(SUM(money), 0) as total_bet FROM trx_result 
         WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
         UNION ALL
         SELECT IFNULL(SUM(money), 0) as total_bet FROM result_k3 
         WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
         UNION ALL
         SELECT IFNULL(SUM(money), 0) as total_bet FROM result_5d 
         WHERE phone = ? AND DATE(FROM_UNIXTIME(time / 1000)) = ?
       ) as all_bets
     `, [
       member.phone, yesterdayDate,
       member.phone, yesterdayDate,
       member.phone, yesterdayDate,
       member.phone, yesterdayDate
     ]);

     return {
       ...member,
       total_deposit: parseFloat(rechargeData[0].total_deposit) || 0,
       daily_turn_over: parseFloat(turnoverData[0]?.daily_turn_over) || 0,
       total_turn_over: parseFloat(turnoverData[0]?.total_turn_over) || 0,
       yesterday_turn_over: parseFloat(yesterdayTurnover[0]?.yesterday_turnover) || 0,
     };
   })
 );

 // Format member data for display
 let newMem = mem.map((data) => ({
   id_user: data.id_user,
   phone:
     "91" + data.phone.slice(0, 1) + "****" + String(data.phone.slice(-4)),
   time: data.time,
 }));

 // Debug: Log the data to console
 console.log("User Code:", userInfo.code);
 console.log("F1 Direct Count:", f1WithDeposit.length);
 console.log("Total Team Count:", selectedData.length);
 console.log("F1 Direct Data:", JSON.stringify(f1WithDeposit, null, 2));
 console.log(selectedData , 55555);
 console.log(f1WithDeposit , 44444);
 return res.status(200).json({
   message: "Receive success",
   f1: selectedData,
   f1_direct: f1WithDeposit,
   mem: newMem,
   total_roses: total_roses,
   status: true,
   timeStamp: timeNow,
 });
};

const wowpay = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;

  // Fetching the user's mobile number from the database using auth token

  // Your existing controller code here
};

const recharge = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let type = req.body.type;
  let typeid = req.body.typeid;

  const minimumMoney = process.env.MINIMUM_MONEY;

  if (type != "cancel") {
    if (!auth || !money || money < minimumMoney - 1) {
      return res.status(200).json({
        message: "Failed",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`name_user`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  if (type == "cancel") {
    await connection.query(
      "UPDATE recharge SET status = 2 WHERE phone = ? AND id_order = ? AND status = ? ",
      [userInfo.phone, typeid, 0]
    );
    return res.status(200).json({
      message: "Cancelled order successfully",
      status: true,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );

  if (recharge.length == 0) {
    let time = new Date().getTime();
    const date = new Date();
    function formateT(params) {
      let result = params < 10 ? "0" + params : params;
      return result;
    }

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
    let checkTime = timerJoin(time);
    let id_time =
      date.getUTCFullYear() +
      "" +
      date.getUTCMonth() +
      1 +
      "" +
      date.getUTCDate();
    let id_order =
      Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
      10000000000000;
    // let vat = Math.floor(Math.random() * (2000 - 0 + 1) ) + 0;

    money = Number(money);
    let client_transaction_id = id_time + id_order;
    const formData = {
      username: process.env.accountBank,
      secret_key: process.env.secret_key,
      client_transaction: client_transaction_id,
      amount: money,
    };

    if (type == "momo") {
      const sql = `INSERT INTO recharge SET 
            id_order = ?,
            transaction_id = ?,
            phone = ?,
            money = ?,
            type = ?,
            status = ?,
            today = ?,
            url = ?,
            time = ?`;
      await connection.execute(sql, [
        client_transaction_id,
        "NULL",
        userInfo.phone,
        money,
        type,
        0,
        checkTime,
        "NULL",
        time,
      ]);
      const [recharge] = await connection.query(
        "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
        [userInfo.phone, 0]
      );
      return res.status(200).json({
        message: "Received successfully",
        datas: recharge[0],
        status: true,
        timeStamp: timeNow,
      });
    }

    const moneyString = money.toString();

    const apiData = {
      key: process.env.PAYMENT_KEY,
      client_txn_id: client_transaction_id,
      amount: moneyString,
      p_info: process.env.PAYMENT_INFO,
      customer_name: userInfo.name_user,
      customer_email: process.env.PAYMENT_EMAIL,
      customer_mobile: userInfo.phone,
      redirect_url: `${process.env.APP_BASE_URL}/wallet/rechargerecord`,
      udf1: process.env.APP_NAME,
    };

    try {
      const apiResponse = await axios.post(
        "https://api.ekqr.in/api/create_order",
        apiData
      );

      if (apiResponse.data.status == true) {
        const sql = `INSERT INTO recharge SET 
                id_order = ?,
                transaction_id = ?,
                phone = ?,
                money = ?,
                type = ?,
                status = ?,
                today = ?,
                url = ?,
                time = ?`;

        await connection.execute(sql, [
          client_transaction_id,
          "0",
          userInfo.phone,
          money,
          type,
          0,
          checkTime,
          "0",
          timeNow,
        ]);

        const [recharge] = await connection.query(
          "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
          [userInfo.phone, 0]
        );

        return res.status(200).json({
          message: "Received successfully",
          datas: recharge[0],
          payment_url: apiResponse.data.data.payment_url,
          status: true,
          timeStamp: timeNow,
        });
      } else {
        return res
          .status(500)
          .json({ message: "Failed to create order", status: false });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "API request failed", status: false });
    }
  } else {
    return res.status(200).json({
      message: "Received successfully",
      datas: recharge[0],
      status: true,
      timeStamp: timeNow,
    });
  }
};

const cancelRecharge = async (req, res) => {
  try {
    let auth = req.cookies.auth;

    if (!auth) {
      return res.status(200).json({
        message: "Authorization is required to access this API!",
        status: false,
        timeStamp: timeNow,
      });
    }

    const [user] = await connection.query(
      "SELECT `phone`, `code`,`name_user`,`invite` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user) {
      return res.status(200).json({
        message: "Authorization is required to access this API!",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];

    const result = await connection.query(
      "DELETE FROM recharge WHERE phone = ? AND status = ?",
      [userInfo.phone, 0]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({
        message: "All the pending recharges has been deleted successfully!",
        status: true,
        timeStamp: timeNow,
      });
    } else {
      return res.status(200).json({
        message:
          "There was no pending recharges for this user or delete operation has been failed!",
        status: true,
        timeStamp: timeNow,
      });
    }
  } catch (error) {
    console.error("API error: ", error);
    return res.status(500).json({
      message: "API Request failed!",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const infoUserBank = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money`,`temp_money`, `roses_f`, `roses_today` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

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
  let date = new Date().getTime();
  let checkTime = timerJoin(date);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = 1",
    [userInfo.phone]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ?",
    [userInfo.phone]
  );
  let total = 0;
  recharge.forEach((data) => {
    total += parseFloat(data.money);
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += parseFloat(data.money);
  });
  let fee = 0;
  minutes_1.forEach((data) => {
    fee += parseFloat(data.fee);
  });

  result = Math.max(result, 0);
  let result = 0;
  let TotalBalance = userInfo.money;
  let TempBalance = userInfo.temp_money;

  if (TotalBalance - TempBalance > 0)
    result = (TotalBalance - TempBalance).toFixed(2);

  //  if (total - total2 > 0) result = total - total2 - fee;

  const [userBank] = await connection.query(
    "SELECT * FROM user_bank WHERE phone = ? ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Received successfully",
    datas: userBank,
    userInfo: user,
    result: result,
    earningAmount: userInfo.roses_f || 0,
    todayEarning: userInfo.roses_today || 0,
    status: true,
    timeStamp: timeNow,
  });
};

const withdrawal3 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let password = req.body.password;
  let withdrawMethod = req.body.withdrawMethod;
  console.log("req.body", req.body);
  console.log(withdrawMethod);

  // return res.status(200).json({
  //         message: 'Failed',
  //         status: false,
  //         timeStamp: timeNow,
  //     })

  if (!auth || !money || !password || money < 100) {
    return res.status(200).json({
      message: "Min 100",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `money` , `temp_money` FROM users WHERE `token` = ? AND password = ?",
    [auth, md5(password)]
  );

  if (user.length == 0) {
    return res.status(200).json({
      message: "incorrect password",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  const date = new Date();
  let id_time =
    date.getUTCFullYear() +
    "" +
    date.getUTCMonth() +
    1 +
    "" +
    date.getUTCDate();
  let id_order =
    Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
    10000000000000;

  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

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
  let dates = new Date().getTime();
  let checkTime = timerJoin(dates);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = 1",
    [userInfo.phone]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ?",
    [userInfo.phone]
  );
  let total = 0;
  recharge.forEach((data) => {
    total += parseFloat(data.money);
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += parseFloat(data.money);
  });

  let result = 0;
  if (total - total2 > 0) result = total - total2;
  result = Math.max(result, 0);
  const [user_bank] = await connection.query(
    "SELECT * FROM user_bank WHERE `phone` = ?",
    [userInfo.phone]
  );
  const [withdraw] = await connection.query(
    "SELECT * FROM withdraw WHERE `phone` = ? AND today = ?",
    [userInfo.phone, checkTime]
  );
  let sts;
  let msg;

  // Check if user has bank details first
  if (user_bank.length === 0) {
    sts = 0;
    msg = "Add your Bank details first";
  } else {
    if (withdrawMethod == "bank") {
      // For bank withdrawals, only check bank details, crypto address is optional
      if (user_bank[0].name_user && user_bank[0].stk && user_bank[0].email) {
        sts = 1;
      } else {
        sts = 0;
        msg = "Add your Bank details";
      }
    } else {
      // For crypto withdrawals, crypto address is mandatory
      if (user_bank[0].cryptoAdd) {
        sts = 1;
      } else {
        sts = 0;
        msg = "Add your crypto address";
      }
    }
  }

  // user_bank.length != 0
  if (sts > 0) {
    if (withdraw.length < 3) {
      // Check for P2P received amounts that cannot be withdrawn
      const [p2pReceived] = await connection.query(
        "SELECT SUM(amount) as total FROM balance_transfer WHERE receiver_phone = ?",
        [userInfo.phone]
      );
      const p2pReceivedTotal = parseFloat(p2pReceived[0]?.total || 0);

      // Calculate withdrawable balance (total balance - P2P received amounts)
      const totalBalance =
        parseFloat(userInfo.money) - parseFloat(userInfo.temp_money);
      const withdrawableBalance = totalBalance; // - p2pReceivedTotal;

      if (withdrawableBalance < money) {
        return res.status(200).json({
          message: `Insufficient withdrawable balance. P2P received funds (₹${p2pReceivedTotal.toFixed(
            2
          )}) cannot be withdrawn. Available: ₹${Math.max(
            0,
            withdrawableBalance
          ).toFixed(2)}`,
          status: false,
          timeStamp: timeNow,
        });
      }

      if (
        parseFloat(userInfo.money) - parseFloat(userInfo.temp_money) - money >=
        0
      ) {
        let _wcharges = 0;
        let _wnetAmount = 0;

        if (withdrawMethod === "bank") {
          _wcharges = money * 0.1;
          _wnetAmount = money - _wcharges;
        } else {
          _wcharges = 0;
          _wnetAmount = money - _wcharges;
        }

        let infoBank = user_bank[0];

        const sql = `INSERT INTO withdraw SET 
                    id_order = ?,
                    phone = ?,
                    
                    money = ?,
                    charges = ?,
                    net_amount = ?,
                     
                    
                    mode = ?,
                    stk = ?,
                    name_bank = ?,
                    ifsc = ?,
                    address = ?,
                    name_user = ?,
                    status = ?,
                    today = ?,
                    time = ?`;

        await connection.execute(sql, [
          id_time + "" + id_order,
          userInfo.phone,
          money,
          _wcharges,
          _wnetAmount,
          withdrawMethod,
          infoBank.stk,
          infoBank.name_bank,
          infoBank.email,
          infoBank.cryptoAdd,
          infoBank.name_user,
          0,
          checkTime,
          dates,
        ]);
        await connection.query(
          "UPDATE users SET money = money - ? WHERE phone = ? ",
          [money, userInfo.phone]
        );
        return res.status(200).json({
          message: "Withdrawal successful",
          status: true,
          money: userInfo.money - money,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "The balance is not enough to fulfill the request",
          status: false,
          timeStamp: timeNow,
        });
      }
    } else {
      return res.status(200).json({
        message: "You can only make 3 withdrawals per day",
        status: false,
        timeStamp: timeNow,
      });
    }
  } else {
    return res.status(200).json({
      message: msg,
      status: false,
      timeStamp: user_bank[0],
    });
  }

  return res.status(200).json({
    message: "Please link your bank first",
    status: false,
    timeStamp: timeNow,
  });
};
const transfer = async (req, res) => {
  let auth = req.cookies.auth;
  let amount = req.body.amount;
  let receiver_phone = req.body.phone;
  const date = new Date();
  // let id_time = date.getUTCFullYear() + '' + (date.getUTCMonth() + 1) + '' + date.getUTCDate();
  let id_order =
    Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
    10000000000000;
  let time = new Date().getTime();
  let client_transaction_id = id_order;

  const [user] = await connection.query(
    "SELECT `phone`,`money`, `temp_money`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  let sender_phone = userInfo.phone;
  let sender_money = parseInt(userInfo.money);
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  function formateT(params) {
    let result = params < 10 ? "0" + params : params;
    return result;
  }

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

  let dates = new Date().getTime();
  let checkTime = timerJoin(dates);
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = 1 ",
    [userInfo.phone]
  );
  const [minutes_1] = await connection.query(
    "SELECT * FROM minutes_1 WHERE phone = ? ",
    [userInfo.phone]
  );
  let total = 0;
  recharge.forEach((data) => {
    total += data.money;
  });
  let total2 = 0;
  minutes_1.forEach((data) => {
    total2 += data.money;
  });

  // Get P2P transfer limits from configuration
  const [minTransferConfig] = await connection.query(
    "SELECT value FROM tbl_config WHERE name = 'p2p_min_transfer'"
  );
  const [maxTransferConfig] = await connection.query(
    "SELECT value FROM tbl_config WHERE name = 'p2p_max_transfer'"
  );
  const [dailyLimitConfig] = await connection.query(
    "SELECT value FROM tbl_config WHERE name = 'p2p_daily_limit'"
  );

  const minTransfer = parseFloat(minTransferConfig[0]?.value || "100");
  const maxTransfer = parseFloat(maxTransferConfig[0]?.value || "50000");
  const dailyLimit = parseFloat(dailyLimitConfig[0]?.value || "100000");

  // Validate transfer amount limits
  if (amount < minTransfer) {
    return res.status(200).json({
      message: `Minimum transfer amount is ₹${minTransfer}`,
      status: false,
      timeStamp: timeNow,
    });
  }

  if (amount > maxTransfer) {
    return res.status(200).json({
      message: `Maximum transfer amount is ₹${maxTransfer}`,
      status: false,
      timeStamp: timeNow,
    });
  }

  const today = new Date().toISOString().split("T")[0];

  // return res.status(200).json({
  //             message: 'Failed ssss' + today,
  //             status: false,
  //             timeStamp: timeNow,
  //         });
  // Check daily transfer limit

  const [dailyTransfers] = await connection.query(
    "SELECT SUM(amount) as total FROM balance_transfer WHERE sender_phone = ? AND DATE(FROM_UNIXTIME(created_at/1000)) = ?",
    [userInfo.phone, today]
  );
  const todayTotal = parseFloat(dailyTransfers[0]?.total || 0);

  if (todayTotal + amount > dailyLimit) {
    return res.status(200).json({
      message: `Daily transfer limit exceeded. Limit: ₹${dailyLimit}, Used: ₹${todayTotal.toFixed(
        2
      )}`,
      status: false,
      timeStamp: timeNow,
    });
  }

  // let result = 0;
  // if (total - total2 > 0) result = total - total2;

  // // console.log('date:', result);
  // if (result == 0) {
  //     if (sender_money >= amount) {

  if (
    parseFloat(userInfo.money) - parseFloat(userInfo.temp_money) - amount >=
    0
  ) {
    let [receiver] = await connection.query(
      "SELECT * FROM users WHERE `phone` = ?",
      [receiver_phone]
    );
    if (receiver.length === 1 && sender_phone !== receiver_phone) {
      let money = parseFloat(sender_money) - parseFloat(amount);
      let total_money =
        parseFloat(amount) + parseFloat(receiver[0].total_money);

      try {
        await connection.query("UPDATE users SET money = ? WHERE phone = ?", [
          money,
          sender_phone,
        ]);
        await connection.query(
          `UPDATE users SET money = money + ? , temp_money = temp_money + ? WHERE phone = ?`,
          [amount, amount, receiver_phone]
        );
        const sql =
          "INSERT INTO balance_transfer (sender_phone, receiver_phone, amount ) VALUES (?, ?, ? )";
        await connection.execute(sql, [sender_phone, receiver_phone, amount]);

        // const sql_recharge = "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        // await connection.execute(sql_recharge, [client_transaction_id, 0, receiver_phone, amount, 'wallet', 0, checkTime, 0, time]);

        return res.status(200).json({
          message: `Requested ${amount} sent successfully`,
          status: true,
          timeStamp: timeNow,
        });
      } catch (error) {
        return res.status(200).json({
          message: error,
          status: false,
          timeStamp: timeNow,
        });
      }
    } else {
      return res.status(200).json({
        message: `${receiver_phone} is not a valid user mobile number`,
        status: false,
        timeStamp: timeNow,
      });
    }
  } else {
    return res.status(200).json({
      message: "The balance is not enough to fulfill the request",
      status: false,
      timeStamp: timeNow,
    });
  }

  //     } else {
  //         return res.status(200).json({
  //             message: 'Your balance is not enough',
  //             status: false,
  //             timeStamp: timeNow,
  //         });
  //     }
  // }
  // else {
  //     return res.status(200).json({
  //         message: 'The total bet is not enough to fulfill the request',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // }
};

// get transfer balance data
const getTransferLimits = async (req, res) => {
  try {
    const [minTransferConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'p2p_min_transfer'"
    );
    const [maxTransferConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'p2p_max_transfer'"
    );
    const [dailyLimitConfig] = await connection.query(
      "SELECT value FROM tbl_config WHERE name = 'p2p_daily_limit'"
    );

    const minTransfer = parseFloat(minTransferConfig[0]?.value || "100");
    const maxTransfer = parseFloat(maxTransferConfig[0]?.value || "50000");
    const dailyLimit = parseFloat(dailyLimitConfig[0]?.value || "100000");

    // Get user's daily usage if authenticated
    let dailyUsed = 0;
    const auth = req.cookies.auth;
    if (auth) {
      const [user] = await connection.query(
        "SELECT phone FROM users WHERE token = ?",
        [auth]
      );
      if (user.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const [dailyTransfers] = await connection.query(
          "SELECT SUM(amount) as total FROM balance_transfer WHERE sender_phone = ? AND DATE(FROM_UNIXTIME(created_at/1000)) = ?",
          [user[0].phone, today]
        );
        dailyUsed = parseFloat(dailyTransfers[0]?.total || 0);
      }
    }

    return res.status(200).json({
      message: "Success",
      status: true,
      limits: {
        minTransfer,
        maxTransfer,
        dailyLimit,
        dailyUsed,
        dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
      },
      timeStamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching transfer limits",
      status: false,
      timeStamp: Date.now(),
    });
  }
};

// Transaction History API - Get all user transactions (deposits, withdrawals, transfers)
const getTransactionHistory = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    if (!auth) {
      return res.status(200).json({
        message: "Authentication required",
        status: false,
        timeStamp: Date.now(),
      });
    }

    const [user] = await connection.query(
      "SELECT phone FROM users WHERE token = ?",
      [auth]
    );
    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: Date.now(),
      });
    }

    const userPhone = user[0].phone;
    const {
      page = 1,
      limit = 20,
      type = "all",
      startDate,
      endDate,
    } = req.query;
    const offset = (page - 1) * limit;

    let transactions = [];

    // Get recharge/deposit history
    if (type === "all" || type === "deposit") {
      let depositQuery = `
                SELECT
                    'deposit' as transaction_type,
                    id,
                    phone,
                    money as amount,
                    
                    status,
                    today as transaction_date,
                    time as transaction_time,
                    id_order,
                    utr
                FROM recharge
                WHERE phone = ?
            `;
      let depositParams = [userPhone];

      if (startDate) {
        depositQuery += " AND DATE(today) >= ?";
        depositParams.push(startDate);
      }
      if (endDate) {
        depositQuery += " AND DATE(today) <= ?";
        depositParams.push(endDate);
      }

      depositQuery += " ORDER BY today DESC";

      const [deposits] = await connection.query(depositQuery, depositParams);

      transactions = transactions.concat(deposits);
    }

    // Get withdrawal history
    if (type === "all" || type === "withdrawal") {
      let withdrawalQuery = `
                SELECT
                    'withdrawal' as transaction_type,
                    id,
                    phone,
                    money as amount,
                    status,
                    today as transaction_date,
                    time as transaction_time,
                    id_order,
                    NULL as utr
                FROM withdraw
                WHERE phone = ?
            `;
      let withdrawalParams = [userPhone];

      if (startDate) {
        withdrawalQuery += " AND DATE(today) >= ?";
        withdrawalParams.push(startDate);
      }
      if (endDate) {
        withdrawalQuery += " AND DATE(today) <= ?";
        withdrawalParams.push(endDate);
      }

      withdrawalQuery += " ORDER BY today DESC";

      const [withdrawals] = await connection.query(
        withdrawalQuery,
        withdrawalParams
      );
      transactions = transactions.concat(withdrawals);
    }

    // Get P2P transfer history (sent)
    if (type === "all" || type === "transfer_sent") {
      let transferSentQuery = `
                SELECT
                    'transfer_sent' as transaction_type,
                    id,
                    sender_phone as phone,
                    amount,
                    'P2P Transfer' as payment_method,
                    1 as status,
                    FROM_UNIXTIME(datetime/1000) as transaction_date,
                    FROM_UNIXTIME(datetime/1000) as transaction_time,
                    CONCAT('P2P-', id) as id_order,
                    receiver_phone as utr
                FROM balance_transfer
                WHERE sender_phone = ?
            `;
      let transferSentParams = [userPhone];

      if (startDate) {
        transferSentQuery += " AND DATE(FROM_UNIXTIME(datetime/1000)) >= ?";
        transferSentParams.push(startDate);
      }
      if (endDate) {
        transferSentQuery += " AND DATE(FROM_UNIXTIME(datetime/1000)) <= ?";
        transferSentParams.push(endDate);
      }

      transferSentQuery += " ORDER BY datetime DESC";

      const [transfersSent] = await connection.query(
        transferSentQuery,
        transferSentParams
      );
      transactions = transactions.concat(transfersSent);
    }

    // Get P2P transfer history (received)
    if (type === "all" || type === "transfer_received") {
      let transferReceivedQuery = `
                SELECT
                    'transfer_received' as transaction_type,
                    id,
                    receiver_phone as phone,
                    amount,
                    'P2P Received' as payment_method,
                    1 as status,
                    FROM_UNIXTIME(datetime/1000) as transaction_date,
                    FROM_UNIXTIME(datetime/1000) as transaction_time,
                    CONCAT('P2P-', id) as id_order,
                    sender_phone as utr
                FROM balance_transfer
                WHERE receiver_phone = ?
            `;
      let transferReceivedParams = [userPhone];

      if (startDate) {
        transferReceivedQuery += " AND DATE(FROM_UNIXTIME(datetime/1000)) >= ?";
        transferReceivedParams.push(startDate);
      }
      if (endDate) {
        transferReceivedQuery += " AND DATE(FROM_UNIXTIME(datetime/1000)) <= ?";
        transferReceivedParams.push(endDate);
      }

      transferReceivedQuery += " ORDER BY datetime DESC";

      const [transfersReceived] = await connection.query(
        transferReceivedQuery,
        transferReceivedParams
      );
      transactions = transactions.concat(transfersReceived);
    }

    // Sort all transactions by date (newest first)
    transactions.sort(
      (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
    );

    // Apply pagination
    const totalTransactions = transactions.length;
    const paginatedTransactions = transactions.slice(
      offset,
      offset + parseInt(limit)
    );

    return res.status(200).json({
      message: "Success",
      status: true,
      data: paginatedTransactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTransactions / limit),
        totalItems: totalTransactions,
        hasNext: offset + parseInt(limit) < totalTransactions,
        hasPrev: page > 1,
      },
      timeStamp: Date.now(),
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      timeStamp: Date.now(),
    });
  }
};

const transferHistory = async (req, res) => {
  try {
    let auth = req.cookies.auth;

    if (!auth) {
      return res.status(200).json({
        message: "Authentication required",
        status: false,
        timeStamp: timeNow,
      });
    }

    const [user] = await connection.query(
      "SELECT `phone`,`money`, `code`,`invite` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];

    const [history] = await connection.query(
      "SELECT * FROM balance_transfer WHERE sender_phone = ? ORDER BY datetime DESC",
      [userInfo.phone]
    );
    const [receive] = await connection.query(
      "SELECT * FROM balance_transfer WHERE receiver_phone = ? ORDER BY datetime DESC",
      [userInfo.phone]
    );

    return res.status(200).json({
      message: "Success",
      receive: receive || [],
      datas: history || [],
      status: true,
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("Transfer history error:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};
const recharge2 = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );
  const [bank_recharge] = await connection.query("SELECT * FROM bank_recharge");
  if (recharge.length != 0) {
    return res.status(200).json({
      message: "Received successfully",
      datas: recharge[0],
      infoBank: bank_recharge,
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listRecharge = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    if (!auth) {
      return res.status(200).json({
        message: "Authentication required",
        status: false,
        timeStamp: timeNow,
      });
    }

    const [user] = await connection.query(
      "SELECT `phone`,`pay_address`, `code`,`invite` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    const [recharge] = await connection.query(
      "SELECT * FROM recharge WHERE phone = ? ORDER BY id DESC ",
      [userInfo.phone]
    );

    return res.status(200).json({
      message: "Receive success",
      datas: recharge || [],
      address: userInfo?.pay_address,
      status: true,
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("List recharge error:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listcoinpayment = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    if (!auth) {
      return res.status(200).json({
        message: "Authentication required",
        status: false,
        timeStamp: timeNow,
      });
    }

    const [user] = await connection.query(
      "SELECT id, `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
      [auth]
    );

    if (!user || user.length === 0) {
      return res.status(200).json({
        message: "User not found",
        status: false,
        timeStamp: timeNow,
      });
    }

    let userInfo = user[0];
    const [recharge] = await connection.query(
      "SELECT * FROM tbl_coinpayment WHERE member_id = ? ORDER BY id DESC ",
      [userInfo.id]
    );

    return res.status(200).json({
      message: "Receive success",
      datas: recharge || [],
      status: true,
      timeStamp: timeNow,
    });
  } catch (error) {
    console.error("List coin payment error:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const search = async (req, res) => {
  let auth = req.cookies.auth;
  let phone = req.body.phone;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite`, `level` FROM users WHERE `token` = ? ",
    [auth]
  );
  if (user.length == 0) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  let userInfo = user[0];
  if (userInfo.level == 1) {
    const [users] = await connection.query(
      `SELECT * FROM users WHERE phone = ? ORDER BY id DESC `,
      [phone]
    );
    return res.status(200).json({
      message: "Receive success",
      datas: users,
      status: true,
      timeStamp: timeNow,
    });
  } else if (userInfo.level == 3) {
    const [users] = await connection.query(
      `SELECT * FROM users WHERE phone LIKE ? OR CAST(id_user AS CHAR) LIKE ? ORDER BY id DESC`,
      [`%${phone}%`, `%${phone}%`]
    );

    // const [users] = await connection.query(`SELECT * FROM users WHERE phone LIKE ? OR id_user LIKE ?     ORDER BY id DESC`, [`%${phone}%`, `%${phone}%`]);
    // const [users] = await connection.query(`SELECT * FROM users WHERE phone = ? ORDER BY id DESC `, [phone]);
    if (users.length == 0) {
      return res.status(200).json({
        message: "Receive success",
        datas: [],
        status: true,
        timeStamp: timeNow,
      });
    } else {
      if (users[0].ctv == userInfo.phone) {
        return res.status(200).json({
          message: "Receive success",
          datas: users,
          status: true,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Failed",
          status: false,
          timeStamp: timeNow,
        });
      }
    }
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const listWithdraw = async (req, res) => {
  let auth = req.cookies.auth;
  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [recharge] = await connection.query(
    "SELECT * FROM withdraw WHERE phone = ? ORDER BY id DESC ",
    [userInfo.phone]
  );
  return res.status(200).json({
    message: "Receive success",
    datas: recharge,
    status: true,
    timeStamp: timeNow,
  });
};

const useRedenvelope = async (req, res) => {
  let auth = req.cookies.auth;
  let code = req.body.code;
  if (!auth || !code) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [redenvelopes] = await connection.query(
    "SELECT * FROM redenvelopes WHERE id_redenvelope = ?",
    [code]
  );

  if (redenvelopes.length == 0) {
    return res.status(200).json({
      message: "Redemption code error",
      status: false,
      timeStamp: timeNow,
    });
  } else {
    let infoRe = redenvelopes[0];
    const d = new Date();
    const time = d.getTime();
    if (infoRe.status == "0") {
      const [exist] = await connection.query(
        "SELECT * FROM redenvelopes_used WHERE id_redenvelops = ? and phone_used = ? ",
        [code, userInfo.phone]
      );

      if (exist.length === 0) {
        let Status = 1;
        if (infoRe.used > 1) {
          Status = 0;
        }

        await connection.query(
          "UPDATE redenvelopes SET used = used - 1, status = ? WHERE `id_redenvelope` = ?",
          [Status, infoRe.id_redenvelope]
        );

        await connection.query(
          "UPDATE users SET temp_money = temp_money + ?, money = money + ? WHERE `phone` = ?",
          [infoRe.money, infoRe.money, userInfo.phone]
        );

        let sql =
          "INSERT INTO redenvelopes_used SET phone = ?, phone_used = ?, id_redenvelops = ?, money = ?, `time` = ?";
        await connection.query(sql, [
          infoRe.phone,
          userInfo.phone,
          infoRe.id_redenvelope,
          infoRe.money,
          time,
        ]);

        return res.status(200).json({
          message: `Received successfully +${infoRe.money}`,
          status: true,
          timeStamp: timeNow,
        });
      } else {
        return res.status(200).json({
          message: "Gift code already used",
          status: false,
          timeStamp: timeNow,
        });
      }
    } else {
      return res.status(200).json({
        message: "Gift code already used",
        status: false,
        timeStamp: timeNow,
      });
    }
  }
};

const callback_bank = async (req, res) => {
  let transaction_id = req.body.transaction_id;
  let client_transaction_id = req.body.client_transaction_id;
  let amount = req.body.amount;
  let requested_datetime = req.body.requested_datetime;
  let expired_datetime = req.body.expired_datetime;
  let payment_datetime = req.body.payment_datetime;
  let status = req.body.status;
  if (!transaction_id) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
  if (status == 2) {
    await connection.query(
      `UPDATE recharge SET status = 1 WHERE id_order = ?`,
      [client_transaction_id]
    );
    const [info] = await connection.query(
      `SELECT * FROM recharge WHERE id_order = ?`,
      [client_transaction_id]
    );
    await connection.query(
      "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ",
      [info[0].money, info[0].money, info[0].phone]
    );
    return res.status(200).json({
      message: 0,
      status: true,
    });
  } else {
    await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

    return res.status(200).json({
      message: "Cancellation successful",
      status: true,
      datas: recharge,
    });
  }
};

const confirmRecharge = async (req, res) => {
  let auth = req.cookies.auth;
  //let money = req.body.money;
  //let paymentUrl = req.body.payment_url;
  let client_txn_id = req.body?.client_txn_id;

  if (!client_txn_id) {
    return res.status(200).json({
      message: "client_txn_id is required",
      status: false,
      timeStamp: timeNow,
    });
  }

  if (!auth) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];

  if (!user) {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }

  const [recharge] = await connection.query(
    "SELECT * FROM recharge WHERE phone = ? AND status = ? ",
    [userInfo.phone, 0]
  );

  if (recharge.length != 0) {
    const rechargeData = recharge[0];
    const date = new Date(rechargeData.today);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const formattedDate = `${dd}-${mm}-${yyyy}`;
    const apiData = {
      key: process.env.PAYMENT_KEY,
      client_txn_id: client_txn_id,
      txn_date: formattedDate,
    };
    try {
      const apiResponse = await axios.post(
        "https://api.ekqr.in/api/check_order_status",
        apiData
      );
      console.log(apiResponse.data);
      const apiRecord = apiResponse.data.data;
      if (apiRecord.status === "scanning") {
        return res.status(200).json({
          message: "Waiting for confirmation",
          status: false,
          timeStamp: timeNow,
        });
      }
      if (
        apiRecord.client_txn_id === rechargeData.id_order &&
        apiRecord.customer_mobile === rechargeData.phone &&
        apiRecord.amount === rechargeData.money
      ) {
        if (apiRecord.status === "success") {
          await connection.query(
            `UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`,
            [
              rechargeData.id,
              apiRecord.client_txn_id,
              apiRecord.customer_mobile,
              apiRecord.amount,
            ]
          );
          // const [code] = await connection.query(`SELECT invite, total_money from users WHERE phone = ?`, [apiRecord.customer_mobile]);
          // const [data] = await connection.query('SELECT recharge_bonus_2, recharge_bonus FROM admin WHERE id = 1');
          // let selfBonus = info[0].money * (data[0].recharge_bonus_2 / 100);
          // let money = info[0].money + selfBonus;
          let money = apiRecord.amount;
          await connection.query(
            "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ",
            [money, money, apiRecord.customer_mobile]
          );
          // let rechargeBonus;
          // if (code[0].total_money <= 0) {
          //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus / 100);
          // }
          // else {
          //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus_2 / 100);
          // }
          // const percent = rechargeBonus;
          // await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE code = ?', [money, money, code[0].invite]);

          return res.status(200).json({
            message: "Successful application confirmation",
            status: true,
            datas: recharge,
          });
        } else if (
          apiRecord.status === "failure" ||
          apiRecord.status === "close"
        ) {
          console.log(apiRecord.status);
          await connection.query(
            `UPDATE recharge SET status = 2 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`,
            [
              rechargeData.id,
              apiRecord.client_txn_id,
              apiRecord.customer_mobile,
              apiRecord.amount,
            ]
          );
          return res.status(200).json({
            message: "Payment failure",
            status: true,
            timeStamp: timeNow,
          });
        }
      } else {
        return res.status(200).json({
          message: "Mismtach data",
          status: true,
          timeStamp: timeNow,
        });
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    return res.status(200).json({
      message: "Failed",
      status: false,
      timeStamp: timeNow,
    });
  }
};

const confirmUSDTRecharge = async (req, res) => {
  console.log(res?.body);
  console.log(res?.query);
  console.log(res?.cookies);
  // let auth = req.cookies.auth;
  // //let money = req.body.money;
  // //let paymentUrl = req.body.payment_url;
  // let client_txn_id = req.body?.client_txn_id;

  // if (!client_txn_id) {
  //     return res.status(200).json({
  //         message: 'client_txn_id is required',
  //         status: false,
  //         timeStamp: timeNow,
  //     })
  // }

  // if (!auth) {
  //     return res.status(200).json({
  //         message: 'Failed',
  //         status: false,
  //         timeStamp: timeNow,
  //     })
  // }

  // const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
  // let userInfo = user[0];

  // if (!user) {
  //     return res.status(200).json({
  //         message: 'Failed',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // };

  // const [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? ', [userInfo.phone, 0]);

  // if (recharge.length != 0) {
  //     const rechargeData = recharge[0];
  //     const date = new Date(rechargeData.today);
  //     const dd = String(date.getDate()).padStart(2, '0');
  //     const mm = String(date.getMonth() + 1).padStart(2, '0');
  //     const yyyy = date.getFullYear();
  //     const formattedDate = `${dd}-${mm}-${yyyy}`;
  //     const apiData = {
  //         key: process.env.PAYMENT_KEY,
  //         client_txn_id: client_txn_id,
  //         txn_date: formattedDate,
  //     };
  //     try {
  //         const apiResponse = await axios.post('https://api.ekqr.in/api/check_order_status', apiData);
  //         const apiRecord = apiResponse.data.data;
  //         if (apiRecord.status === "scanning") {
  //             return res.status(200).json({
  //                 message: 'Waiting for confirmation',
  //                 status: false,
  //                 timeStamp: timeNow,
  //             });
  //         }
  //         if (apiRecord.client_txn_id === rechargeData.id_order && apiRecord.customer_mobile === rechargeData.phone && apiRecord.amount === rechargeData.money) {
  //             if (apiRecord.status === 'success') {
  //                 await connection.query(`UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
  //                 // const [code] = await connection.query(`SELECT invite, total_money from users WHERE phone = ?`, [apiRecord.customer_mobile]);
  //                 // const [data] = await connection.query('SELECT recharge_bonus_2, recharge_bonus FROM admin WHERE id = 1');
  //                 // let selfBonus = info[0].money * (data[0].recharge_bonus_2 / 100);
  //                 // let money = info[0].money + selfBonus;
  //                 let money = apiRecord.amount;
  //                 await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [money, money, apiRecord.customer_mobile]);
  //                 // let rechargeBonus;
  //                 // if (code[0].total_money <= 0) {
  //                 //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus / 100);
  //                 // }
  //                 // else {
  //                 //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus_2 / 100);
  //                 // }
  //                 // const percent = rechargeBonus;
  //                 // await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE code = ?', [money, money, code[0].invite]);

  //                 return res.status(200).json({
  //                     message: 'Successful application confirmation',
  //                     status: true,
  //                     datas: recharge,
  //                 });
  //             } else if (apiRecord.status === 'failure' || apiRecord.status === 'close') {
  //                 console.log(apiRecord.status)
  //                 await connection.query(`UPDATE recharge SET status = 2 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
  //                 return res.status(200).json({
  //                     message: 'Payment failure',
  //                     status: true,
  //                     timeStamp: timeNow,
  //                 });
  //             }
  //         } else {
  //             return res.status(200).json({
  //                 message: 'Mismtach data',
  //                 status: true,
  //                 timeStamp: timeNow,
  //             });
  //         }
  //     } catch (error) {
  //         console.error(error);
  //     }
  // } else {
  //     return res.status(200).json({
  //         message: 'Failed',
  //         status: false,
  //         timeStamp: timeNow,
  //     });
  // }
};

const updateRecharge = async (req, res) => {
  let auth = req.cookies.auth;
  let money = req.body.money;
  let order_id = req.body.id_order;
  let data = req.body.inputData;

  // if (type != 'upi') {
  //     if (!auth || !money || money < 300) {
  //         return res.status(200).json({
  //             message: 'upi failed',
  //             status: false,
  //             timeStamp: timeNow,
  //         })
  //     }
  // }
  const [user] = await connection.query(
    "SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ",
    [auth]
  );
  let userInfo = user[0];
  if (!user) {
    return res.status(200).json({
      message: "user not found",
      status: false,
      timeStamp: timeNow,
    });
  }
  const [utr] = await connection.query(
    "SELECT * FROM recharge WHERE `utr` = ? ",
    [data]
  );
  let utrInfo = utr[0];

  if (!utrInfo) {
    await connection.query(
      "UPDATE recharge SET utr = ? WHERE phone = ? AND id_order = ?",
      [data, userInfo.phone, order_id]
    );
    return res.status(200).json({
      message: "UTR updated",
      status: true,
      timeStamp: timeNow,
    });
  } else {
    return res.status(200).json({
      message: "UTR is already in use",
      status: false,
      timeStamp: timeNow,
    });
  }
};

module.exports = {
  commissionTotal,
  userInfo,
  LevelTurnOver,
  DailyTrade,
  inviteBonus,
  DailySalary,
  WeeklySalary,
  MonthlySalary,

  changeUser,
  promotion,
  myTeam,
  wowpay,
  recharge,
  recharge2,
  listRecharge,
  listWithdraw,
  changePassword,
  checkInHandling,
  infoUserBank,
  addBank,
  withdrawal3,
  transfer,
  transferHistory,
  callback_bank,
  listMyTeam,
  verifyCode,
  aviator,
  useRedenvelope,
  search,
  updateRecharge,
  confirmRecharge,
  cancelRecharge,
  confirmUSDTRecharge,
  referralBonus,
  rechargeBonus,
  AllgameStatistics,
  gameHistory,
  listcoinpayment,
  dailyAttendance,
  getAttendanceHistory,
  getTransferLimits,
  getTransactionHistory,
};
