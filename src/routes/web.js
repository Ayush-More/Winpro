import express from 'express';
import accountController from '../controllers/accountController';
import homeController from '../controllers/homeController';
import winGoController from '../controllers/winGoController';
import userController from '../controllers/userController';
import middlewareController from '../controllers/middlewareController';
import middlewareDailyController from '../controllers/middlewareDailyController';
import adminController from '../controllers/adminController';
import dailyController from '../controllers/dailyController';
import k5Controller from '../controllers/k5Controller';
import k3Controller from '../controllers/k3Controller';
import paymentController from '../controllers/paymentController';
import mycronController from '../controllers/mycronController';

import coinpaymentController from '../controllers/coinpaymentController';
import trxController from '../controllers/trxController';
import ownpay from '../controllers/own_pay';
import socialCampaignController from '../controllers/socialCampaignController';


let router = express.Router();

const initWebRouter = (app) => {
    
    
    
//   router.get('/manager/gifts',  dailyController.giftPage);
    
    
    // page account
    router.get('/keFuMenu', accountController.keFuMenu);
    router.get('/customerSupport', accountController.keFuMenu);

    router.get('/generateWallet', ownpay.generateNewWallet);
    router.post('/saveWallet', ownpay.savewallet);
    router.post('/monitorWallet', ownpay.startMonitoring);
    router.post('/api/webapi/requestWithdrawal', middlewareController, ownpay.requestWithdrawal);
    router.post('/api/webapi/admin/processWithdrawal', adminController.middlewareAdminController, ownpay.processWithdrawal);
    router.get('/login', accountController.loginPage);
    router.get('/register', accountController.registerPage);
    router.get('/forgot', accountController.forgotPage);
    router.post('/api/sent/otp/verify', accountController.verifyCode);
    router.post('/api/sent/otp/verify/reset', accountController.verifyCodePass);
    router.post('/api/resetPasword', accountController.forGotPassword);

         router.get('/jili/game_link', homeController.getGameLink); 
         router.get('/jili-game-list', homeController.getGameList); 
         
         
         
         
    router.get('/dailySalaryIncome', mycronController.dailySalaryIncome);
    router.get('/weeklySalaryIncome', mycronController.weeklySalaryIncome);
    router.get('/monthlySalaryIncome', mycronController.monthlySalaryIncome);
    router.get('/setupDailySalachiever', mycronController.setupDailySalachiever);
    router.get('/registerUser', mycronController.registerUser);
    router.get('/rechargeSalaryIncome', mycronController.rechargeSalaryIncome);
    router.get('/processInviteBonus', mycronController.processInviteBonus);
    router.get('/DailyTradeLevelIncome', mycronController.DailyTradeLevelIncome);
    router.get('/TradeLevelBonus', mycronController.TradeLevelBonus);

    router.get('/setupClosing', mycronController.setupClosing);
    router.get('/setupBusinessStatics', mycronController.setupBusinessStatics);

    router.get('/callbackIPsWithdraw', mycronController.callbackIPsWithdraw);
    router.post('/callbackIPsWithdraw', mycronController.callbackIPsWithdraw);
    router.get('/DailyTradeLevelIncomeTrx', mycronController.DailyTradeLevelIncomeTrx);


    router.get('/testmethod', mycronController.testmethod);
    router.get('/handleWithdraw', mycronController.handleWithdraw);
    router.post('/verifyCoinPaymet', mycronController.verifyCoinPaymet);


    // page home
    router.get('/', (req, res) => {
        return res.redirect('/home');
    });
    router.get('/home', homeController.homePage);

    router.post('/admin/manager/settings/commissionSettingRechrage', adminController.middlewareAdminController, adminController.commissionSettingRechrage);
    router.post('/admin/manager/settings/commissionSettingTrade', adminController.middlewareAdminController, adminController.commissionSettingTrade);
    router.post('/admin/manager/settings/getLevelSettingData', adminController.middlewareAdminController, adminController.getLevelSettingData);
    router.get('/admin/manager/levelSetupPage', adminController.middlewareAdminController, adminController.levelSetupPage);



    // TRX

    router.get('/trx', middlewareController, trxController.trxPage);
    router.get('/trx/3', middlewareController, trxController.trxPage3);
    router.get('/trx/5', middlewareController, trxController.trxPage5);
    router.get('/trx/10', middlewareController, trxController.trxPage10);
    router.get('/block/:blockId', middlewareController, trxController.blockPage);
    router.post('/api/webapi/trx/action/join', middlewareController, trxController.bettrx); // register
    router.post('/api/webapi/trx/GetNoaverageEmerdList', middlewareController, trxController.listOrderOld); // register
    router.post('/api/webapi/trx/GetMyEmerdList', middlewareController, trxController.GetMyEmerdList); // register

    router.post('/admin/manager/settings/commissionSetting', adminController.middlewareAdminController, adminController.commissionSetting);
    router.post('/admin/manager/settings/blockSecond', adminController.middlewareAdminController, adminController.blockSecond);
    router.get('/admin/manager/BusinessStatics', adminController.middlewareAdminController, adminController.BusinessStatics);
    router.post('/api/webapi/admin/businessStaticsList', adminController.middlewareAdminController, adminController.businessStaticsList); //

    router.get('/history/inviteBonus', middlewareController, homeController.inviteBonus);
    router.get('/history/invitationBonus', middlewareController, homeController.invitationBonus);
    router.get('/history/RechargeSalary', middlewareController, homeController.RechargeSalary);
    router.get('/history/ReferralBonus', middlewareController, homeController.ReferralBonus);
    router.get('/history/DailySalary', middlewareController, homeController.DailySalary);
    router.get('/history/DailyTrade', middlewareController, homeController.DailyTrade);
    router.get('/history/WeeklySalary', middlewareController, homeController.WeeklySalary);
    router.get('/history/MonthlySalary', middlewareController, homeController.MonthlySalary);


    router.post('/api/webapi/DailyTrade', middlewareController, userController.DailyTrade);
    router.post('/api/webapi/referralBonus', middlewareController, userController.referralBonus);
    router.post('/api/webapi/rechargeBonus', middlewareController, userController.rechargeBonus);

    router.post('/api/webapi/inviteBonus', middlewareController, userController.inviteBonus);
    router.post('/api/webapi/DailySalary', middlewareController, userController.DailySalary);
    router.post('/api/webapi/WeeklySalary', middlewareController, userController.WeeklySalary);
    router.post('/api/webapi/MonthlySalary', middlewareController, userController.MonthlySalary);


    router.get('/checkIn', middlewareController, homeController.checkInPage);
    router.get('/checkDes', middlewareController, homeController.checkDes);
    router.get('/checkRecord', middlewareController, homeController.checkRecord);
    router.get('/wallet/transfer', middlewareController, homeController.transfer);

    router.get('/promotion', middlewareController, homeController.promotionPage);
     router.get('/vip', middlewareController, homeController.vip);
    router.get('/promotion/myTeam', middlewareController, homeController.promotionmyTeamPage);
    router.get('/promotion/promotionDes', middlewareController, homeController.promotionDesPage);
    router.get('/promotion/tutorial', middlewareController, homeController.tutorialPage);
    router.get('/promotion/bonusrecord', middlewareController, homeController.bonusRecordPage);

    // Commission route - moved here for better visibility
    router.get('/commission', middlewareController, homeController.commissionPage);
    router.get('/Commission', middlewareController, homeController.commissionPage);

    // Additional promotion-related pages
    router.get('/Subordinate', middlewareController, homeController.subordinatePage);
    router.get('/releaseSignUpBonus', middlewareController, homeController.releaseSignUpBonusPage);
    router.get('/directdeposite', middlewareController, homeController.directDepositePage);
    router.get('/selffirstd', middlewareController, homeController.selfFirstDepositPage);
    router.get('/LevelUpBonus', middlewareController, homeController.levelUpBonusPage);
    router.get('/promotion/dailysalaryincomes', middlewareController, homeController.dailySalaryIncomePage);
    router.get('/promotion/WeeklySalaryIncome', middlewareController, homeController.weeklySalaryIncomePage);
    router.get('/betincome', middlewareController, homeController.betIncomePage);
    router.get('/teamrechargeincome', middlewareController, homeController.teamRechargeIncomePage);
    router.get('/promotion/MonthlyReward', middlewareController, homeController.monthlyRewardPage);
    router.get('/jackpotincome', middlewareController, homeController.jackpotIncomePage);
    router.get('/activityaward', middlewareController, homeController.activityAwardPage);
    router.get('/superjackpot', middlewareController, homeController.superJackpotPage);
    router.get('/myRefferral', middlewareController, homeController.myReferralPage);
    router.get('/myDownline', middlewareController, homeController.myDownlinePage);
    router.get('/levelDetails', middlewareController, homeController.levelDetailsPage);
    router.get('/MLMDashboard', middlewareController, homeController.mlmDashboardPage);
    router.get('/newSubordinate', middlewareController, homeController.newSubordinatePage);
    router.get('/customerSupport', middlewareController, homeController.customerSupportPage);

    router.get('/wallet', middlewareController, homeController.walletPage);
    router.get('/wallet/recharge', middlewareController, homeController.rechargePage);
    router.get('/wallet/withdrawal', middlewareController, homeController.withdrawalPage);
    router.get('/wallet/rechargerecord', middlewareController, homeController.rechargerecordPage);
    router.get('/wallet/cryptorecord', middlewareController, homeController.cryptorecord);
    router.get('/wallet/crypto/pay', middlewareController, homeController.cpay);


    router.get('/wallet/withdrawalrecord', middlewareController, homeController.withdrawalrecordPage);
    router.get('/wallet/addBank', middlewareController, homeController.addBank);

    router.get('/wallet/paynow/manual_upi', middlewareController, paymentController.initiateManualUPIPayment);
    router.get('/wallet/paynow/manual_usdt', middlewareController, paymentController.initiateManualUSDTPayment);
    router.post('/wallet/paynow/manual_upi_request', middlewareController, paymentController.addManualUPIPaymentRequest);
    router.post('/wallet/paynow/manual_usdt_request', middlewareController, paymentController.addManualUSDTPaymentRequest);
    router.post('/wallet/paynow/wowpay', middlewareController, paymentController.initiateWowPayPayment);

    router.post('/wallet/verify/wowpay', paymentController.verifyWowPayPayment);
    router.get('/wallet/verify/wowpay', paymentController.verifyWowPayPayment);

    router.post('/wallet/paynow/coinpayment', middlewareController, coinpaymentController.coinpayment);

    //router.post('/wallet/verify/wowpay', middlewareController, paymentController.verifyWowPayPayment);
    //router.get('/wallet/verify/wowpay', middlewareController, paymentController.verifyWowPayPayment);
    router.post('/wallet/paynow/upi', middlewareController, paymentController.initiateUPIPayment);
    router.get('/wallet/verify/upi', middlewareController, paymentController.verifyUPIPayment);

    router.get('/mian', middlewareController, homeController.mianPage);
     router.get('/newsupdate', middlewareController, homeController.newsupdate);
     router.get('/gamestatistics', middlewareController, homeController.gamestatistics);
     router.get('/gamehistory', middlewareController, homeController.gamehistory);
    router.get('/recordsalary', middlewareController, homeController.recordsalary);
    router.get('/getrecord', middlewareController, homeController.getSalaryRecord);
    router.get('/about', middlewareController, homeController.aboutPage);
    router.get('/redenvelopes', middlewareController, homeController.redenvelopes);
    router.get('/mian/forgot', middlewareController, homeController.forgot);
    router.get('/newtutorial', homeController.newtutorial);
    router.get('/about/privacyPolicy', middlewareController, homeController.privacyPolicy);
    router.get('/about/riskAgreement', middlewareController, homeController.riskAgreement);

    router.get('/myProfile', middlewareController, homeController.myProfilePage);



    // BET wingo
    router.get('/win', middlewareController, winGoController.winGoPage);
    router.get('/win/3', middlewareController, winGoController.winGoPage3);
    router.get('/win/5', middlewareController, winGoController.winGoPage5);
    router.get('/win/10', middlewareController, winGoController.winGoPage10);

    // BET K5D
    router.get('/5d', middlewareController, k5Controller.K5DPage);
    router.post('/api/webapi/action/5d/join', middlewareController, k5Controller.betK5D); // register
    router.post('/api/webapi/5d/GetNoaverageEmerdList', middlewareController, k5Controller.listOrderOld); // register
    router.post('/api/webapi/5d/GetMyEmerdList', middlewareController, k5Controller.GetMyEmerdList); // register

    // BET K3
    router.get('/k3', middlewareController, k3Controller.K3Page);

    router.post('/api/webapi/action/k3/join', middlewareController, k3Controller.betK3); // register
    router.post('/api/webapi/k3/GetNoaverageEmerdList', middlewareController, k3Controller.listOrderOld); // register
    router.post('/api/webapi/k3/GetMyEmerdList', middlewareController, k3Controller.GetMyEmerdList); // register


    router.get('/promotion/socialCampaign', middlewareController, homeController.socialCampaignPage);
    // social campaigns
    router.get('/api/webapi/social-campaigns', middlewareController, socialCampaignController.getSocialCampaigns);
    router.post('/api/webapi/social-shares/submit', middlewareController, socialCampaignController.submitSocialShare);
    router.get('/api/webapi/social-shares/my', middlewareController, socialCampaignController.getUserSocialShares);
    router.get('/admin/manager/socialCampaigns', adminController.middlewareAdminController, adminController.socialCampaignsPage);
    //     // Admin social campaign routes
    router.get('/api/webapi/admin/social-shares/pending', adminController.middlewareAdminController, socialCampaignController.getPendingSocialShares);
    router.post('/api/webapi/admin/social-shares/review', adminController.middlewareAdminController, socialCampaignController.reviewSocialShare);
    router.post('/api/webapi/admin/social-campaigns/add', adminController.middlewareAdminController, socialCampaignController.addSocialCampaign);
    router.get('/api/webapi/admin/social-campaigns/:campaign_id', adminController.middlewareAdminController, socialCampaignController.getCampaignDetails);
    router.post('/api/webapi/admin/social-campaigns/update', adminController.middlewareAdminController, socialCampaignController.updateCampaign);
    router.post('/api/webapi/admin/social-campaigns/delete', adminController.middlewareAdminController, socialCampaignController.deleteCampaign);
    // login | register
    router.post('/api/webapi/login', accountController.login); // login
    router.post('/api/webapi/register', accountController.register); // register
    router.post('/api/webapi/logout', accountController.logout); // logout
    router.get('/aviator', middlewareController, userController.aviator);
    router.get('/api/webapi/GetUserInfo', middlewareController, userController.userInfo); // get info account
    router.put('/api/webapi/change/userInfo', middlewareController, userController.changeUser); // get info account
    router.put('/api/webapi/change/pass', middlewareController, userController.changePassword); // get info account

    // bet wingo
    router.post('/api/webapi/action/join', middlewareController, winGoController.betWinGo); // register
    router.post('/api/webapi/GetNoaverageEmerdList', middlewareController, winGoController.listOrderOld); // register
    router.post('/api/webapi/GetMyEmerdList', middlewareController, winGoController.GetMyEmerdList); // register


    // promotion


    router.post('/api/webapi/LevelTurnOver', middlewareController, userController.LevelTurnOver);

    router.get('/api/webapi/StatisticsGame', middlewareController, userController.AllgameStatistics);
    router.get('/api/webapi/gameHistory', middlewareController, userController.gameHistory);

    router.post('/api/webapi/commission', middlewareController, userController.commissionTotal);
    router.post('/api/webapi/promotion', middlewareController, userController.promotion); // register
    router.post('/api/webapi/checkIn', middlewareController, userController.checkInHandling); // register
    router.post('/api/webapi/check/Info', middlewareController, userController.infoUserBank); // register
    router.post('/api/webapi/addBank', middlewareController, userController.addBank); // register
    router.post('/api/webapi/otp', middlewareController, userController.verifyCode); // register
    router.post('/api/webapi/use/redenvelope', middlewareController, userController.useRedenvelope); // register

    // wallet
    router.post('/api/webapi/recharge', middlewareController, userController.recharge);
    router.post('/api/webapi/cancel_recharge', middlewareController, userController.cancelRecharge); // register
    router.post('/wowpay/create', middlewareController, userController.wowpay);
    router.post('/api/webapi/confirm_recharge', middlewareController, userController.confirmRecharge);
    router.get('/api/webapi/myTeam', middlewareController, userController.listMyTeam); // register
    router.get('/api/webapi/recharge/list', middlewareController, userController.listRecharge); // register
    router.get('/api/webapi/coinpayment/list', middlewareController, userController.listcoinpayment); // register
    router.get('/api/webapi/withdraw/list', middlewareController, userController.listWithdraw); // register
    router.post('/api/webapi/recharge/check', middlewareController, userController.recharge2); // register
    router.post('/api/webapi/withdrawal', middlewareController, userController.withdrawal3); // register
    router.post('/api/webapi/callback_bank', middlewareController, userController.callback_bank); // register
    router.post('/api/webapi/recharge/update', middlewareController, userController.updateRecharge); // update recharge
    router.post('/api/webapi/transfer', middlewareController, userController.transfer); // register
    router.get('/api/webapi/transfer_history', middlewareController, userController.transferHistory); //
    router.get('/api/webapi/transfer_limits', middlewareController, userController.getTransferLimits); // get transfer limits
    router.get('/api/webapi/confirm_recharge_usdt', middlewareController, userController.confirmUSDTRecharge); //
    router.post('/api/webapi/confirm_recharge_usdt', middlewareController, userController.confirmUSDTRecharge); //

    router.post('/api/webapi/search', middlewareController, userController.search); // register


    // daily
    
   
     router.get('/manager/gifts', middlewareController, dailyController.giftPage);
     router.get('/manager/index', middlewareController, dailyController.dailyPage);
     router.get('/manager/members',middlewareController, dailyController.listMeber);
    
    
    router.get('/manager/listRecharge', middlewareController, dailyController.listRecharge);
    router.get('/manager/listWithdraw', middlewareController, dailyController.listWithdraw);
    
    router.get('/manager/profileMember', middlewareController, dailyController.profileMember);
    router.get('/manager/settings', middlewareController, dailyController.settingPage);
    // router.get('/manager/gifts', dailyController.middlewareDailyController, dailyController.giftPage);
    router.get('/manager/support', middlewareController, dailyController.support);
    router.get('/manager/member/info/:phone', middlewareController, dailyController.pageInfo);

    router.post('/manager/member/info/:phone', middlewareController, dailyController.userInfo);
    router.post('/manager/member/listRecharge/:phone', middlewareController, dailyController.listRechargeMem);
    router.post('/manager/member/listWithdraw/:phone', middlewareController, dailyController.listWithdrawMem);
    router.post('/manager/member/redenvelope/:phone', middlewareController, dailyController.listRedenvelope);
    router.post('/manager/member/bet/:phone', middlewareController, dailyController.listBet);


    router.post('/manager/settings/list', middlewareController, dailyController.settings);
    router.post('/manager/createBonus', middlewareController, dailyController.createBonus);
    router.post('/manager/listRedenvelops', middlewareController, dailyController.listRedenvelops);

    router.post('/manager/listRecharge', middlewareController, dailyController.listRechargeP);
    router.post('/manager/listWithdraw', middlewareController, dailyController.listWithdrawP);

    router.post('/api/webapi/statistical', middlewareController, dailyController.statistical);
    router.post('/manager/infoCtv', middlewareController, dailyController.infoCtv); // get info account
    router.post('/manager/infoCtv/select', middlewareController, dailyController.infoCtv2); // get info account
    router.post('/api/webapi/manager/listMember', middlewareController, dailyController.listMember); // get info account

    router.post('/api/webapi/manager/buff', middlewareController, dailyController.buffMoney); // get info account


    // admin


    router.get('/admin/manager/aviatorSettings', adminController.middlewareAdminController, adminController.aviatorSettings);
    router.post('/admin/manager/settings/aviSettings', adminController.middlewareAdminController, adminController.aviSettings);



    router.get('/admin/manager/index', adminController.middlewareAdminController, adminController.adminPage); // get info account
    router.get('/admin/manager/index/3', adminController.middlewareAdminController, adminController.adminPage3); // get info account
    router.get('/admin/manager/index/5', adminController.middlewareAdminController, adminController.adminPage5); // get info account
    router.get('/admin/manager/index/10', adminController.middlewareAdminController, adminController.adminPage10); // get info account

    router.get('/admin/manager/5d', adminController.middlewareAdminController, adminController.adminPage5d); // get info account
    router.get('/admin/manager/k3', adminController.middlewareAdminController, adminController.adminPageK3); // get info account



    router.get('/admin/manager/referralBonus', adminController.middlewareAdminController, adminController.referralBonus);
    router.get('/admin/manager/DailySalaryIncome', adminController.middlewareAdminController, adminController.DailySalaryIncome); // get
    router.get('/admin/manager/WeeklySalaryIncome', adminController.middlewareAdminController, adminController.WeeklySalaryIncome); // get
    router.get('/admin/manager/MonthlySalaryIncome', adminController.middlewareAdminController, adminController.MonthlySalaryIncome); // get
    router.get('/admin/manager/DailyTradeVolumeIncome', adminController.middlewareAdminController, adminController.DailyTradeVolumeIncome); // get
    router.get('/admin/manager/depositBonus', adminController.middlewareAdminController, adminController.depositBonusPage); // get
    router.get('/admin/manager/extraBonus', adminController.middlewareAdminController, adminController.extraBonusPage); // get

    router.post('/api/webapi/admin/listreferralBonus', adminController.middlewareAdminController, adminController.listreferralBonus);
    router.post('/api/webapi/admin/listDailySalaryIncome', adminController.middlewareAdminController, adminController.listDailySalaryIncome); //
    router.post('/api/webapi/admin/listTardeLevel', adminController.middlewareAdminController, adminController.listTardeLevel); //
    router.post('/api/webapi/admin/listDepositBonus', adminController.middlewareAdminController, adminController.listDepositBonus); //
    router.post('/api/webapi/admin/listExtraBonus', adminController.middlewareAdminController, adminController.listExtraBonus); //


    router.get('/admin/manager/members', adminController.middlewareAdminController, adminController.membersPage); // get info account
    router.get('/admin/manager/createBonus', adminController.middlewareAdminController, adminController.giftPage); // get info account
    router.get('/admin/manager/ctv', adminController.middlewareAdminController, adminController.ctvPage); // get info account
    router.get('/admin/manager/ctv/profile/:phone', adminController.middlewareAdminController, adminController.ctvProfilePage); // get info account
    router.get('/admin/manager/news', adminController.middlewareAdminController, adminController.newsPage); // news management page
    router.get('/admin/manager/support', adminController.middlewareAdminController, adminController.supportPage); // support management page
    router.get('/admin/manager/p2p-transfers', adminController.middlewareAdminController, adminController.p2pTransfersPage); // P2P transfers management page

    router.get('/admin/manager/settings', adminController.middlewareAdminController, adminController.settings); // get info account
    router.get('/admin/manager/listRedenvelops', adminController.middlewareAdminController, adminController.listRedenvelops); // get info account


    router.get('/admin/manager/giftUsesHistory', adminController.middlewareAdminController, adminController.giftUsesHistory);

    router.post('/api/webapi/admin/getGiftHistory', adminController.middlewareAdminController, adminController.getGiftHistory); //

    router.post('/admin/manager/infoCtv', adminController.middlewareAdminController, adminController.infoCtv); // get info account
    router.post('/admin/manager/infoCtv/select', adminController.middlewareAdminController, adminController.infoCtv2); // get info account
    router.post('/admin/manager/settings/bank', adminController.middlewareAdminController, adminController.settingBank); // get info account
    router.post('/admin/manager/settings/cskh', adminController.middlewareAdminController, adminController.settingCskh); // get info account
    router.post('/admin/manager/settings/buff', adminController.middlewareAdminController, adminController.settingbuff); // get info account
    router.post('/admin/manager/settings/adminPrivateKey', adminController.middlewareAdminController, adminController.setAdminPrivateKey); // set admin private key
    router.post('/admin/manager/create/ctv', adminController.middlewareAdminController, adminController.register); // get info account
    router.post('/admin/manager/settings/get', adminController.middlewareAdminController, adminController.settingGet); // get info account
    router.post('/admin/manager/createBonus', adminController.middlewareAdminController, adminController.createBonus); // get info account

    router.post('/admin/member/listRecharge/:phone', adminController.middlewareAdminController, adminController.listRechargeMem);
    router.post('/admin/member/listWithdraw/:phone', adminController.middlewareAdminController, adminController.listWithdrawMem);
    router.post('/admin/member/redenvelope/:phone', adminController.middlewareAdminController, adminController.listRedenvelope);
    router.post('/admin/member/bet/:phone', adminController.middlewareAdminController, adminController.listBet);


    router.get('/admin/manager/recharge', adminController.middlewareAdminController, adminController.rechargePage); // get info account
    router.get('/admin/manager/withdraw', adminController.middlewareAdminController, adminController.withdraw); // get info account
    // router.get('/admin/manager/level', adminController.middlewareAdminController, adminController.level); // get info account
    router.get('/admin/manager/levelSetting', adminController.middlewareAdminController, adminController.levelSetting);
    router.get('/admin/manager/CreatedSalaryRecord', adminController.middlewareAdminController, adminController.CreatedSalaryRecord);
    router.get('/admin/manager/rechargeRecord', adminController.middlewareAdminController, adminController.rechargeRecord); // get info account
    router.get('/admin/manager/withdrawRecord', adminController.middlewareAdminController, adminController.withdrawRecord); // get info account
    router.get('/admin/manager/statistical', adminController.middlewareAdminController, adminController.statistical); // get info account
    router.get('/admin/member/info/:id', adminController.middlewareAdminController, adminController.infoMember);
    router.get('/admin/login-as-user/:phone', adminController.middlewareAdminController, adminController.loginAsUser);
    router.get('/api/webapi/admin/getLevelInfo', adminController.middlewareAdminController, adminController.getLevelInfo);
    router.get('/api/webapi/admin/getSalary', adminController.middlewareAdminController, adminController.getSalary);

    router.post('/api/webapi/admin/updateLevel', adminController.middlewareAdminController, adminController.updateLevel); // get info account
    router.post('/api/webapi/admin/CreatedSalary', adminController.middlewareAdminController, adminController.CreatedSalary); // get info account
    router.post('/api/webapi/admin/listMember', adminController.middlewareAdminController, adminController.listMember); // get info account
    router.post('/api/webapi/admin/listctv', adminController.middlewareAdminController, adminController.listCTV); // get info account

    router.post('/api/webapi/admin/withdraw', adminController.middlewareAdminController, adminController.handlWithdraw); // get info account
    // router.post('/api/webapi/admin/withdraw2', adminController.middlewareAdminController, adminController.handlWithdrawCrypto);


    router.post('/api/webapi/admin/recharge', adminController.middlewareAdminController, adminController.recharge); // get info account
    router.post('/api/webapi/admin/rechargeDuyet', adminController.middlewareAdminController, adminController.rechargeDuyet); // get info account
    router.post('/api/webapi/admin/member/info', adminController.middlewareAdminController, adminController.userInfo); // get info account
    router.post('/api/webapi/admin/statistical', adminController.middlewareAdminController, adminController.statistical2); // get info account

    router.post('/api/webapi/admin/banned', adminController.middlewareAdminController, adminController.banned); // get info account
    router.get('/api/webapi/transactionHistory', middlewareController, userController.getTransactionHistory);
     router.get('/TransactionHistory', middlewareController, homeController.transactionHistory);
    // News management routes
    router.post('/api/webapi/admin/news/list', adminController.middlewareAdminController, adminController.listNews); // list news
    router.post('/api/webapi/admin/news/create', adminController.middlewareAdminController, adminController.createNews); // create news
    router.post('/api/webapi/admin/news/update', adminController.middlewareAdminController, adminController.updateNews); // update news
    router.post('/api/webapi/admin/news/delete', adminController.middlewareAdminController, adminController.deleteNews); // delete news
    router.get('/api/webapi/admin/news/:id', adminController.middlewareAdminController, adminController.getNewsById); // get news by id

    // Public API for user-side news (no authentication required)
    router.get('/api/webapi/news', adminController.getPublicNews); // get public news

    // Support management routes
    router.post('/api/webapi/admin/support/tickets/list', adminController.middlewareAdminController, adminController.listSupportTickets); // list support tickets
    router.post('/api/webapi/admin/support/tickets/update', adminController.middlewareAdminController, adminController.updateTicketStatus); // update ticket status
    router.post('/api/webapi/admin/support/faqs/list', adminController.middlewareAdminController, adminController.listFAQs); // list FAQs
    router.post('/api/webapi/admin/support/faqs/create', adminController.middlewareAdminController, adminController.createFAQ); // create FAQ
    router.post('/api/webapi/admin/support/faqs/update', adminController.middlewareAdminController, adminController.updateFAQ); // update FAQ
    router.post('/api/webapi/admin/support/faqs/delete', adminController.middlewareAdminController, adminController.deleteFAQ); // delete FAQ
    router.get('/api/webapi/admin/support/contacts/list', adminController.middlewareAdminController, adminController.listContacts); // list contacts
    router.post('/api/webapi/admin/support/contacts/update', adminController.middlewareAdminController, adminController.updateContact); // update contact

    // P2P transfers management routes
    router.post('/api/webapi/admin/p2p-transfers/list', adminController.middlewareAdminController, adminController.listP2PTransfers); // list P2P transfers

    // Public APIs for user-side support (no authentication required)
    router.get('/api/webapi/support/faqs', adminController.getPublicFAQs); // get public FAQs
    router.get('/api/webapi/support/contacts', adminController.getPublicContacts); // get public contacts
    router.post('/api/webapi/support', adminController.submitSupportTicket); // submit support ticket


    router.post('/api/webapi/admin/totalJoin', adminController.middlewareAdminController, adminController.totalJoin); // get info account
    router.post('/api/webapi/admin/change', adminController.middlewareAdminController, adminController.changeAdmin); // get info account
    router.post('/api/webapi/admin/profileUser', adminController.middlewareAdminController, adminController.profileUser); // get info account

    // admin 5d
    router.post('/api/webapi/admin/5d/listOrders', adminController.middlewareAdminController, adminController.listOrderOld); // get info account
    router.post('/api/webapi/admin/k3/listOrders', adminController.middlewareAdminController, adminController.listOrderOldK3); // get info account
    router.post('/api/webapi/admin/5d/editResult', adminController.middlewareAdminController, adminController.editResult); // get info account
    router.post('/api/webapi/admin/k3/editResult', adminController.middlewareAdminController, adminController.editResult2); // get info account

    return app.use('/', router);
}

module.exports = {
    initWebRouter,
};