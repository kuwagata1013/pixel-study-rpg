const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { OAuth2Client } = require('google-auth-library');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE,
                email TEXT UNIQUE,
                name TEXT,
                avatar TEXT,
                class_title TEXT DEFAULT '学者ローグ',
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                total_study_mins INTEGER DEFAULT 0,
                weekly_study_mins INTEGER DEFAULT 0,
                cert_count INTEGER DEFAULT 0,
                last_timer_start INTEGER,
                last_daily_checkin TEXT,
                run_start_date INTEGER,
                sound_enabled INTEGER DEFAULT 1,
                focus_duration_mins INTEGER DEFAULT 45,
                is_studying INTEGER DEFAULT 0,
                claimed_quests TEXT
            )
        `, (err) => {
            db.run(`ALTER TABLE users ADD COLUMN claimed_quests TEXT`, () => {});
        });

        // Focus Session Logs Table
        db.run(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                timestamp INTEGER,
                duration INTEGER,
                task TEXT,
                intensity TEXT,
                exp_gained INTEGER,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Reincarnation Records (Past Records) Table
        db.run(`
            CREATE TABLE IF NOT EXISTS past_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                level INTEGER,
                survival_days INTEGER,
                date TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Friends Table
        db.run(`
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                friend_user_id INTEGER,
                status TEXT, -- 'pending' or 'accepted'
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(friend_user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_user_id)
            )
        `);
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Express Session configuration
app.use(session({
    secret: 'pixel-study-rpg-neural-key-9988',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: false // Set to true if running on HTTPS
    }
}));

// Google Authentication
const client = new OAuth2Client();
async function verifyGoogleToken(token) {
    // Helper to support easy mock login testing locally
    if (token.startsWith('mock_token_')) {
        const username = token.replace('mock_token_', '');
        return {
            sub: 'mock_sub_' + username,
            email: username.toLowerCase() + '@example.com',
            name: username,
            picture: ''
        };
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token
        });
        return ticket.getPayload();
    } catch (err) {
        console.error('Error verifying Google ID token:', err);
        return null;
    }
}

// Authentication Middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: '認証が必要です。' });
    }
    next();
}

// --- API ROUTES ---

// 1. Google OAuth Authentication endpoint
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: '認証情報がありません。' });
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
        return res.status(401).json({ error: 'Google認証に失敗しました。' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const avatar = payload.picture;

    // Check if user exists in SQLite
    db.get('SELECT * FROM users WHERE google_id = ?', [googleId], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'データベースエラーが発生しました。' });
        }

        if (user) {
            // User exists, login
            req.session.userId = user.id;
            getUserFullProfile(user.id, res);
        } else {
            // Create new user
            db.run(
                `INSERT INTO users (google_id, email, name, avatar, run_start_date, last_timer_start) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [googleId, email, name, avatar, Date.now(), Date.now()],
                function(insertErr) {
                    if (insertErr) {
                        console.error(insertErr);
                        return res.status(500).json({ error: '新規ユーザー作成に失敗しました。' });
                    }
                    req.session.userId = this.lastID;
                    getUserFullProfile(this.lastID, res);
                }
            );
        }
    });
});

// Helper to fetch user data, logs, and past_records
function getUserFullProfile(userId, res) {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません。' });
        }

        // Fetch logs
        db.all('SELECT timestamp, duration, task, intensity, exp_gained FROM logs WHERE user_id = ? ORDER BY timestamp ASC', [userId], (logErr, logs) => {
            if (logErr) logs = [];

            // Fetch past reincarnation records
            db.all('SELECT level, survival_days, date FROM past_records WHERE user_id = ? ORDER BY id ASC', [userId], (recordErr, pastRecords) => {
                if (recordErr) pastRecords = [];

                res.json({
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        class_title: user.class_title,
                        level: user.level,
                        exp: user.exp,
                        streak_days: user.streak_days,
                        total_study_mins: user.total_study_mins,
                        weekly_study_mins: user.weekly_study_mins,
                        cert_count: user.cert_count,
                        last_timer_start: user.last_timer_start,
                        last_daily_checkin: user.last_daily_checkin,
                        run_start_date: user.run_start_date,
                        sound_enabled: user.sound_enabled === 1,
                        focus_duration_mins: user.focus_duration_mins,
                        is_studying: user.is_studying === 1,
                        claimed_quests: user.claimed_quests ? JSON.parse(user.claimed_quests) : { weekly: null, daily: null, streak: 0 }
                    },
                    logs: logs.map(l => ({
                        timestamp: l.timestamp,
                        duration: l.duration,
                        task: l.task,
                        intensity: l.intensity,
                        expGained: l.exp_gained
                    })),
                    pastRecords: pastRecords
                });
            });
        });
    });
}

// 2. Get profile for authenticated user
app.get('/api/user/profile', requireAuth, (req, res) => {
    getUserFullProfile(req.session.userId, res);
});

// 3. Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'ログアウトに失敗しました。' });
        }
        res.json({ success: true });
    });
});

// 4. Sync State to database
app.post('/api/user/sync', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const {
        class_title,
        level,
        exp,
        streak_days,
        total_study_mins,
        weekly_study_mins,
        cert_count,
        last_timer_start,
        last_daily_checkin,
        run_start_date,
        sound_enabled,
        focus_duration_mins,
        is_studying,
        claimed_quests,
        logs,
        pastRecords
    } = req.body;

    db.serialize(() => {
        // Begin Transaction equivalent in serial execution
        db.run(
            `UPDATE users SET 
                class_title = ?,
                level = ?,
                exp = ?,
                streak_days = ?,
                total_study_mins = ?,
                weekly_study_mins = ?,
                cert_count = ?,
                last_timer_start = ?,
                last_daily_checkin = ?,
                run_start_date = ?,
                sound_enabled = ?,
                focus_duration_mins = ?,
                is_studying = ?,
                claimed_quests = ?
             WHERE id = ?`,
            [
                class_title,
                level,
                exp,
                streak_days,
                total_study_mins,
                weekly_study_mins,
                cert_count,
                last_timer_start,
                last_daily_checkin,
                run_start_date,
                sound_enabled ? 1 : 0,
                focus_duration_mins,
                is_studying ? 1 : 0,
                claimed_quests ? JSON.stringify(claimed_quests) : null,
                userId
            ],
            (updateErr) => {
                if (updateErr) {
                    console.error('Failed to sync user state:', updateErr);
                    return res.status(500).json({ error: '同期エラーが発生しました。' });
                }

                // Sync Logs: delete and recreate for simplicity
                db.run('DELETE FROM logs WHERE user_id = ?', [userId], (delLogErr) => {
                    if (delLogErr) console.error(delLogErr);

                    if (logs && logs.length > 0) {
                        const stmt = db.prepare('INSERT INTO logs (user_id, timestamp, duration, task, intensity, exp_gained) VALUES (?, ?, ?, ?, ?, ?)');
                        logs.forEach(log => {
                            stmt.run([userId, log.timestamp, log.duration, log.task, log.intensity, log.expGained]);
                        });
                        stmt.finalize();
                    }

                    // Sync Past Records: delete and recreate
                    db.run('DELETE FROM past_records WHERE user_id = ?', [userId], (delRecErr) => {
                        if (delRecErr) console.error(delRecErr);

                        if (pastRecords && pastRecords.length > 0) {
                            const recordStmt = db.prepare('INSERT INTO past_records (user_id, level, survival_days, date) VALUES (?, ?, ?, ?)');
                            pastRecords.forEach(rec => {
                                recordStmt.run([userId, rec.level, rec.survivalDays, rec.date]);
                            });
                            recordStmt.finalize();
                        }

                        res.json({ success: true });
                    });
                });
            }
        );
    });
});

// 5. Search other users
app.get('/api/users/search', requireAuth, (req, res) => {
    const query = req.query.q;
    const userId = req.session.userId;
    if (!query) {
        return res.json([]);
    }

    db.all(
        'SELECT id, name, email, avatar FROM users WHERE id != ? AND (email LIKE ? OR name LIKE ?) LIMIT 10',
        [userId, `%${query}%`, `%${query}%`],
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: '検索エラーが発生しました。' });
            }
            res.json(rows);
        }
    );
});

// 6. Get friends list and pending requests
app.get('/api/friends', requireAuth, (req, res) => {
    const userId = req.session.userId;

    // Get accepted friends details
    const acceptedQuery = `
        SELECT u.id, u.name, u.email, u.avatar, u.class_title, u.level, u.streak_days, u.last_timer_start, u.is_studying
        FROM friends f
        JOIN users u ON f.friend_user_id = u.id
        WHERE f.user_id = ? AND f.status = 'accepted'
    `;

    db.all(acceptedQuery, [userId], (err, friends) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'フレンドデータ読み込みエラー' });
        }

        // Get received pending requests
        const receivedQuery = `
            SELECT u.id, u.name, u.email, u.avatar 
            FROM friends f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_user_id = ? AND f.status = 'pending'
        `;

        db.all(receivedQuery, [userId], (recErr, pendingReceived) => {
            if (recErr) pendingReceived = [];

            // Get sent pending requests
            const sentQuery = `
                SELECT u.id, u.name, u.email, u.avatar 
                FROM friends f
                JOIN users u ON f.friend_user_id = u.id
                WHERE f.user_id = ? AND f.status = 'pending'
            `;

            db.all(sentQuery, [userId], (sentErr, pendingSent) => {
                if (sentErr) pendingSent = [];

                res.json({
                    friends: friends.map(f => ({
                        id: f.id,
                        name: f.name,
                        email: f.email,
                        avatar: f.avatar,
                        class_title: f.class_title,
                        level: f.level,
                        streak_days: f.streak_days,
                        last_timer_start: f.last_timer_start,
                        is_studying: f.is_studying === 1
                    })),
                    pendingReceived: pendingReceived,
                    pendingSent: pendingSent
                });
            });
        });
    });
});

// 7. Send friend request
app.post('/api/friends/request', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { friendId } = req.body;

    if (!friendId || userId == friendId) {
        return res.status(400).json({ error: '無効なフレンドIDです。' });
    }

    // Insert pending request
    db.run(
        'INSERT OR IGNORE INTO friends (user_id, friend_user_id, status) VALUES (?, ?, ?)',
        [userId, friendId, 'pending'],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'フレンド申請に失敗しました。' });
            }
            res.json({ success: true });
        }
    );
});

// 8. Accept friend request
app.post('/api/friends/accept', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { friendId } = req.body;

    if (!friendId) {
        return res.status(400).json({ error: '無効なフレンドIDです。' });
    }

    db.serialize(() => {
        // Update original pending request to 'accepted'
        db.run(
            'UPDATE friends SET status = \'accepted\' WHERE user_id = ? AND friend_user_id = ?',
            [friendId, userId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: '承認エラーが発生しました。' });
                }

                // Insert reciprocal relationship
                db.run(
                    'INSERT OR REPLACE INTO friends (user_id, friend_user_id, status) VALUES (?, ?, ?)',
                    [userId, friendId, 'accepted'],
                    (recErr) => {
                        if (recErr) console.error(recErr);
                        res.json({ success: true });
                    }
                );
            }
        );
    });
});

// 9. Decline/Cancel friend request or remove friend
app.post('/api/friends/decline', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { friendId } = req.body;

    if (!friendId) {
        return res.status(400).json({ error: '無効なフレンドIDです。' });
    }

    db.run(
        `DELETE FROM friends 
         WHERE (user_id = ? AND friend_user_id = ?) 
            OR (user_id = ? AND friend_user_id = ?)`,
        [userId, friendId, friendId, userId],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'フレンド関係の削除に失敗しました。' });
            }
            res.json({ success: true });
        }
    );
});

// Route fallback for client-side routing, serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
