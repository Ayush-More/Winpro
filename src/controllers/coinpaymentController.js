import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import e from "express";
 
 import crypto from "crypto";
 import querystring from "querystring"
 const CryptoJS = require('crypto-js');



require('dotenv').config();
const axios = require('axios');
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

const getUserDataByAuthToken = async (authToken) => {
    let [users] = await connection.query('SELECT id ,`phone`, `code`,`name_user`,`invite` FROM users WHERE `token` = ? ', [authToken]);
    const user = users?.[0]


    if (user === undefined || user === null) {
        throw Error("Unable to get user data!")
    }

    return {
        id: user.id,
        phone: user.phone,
        code: user.code,
        username: user.name_user,
        invite: user.invite,
    }
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

const coinpayment = async (req, res) => {
   
   try {
           
            let auth = req.cookies.auth;
            let money =  parseInt(req.body.money);
            
            const minimumMoneyAllowed = parseInt(10);
            
            if (!money || !(money >= minimumMoneyAllowed)) {
            return res.status(400).json({
            message: `Money is Required and it should be $ ${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
            })
            }
            
            
            const user = await getUserDataByAuthToken(auth)
      
            
        
        // const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        // if (pendingRechargeList.length !== 0) {
        //     const deleteRechargeQueries = pendingRechargeList.map(recharge => {
        //         return rechargeTable.cancelById(recharge.id)
        //     });

        //     await Promise.all(deleteRechargeQueries)
        // }

        // const orderId = getRechargeOrderId()
        
        
        
        const addedMoney = parseInt(money) * parseInt(94);
        let resCoin = await generateQRofCoinPay(user.id, user.phone, money, 94, addedMoney, 'USDT.BEP20', 'info@bdgwin007.com');
        if(resCoin === true)
        {
            return res.status(200).json({
            message: 'Payment Initiated successfully',
            recharge: resCoin,
            urls: {   
                web_url:  'https://bdgwin007.com/wallet/crypto/pay',
                // bhim_link: ekqrData.data?.upi_intent?.bhim_link || "",
                // phonepe_link: ekqrData.data?.upi_intent?.phonepe_link || "",
                // paytm_link: ekqrData.data?.upi_intent?.paytm_link || "",
                // gpay_link: ekqrData.data?.upi_intent?.gpay_link || "",
            },
            status: true,
            timeStamp: timeNow,
        });
        }
        else 
        {
            return res.status(200).json({
            message: 'Failed',
            recharge: resCoin,
            urls: {
            // web_url: ekqrData.data.payment_url,
            // bhim_link: ekqrData.data?.upi_intent?.bhim_link || "",
            // phonepe_link: ekqrData.data?.upi_intent?.phonepe_link || "",
            // paytm_link: ekqrData.data?.upi_intent?.paytm_link || "",
            // gpay_link: ekqrData.data?.upi_intent?.gpay_link || "",
            },
            status: false,
            timeStamp: timeNow,
            });
        }
       
   }
 catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow,
            error
        })
    }
   
   
   
}

async function getStatusofTransaction(txid) {
  const serverName = process.env.SERVER_NAME || 'bdgwin007.com';
  const url = 'https://cp.vertoindia.com/api/getAuth';
  const parameters = `serverName=${serverName}`;

  try {
    const authResponse = await axios.post(url, parameters);
    const api_res = authResponse.data;

    if (api_res.Status) {
      const authKey = api_res.authKey;
      const trnsId = txid;
      const statusUrl = 'https://cp.vertoindia.com/api/cryptoTrnsStatus';
      const statusParameters = `authKey=${authKey}&&serverName=${serverName}&trnsId=${trnsId}`;
      const statusResponse = await axios.post(statusUrl, statusParameters);
      const result = statusResponse.data.API;
      return result.result;
    } else {
      throw new Error('Failed to get authKey');
    }
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
  }
}

async function generateQRofCoinPay(member_id, user_id, amount, price, requestValue, coins, email_id) {
  const serverName = process.env.SERVER_NAME || 'bdgwin007.com';
  const url = 'https://cp.vertoindia.com/api/getAuth';
  const parameters = `serverName=${serverName}`;

  try {
    const authResponse = await axios.post(url, parameters);
    const api_res = authResponse.data;
  
    if (api_res.Status) {
      const authKey = api_res.authKey;
      
      const qrUrl = 'https://cp.vertoindia.com/api/cryptoGenerateQR';
      const qrParameters = `authKey=${authKey}&&serverName=${serverName}&requestValue=${amount}&coins=${coins}&price=${price}&emailId=${email_id}&member_id=${member_id}&user_id=${user_id}`;
      const qrResponse = await axios.post(qrUrl, qrParameters);
      const result = qrResponse.data.API;

      if (result.error === 'ok') {
        const res = result.result;
        const status = await getStatusofTransaction(res.txn_id);
         
        
        
        // const data = {
        //   member_id: member_id,
        //   txn_id: res.txn_id,
        //   amount: res.amount,
        //   address: res.address,
        //   confirms_needed: res.confirms_needed,
        //   timeout: res.timeout,
        //   checkout_url: res.checkout_url,
        //   status_url: res.status_url,
        //   qrcode_url: res.qrcode_url,
        //   status: 'N',
        //   date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        //   added_usd: amount,
        //   usd_price: price,
        //   time_created: status.time_created,
        //   time_expires: status.time_expires,
        //   status_text: status.status_text,
        //   type: status.type,
        //   coin: status.coin,
        // };

        // await model.insertRecord('tbl_coinpayment', data);
        
        const data = {
          member_id: member_id,
          txn_id: res.txn_id,
          amount: res.amount,
          address: res.address,
          confirms_needed: res.confirms_needed,
          timeout: res.timeout,
          checkout_url: res.checkout_url,
          status_url: res.status_url,
          qrcode_url: res.qrcode_url,
          status: 'N',
          date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
          added_usd: requestValue,
          usd_price: price,
          time_created: status.time_created,
          time_expires: status.time_expires,
          status_text: status.status_text,
          type: status.type,
          coin: status.coin,
        };
            const sql = `INSERT INTO tbl_coinpayment (member_id, txn_id, amount, address, confirms_needed, timeout, checkout_url, status_url, qrcode_url, status, date_time, added_usd, usd_price, time_created, time_expires, status_text, type, coin)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [
          data.member_id, data.txn_id, data.amount, data.address, data.confirms_needed, data.timeout,
          data.checkout_url, data.status_url, data.qrcode_url, data.status, data.date_time, data.added_usd,
          data.usd_price, data.time_created, data.time_expires, data.status_text, data.type, data.coin
        ];
        
        await connection.execute(sql, values);
        
       
        
        
        return true;
      } else {
        return 'false';
      }
    } else {
      return 'false';
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    return error.message;
  }
}




module.exports = {
    coinpayment,
}