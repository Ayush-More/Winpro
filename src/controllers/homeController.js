import connection from "../config/connectDB";
// import jwt from 'jsonwebtoken'
// import md5 from "md5";
// import e from "express";

const homePage = async(req, res) => {
    const [settings] = await connection.query('SELECT `app` FROM admin');
    let app = settings[0].app;
    return res.render("home/index.ejs", { app });
}

const checkInPage = async(req, res) => {
    return res.render("checkIn/checkIn.ejs");
}

const checkDes = async(req, res) => {
    return res.render("checkIn/checkDes.ejs");
}

const checkRecord = async(req, res) => {
    return res.render("checkIn/checkRecord.ejs");
}
const gamestatistics = async(req, res) => {
    return res.render("member/gamestatistics.ejs");
}

const gamehistory = async(req, res) => {
    return res.render("member/gamehistory.ejs");
}

const transactionHistory = async(req, res) => {
    return res.render("member/transactionhistory.ejs");
}
const addBank = async(req, res) => {
    return res.render("wallet/addbank.ejs");
}

const socialCampaignPage = async(req, res) => {
    return res.render("promotion/socialCampaign.ejs");
}


const inviteBonus = async(req, res) => {
    return res.render("report/inviteBonus.ejs");
}
const invitationBonus = async(req, res) => {
    return res.render("report/invitationBonus.ejs");
}


const RechargeSalary = async(req, res) => {
    return res.render("report/rechargeSalary.ejs");
}

const ReferralBonus = async(req, res) => {
    return res.render("report/referralBonus.ejs");
}

const DailySalary = async(req, res) => {
    return res.render("report/dailySalary.ejs");
}

const DailyTrade = async(req, res) => {
    return res.render("report/dailyTrade.ejs");
}

const WeeklySalary = async(req, res) => {
    return res.render("report/weeklySalary.ejs");
}

const MonthlySalary = async(req, res) => {
    return res.render("report/monthlySalary.ejs");
}




// promotion
const promotionPage = async(req, res) => {
    return res.render("promotion/promotion.ejs");
}

const vip = async(req, res) => {
    return res.render("member/vip.ejs");
}
const promotionmyTeamPage = async(req, res) => {
    return res.render("promotion/myTeam.ejs");
}

const promotionDesPage = async(req, res) => {
    return res.render("promotion/promotionDes.ejs");
}

const tutorialPage = async(req, res) => {
    return res.render("promotion/tutorial.ejs");
}

const bonusRecordPage = async(req, res) => {
    return res.render("promotion/bonusrecord.ejs");
}

// Additional promotion-related pages
const subordinatePage = async(req, res) => {
    return res.render("promotion/subordinate.ejs");
}

const commissionPage = async(req, res) => {
    return res.render("promotion/commission.ejs");
}

const releaseSignUpBonusPage = async(req, res) => {
    return res.render("promotion/releaseSignUpBonus.ejs");
}

const directDepositePage = async(req, res) => {
    return res.render("promotion/directDeposite.ejs");
}

const selfFirstDepositPage = async(req, res) => {
    return res.render("promotion/selfFirstDeposit.ejs");
}

const levelUpBonusPage = async(req, res) => {
    return res.render("promotion/levelUpBonus.ejs");
}

const dailySalaryIncomePage = async(req, res) => {
    return res.render("promotion/dailySalaryIncome.ejs");
}

const weeklySalaryIncomePage = async(req, res) => {
    return res.render("promotion/weeklySalaryIncome.ejs");
}

const betIncomePage = async(req, res) => {
    return res.render("promotion/betIncome.ejs");
}

const teamRechargeIncomePage = async(req, res) => {
    return res.render("promotion/teamRechargeIncome.ejs");
}

const monthlyRewardPage = async(req, res) => {
    return res.render("promotion/monthlyReward.ejs");
}

const jackpotIncomePage = async(req, res) => {
    return res.render("promotion/jackpotIncome.ejs");
}

const activityAwardPage = async(req, res) => {
    return res.render("promotion/activityAward.ejs");
}

const superJackpotPage = async(req, res) => {
    return res.render("promotion/superJackpot.ejs");
}

const myReferralPage = async(req, res) => {
    return res.render("promotion/myReferral.ejs");
}

const myDownlinePage = async(req, res) => {
    return res.render("promotion/myDownline.ejs");
}

const levelDetailsPage = async(req, res) => {
    return res.render("promotion/levelDetails.ejs");
}

const mlmDashboardPage = async(req, res) => {
    return res.render("promotion/mlmDashboard.ejs");
}

const newSubordinatePage = async(req, res) => {
    return res.render("promotion/newSubordinate.ejs");
}

const customerSupportPage = async(req, res) => {
    return res.render("promotion/customerSupport.ejs");
}

// wallet
const walletPage = async(req, res) => {
    return res.render("wallet/index.ejs");
}

const rechargePage = async(req, res) => {
    return res.render("wallet/recharge.ejs", {
        MinimumMoney: process.env.MINIMUM_MONEY
    });
}

const rechargerecordPage = async(req, res) => {
    return res.render("wallet/rechargerecord.ejs");
}

const cpay = async(req, res) => {
    let auth = req.cookies.auth;


    const [user] = await connection.query('SELECT `id` FROM users WHERE `token` = ? ', [auth]);
    const [Cpay] = await connection.query("SELECT * FROM `tbl_coinpayment` WHERE member_id = ? AND status = 'N' ORDER BY id DESC", [user[0].id]);
    let amount = Cpay[0].amount;
    let address = Cpay[0].address;
    let qrCode = Cpay[0].qrcode_url;
    return res.render("wallet/cpay.ejs", { amount, address, qrCode });
}

const cryptorecord = async(req, res) => {
    return res.render("wallet/coinpayment.ejs");
}



const withdrawalPage = async(req, res) => {
    return res.render("wallet/withdrawal.ejs");
}

const withdrawalrecordPage = async(req, res) => {
    return res.render("wallet/withdrawalrecord.ejs");
}
const transfer = async(req, res) => {
    return res.render("wallet/transfer.ejs");
}

// member page
const mianPage = async(req, res) => {
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT `level` FROM users WHERE `token` = ? ', [auth]);
    const [settings] = await connection.query('SELECT `cskh` FROM admin');
    let cskh = settings[0].cskh;
    let level = user[0].level;
    return res.render("member/index.ejs", { level, cskh });
}
const aboutPage = async(req, res) => {
    return res.render("member/about/index.ejs");
}
const newsupdate = async(req, res) => {
    return res.render("member/newsupdate.ejs");
}

const recordsalary = async(req, res) => {
    return res.render("member/about/recordsalary.ejs");
}

const privacyPolicy = async(req, res) => {
    return res.render("member/about/privacyPolicy.ejs");
}

const newtutorial = async(req, res) => {
    return res.render("member/newtutorial.ejs");
}

const forgot = async(req, res) => {
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT `time_otp` FROM users WHERE token = ? ', [auth]);
    let time = user[0].time_otp;
    return res.render("member/forgot.ejs", { time });
}

const redenvelopes = async(req, res) => {
    return res.render("member/redenvelopes.ejs");
}

const riskAgreement = async(req, res) => {
    return res.render("member/about/riskAgreement.ejs");
}

const myProfilePage = async(req, res) => {
    return res.render("member/myProfile.ejs");
}

const getSalaryRecord = async(req, res) => {
    const auth = req.cookies.auth;

    const [rows] = await connection.query(`SELECT * FROM users WHERE token = ?`, [auth]);
    let rowstr = rows[0];
    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    const [getPhone] = await connection.query(
        `SELECT * FROM salary WHERE phone = ? ORDER BY time DESC`, [rowstr.phone]
    );


    console.log("asdasdasd : " + [rows.phone])
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: getPhone,
    })
}


const getGameLink = async (req, res) => {
    try {
        let token = req.cookies.auth;  // Get token from the cookies
        let gameId = req.query.game_id; // Get gameId from query parameter

        // Query the database for the user with the provided token
        const [rows] = await connection.query(
            "SELECT * FROM `users` WHERE `token` = ? AND `veri` = 1",
            [token]
        );

        // Check if no rows are returned
        if (!rows || rows.length === 0) {
            return res.status(400).json({
                message: "User not found or token is invalid",
                isAuthorized: false,
            });
        }

        // At this point, rows[0] is safe to access
        if (rows[0].token !== token || rows[0].status !== 1) {
            return res.status(400).json({
                message: "Login is required to access this API",
                isAuthorized: false,
            });
        }

        // Check if gameId is provided
        if (!gameId) {
            return res.status(400).json({
                message: "gameID is required!",
                isAuthorized: true,
            });
        }

        // Redirect or generate game link (this part is assumed to be further implementation)
        return res.redirect("http://api.dubaideck.com/api.php?i=" + gameId + "&t=" + rows[0].phone);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong!",
        });
    }
}
const getGameList = async(req, res) => {
    
    const [settings] = await connection.query('SELECT `app` FROM admin');
    let app = settings[0].app;
    return res.render("game/getGameList.ejs", { app });
    }



module.exports = {
    homePage,
    checkInPage,
    promotionPage,
    vip,
    walletPage,
    mianPage,
    myProfilePage,
    promotionmyTeamPage,
    promotionDesPage,
    tutorialPage,
    bonusRecordPage,
    subordinatePage,
    commissionPage,
    releaseSignUpBonusPage,
    directDepositePage,
    selfFirstDepositPage,
    levelUpBonusPage,
    dailySalaryIncomePage,
    weeklySalaryIncomePage,
    betIncomePage,
    teamRechargeIncomePage,
    monthlyRewardPage,
    jackpotIncomePage,
    activityAwardPage,
    superJackpotPage,
    myReferralPage,
    myDownlinePage,
    levelDetailsPage,
    mlmDashboardPage,
    newSubordinatePage,
    customerSupportPage,
    rechargePage,
    rechargerecordPage,
    withdrawalPage,
    withdrawalrecordPage,
    newsupdate,
    aboutPage,
    privacyPolicy,
    riskAgreement,
    newtutorial,
    redenvelopes,
    forgot,
    checkDes,
    gamestatistics,
    gamehistory,
    transactionHistory,
    checkRecord,
    addBank,
    transfer,
    recordsalary,
    getSalaryRecord,
    invitationBonus,
    RechargeSalary,
    ReferralBonus,
    DailySalary,
    DailyTrade,
    WeeklySalary,
    MonthlySalary,
    inviteBonus,
    socialCampaignPage,
    cryptorecord,
    cpay,
    getGameLink,
    getGameList
}