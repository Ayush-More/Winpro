// own_pay.js - JavaScript conversion of own_pay.php
const axios = require('axios');
const { ec: EC } = require('elliptic');
const keccak256 = require('keccak256');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
import connection from "../config/connectDB";
// Database connection would be handled differently in Node.js
// This is a placeholder for the actual implementation
// Only require database if it's available
// let connection;
// try {
//     connection = require('../config/connectDB');
// } catch (e) {
//     console.log('Database connection not available, running in test mode');
//     // Create a mock db object for testing
//     connection = {
//         query: async() => ({ rows: [] })
//     };
// }
// const { getUserDetails, myQuery } = require('../function_lib.js');

// Session handling would be different in Node.js
// This is a placeholder for the actual implementation
// Session handling would be implemented differently in Node.js
// const session = {
//     userid: null
// };

class WalletGenerator {
    constructor() {
        this.provider = axios.create({
            baseURL: 'https://bsc-dataseed.binance.org'
        });
    }

    generateWallet() {
        try {
            const ec = new EC('secp256k1');
            // Use a custom random number generator to avoid brorand issues
            const keyPair = ec.genKeyPair({
                entropy: this.generateRandomBytes(32)
            });

            const privateKey = keyPair.getPrivate('hex');
            let publicKey = keyPair.getPublic(false, 'hex');

            publicKey = publicKey.substring(2);
            const address = '0x' + keccak256(Buffer.from(publicKey, 'hex')).toString('hex').substring(24);

            return {
                address: address,
                privateKey: '0x' + privateKey
            };
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw error;
        }
    }

    // Custom random bytes generator to avoid dependency on brorand
    generateRandomBytes(length) {
        const result = Buffer.alloc(length);
        for (let i = 0; i < length; i++) {
            result[i] = Math.floor(Math.random() * 256);
        }
        return result;
    }
}

class WalletMonitor {
    constructor(usdtReceiveWallet, gasWallet, gasPrivateKey) {
        try {
            this.provider = axios.create({
                baseURL: 'https://bsc-dataseed.binance.org'
            });
            this.usdtReceiveWallet = usdtReceiveWallet;
            this.gasWallet = gasWallet;
            this.gasPrivateKey = gasPrivateKey;
            this.usdtContract = '0x55d398326f99059fF775485246999027B3197955';

            // Validate addresses
            if (!/^0x[a-fA-F0-9]{40}$/.test(gasWallet)) {
                throw new Error("Invalid gas wallet address format");
            }
            if (!/^0x[a-fA-F0-9]{40}$/.test(usdtReceiveWallet)) {
                throw new Error("Invalid USDT receive wallet address format");
            }
        } catch (e) {
            console.error("Error in constructor:", e.message);
            throw e;
        }
    }

    async getBNBBalance(address) {
        try {
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1
            });

            const body = response.data;

            if (!body.result) {
                console.warn(`Warning: Invalid response from node for address ${address}`);
                return 0;
            }

            return parseInt(body.result, 16) / (10 ** 18); // Convert Wei to BNB
        } catch (e) {
            console.error("Error fetching BNB balance:", e.message);
            return 0;
        }
    }

    async getUSDTBalance(address) {
        try {
            // Create function signature for balanceOf(address)
            const web3 = new Web3('https://bsc-dataseed.binance.org');
            const methodID = web3.utils.sha3('balanceOf(address)').substring(0, 10);
            const params = address.substring(2).padStart(64, '0');
            const data = methodID + params;

            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: this.usdtContract,
                    data: data
                }, 'latest'],
                id: 1
            });

            const body = response.data;
            return parseInt(body.result, 16) / (10 ** 18); // Convert to USDT (18 decimals)
        } catch (e) {
            console.error("Error fetching USDT balance:", e.message);
            return 0;
        }
    }

    async monitorAndTransfer(wallet) {
        try {
            console.log("Checking wallet:", wallet.address);

            // Get initial balances
            const bnbBalance = await this.getBNBBalance(wallet.address);
            const usdtBalance = await this.getUSDTBalance(wallet.address);

            console.log("BNB Balance:", bnbBalance, "BNB");
            console.log("USDT Balance:", usdtBalance, "USDT");

            // Define minimum thresholds
            const MIN_USDT_THRESHOLD = 0.00001; // Minimum USDT amount worth processing
            const MIN_BNB_REQUIRED = 0.005; // Minimum BNB needed for gas

            // First check if USDT balance is worth processing
            if (usdtBalance < MIN_USDT_THRESHOLD) {
                console.log(`USDT balance too small to process (< ${MIN_USDT_THRESHOLD})`);
                return {
                    found: false,
                    message: 'No significant USDT balance found'
                };
            }

            // If USDT balance is significant, ensure we have enough BNB
            if (bnbBalance < MIN_BNB_REQUIRED) {
                console.log("Insufficient BNB for gas. Attempting to send from main wallet...");

                // Try to send BNB from gas wallet
                if (!await this.sendGasFromMainWallet(wallet.address)) {
                    console.log("Failed to send BNB for gas");
                    return {
                        found: false,
                        message: 'Failed to send BNB for gas'
                    };
                }

                // Wait for BNB transfer to confirm
                await new Promise(resolve => setTimeout(resolve, 15000));

                // Verify BNB was received
                const newBnbBalance = await this.getBNBBalance(wallet.address);
                if (newBnbBalance < MIN_BNB_REQUIRED) {
                    console.log("BNB transfer failed to arrive");
                    return {
                        found: false,
                        message: 'BNB transfer failed to arrive'
                    };
                }
            }

            // Now proceed with USDT transfer
            console.log("Proceeding with USDT transfer...");

            try {
                // The transferUSDT function now handles both blockchain transaction and database update
                // It only returns true if both were successful
                const success = await this.transferUSDT(wallet.address, wallet.privateKey, usdtBalance);

                if (!success) {
                    console.log("USDT transfer failed");
                    // Return remaining BNB to gas wallet
                    try {
                        const finalBnbBalance = await this.getBNBBalance(wallet.address);
                        if (finalBnbBalance > 0.001) {
                            await this.transferBNB(wallet.address, wallet.privateKey, finalBnbBalance);
                            console.log("Returned remaining BNB to gas wallet after failed USDT transfer");
                        }
                    } catch (bnbError) {
                        console.error("Error returning BNB after failed USDT transfer:", bnbError.message);
                    }
                    return {
                        found: false,
                        message: 'USDT transfer failed. Blockchain transaction or database update unsuccessful.'
                    };
                }

                // If we get here, both blockchain transaction and database update were successful

                // Return remaining BNB to gas wallet
                try {
                    const finalBnbBalance = await this.getBNBBalance(wallet.address);
                    if (finalBnbBalance > 0.001) {
                        await this.transferBNB(wallet.address, wallet.privateKey, finalBnbBalance);
                        console.log("Returned remaining BNB to gas wallet after successful USDT transfer");
                    }
                } catch (bnbError) {
                    console.error("Error returning BNB after successful USDT transfer:", bnbError.message);
                    // Continue with success response even if BNB return fails
                }

                return {
                    found: true,
                    amount: usdtBalance,
                    currency: 'USDT',
                    message: 'Transfer completed successfully'
                };

            } catch (transferError) {
                console.error("Error in USDT transfer process:", transferError.message);
                return {
                    found: false,
                    message: 'Error in USDT transfer: ' + transferError.message
                };
            }

        } catch (e) {
            console.error("Error in monitoring:", e.message);
            return {
                found: false,
                message: 'Error: ' + e.message
            };
        }
    }

    async approveUSDT(fromAddress, privateKey, amount) {
        try {
            console.log("Approving USDT transfer...");

            privateKey = privateKey.replace('0x', '');

            // Create approve function data
            const web3 = new Web3('https://bsc-dataseed.binance.org');
            const methodID = web3.utils.sha3('approve(address,uint256)').substring(0, 10);
            const spender = this.usdtReceiveWallet.substring(2).padStart(64, '0');

            // Convert amount to wei format
            const bn = new BigNumber(amount).times(new BigNumber(10).pow(18));
            const amountHex = bn.toString(16).padStart(64, '0');

            const data = methodID + spender + amountHex;

            const nonce = await this.getTransactionCount(fromAddress);

            const txParams = {
                nonce: '0x' + nonce.toString(16),
                to: this.usdtContract,
                value: '0x0',
                data: data,
                gas: '0x186A0', // 100000 gas limit
                gasPrice: '0x' + (5 * 10 ** 9).toString(16), // 5 Gwei
                chainId: 56
            };

            const web3Instance = new Web3('https://bsc-dataseed.binance.org');
            const account = web3Instance.eth.accounts.privateKeyToAccount(privateKey);
            const signedTx = await account.signTransaction(txParams);

            const txHash = await this.sendRawTransaction(signedTx.rawTransaction);

            // Wait for approval confirmation
            for (let i = 0; i < 30; i++) {
                const status = await this.getTransactionStatus(txHash);
                if (status === true) {
                    console.log("Approval confirmed");
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait a bit for blockchain to update
                    return true;
                } else if (status === false) {
                    console.log("Approval transaction failed");
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            console.log("Approval transaction timeout");
            return false;
        } catch (e) {
            console.error("Error in approveUSDT:", e.message);
            return false;
        }
    }

    // async transferUSDT(fromAddress, privateKey, amount) {
    //     try {
    //         const actualBalance = await this.getUSDTBalance(fromAddress);
    //         amount = Math.min(amount, actualBalance);
    //         amount = Math.round(amount * 1000000) / 1000000; // Round to 6 decimal places

    //         console.log(`Attempting to transfer ${amount} USDT from ${fromAddress} to ${this.usdtReceiveWallet}`);

    //         // Direct transfer without allowance

    //         // Create a web3 instance
    //         const web3 = new Web3('https://bsc-dataseed.binance.org');

    //         // Create contract ABI for the transfer function
    //         const transferAbi = {
    //             name: 'transfer',
    //             type: 'function',
    //             inputs: [
    //                 { type: 'address', name: 'recipient' },
    //                 { type: 'uint256', name: 'amount' }
    //             ]
    //         };

    //         // Encode the function call properly using web3
    //         let transactionData;
    //         try {
    //             transactionData = web3.eth.abi.encodeFunctionCall(transferAbi, [
    //                 this.usdtReceiveWallet,
    //                 web3.utils.toWei(amount.toString(), 'ether')
    //             ]);

    //             console.log(`Using recipient address: ${this.usdtReceiveWallet}`);
    //             console.log(`Using amount wei: ${web3.utils.toWei(amount.toString(), 'ether')}`);
    //             console.log(`Encoded transaction data: ${transactionData}`);

    //             // Verify data is valid hex
    //             if (!/^0x[0-9a-f]+$/i.test(transactionData)) {
    //                 console.error("Invalid hex data format:", transactionData);
    //                 return false;
    //             }
    //         } catch (error) {
    //             console.error("Error encoding transaction data:", error.message);
    //             return false;
    //         }

    //         const txParams = {
    //             nonce: '0x' + (await this.getTransactionCount(fromAddress)).toString(16),
    //             to: this.usdtContract,
    //             value: '0x0',
    //             data: transactionData,
    //             gas: '0x186A0', // 100000 gas
    //             gasPrice: '0x' + (3 * 10 ** 9).toString(16), // 3 Gwei
    //             chainId: 56
    //         };

    //         // First, attempt the blockchain transaction
    //         let txSuccess = false;
    //         let txHash = '';

    //         try {
    //             const web3Instance = new Web3('https://bsc-dataseed.binance.org');
    //             const cleanPrivateKey = privateKey.replace('0x', '');
    //             const account = web3Instance.eth.accounts.privateKeyToAccount(cleanPrivateKey);

    //             console.log("Signing transaction...");
    //             const signedTx = await account.signTransaction(txParams);

    //             console.log("Sending transaction...");
    //             txHash = await this.sendRawTransaction2(signedTx.rawTransaction);
    //             console.log(`Transaction sent with hash: ${txHash}`);

    //             // Wait for transaction confirmation
    //             await new Promise(resolve => setTimeout(resolve, 8000));

    //             // Verify the transfer was successful by checking the new balance
    //             const newBalance = await this.getUSDTBalance(fromAddress);
    //             console.log(`New USDT balance after transfer: ${newBalance}`);

    //             // Check if the balance is significantly reduced
    //             const significantReduction = newBalance < (amount * 0.1);
    //             txSuccess = newBalance < 0.0001 || significantReduction;

    //             if (!txSuccess) {
    //                 console.log("Blockchain transaction verification failed - balance not reduced enough");
    //                 return false;
    //             }

    //             console.log("Blockchain transaction successful, proceeding to update database");
    //         } catch (txError) {
    //             console.error("Blockchain transaction error:", txError.message);
    //             return false;
    //         }

    //         // Only update the database if the blockchain transaction was successful
    //         if (txSuccess) {
    //             try {
    //                 const [result] = await connection.query('SELECT * FROM users WHERE pay_address = ? LIMIT 1', [fromAddress]);
    //                 const row = result[0];

    //                 if (!row) {
    //                     console.error("User not found in database");
    //                     return false;
    //                 }

    //                 const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
    //                 const usdtBonus = parseFloat(usdt_bonus[0] && usdt_bonus[0].value || '0');

    //                 // Generate a transaction ID using timestamp and txHash
    //                 const txid = `USDT_${txHash.substring(0, 10)}_${Date.now()}`;

    //                 // Convert USDT to INR at rate of 90
    //                 let money_inr = Math.floor(amount * 90);
    //                 let money_inrtotal = money_inr;
    //                 money_inr += (money_inr * usdtBonus) / 100;

    //                 console.log("USDT amount in INR with bonus:", money_inr);

    //                 // Insert into recharge table
    //                 const sql = `INSERT INTO recharge (id_order, transaction_id, utr, phone, money, type, status, today, url, time)
    //                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    //                 await connection.query(sql, [
    //                     row.id_user,
    //                     txid,
    //                     txHash,  // Use actual transaction hash as UTR
    //                     row.phone,
    //                     money_inrtotal,
    //                     'USDT',
    //                     1, // Set as completed
    //                     new Date().toISOString().split('T')[0],
    //                     'AUTO',
    //                     Date.now()
    //                 ]);

    //                 // Update user's wallet
    //                 await connection.query(
    //                     'UPDATE users SET got = 1, temp_money = temp_money + ?, money = money + ?, total_money = total_money + ? WHERE pay_address = ?',
    //                     [money_inr, money_inr, money_inr, fromAddress]
    //                 );

    //                 // Fetch recharge level config for referral bonuses
    //                 const [levelConfigs] = await connection.query("SELECT name, value FROM tbl_config WHERE name LIKE 'recharge_level_%'");
    //                 const levelPercents = {};
    //                 levelConfigs.forEach(cfg => {
    //                     levelPercents[cfg.name] = parseFloat(cfg.value);
    //                 });

    //                 let currentInviteCode = row.invite;
    //                 let currentLevel = 1;

    //                 // Process referral bonuses
    //                 while (currentInviteCode && currentLevel <= 6) {
    //                     const [uplineData] = await connection.query(`SELECT phone, invite FROM users WHERE code = ?`, [currentInviteCode]);

    //                     if (uplineData.length === 0) break;

    //                     const uplinePhone = uplineData[0].phone;
    //                     const uplineInvite = uplineData[0].invite;

    //                     const levelKey = `recharge_level_${currentLevel}`;
    //                     const percent = levelPercents[levelKey] || 0;

    //                     if (percent > 0) {
    //                         const levelIncome = (money_inrtotal * percent) / 100;

    //                         await connection.query(
    //                             `INSERT INTO inc_level (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date)
    //                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    //                             ['Recharge', txHash.substring(0, 10), txid, uplinePhone, row.phone, currentLevel, money_inrtotal, percent, levelIncome, new Date()]
    //                         );

    //                         await connection.query(
    //                             `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?`,
    //                             [levelIncome, levelIncome, uplinePhone]
    //                         );
    //                     }

    //                     // Move to next level
    //                     currentInviteCode = uplineInvite;
    //                     currentLevel++;
    //                 }

    //                 // Verify the database update was successful
    //                 const [userAfterUpdate] = await connection.query('SELECT money, temp_money, total_money FROM users WHERE pay_address = ?', [fromAddress]);
    //                 if (userAfterUpdate && userAfterUpdate[0]) {
    //                     console.log(`User balance after update: Money=${userAfterUpdate[0].money}, Temp=${userAfterUpdate[0].temp_money}, Total=${userAfterUpdate[0].total_money}`);
    //                 }

    //                 console.log(`Successfully updated database for user ${row.phone} with ${money_inr} INR (${amount} USDT)`);
    //                 return true;

    //             } catch (dbError) {
    //                 console.error("Database error in transferUSDT:", dbError.message);
    //                 // The blockchain transaction was successful but database update failed
    //                 // This is a critical error that needs manual intervention
    //                 console.error("CRITICAL ERROR: Blockchain transaction successful but database update failed. Manual reconciliation required.");
    //                 return false;
    //             }
    //         }

    //         return false; // Should not reach here, but just in case
    //     } catch (e) {
    //         console.error("Error in transferUSDT:", e.message);
    //         return false;
    //     }
    // }

     async transferUSDT(fromAddress, privateKey, amount) {
        try {
            const actualBalance = await this.getUSDTBalance(fromAddress);
            amount = Math.min(amount, actualBalance);
            amount = Math.round(amount * 1000000) / 1000000; // Round to 6 decimal places

            console.log(`Attempting to transfer ${amount} USDT from ${fromAddress} to ${this.usdtReceiveWallet}`);

            // Create a web3 instance
            const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org'));

            // Create contract ABI for the transfer function
            const transferAbi = {
                name: 'transfer',
                type: 'function',
                inputs: [
                    { type: 'address', name: 'recipient' },
                    { type: 'uint256', name: 'amount' }
                ]
            };

            // Encode the function call properly using web3
            let transactionData;
            try {
                transactionData = web3.eth.abi.encodeFunctionCall(transferAbi, [
                    this.usdtReceiveWallet,
                    web3.utils.toWei(amount.toString(), 'ether')
                ]);

                console.log(`Using recipient address: ${this.usdtReceiveWallet}`);
                console.log(`Using amount wei: ${web3.utils.toWei(amount.toString(), 'ether')}`);
                console.log(`Encoded transaction data: ${transactionData}`);

                // Verify data is valid hex
                if (!/^0x[0-9a-f]+$/i.test(transactionData)) {
                    console.error("Invalid hex data format:", transactionData);
                    return false;
                }
            } catch (error) {
                console.error("Error encoding transaction data:", error.message);
                return false;
            }

            const txParams = {
                nonce: '0x' + (await this.getTransactionCount(fromAddress)).toString(16),
                to: this.usdtContract,
                value: '0x0',
                data: transactionData,
                gas: '0x186A0', // 100000 gas
                gasPrice: '0x' + (3 * 10 ** 9).toString(16), // 3 Gwei
                chainId: 56
            };

            // Log transaction details
            console.log(`Processing transfer of ${amount} USDT from ${fromAddress} to ${this.usdtReceiveWallet}`);

            // Sign and send the transaction
            try {
                const web3Instance = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org'));
                const cleanPrivateKey = privateKey.replace('0x', '');
                const account = web3Instance.eth.accounts.privateKeyToAccount('0x' + cleanPrivateKey);

                console.log("Signing transaction...");
                const signedTx = await account.signTransaction(txParams);

                console.log("Sending transaction...");

                // First send the transaction to the blockchain
                const txHash = await this.sendRawTransaction2(signedTx.rawTransaction);
                console.log(`Transaction sent with hash: ${txHash}`);

                // Wait for transaction confirmation
                await new Promise(resolve => setTimeout(resolve, 8000));

                // Verify the transfer was successful by checking the new balance
                const newBalance = await this.getUSDTBalance(fromAddress);
                console.log(`New USDT balance after transfer: ${newBalance}`);

                // Only proceed with database operations if transaction was successful
                if (newBalance < 0.0001) {
                    try {
                        // Get user information by wallet address
                        const [result] = await connection.query('SELECT * FROM users WHERE pay_address = ? LIMIT 1', [fromAddress]);
                        const user = result[0];

                        if (!user) {
                            console.error("User not found with wallet address:", fromAddress);
                            return true; // Transaction was successful even if we couldn't update the database
                        }

                        // Get USDT bonus configuration
                        const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
                        const usdtBonus = parseFloat(usdt_bonus[0] && usdt_bonus[0].value || '0');

                        // Generate a transaction ID using timestamp and txHash
                        const txid = `USDT_${txHash.substring(0, 10)}_${Date.now()}`;

                        // Convert USDT to INR at rate of 94
                        let money_inr = Math.floor(amount * 94);
                        let money_inrtotal = money_inr;
                        
                        const [rows25] = await connection.query(
                        "SELECT COUNT(*) AS total FROM `recharge` WHERE `phone` = ?",
                        [user.phone]
                        );
                        
                        const countExist = parseFloat(rows25[0]?.total || 0);
                        
                        if (countExist > 0) {
                        money_inr += (money_inr * 5) / 100;
                        } else {
                        money_inr += (money_inr * 10) / 100;
                        }

                        

                        console.log("USDT amount in INR with bonus:", money_inr);

                        // Insert into recharge table
                        const sql = `INSERT INTO recharge (id_order, transaction_id, utr, phone, money, type, status, today, url, time)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                        await connection.query(sql, [
                            user.id_user,
                            txid,
                            txHash,  // Use actual transaction hash as UTR
                            user.phone,
                            money_inrtotal,
                            'USDT',
                            1, // Set as completed
                            new Date().toISOString().split('T')[0],
                            'AUTO',
                            Date.now()
                        ]);

                        // Update user's wallet
                        await connection.query(
                            'UPDATE users SET got = 1, temp_money = temp_money + ?, money = money + ?, total_money = total_money + ? WHERE pay_address = ?',
                            [money_inr, money_inr, money_inr, fromAddress]
                        );

                        // Fetch recharge level config for referral bonuses
                        const [levelConfigs] = await connection.query("SELECT name, value FROM tbl_config WHERE name LIKE 'recharge_level_%'");
                        const levelPercents = {};
                        levelConfigs.forEach(cfg => {
                            levelPercents[cfg.name] = parseFloat(cfg.value);
                        });

                        let currentInviteCode = user.invite;
                        let currentLevel = 1;

                        // Process referral bonuses
                        while (currentInviteCode && currentLevel <= 6) {
                            const [uplineData] = await connection.query(`SELECT phone, invite FROM users WHERE code = ?`, [currentInviteCode]);

                            if (uplineData.length === 0) break;

                            const uplinePhone = uplineData[0].phone;
                            const uplineInvite = uplineData[0].invite;

                            const levelKey = `recharge_level_${currentLevel}`;
                            const percent = levelPercents[levelKey] || 0;

                            if (percent > 0) {
                                const levelIncome = (money_inrtotal * percent) / 100;

                                await connection.query(
                                    `INSERT INTO inc_level (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    ['Recharge', txHash.substring(0, 10), txid, uplinePhone, user.phone, currentLevel, money_inrtotal, percent, levelIncome, new Date()]
                                );

                                await connection.query(
                                    `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?`,
                                    [levelIncome, levelIncome, uplinePhone]
                                );
                            }

                            // Move to next level
                            currentInviteCode = uplineInvite;
                            currentLevel++;
                        }

                        // Verify the database update was successful
                        const [userAfterUpdate] = await connection.query('SELECT money, temp_money, total_money FROM users WHERE pay_address = ?', [fromAddress]);
                        if (userAfterUpdate && userAfterUpdate[0]) {
                            console.log(`User balance after update: Money=${userAfterUpdate[0].money}, Temp=${userAfterUpdate[0].temp_money}, Total=${userAfterUpdate[0].total_money}`);
                        }

                        console.log(`Successfully updated database for user ${user.phone} with ${money_inr} INR (${amount} USDT)`);
                        return true;
                    } catch (error) {
                        console.error('Error saving deposit:', error);
                        // Still return success since the blockchain transaction was successful
                        return true;
                    }
                } else {
                    console.log("Transaction may have failed - balance is still significant");
                    return false;
                }
            } catch (txError) {
                console.error("Transaction error:", txError.message);
                return false;
            }
        } catch (e) {
            console.error("Error in transferUSDT:", e.message);
            return false;
        }
    }


    async transferBNB(fromAddress, privateKey, amount) {
        try {
            // Convert amount to Wei for precise calculations
            const amountInWei = amount * (10 ** 18);

            // Gas limit in Wei (21000 gas for simple transfer)
            const gasLimit = 21000;

            // Gas price in Wei (3 Gwei)
            const gasPriceInWei = 3 * (10 ** 9);

            // Calculate total gas cost in Wei
            const gasCostInWei = gasLimit * gasPriceInWei;

            // Check if we have enough for gas + transfer
            if (amountInWei <= gasCostInWei) {
                console.log("Amount too small to transfer after gas costs");
                return false;
            }

            // Calculate amount to send (total - gas cost)
            const sendAmountInWei = amountInWei - gasCostInWei;
            const sendAmount = sendAmountInWei / (10 ** 18);

            console.log(`Transferring ${sendAmount} BNB to gas wallet: ${this.gasWallet}`);
            console.log(`Gas cost: ${gasCostInWei / (10 ** 18)} BNB`);

            // Remove '0x' if present from private key
            privateKey = privateKey.replace('0x', '');

            const nonce = await this.getTransactionCount(fromAddress);

            const txParams = {
                nonce: '0x' + nonce.toString(16),
                to: this.gasWallet,
                value: '0x' + Math.floor(sendAmountInWei).toString(16),
                gas: '0x' + gasLimit.toString(16),
                gasPrice: '0x' + gasPriceInWei.toString(16),
                chainId: 56
            };

            const web3Instance = new Web3('https://bsc-dataseed.binance.org');
            const account = web3Instance.eth.accounts.privateKeyToAccount(privateKey);
            const signedTx = await account.signTransaction(txParams);

            const txHash = await this.sendRawTransaction(signedTx.rawTransaction);

            console.log("Transaction sent successfully! TxHash:", txHash);

            // Wait for confirmation
            const maxAttempts = 30;
            for (let i = 0; i < maxAttempts; i++) {
                const receipt = await this.getDetailedTransactionReceipt(txHash);

                if (receipt === null) {
                    console.log(`Waiting for transaction confirmation... Attempt ${i + 1}/${maxAttempts}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (receipt.status === '0x1') {
                    console.log("BNB transfer confirmed");
                    return true;
                } else {
                    console.log("BNB transfer failed");
                    return false;
                }
            }

            console.log("Transaction confirmation timeout");
            return false;
        } catch (e) {
            console.error("Error in transferBNB:", e.message);
            return false;
        }
    }

    async getTransactionCount(address) {
        const response = await this.provider.post('', {
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [address, 'latest'],
            id: 1
        });
        const body = response.data;
        return parseInt(body.result, 16);
    }

    async sendRawTransaction(signedTx) {
        const response = await this.provider.post('', {
            jsonrpc: '2.0',
            method: 'eth_sendRawTransaction',
            params: [signedTx],
            id: 1
        });

        const body = response.data;

        if (body.error) {
            throw new Error("Error sending transaction: " + body.error.message);
        }

        console.log("Transaction sent successfully! TxHash:", body.result);
        return body.result;
    }

    async sendRawTransaction2(signedTx) {
        try {
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [signedTx],
                id: 1
            });

            const body = response.data;

            if (body.error) {
                console.log("Error sending transaction:", body.error.message);
                throw new Error(body.error.message);
            } else {
                console.log("Transaction sent successfully! TxHash:", body.result);

                // Wait a bit for the transaction to propagate
                await new Promise(resolve => setTimeout(resolve, 2000));

                return body.result;
            }
        } catch (e) {
            console.error("Error in sendRawTransaction2:", e.message);
            throw e; // Re-throw to properly handle in the calling function
        }
    }

    async transferBNBFromGasWallet(toAddress, amount) {
        try {
            console.log(`Sending ${amount} BNB from gas wallet to ${toAddress}`);

            // Convert amount to Wei for precise calculations
            const amountInWei = amount * (10 ** 18);

            // Gas limit in Wei (21000 gas for simple transfer)
            const gasLimit = 21000;

            // Gas price in Wei (3 Gwei)
            const gasPriceInWei = 3 * (10 ** 9);

            // Calculate total gas cost in Wei
            const gasCostInWei = gasLimit * gasPriceInWei;

            // Total amount needed including gas
            const totalAmountNeeded = amountInWei + gasCostInWei;

            // Check if gas wallet has enough balance
            const gasWalletBalance = await this.getBNBBalance(this.gasWallet);
            const gasWalletBalanceWei = gasWalletBalance * (10 ** 18);

            if (gasWalletBalanceWei < totalAmountNeeded) {
                console.log(`Insufficient balance in gas wallet. Required: ${totalAmountNeeded / (10 ** 18)} BNB, Available: ${gasWalletBalance} BNB`);
                return false;
            }

            // Remove '0x' if present from private key
            const privateKey = this.gasPrivateKey.replace('0x', '');

            const nonce = await this.getTransactionCount(this.gasWallet);

            const txParams = {
                nonce: '0x' + nonce.toString(16),
                to: toAddress,
                value: '0x' + Math.floor(amountInWei).toString(16),
                gas: '0x' + gasLimit.toString(16),
                gasPrice: '0x' + gasPriceInWei.toString(16),
                chainId: 56
            };

            const web3Instance = new Web3('https://bsc-dataseed.binance.org');
            const account = web3Instance.eth.accounts.privateKeyToAccount(privateKey);
            const signedTx = await account.signTransaction(txParams);

            const txHash = await this.sendRawTransaction(signedTx.rawTransaction);

            console.log("Gas transfer transaction sent! TxHash:", txHash);

            // Wait for confirmation
            const maxAttempts = 30;
            for (let i = 0; i < maxAttempts; i++) {
                const receipt = await this.getDetailedTransactionReceipt(txHash);

                if (receipt === null) {
                    console.log(`Waiting for gas transfer confirmation... Attempt ${i + 1}/${maxAttempts}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (receipt.status === '0x1') {
                    console.log("Gas transfer confirmed");
                    return txHash;
                } else {
                    console.log("Gas transfer failed");
                    return false;
                }
            }

            console.log("Gas transfer confirmation timeout");
            return false;
        } catch (e) {
            console.error("Error in transferBNBFromGasWallet:", e.message);
            return false;
        }
    }

    async sendGasFromMainWallet(toAddress) {
        try {
            const amount = 0.005; // Amount of BNB to send
            console.log(`Sending ${amount} BNB from gas wallet for operations`);

            const txHash = await this.transferBNBFromGasWallet(toAddress, amount);
            if (!txHash) {
                return false;
            }

            console.log("Transaction sent successfully! TxHash:", txHash);

            // Wait for confirmation
            for (let i = 0; i < 30; i++) {
                const status = await this.getTransactionStatus(txHash);
                if (status === true) {
                    // Verify the balance was actually received
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const newBalance = await this.getBNBBalance(toAddress);
                    if (newBalance >= 0.005) {
                        return true;
                    }
                } else if (status === false) {
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            return false;
        } catch (e) {
            console.error("Error in sendGasFromMainWallet:", e.message);
            return false;
        }
    }

    async getDetailedTransactionStatus(txHash) {
        try {
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1
            });

            const receipt = response.data;

            if (!receipt.result || receipt.result === null) {
                return null; // Transaction not yet mined
            }

            const result = receipt.result;

            // Check if transaction was successful
            if (result.status === '0x1') {
                // Check for token transfer event
                for (const log of result.logs) {
                    if (log.address.toLowerCase() === this.usdtContract.toLowerCase()) {
                        // This is a USDT transfer event
                        console.log("Found USDT transfer event in transaction");
                        return true;
                    }
                }
                console.log("Transaction successful but no USDT transfer event found");
                return false;
            } else {
                console.log("Transaction failed with status:", result.status);
                return false;
            }
        } catch (e) {
            console.error("Error checking transaction status:", e.message);
            return null;
        }
    }

    async checkAllowance(owner, spender) {
        try {
            const web3 = new Web3('https://bsc-dataseed.binance.org');
            const methodID = web3.utils.sha3('allowance(address,address)').substring(0, 10);
            const param1 = owner.substring(2).padStart(64, '0');
            const param2 = spender.substring(2).padStart(64, '0');
            const data = methodID + param1 + param2;

            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: this.usdtContract,
                    data: data
                }, 'latest'],
                id: 1
            });

            const body = response.data;
            return parseInt(body.result, 16) / (10 ** 18);
        } catch (e) {
            console.error("Error checking allowance:", e.message);
            return 0;
        }
    }

    async getTransactionError(txHash) {
        try {
            // Get transaction
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_getTransactionByHash',
                params: [txHash],
                id: 1
            });

            const tx = response.data.result;

            // Try to simulate the transaction to get the error
            const response2 = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                        from: tx.from,
                        to: tx.to,
                        data: tx.input,
                        value: tx.value,
                        gas: tx.gas,
                        gasPrice: tx.gasPrice
                    },
                    'latest'
                ],
                id: 1
            });

            const result = response2.data;
            return result.error ? result.error.message : 'Unknown error';
        } catch (e) {
            return e.message;
        }
    }

    async getTransactionStatus(txHash) {
        try {
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1
            });

            const receipt = response.data;

            if (!receipt.result) {
                return null; // Transaction not yet mined
            }

            if (receipt.result === null) {
                return null; // Transaction not yet mined
            }

            // Check status (1 = success, 0 = failure)
            return parseInt(receipt.result.status, 16) === 1;
        } catch (e) {
            console.error("Error checking transaction status:", e.message);
            return false;
        }
    }

    async getDetailedTransactionReceipt(txHash) {
        try {
            const response = await this.provider.post('', {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1
            });

            const result = response.data;

            if (!result.result) {
                return null;
            }

            return result.result;
        } catch (e) {
            console.error("Error getting transaction receipt:", e.message);
            return null;
        }
    }
}

// Function to manually deposit funds to user account
async function depositFunds(req, res) {
    try {
        const { walletAddress, amount, txHash } = req.body;
        const auth = req.cookies.auth;

        if (!walletAddress || !amount || !txHash || !auth) {
            return res.status(400).json({
                message: 'Missing required parameters',
                status: false
            });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                message: 'Invalid wallet address format',
                status: false
            });
        }

        // Get user information by wallet address
        const [result] = await connection.query('SELECT * FROM users WHERE pay_address = ? LIMIT 1', [walletAddress]);
        const user = result[0];

        if (!user) {
            return res.status(404).json({
                message: 'User not found with this wallet address',
                status: false
            });
        }

        // Check if transaction hash already exists
        const [existingTx] = await connection.query('SELECT * FROM recharge WHERE utr = ? LIMIT 1', [txHash]);
        if (existingTx.length > 0) {
            return res.status(400).json({
                message: 'Transaction hash already processed',
                status: false
            });
        }

        const depositAmount = parseFloat(amount);
        if (depositAmount <= 0) {
            return res.status(400).json({
                message: 'Invalid deposit amount',
                status: false
            });
        }

        // Get USDT bonus configuration
        const [usdt_bonus] = await connection.query("SELECT `value` FROM `tbl_config` WHERE `name` = 'usdt_bonus'");
        const usdtBonus = parseFloat(usdt_bonus[0] && usdt_bonus[0].value || '0');

        // Generate a transaction ID
        const txid = `USDT_${txHash.substring(0, 10)}_${Date.now()}`;

        // Convert USDT to INR at rate of 94
        let money_inr = Math.floor(depositAmount * 94);
        let money_inrtotal = money_inr;
        money_inr += (money_inr * usdtBonus) / 100;

        // Insert into recharge table
        const sql = `INSERT INTO recharge (id_order, transaction_id, utr, phone, money, type, status, today, url, time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await connection.query(sql, [
            user.id_user,
            txid,
            txHash,
            user.phone,
            money_inrtotal,
            'USDT',
            1, // Set as completed
            new Date().toISOString().split('T')[0],
            'MANUAL',
            Date.now()
        ]);

        // Update user's wallet
        await connection.query(
            'UPDATE users SET got = 1, temp_money = temp_money + ?, money = money + ?, total_money = total_money + ? WHERE pay_address = ?',
            [money_inr, money_inr, money_inr, walletAddress]
        );

        // Process referral bonuses
        const [levelConfigs] = await connection.query("SELECT name, value FROM tbl_config WHERE name LIKE 'recharge_level_%'");
        const levelPercents = {};
        levelConfigs.forEach(cfg => {
            levelPercents[cfg.name] = parseFloat(cfg.value);
        });

        let currentInviteCode = user.invite;
        let currentLevel = 1;

        while (currentInviteCode && currentLevel <= 6) {
            const [uplineData] = await connection.query(`SELECT phone, invite FROM users WHERE code = ?`, [currentInviteCode]);

            if (uplineData.length === 0) break;

            const uplinePhone = uplineData[0].phone;
            const uplineInvite = uplineData[0].invite;

            const levelKey = `recharge_level_${currentLevel}`;
            const percent = levelPercents[levelKey] || 0;

            if (percent > 0) {
                const levelIncome = (money_inrtotal * percent) / 100;

                await connection.query(
                    `INSERT INTO inc_level (type, process_id, bet_id, user_id, from_id, level, amount, returns, net_amount, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['Recharge', txHash.substring(0, 10), txid, uplinePhone, user.phone, currentLevel, money_inrtotal, percent, levelIncome, new Date()]
                );

                await connection.query(
                    `UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ?`,
                    [levelIncome, levelIncome, uplinePhone]
                );
            }

            currentInviteCode = uplineInvite;
            currentLevel++;
        }

        return res.status(200).json({
            message: 'Deposit processed successfully',
            status: true,
            amount: money_inr,
            currency: 'INR',
            originalAmount: depositAmount,
            originalCurrency: 'USDT'
        });

    } catch (error) {
        console.error('Error in depositFunds:', error);
        return res.status(500).json({
            message: 'Error processing deposit: ' + error.message,
            status: false
        });
    }
}

// Function to monitor wallet for incoming transactions
async function monitorWallet(req, res) {
    try {
        const { walletAddress, privateKey, gasWallet, gasPrivateKey, usdtReceiveWallet } = req.body;

        if (!walletAddress || !privateKey || !gasWallet || !gasPrivateKey || !usdtReceiveWallet) {
            return res.status(400).json({
                message: 'Missing required parameters',
                status: false
            });
        }

        const monitor = new WalletMonitor(usdtReceiveWallet, gasWallet, gasPrivateKey);
        const wallet = {
            address: walletAddress,
            privateKey: privateKey
        };

        const result = await monitor.monitorAndTransfer(wallet);

        return res.status(200).json({
            status: result.found,
            message: result.message,
            amount: result.amount || 0,
            currency: result.currency || 'USDT'
        });

    } catch (error) {
        console.error('Error in monitorWallet:', error);
        return res.status(500).json({
            message: 'Error monitoring wallet: ' + error.message,
            status: false
        });
    }
}

// Export functions that can be called
function generateNewWallet(req, res) {
    try {
        const generator = new WalletGenerator();
        const wallet = generator.generateWallet();

        return res.status(200).json({
            status: true,
            wallet: wallet,
            message: 'Wallet generated successfully'
        });
    } catch (error) {
        console.error('Error in generateNewWallet:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to generate wallet: ' + error.message
        });
    }
}
const savewallet = async(req, res) => {
        try {
            let walletAddress = req.body.walletAddress;
            let walletPrivateKey = req.body.walletPrivateKey;
            let auth = req.cookies.auth;

            if (!walletAddress || !walletPrivateKey || !auth) {
                return res.status(400).json({
                    message: 'Missing required parameters',
                    status: false
                });
            }

            // Use parameterized query to prevent SQL injection
            await connection.query(
                'UPDATE users SET pay_address = ?, pay_privatekey = ? WHERE token = ?', [walletAddress, walletPrivateKey, auth]
            );

            return res.status(200).json({
                message: 'Wallet saved successfully',
                status: true
            });
        } catch (error) {
            console.error('Error saving wallet:', error);
            return res.status(500).json({
                message: 'Error saving wallet: ' + error.message,
                status: false
            });
        }
    }
    // Function to handle withdrawal requests from users
async function requestWithdrawal(req, res) {
    try {
        const { amount, walletAddress } = req.body;
        const auth = req.cookies.auth;

        if (!amount || !walletAddress || !auth) {
            return res.status(400).json({
                message: 'Missing required parameters',
                status: false
            });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                message: 'Invalid wallet address format',
                status: false
            });
        }

        // Get user information
        const [user] = await connection.query('SELECT * FROM users WHERE token = ?', [auth]);
        if (user.length === 0) {
            return res.status(401).json({
                message: 'User not found',
                status: false
            });
        }

        const userInfo = user[0];
        const money = parseFloat(amount);

        // Check if user has enough balance
        if (userInfo.money < money) {
            return res.status(400).json({
                message: 'Insufficient balance',
                status: false
            });
        }

        // Generate a unique ID for the withdrawal
        const id_time = Math.floor(Date.now() / 1000);
        const id_order = Math.floor(Math.random() * 1000000);
        const checkTime = new Date().toISOString().split('T')[0];
        const dates = Date.now();

        // Insert withdrawal request into database
        const sql = `INSERT INTO withdraw SET
            id_order = ?,
            phone = ?,
            money = ?,
            mode = ?,
            address = ?,
            status = ?,
            today = ?,
            time = ?`;

        await connection.execute(sql, [
            id_time + '' + id_order,
            userInfo.phone,
            money,
            'USDT',
            walletAddress,
            0,
            checkTime,
            dates
        ]);

        // Deduct the amount from user's balance
        await connection.query('UPDATE users SET money = money - ? WHERE phone = ?', [money, userInfo.phone]);

        return res.status(200).json({
            message: 'Withdrawal request submitted successfully',
            status: true,
            money: userInfo.money - money
        });

    } catch (error) {
        console.error('Error in requestWithdrawal:', error);
        return res.status(500).json({
            message: 'Error processing withdrawal request: ' + error.message,
            status: false
        });
    }
}

// Function for admin to process withdrawal requests
async function processWithdrawal(req, res) {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                message: 'Missing withdrawal ID',
                status: false
            });
        }

        // Get admin private key from database
        const [adminKeyResult] = await connection.query("SELECT `pkey` FROM `admin` WHERE 1");

        if (!adminKeyResult || adminKeyResult.length === 0 || !adminKeyResult[0].pkey) {
            return res.status(400).json({
                message: 'Admin private key not configured',
                status: false
            });
        }

        // Ensure adminPrivateKey is a string
        const adminPrivateKey = String(adminKeyResult[0].pkey);
        console.log('Admin private key type:', typeof adminPrivateKey);

        // Get withdrawal request details
        const [withdrawalRequest] = await connection.query('SELECT * FROM withdraw WHERE id = ?', [id]);
        if (withdrawalRequest.length === 0) {
            return res.status(404).json({
                message: 'Withdrawal request not found',
                status: false
            });
        }

        const withdrawal = withdrawalRequest[0];

        // Check if withdrawal is already processed
        if (withdrawal.status !== 0) {
            return res.status(400).json({
                message: 'Withdrawal request already processed',
                status: false
            });
        }

        // Convert INR to USDT (assuming 1 USDT = 94 INR as per your existing code)
        const usdtAmount = withdrawal.money / 94;

        // Log the withdrawal details for debugging
        console.log('Processing withdrawal:', {
            id: withdrawal.id,
            amount: withdrawal.money,
            usdtAmount,
            address: withdrawal.address,
            mode: withdrawal.mode
        });

        // USDT contract address on BSC
        const usdtContract = '0x55d398326f99059fF775485246999027B3197955';

        // Create a web3 instance
        const web3 = new Web3('https://bsc-dataseed.binance.org');

        // Derive admin wallet address from private key
        try {
            // Ensure the private key has the correct format (0x prefix)
            let cleanPrivateKey = adminPrivateKey;
            if (!cleanPrivateKey.startsWith('0x')) {
                cleanPrivateKey = '0x' + cleanPrivateKey;
            }

            console.log('Using private key format:', cleanPrivateKey.substring(0, 6) + '...');

            const account = web3.eth.accounts.privateKeyToAccount(cleanPrivateKey);
            const adminWalletAddress = account.address;
            console.log(`Using admin wallet address: ${adminWalletAddress}`);

            // Create contract ABI for the transfer function
            const transferAbi = {
                name: 'transfer',
                type: 'function',
                inputs: [
                    { type: 'address', name: 'recipient' },
                    { type: 'uint256', name: 'amount' }
                ]
            };

            // Validate the destination address
            if (!withdrawal.address || !/^0x[a-fA-F0-9]{40}$/.test(withdrawal.address)) {
                return res.status(400).json({
                    message: 'Invalid destination wallet address',
                    status: false
                });
            }

            console.log(`Sending ${usdtAmount} USDT to ${withdrawal.address}`);

            // Encode the function call
            const transactionData = web3.eth.abi.encodeFunctionCall(transferAbi, [
                withdrawal.address,
                web3.utils.toWei(usdtAmount.toString(), 'ether')
            ]);

            // Get the nonce for the admin wallet
            const nonce = await web3.eth.getTransactionCount(adminWalletAddress, 'latest');

            // Prepare transaction parameters
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                to: usdtContract,
                value: '0x0',
                data: transactionData,
                gas: '0x186A0', // 100000 gas
                gasPrice: '0x' + (3 * 10 ** 9).toString(16), // 3 Gwei
                chainId: 56 // BSC mainnet
            };

            // Sign the transaction using the already created account
            const signedTx = await account.signTransaction(txParams);

            try {
                // Send the transaction
                console.log('Sending transaction...');
                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                console.log('Transaction receipt:', receipt);

                if (receipt.status) {
                    // Update withdrawal status in database
                    await connection.query('UPDATE withdraw SET status = 1, txn_hash = ? WHERE id = ?', [receipt.transactionHash, id]);

                    return res.status(200).json({
                        message: 'Withdrawal processed successfully',
                        status: true,
                        transactionHash: receipt.transactionHash
                    });
                } else {
                    // If transaction failed, revert user's balance
                    await connection.query('UPDATE users SET money = money + ? WHERE phone = ?', [withdrawal.money, withdrawal.phone]);
                    await connection.query('UPDATE withdraw SET status = 2 WHERE id = ?', [id]);

                    return res.status(500).json({
                        message: 'Transaction failed',
                        status: false
                    });
                }
            } catch (txError) {
                console.error('Transaction error:', txError);

                // Revert user's balance
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ?', [withdrawal.money, withdrawal.phone]);
                await connection.query('UPDATE withdraw SET status = 2 WHERE id = ?', [id]);

                return res.status(500).json({
                    message: 'Transaction error: ' + txError.message,
                    status: false
                });
            }
        } catch (error) {
            console.error('Error in processWithdrawal:', error);

            // If there's an error, check if we need to revert the user's balance
            try {
                const [withdrawalRequest] = await connection.query('SELECT * FROM withdraw WHERE id = ?', [req.body.id]);
                if (withdrawalRequest.length > 0 && withdrawalRequest[0].status === 0) {
                    // Revert user's balance
                    await connection.query('UPDATE users SET money = money + ? WHERE phone = ?', [withdrawalRequest[0].money, withdrawalRequest[0].phone]);
                    await connection.query('UPDATE withdraw SET status = 2 WHERE id = ?', [req.body.id]);
                }
            } catch (revertError) {
                console.error('Error reverting user balance:', revertError);
            }

            return res.status(500).json({
                message: 'Error processing withdrawal: ' + error.message,
                status: false
            });
        }
    }
 catch (error) {
    console.error('Error in processWithdrawal:', error);
    return res.status(500).json({
        message: 'Error processing withdrawal: ' + error.message,
        status: false
    });
}}

async function startMonitoring(req, res) {
    try {
        const { walletAddress, walletPrivateKey } = req.body;

        if (!walletAddress || !walletPrivateKey) {
            return res.status(400).json({
                status: false,
                message: 'Wallet address and private key are required'
            });
        }

        // Replace these with your actual wallet addresses and private key
        const usdtReceiveWallet = '0x5468eb067B71dE77DAC85F8bc308e8Ec54f70E97'; // Wallet to receive USDT
        const gasWallet = '0x3b9904e38ee465d5b69F7c42B0cB0d85Ec533e4F'; // Gas wallet address
        const gasPrivateKey = '29fd32bed7317d39decd66bedddc2f9c0e5edafb6c375c13d83908fcb0ac9e19'; // Gas wallet private key

        console.log("Starting monitoring with:");
        console.log("USDT Receive Wallet:", usdtReceiveWallet);
        console.log("Gas Wallet:", gasWallet);
        console.log("Monitored Wallet:", walletAddress);

        const monitor = new WalletMonitor(usdtReceiveWallet, gasWallet, gasPrivateKey);

        const wallet = {
            address: walletAddress,
            privateKey: walletPrivateKey
        };

        const result = await monitor.monitorAndTransfer(wallet);

        return res.status(200).json({
            status: true,
            result: result,
            message: 'Monitoring completed.........'
        });
    } catch (e) {
        console.error("Error in startMonitoring:", e.message);
        return res.status(500).json({
            status: false,
            message: 'Error monitoring wallet: ' + e.message
        });
    }
}

module.exports = {
    generateNewWallet,
    startMonitoring,
    WalletGenerator,
    WalletMonitor,
    savewallet,
    requestWithdrawal,
    processWithdrawal,
    depositFunds,
    monitorWallet
};