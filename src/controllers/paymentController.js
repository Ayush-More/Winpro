import connection from "../config/connectDB";
import axios from 'axios';
import moment from "moment";
import crypto from "crypto";
import querystring from "querystring"
const CryptoJS = require('crypto-js');
let timeNow = Date.now();

const PaymentStatusMap = {
    PENDING: 0,
    SUCCESS: 1,
    CANCELLED: 2
}

const PaymentMethodsMap = {
    UPI_GATEWAY: "upi_gateway",
    UPI_MANUAL: "upi_manual",
    USDT_MANUAL: "usdt_manual",
    WOW_PAY: "wow_pay",
    USDT: "usdt",
}

const initiateManualUPIPayment = async (req, res) => {
    const query = req.query

    const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'bank'");

    let bank_recharge_momo_data
    if (bank_recharge_momo.length) {
        bank_recharge_momo_data = bank_recharge_momo[0]
    }

    const momo = {
        bank_name: bank_recharge_momo_data?.name_bank || "",
        username: bank_recharge_momo_data?.name_user || "",
        upi_id: bank_recharge_momo_data?.stk || "",
        usdt_wallet_address: bank_recharge_momo_data?.qr_code_image || "",
    }

    return res.render("wallet/manual_payment.ejs", {
        Amount: query?.am,
        UpiId: momo.upi_id,
    });
}

const initiateManualUSDTPayment = async (req, res) => {
    const query = req.query

    const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'momo'");

    let bank_recharge_momo_data
    if (bank_recharge_momo.length) {
        bank_recharge_momo_data = bank_recharge_momo[0]
    }
    
    
        let   auth = req.cookies.auth;
        const user = await getUserDataByAuthToken(auth)
        
        
    const momo = {
        bank_name: bank_recharge_momo_data?.name_bank || "",
        username: bank_recharge_momo_data?.name_user || "",
        upi_id: bank_recharge_momo_data?.stk || "",
        usdt_wallet_address: bank_recharge_momo_data?.qr_code_image || "",
        _address : user?.pay_address || ""
    }

    return res.render("wallet/usdt_manual_payment.ejs", {
        Amount: query?.am,
        UsdtWalletAddress: momo.usdt_wallet_address,
         _address : momo._address,
         pay_privatekey:user?.pay_privatekey
    });
    
    // return res.status(200).json({
    //         message:   user,
    //         status: true
    //     });
}

const addManualUPIPaymentRequest = async (req, res) => {
    try {
        const data = req.body
        let auth = req.cookies.auth;
        let money = parseInt(data.money);
        let utr = parseInt(data.utr);
        const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

        if (!money || !(money >= minimumMoneyAllowed)) {
            return res.status(400).json({
                message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
                status: false,
                timeStamp: timeNow,
            })
        }

        if (!utr && utr?.length != 12) {
            return res.status(400).json({
                message: `UPI Ref No. or UTR is Required And it should be 12 digit long`,
                status: false,
                timeStamp: timeNow,
            })
        }
        
  
        

        const user = await getUserDataByAuthToken(auth)






    const [CountUTR] = await connection.query('SELECT  COUNT(*) as total  FROM recharge WHERE `phone` = ? and utr =? ', [user.phone , utr]);
 

    let URT_count = CountUTR[0].total;

    
     if (URT_count > 0 ) {
            return res.status(400).json({
                message: `Exist this UTR No.`,
                status: false,
                timeStamp: timeNow,
            })
        }
        
        






        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }
        
        
        
        
        
        
        

        const orderId = getRechargeOrderId()

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: utr,
            phone: user.phone,
            money: money,
            type: PaymentMethodsMap.UPI_MANUAL,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Requested successfully Your Balance will update shortly!',
            recharge: recharge,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const addManualUSDTPaymentRequest = async (req, res) => {
    try {
  
            
        const data = req.body
        let auth = req.cookies.auth;
        let money_usdt = parseInt(data.money);
        let money = money_usdt * 90;
        let utr = data.utr;
        const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)
 
        if (!money || !(money >= minimumMoneyAllowed)) {
            return res.status(400).json({
                message: `Money is Required and it should be ₹${minimumMoneyAllowed} or ${(minimumMoneyAllowed / 90).toFixed(2)} or above!`,
                status: false,
                timeStamp: timeNow,
            })
        }

        if (!utr) {
            return res.status(400).json({
                message: `Ref No. or UTR/Hash Code is Required`,
                status: false,
                timeStamp: timeNow,
               
            })
        }

        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()

 
        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: utr,
            phone: user.phone,
            money: money,
            type: PaymentMethodsMap.USDT_MANUAL,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        return res.status(200).json({
            message: 'Payment Requested successfully Your Balance will update shortly!',
            recharge: recharge,
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

const initiateUPIPayment = async (req, res) => {
    const type = PaymentMethodsMap.UPI_GATEWAY
    let auth = req.cookies.auth;
    let money = parseInt(req.body.money);

    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)

    if (!money || !(money >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }

    try {
        const user = await getUserDataByAuthToken(auth)

        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })

        if (pendingRechargeList.length !== 0) {
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }

        const orderId = getRechargeOrderId()

        const ekqrResponse = await axios.post('https://api.ekqr.in/api/create_order', {
            key: process.env.UPI_GATEWAY_PAYMENT_KEY,
            client_txn_id: orderId,
            amount: String(money),
            p_info: process.env.PAYMENT_INFO,
            customer_name: user.username,
            customer_email: process.env.PAYMENT_EMAIL,
            customer_mobile: user.phone,
            redirect_url: `${process.env.APP_BASE_URL}/wallet/verify/upi`,
            udf1: process.env.APP_NAME,
        })

        const ekqrData = ekqrResponse?.data

        if (ekqrData === undefined || ekqrData.status === false) {
            throw Error("Gateway er!#ror from ekqr!")
        }

        const newRecharge = {
            orderId: orderId,
            transactionId: 'NULL',
            utr: null,
            phone: user.phone,
            money: money,
            type: type,
            status: 0,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: ekqrData.data.payment_url,
            time: timeNow,
        }

        const recharge = await rechargeTable.create(newRecharge)

        console.log(ekqrData)

        return res.status(200).json({
            message: 'Payment Initiated successfully',
            recharge: recharge,
            urls: {
                web_url: ekqrData.data.payment_url,
                bhim_link: ekqrData.data?.upi_intent?.bhim_link || "",
                phonepe_link: ekqrData.data?.upi_intent?.phonepe_link || "",
                paytm_link: ekqrData.data?.upi_intent?.paytm_link || "",
                gpay_link: ekqrData.data?.upi_intent?.gpay_link || "",
            },
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow,
            error
        })
    }
}
function decrypt(encryptedValue) {
    const rey = "ap6v9nj";
    const bytes = CryptoJS.AES.decrypt(encryptedValue, rey);
    return bytes.toString(CryptoJS.enc.Utf8);
};

const verifyUPIPayment = async (req, res) => {
    const type = PaymentMethodsMap.UPI_GATEWAY
    let auth = req.cookies.auth;
    let orderId = req.query.client_txn_id;

    if (!auth || !orderId) {
        return res.status(400).json({
            message: `orderId is Required!`,
            status: false,
            timeStamp: timeNow,
        })
    }
    try {
        const user = await getUserDataByAuthToken(auth)

        const recharge = await rechargeTable.getRechargeByOrderId({ orderId })

        if (!recharge) {
            return res.status(400).json({
                message: `Unable to find recharge with this order id!`,
                status: false,
                timeStamp: timeNow,
            })
        }

        const ekqrResponse = await axios.post('https://api.ekqr.in/api/check_order_status', {
            key: process.env.UPI_GATEWAY_PAYMENT_KEY,
            client_txn_id: orderId,
            txn_date: rechargeTable.getDMYDateOfTodayFiled(recharge.today),
        });


        const ekqrData = ekqrResponse?.data

        if (ekqrData === undefined || ekqrData.status === false) {
            throw Error("Gateway error from ekqr!")
        }

        if (ekqrData.data.status === "created") {
            return res.status(200).json({
                message: 'Your payment request is just created',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (ekqrData.data.status === "scanning") {
            return res.status(200).json({
                message: 'Waiting for confirmation',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (ekqrData.data.status === 'success') {

            if (recharge.status === PaymentStatusMap.PENDING || recharge.status === PaymentStatusMap.CANCELLED) {

                await rechargeTable.setStatusToSuccessByIdAndOrderId({
                    id: recharge.id,
                    orderId: recharge.orderId
                })

                await addUserAccountBalance({
                    phone: user.phone,
                    money: recharge.money + (recharge.money / 100) * 5
                })
            }

            // return res.status(200).json({
            //     status: true,
            //     message: "Payment verified",
            //     timestamp: timeNow
            // })
            return res.redirect("/wallet/rechargerecord")
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow,
            error
        })
    }
}

const initiateWowPayPayment = async (req, res) => {
    console.log("initiateWowPayPayment call")
    const type = PaymentMethodsMap.WOW_PAY
    let auth = req.cookies.auth;
    let money = parseInt(req.query.money);
    const minimumMoneyAllowed = parseInt(process.env.MINIMUM_MONEY)
    if (!money || !(money >= minimumMoneyAllowed)) {
        return res.status(400).json({
            message: `Money is Required and it should be ₹${minimumMoneyAllowed} or above!`,
            status: false,
            timeStamp: timeNow,
        })
    }
    try {
        const user = await getUserDataByAuthToken(auth)
        const pendingRechargeList = await rechargeTable.getRecordByPhoneAndStatus({ phone: user.phone, status: PaymentStatusMap.PENDING, type: PaymentMethodsMap.UPI_GATEWAY })
        console.log("pendingRechargeList",pendingRechargeList)
        if (pendingRechargeList.length !== 0) {
            console.log("pendingRechargeList.length !== 0")
            const deleteRechargeQueries = pendingRechargeList.map(recharge => {
                return rechargeTable.cancelById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)
        }
        const orderId = getRechargeOrderId()
        const _zD = decrypt('U2FsdGVkX1+E8jZqS3uId/iCQSaTxXL5h9tMS+wNlNU=')
        const _nl = decrypt('U2FsdGVkX1+takmNuqNYTCurscQ/sJp1qwizoA9mxexz+lULClQJ9eQH9qrjdLMbYQgURTVg2JiIZBr+PGajyg==')
        const params = {
            mchId: _zD,
            passageId: '17701',
            amount: money,
            orderNo: orderId,
            notifyUrl: _nl,
            otherData: user.phone,
        };
        const _zE = decrypt('U2FsdGVkX18fZUkHFLTbmQls2aOY/lRrTvcIBVuAH2AtMcLY2R2kAo1ru1EHBy46SHmUeWU2/B/PdsihUb9gZQ==')
        params.sign = wowpay.generateSign(params, _zE);
        console.log(params)
        const _al = decrypt('U2FsdGVkX186qmz9E+Ebq6N0bbNPB+SM8gAth7c6SaZwdjBhBQEbK98QWYsSFHSr2c6PU243ojdbGONu0NpbM0k/EFEoywYZ8f8ZmEF2o4I=')
        const response = await axios.post(_al, querystring.stringify(params));
        console.log(response.data)
        
        
        
        
        
        if (response.data.success == true && response.data.data.payUrl) {
            return res.status(200).json({
                message: "Payment requested Successfully",
                payment_url: response.data.data.payUrl,
                status: true,
                timeStamp: timeNow,
            })
            
        } else {
            return res.status(400).json({
                message: "Payment request failed. Please try again Or Wrong Details.",
                status: false,
                timeStamp: timeNow,
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: timeNow
        })
    }
}

 const verifyWowPayPayment = async (req, res) => {
    try {
        const type = PaymentMethodsMap.WOW_PAY;
        let data = req.body;

        if (!req.body) {
            data = req.query;
        }

        console.log('Request:', req); // Printing the request object
        console.log('Request body:', data); 

        // Verification Signature
        const keys = Object.keys(data).sort();
        let str = "";
        keys.forEach((key) => {
            if (data[key] !== null && key !== "sign") {
                str += key + "=" + data[key] + "&";
            }
        });

        // Splice key obtained by merchant background
        const token = "8aa07857d0b34316bc89e5b6a04cc93f";
        str += "key=" + token;

        // Calculate MD5 hash
        const md5 = crypto.createHash("md5").update(str).digest("hex");

        // Verify signature
        if (data["sign"] !== md5) {
            return res.write("sign error").end();
        }

        // Process the business logic and return success after successful processing
        const newRechargeParams = {
            orderId: data.orderNo,
            transactionId: data.tradeNo,
            utr: null,
            phone: data.otherData,
            money: data.amount,  // Assuming 'params' was a typo and should be 'data'
            type: type,
            status: data.payStatus,
            today: rechargeTable.getCurrentTimeForTodayField(),
            url: "NULL",
            time: timeNow, // Define timeNow here
        };

        const recharge = await rechargeTable.getRechargeByOrderId({ orderId: newRechargeParams.orderId });

        if (recharge) {
            console.log({
                message: `Recharge already verified!`,
                status: true,
                timeStamp: newRechargeParams.time,
            });
            return res.status(400).json({
                message: `Recharge already verified!`,
                status: true,
                timeStamp: newRechargeParams.time,
            });
        }

        const newRecharge = await rechargeTable.create(newRechargeParams);

        await addUserAccountBalance({
            phone: newRechargeParams.phone,
            money: newRecharge.money 
        });

        return res.redirect("/wallet/rechargerecord");
    } catch (error) {
        console.log({
            status: false,
            message: "Something went wrong!",
            timestamp: new Date(), // Define timeNow here
        });
        return res.status(500).json({
            status: false,
            message: "Something went wrong!",
            timestamp: new Date(), // Define timeNow here
        });
    }
}

// helpers ---------------
const getUserDataByAuthToken = async (authToken) => {
    let [users] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [authToken]);
    const user = users?.[0]


    if (user === undefined || user === null) {
        throw Error("Unable to get user data!")
    }

    return {
        phone: user.phone,
        code: user.code,
        username: user.name_user,
        invite: user.invite,
        usdt_bep20:user.usdt_bep20,
        pay_address:user.pay_address,
        pay_privatekey:user.pay_privatekey
    }
}


const addUserAccountBalance = async ({ money, phone }) => {
 
 
    let amountAdd = money + (money / 100) * 5;
    await connection.query('UPDATE users SET temp_money = temp_money + ? , money = money + ?, total_money = total_money + ? WHERE phone = ? ', [amountAdd,amountAdd, amountAdd, phone]);
    
    const [rows2] = await connection.query(`SELECT * FROM users WHERE phone = ?`, [phone]);
    let parentId = rows2[0].invite;
    
    
    
const [rows3] = await connection.query(`SELECT * FROM users WHERE code = ?`, [parentId]);
    let parentPhone = rows3.length > 0 ? rows3[0].phone : '';

    if (parentPhone != '') {
        const [process] = await connection.query(`SELECT id, date FROM tbl_process WHERE status = 'N'`);
        if (process.length > 0) {
            let Pdate = process[0].date;
            let Pid = process[0].id;
            let amountSponsor =   (money / 100) * 4;
            const sql = "INSERT INTO inc_direct SET process_id = ?, phone = ?, from_id = ?, total_amount = ?, returns = ?, net_amount = ?, date = ?";
            await connection.execute(sql, [Pid, parentPhone, phone, money, 4, amountSponsor, Pdate]);
            await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?', [amountSponsor, amountSponsor, parentPhone]);
        }
    }
    
    
    
}


const getRechargeOrderId = () => {
    // const date = new Date();
    // let id_time = date.getUTCFullYear() + '' + date.getUTCMonth() + 1 + '' + date.getUTCDate();
    // let id_order = Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) + 10000000000000;

    // return id_time + id_order
    
     
     const date = new Date();
     let year = date.getUTCFullYear();  // 4 digits
     let month = ('0' + (date.getUTCMonth() + 1)).slice(-2);  // 2 digits, zero-padded
     let day = ('0' + date.getUTCDate()).slice(-2);  // 2 digits, zero-padded
     
     // Concatenate the date part to get a string of length 8 (YYYYMMDD)
     let id_time = year + month + day;  // 8 digits
     
     // Generate a random number part with exactly 12 digits
     let id_order = Math.floor(100000000000 + Math.random() * 900000000000);  // 12 digits
     
     // Combine the two parts to create a 20-digit identifier
     return  id_time + id_order;
     
     // console.log(unique_id);

}

const rechargeTable = {
    getRecordByPhoneAndStatus: async ({ phone, status, type }) => {
        if (![PaymentStatusMap.SUCCESS, PaymentStatusMap.CANCELLED, PaymentStatusMap.PENDING].includes(status)) {
            throw Error("Invalid Payment Status!")
        }

        let recharge

        if (type) {
            [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? AND type = ?', [phone, status, type]);
        } else {
            [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ?', [phone, status]);
        }

        return recharge.map((item) => ({
            id: item.id,
            orderId: item.id_order,
            transactionId: item.transaction_id,
            utr: item.utr,
            phone: item.phone,
            money: item.money,
            type: item.type,
            status: item.status,
            today: item.today,
            url: item.url,
            time: item.time,
        }))
    },
    getRechargeByOrderId: async ({ orderId }) => {
        const [recharge] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [orderId]);

        if (recharge.length === 0) {
            return null
        }

        return recharge.map((item) => ({
            id: item.id,
            orderId: item.id_order,
            transactionId: item.transaction_id,
            utr: item.utr,
            phone: item.phone,
            money: item.money,
            type: item.type,
            status: item.status,
            today: item.today,
            url: item.url,
            time: timeNow,
        }))?.[0]
    },
    cancelById: async (id) => {
        if (typeof id !== "number") {
            throw Error("Invalid Recharge 'id' expected a number!")
        }


        await connection.query('UPDATE recharge SET status = 2 WHERE id = ?', [id]);
    },
    setStatusToSuccessByIdAndOrderId: async ({ id, orderId }) => {
        if (typeof id !== "number") {
            throw Error("Invalid Recharge 'id' expected a number!")
        }


        console.log(id, orderId)

        const [re] = await connection.query('UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ?', [id, orderId]);
        console.log(re)
    },
    getCurrentTimeForTodayField: () => {
        return moment().format("YYYY-DD-MM h:mm:ss A")
    },
    getDMYDateOfTodayFiled: (today) => {
        return moment(today, "YYYY-DD-MM h:mm:ss A").format("DD-MM-YYYY")
    },
    create: async (newRecharge) => {

        if (newRecharge.url === undefined || newRecharge.url === null) {
            newRecharge.url = "0"
        }

        await connection.query(
            `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?, utr = ?`,
            [newRecharge.orderId, newRecharge.transactionId, newRecharge.phone, newRecharge.money, newRecharge.type, newRecharge.status, newRecharge.today, newRecharge.url, timeNow, newRecharge?.utr || "NULL"]
        );

        const [recharge] = await connection.query('SELECT * FROM recharge WHERE id_order = ?', [newRecharge.orderId]);

        if (recharge.length === 0) {
            throw Error("Unable to create recharge!")
        }

        return recharge[0]
    }
}


const wowpay = {
    generateSign: (params, secretKey) => {
        delete params.sign;
        const stringA = Object.entries(params)
            .filter(([key, value]) => value !== null)
            .sort(([key1], [key2]) => key1.localeCompare(key2))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        const stringSignTemp = `${stringA}&key=${secretKey}`;
        console.log("Value to be signed: " + stringSignTemp);
        const signValue = crypto.createHash('md5').update(stringSignTemp).digest('hex');
        const sign = signValue.toLowerCase();
        console.log("Signature result " + sign);
        return sign
    },
    validateSignByKey: (signSource, key, retSign) => {
        const signKey = crypto.createHash("md5").update(signSource + "&key=" + key).digest("hex");
        return signKey === retSign;
    },
};



module.exports = {
    initiateUPIPayment,
    verifyUPIPayment,
    initiateWowPayPayment,
    verifyWowPayPayment,
    initiateManualUPIPayment,
    addManualUPIPaymentRequest,
    addManualUSDTPaymentRequest,
    initiateManualUSDTPayment,
}