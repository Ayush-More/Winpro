import connection from "../config/connectDB";

// Initialize timeNow, but we'll update it in each function to ensure it's current
let timeNow = Date.now();

// Helper function to get the current week number
const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Helper function to get next Monday's timestamp
const getNextMonday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If today is Sunday, next Monday is tomorrow
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.getTime();
};

// Get all active social campaigns
const getSocialCampaigns = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();
    let auth = req.cookies.auth;

    if (!auth) {
        return res.status(200).json({
            message: 'Authentication failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Get user information
        const [user] = await connection.query('SELECT id FROM users WHERE token = ?', [auth]);

        if (!user || user.length === 0) {
            return res.status(200).json({
                message: 'User not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        const userId = user[0].id;
        const currentWeek = getWeekNumber(timeNow);

        // Get all active campaigns
        const [campaigns] = await connection.query('SELECT * FROM social_campaigns WHERE status = 1 ORDER BY id DESC');

        // For each campaign, check if the user has already submitted for this week
        const availableCampaigns = [];

        for (const campaign of campaigns) {
            // Check if user has a submission for this campaign this week
            const [submissions] = await connection.query(
                `SELECT * FROM social_shares
                 WHERE user_id = ? AND campaign_id = ? AND week_number = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [userId, campaign.id, currentWeek]
            );

            if (submissions.length === 0) {
                // No submission this week, campaign is available
                availableCampaigns.push({
                    ...campaign,
                    available: true,
                    next_available_date: null,
                    message: "Available now"
                });
            } else {
                const submission = submissions[0];

                if (submission.status === 2) {
                    // Rejected submission, campaign is available again
                    availableCampaigns.push({
                        ...campaign,
                        available: true,
                        next_available_date: null,
                        message: "Resubmit (previous submission was rejected)"
                    });
                } else if (submission.status === 1) {
                    // Approved submission, campaign will be available next Monday
                    const nextMonday = getNextMonday();
                    availableCampaigns.push({
                        ...campaign,
                        available: false,
                        next_available_date: nextMonday,
                        message: "Completed for this week"
                    });
                } else {
                    // Pending submission
                    availableCampaigns.push({
                        ...campaign,
                        available: false,
                        next_available_date: null,
                        message: "Pending approval"
                    });
                }
            }
        }

        return res.status(200).json({
            message: 'Success',
            status: true,
            campaigns: availableCampaigns,
            current_week: currentWeek,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error fetching social campaigns:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Submit a social share
const submitSocialShare = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    let auth = req.cookies.auth;
    const { campaign_id, share_link } = req.body;

    if (!auth) {
        return res.status(200).json({
            message: 'Authentication failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    if (!campaign_id || !share_link) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Get user information
        const [user] = await connection.query('SELECT id, phone FROM users WHERE token = ?', [auth]);

        if (!user || user.length === 0) {
            return res.status(200).json({
                message: 'User not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        const userId = user[0].id;
        const phone = user[0].phone;
        const currentWeek = getWeekNumber(timeNow);

        // Check if campaign exists and is active
        const [campaign] = await connection.query('SELECT * FROM social_campaigns WHERE id = ? AND status = 1', [campaign_id]);

        if (!campaign || campaign.length === 0) {
            return res.status(200).json({
                message: 'Campaign not found or inactive',
                status: false,
                timeStamp: timeNow,
            });
        }

        // Check if user already submitted this campaign this week and it's not rejected
        const [existingShare] = await connection.query(
            `SELECT * FROM social_shares
             WHERE user_id = ? AND campaign_id = ? AND week_number = ? AND status != 2
             ORDER BY created_at DESC LIMIT 1`,
            [userId, campaign_id, currentWeek]
        );

        if (existingShare && existingShare.length > 0) {
            if (existingShare[0].status === 0) {
                return res.status(200).json({
                    message: 'You already have a pending submission for this campaign this week',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (existingShare[0].status === 1) {
                // Calculate next Monday
                const nextMonday = getNextMonday();

                return res.status(200).json({
                    message: 'You have already completed this campaign for this week. Next available on Monday.',
                    status: false,
                    next_available_date: nextMonday,
                    timeStamp: timeNow,
                });
            }
        }

        // Calculate next Monday for next_available_date
        const nextMonday = getNextMonday();

        // Insert the share with week number and next available date
        await connection.query(
            `INSERT INTO social_shares
             (user_id, phone, campaign_id, share_link, status, reward, created_at, updated_at, week_number, next_available_date)
             VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
            [userId, phone, campaign_id, share_link, timeNow, timeNow, currentWeek, nextMonday]
        );

        return res.status(200).json({
            message: 'Share submitted successfully. It will be reviewed by an admin.',
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error submitting social share:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Get user's social shares
const getUserSocialShares = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    let auth = req.cookies.auth;

    if (!auth) {
        return res.status(200).json({
            message: 'Authentication failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Get user information
        const [user] = await connection.query('SELECT id FROM users WHERE token = ?', [auth]);

        if (!user || user.length === 0) {
            return res.status(200).json({
                message: 'User not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        const userId = user[0].id;
        const currentWeek = getWeekNumber(timeNow);

        // Get user's shares with campaign information
        const [shares] = await connection.query(
            `SELECT s.*, c.title as campaign_title
             FROM social_shares s
             JOIN social_campaigns c ON s.campaign_id = c.id
             WHERE s.user_id = ?
             ORDER BY s.created_at DESC`,
            [userId]
        );

        // Format the shares with next available date information
        const formattedShares = shares.map(share => {
            const now = new Date().getTime();
            let nextAvailableText = "";

            if (share.status === 1 && share.next_available_date) {
                if (now < share.next_available_date) {
                    // Calculate days until next available
                    const daysUntil = Math.ceil((share.next_available_date - now) / (1000 * 60 * 60 * 24));
                    const nextDate = new Date(share.next_available_date);
                    nextAvailableText = `Next available on ${nextDate.toLocaleDateString()} (${daysUntil} days)`;
                } else {
                    nextAvailableText = "Available now";
                }
            }

            return {
                ...share,
                week_label: `Week ${share.week_number || 'Unknown'}`,
                next_available_text: nextAvailableText,
                is_current_week: share.week_number === currentWeek
            };
        });

        return res.status(200).json({
            message: 'Success',
            status: true,
            submissions: formattedShares,
            current_week: currentWeek,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error fetching user social shares:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Get pending social shares
const getPendingSocialShares = async (req, res) => {
    try {
        // Get pending shares with user and campaign information
        const [shares] = await connection.query(
            `SELECT s.*, u.name_user, u.phone, c.title as campaign_title, c.reward as campaign_reward
             FROM social_shares s
             JOIN users u ON s.user_id = u.id
             JOIN social_campaigns c ON s.campaign_id = c.id
             WHERE s.status = 0
             ORDER BY s.created_at ASC`
        );

        return res.status(200).json({
            message: 'Success',
            status: true,
            pendingShares: shares,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error fetching pending social shares:", error);
        return res.status(500).json({
            message: 'Server error',
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Approve or reject a social share
const reviewSocialShare = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    const { share_id, action } = req.body;

    if (!share_id || !action || (action !== 'approve' && action !== 'reject')) {
        return res.status(200).json({
            message: 'Missing or invalid parameters',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Get the share information
        const [share] = await connection.query('SELECT * FROM social_shares WHERE id = ?', [share_id]);

        if (!share || share.length === 0) {
            return res.status(200).json({
                message: 'Share not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (share[0].status !== 0) {
            return res.status(200).json({
                message: 'This share has already been reviewed',
                status: false,
                timeStamp: timeNow,
            });
        }

        if (action === 'approve') {
            // Get campaign reward
            const [campaign] = await connection.query('SELECT reward FROM social_campaigns WHERE id = ?', [share[0].campaign_id]);

            if (!campaign || campaign.length === 0) {
                return res.status(200).json({
                    message: 'Campaign not found',
                    status: false,
                    timeStamp: timeNow,
                });
            }

            const reward = campaign[0].reward;

            // Calculate next Monday for next_available_date
            const nextMonday = getNextMonday();

            // Update share status, reward, and next available date
            await connection.query(
                'UPDATE social_shares SET status = 1, reward = ?, updated_at = ?, next_available_date = ? WHERE id = ?',
                [reward, timeNow, nextMonday, share_id]
            );

            // Add reward to user's balance
            await connection.query(
                'UPDATE users SET money = money + ? WHERE id = ?',
                [reward, share[0].user_id]
            );

            return res.status(200).json({
                message: 'Share approved and reward added to user balance',
                status: true,
                timeStamp: timeNow,
            });
        } else {
            // Reject the share - set status to 2 (rejected) but don't set next_available_date
            // This allows the user to resubmit during the same week
            await connection.query(
                'UPDATE social_shares SET status = 2, updated_at = ? WHERE id = ?',
                [timeNow, share_id]
            );

            return res.status(200).json({
                message: 'Share rejected. User can resubmit during this week.',
                status: true,
                timeStamp: timeNow,
            });
        }
    } catch (error) {
        console.error("Error reviewing social share:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Add a new social campaign
const addSocialCampaign = async (req, res) => {
    const { title, description, share_url, reward } = req.body;

    if (!title || !description || !share_url || !reward) {
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Insert the new campaign
        await connection.query(
            'INSERT INTO social_campaigns (title, description, share_url, reward, status, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
            [title, description, share_url, reward, timeNow, timeNow]
        );

        return res.status(200).json({
            message: 'Campaign added successfully',
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error adding social campaign:", error);
        return res.status(500).json({
            message: 'Server error',
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Get campaign details for editing
const getCampaignDetails = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    const { campaign_id } = req.params;

    console.log("Getting campaign details for ID:", campaign_id);

    if (!campaign_id) {
        console.log("Missing campaign ID");
        return res.status(200).json({
            message: 'Missing campaign ID',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Get campaign details
        console.log("Executing query for campaign ID:", campaign_id);
        const [campaign] = await connection.query('SELECT * FROM social_campaigns WHERE id = ?', [campaign_id]);
        console.log("Query result:", campaign);

        if (!campaign || campaign.length === 0) {
            console.log("Campaign not found");
            return res.status(200).json({
                message: 'Campaign not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        console.log("Returning campaign details:", campaign[0]);
        return res.status(200).json({
            message: 'Success',
            status: true,
            campaign: campaign[0],
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error fetching campaign details:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Update an existing campaign
const updateCampaign = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    const { campaign_id, title, description, share_url, reward, status } = req.body;

    console.log("Updating campaign with ID:", campaign_id);

    if (!campaign_id || !title || !description || !share_url || !reward || status === undefined) {
        console.log("Missing required fields:", { campaign_id, title, description, share_url, reward, status });
        return res.status(200).json({
            message: 'Missing required fields',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Check if campaign exists
        console.log("Checking if campaign exists with ID:", campaign_id);
        const [existingCampaign] = await connection.query('SELECT * FROM social_campaigns WHERE id = ?', [campaign_id]);
        console.log("Existing campaign query result:", existingCampaign);

        if (!existingCampaign || existingCampaign.length === 0) {
            console.log("Campaign not found with ID:", campaign_id);
            return res.status(200).json({
                message: 'Campaign not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        // Update the campaign
        console.log("Updating campaign with data:", { title, description, share_url, reward, status, timeNow, campaign_id });
        await connection.query(
            'UPDATE social_campaigns SET title = ?, description = ?, share_url = ?, reward = ?, status = ?, updated_at = ? WHERE id = ?',
            [title, description, share_url, reward, status, timeNow, campaign_id]
        );
        console.log("Campaign updated successfully");

        return res.status(200).json({
            message: 'Campaign updated successfully',
            status: true,
            timeStamp: timeNow,
        });
    } catch (error) {
        console.error("Error updating campaign:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

// Admin: Delete a campaign
const deleteCampaign = async (req, res) => {
    // Update timeNow to get the current timestamp
    timeNow = Date.now();

    const { campaign_id } = req.body;

    console.log("Deleting campaign with ID:", campaign_id);

    if (!campaign_id) {
        console.log("Missing campaign ID");
        return res.status(200).json({
            message: 'Missing campaign ID',
            status: false,
            timeStamp: timeNow,
        });
    }

    try {
        // Check if campaign exists
        console.log("Checking if campaign exists with ID:", campaign_id);
        const [existingCampaign] = await connection.query('SELECT * FROM social_campaigns WHERE id = ?', [campaign_id]);
        console.log("Existing campaign query result:", existingCampaign);

        if (!existingCampaign || existingCampaign.length === 0) {
            console.log("Campaign not found with ID:", campaign_id);
            return res.status(200).json({
                message: 'Campaign not found',
                status: false,
                timeStamp: timeNow,
            });
        }

        // Check if there are any shares associated with this campaign
        console.log("Checking for associated shares with campaign ID:", campaign_id);
        const [shares] = await connection.query('SELECT COUNT(*) as count FROM social_shares WHERE campaign_id = ?', [campaign_id]);
        console.log("Associated shares count:", shares[0].count);

        if (shares[0].count > 0) {
            // If there are shares, just set the campaign status to inactive (0)
            console.log("Campaign has associated shares, deactivating instead of deleting");
            await connection.query(
                'UPDATE social_campaigns SET status = 0, updated_at = ? WHERE id = ?',
                [timeNow, campaign_id]
            );
            console.log("Campaign deactivated successfully");

            return res.status(200).json({
                message: 'Campaign has associated shares and cannot be deleted. It has been deactivated instead.',
                status: true,
                timeStamp: timeNow,
            });
        } else {
            // If no shares, delete the campaign
            console.log("No associated shares, deleting campaign");
            await connection.query('DELETE FROM social_campaigns WHERE id = ?', [campaign_id]);
            console.log("Campaign deleted successfully");

            return res.status(200).json({
                message: 'Campaign deleted successfully',
                status: true,
                timeStamp: timeNow,
            });
        }
    } catch (error) {
        console.error("Error deleting campaign:", error);
        return res.status(500).json({
            message: 'Server error: ' + error.message,
            status: false,
            timeStamp: timeNow,
        });
    }
};

module.exports = {
    getSocialCampaigns,
    submitSocialShare,
    getUserSocialShares,
    getPendingSocialShares,
    reviewSocialShare,
    addSocialCampaign,
    getCampaignDetails,
    updateCampaign,
    deleteCampaign
};
