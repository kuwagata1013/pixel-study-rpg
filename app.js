// App State & Data
const STORAGE_KEY = 'pixel_study_rpg_data';
const WEEKLY_GOAL_MINS = 14 * 60;
const DEATH_LIMIT_MS = 24 * 60 * 60 * 1000;

let gameState = {
    exp: 0,
    level: 1,
    weeklyStudyMins: 0,
    totalStudyMins: 0,
    lastTimerStart: null,
    lastDailyCheckIn: null,
    streakDays: 0,
    certCount: 0,
    isStudying: false,
    currentSessionStart: null,
    runStartDate: Date.now(),
    pastRecords: [],
    weeklyResetDate: null,
    // Extensions
    classTitle: 'SCHOLAR ROGUE',
    soundEnabled: true,
    focusDurationMins: 45,
    logs: [],
    claimedQuests: { weekly: null, daily: null, streak: 0 }
};

// Available Tasks and Intensities
const TASKS = [
    'アルゴリズム学習.PRC',
    'UIデザイン修正.PRC',
    'システム保守.PRC',
    'メール整理.PRC'
];
let currentTaskIndex = 0;

const INTENSITIES = [
    '超集中',
    'システム分析',
    'システム保守'
];
let currentIntensityIndex = 0;

// Web Audio API Sound Generator
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSFX(type) {
    if (!gameState.soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
            
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'start') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.setValueAtTime(390, now + 0.08);
            osc.frequency.setValueAtTime(520, now + 0.16);
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'complete') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'fail') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(60, now + 0.4);
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'item') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.25);
            
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn('AudioContext not active:', e);
    }
}

// DOM Elements
const elPlayerLevel = document.getElementById('player-level');
const elSyncRate = document.getElementById('sync-rate');
const elClassTitle = document.getElementById('class-title');
const elExpFill = document.getElementById('exp-fill');
const elPlayerExp = document.getElementById('player-exp');
const elDeathTimer = document.getElementById('death-timer');

const elNavItems = document.querySelectorAll('.nav-item');
const elBtnToggleStudy = document.getElementById('btn-toggle-study');
const elBtnLogout = document.getElementById('btn-logout');

const elStudyTimer = document.getElementById('study-timer');
const elFocusStatusDot = document.getElementById('focus-status-dot');
const elFocusStatusText = document.getElementById('focus-status-text');
const elTaskIdentity = document.getElementById('task-identity');
const elTaskIntensity = document.getElementById('task-intensity');
const elMonitorLinkStatus = document.getElementById('monitor-link-status');
const elTelemetryRow1 = document.getElementById('telemetry-row-1');
const elTelemetryRow2 = document.getElementById('telemetry-row-2');
const elBgLayer = document.getElementById('bg-layer');
const elCharacterSprite = document.getElementById('character-sprite');

const elStreakCount = document.getElementById('streak-count');
const elStreakChart = document.getElementById('streak-chart');
const elTotalUptimeVal = document.getElementById('total-uptime-val');
const elUptimePercentage = document.getElementById('uptime-percentage');
const elUptimeSparkline = document.getElementById('uptime-sparkline');

const elAllocDeepPercent = document.getElementById('allocation-deep-percent');
const elAllocBarDeep = document.getElementById('alloc-bar-deep');
const elAllocAnalysisPercent = document.getElementById('allocation-analysis-percent');
const elAllocBarAnalysis = document.getElementById('alloc-bar-analysis');
const elAllocMaintPercent = document.getElementById('allocation-maint-percent');
const elAllocBarMaint = document.getElementById('alloc-bar-maint');

const elArchiveLogsTbody = document.getElementById('archive-logs-tbody');
const elBtnExportCSV = document.getElementById('btn-export-csv');

const elViewTimer = document.getElementById('view-timer');
const elViewQuests = document.getElementById('view-quests');
const elViewStats = document.getElementById('view-stats');
const elViewInventory = document.getElementById('view-inventory');
const elViewArchive = document.getElementById('view-archive');
const elViewSettings = document.getElementById('view-settings');

const elQuestsListContainer = document.getElementById('quests-list-container');
const elStatsExpandedContainer = document.getElementById('stats-expanded-container');

const elInventoryGrid = document.getElementById('inventory-grid');
const elInventorySidebar = document.getElementById('inventory-sidebar');
const elItemTitle = document.getElementById('item-title');
const elItemDescription = document.getElementById('item-description');
const elBtnUseItem = document.getElementById('btn-use-item');

const elFullHistoryTbody = document.getElementById('full-history-tbody');
const elRecordsList = document.getElementById('records-list');

const elSettingsUsername = document.getElementById('settings-username');
const elSettingsSFX = document.getElementById('settings-sfx');
const elBtnReincarnate = document.getElementById('btn-reincarnate');
const elBtnWipe = document.getElementById('btn-wipe');

const elModalGameOver = document.getElementById('modal-gameover');
const elDeathReason = document.getElementById('death-reason');
const elFinalLevel = document.getElementById('final-level');
const elSurvivalDays = document.getElementById('survival-days');
const elBtnRestart = document.getElementById('btn-restart');
const elGameMessage = document.getElementById('game-message');

// Authentication & Friends DOM Elements
const elAuthOverlay = document.getElementById('auth-overlay');
const elBtnGuestMode = document.getElementById('btn-guest-mode');
const elBtnMockLogin = document.getElementById('btn-mock-login');
const elMockUsernameInput = document.getElementById('mock-username-input');

const elViewFriends = document.getElementById('view-friends');
const elFriendSearchInput = document.getElementById('friend-search-input');
const elBtnFriendSearch = document.getElementById('btn-friend-search');
const elSearchResultsContainer = document.getElementById('search-results-container');
const elFriendRequestsReceived = document.getElementById('friend-requests-received');
const elFriendRequestsSent = document.getElementById('friend-requests-sent');
const elFriendsList = document.getElementById('friends-list');

const elBtnSignOut = document.getElementById('btn-signout');

let mainLoopId = null;
let telemetryTimerId = null;
let selectedItemIndex = null;
let syncTimeoutId = null;

// Initialization
function init() {
    // Bind authentication overlay triggers
    elBtnGuestMode.addEventListener('click', () => {
        gameState.authMode = 'offline';
        elAuthOverlay.classList.add('hidden');
        loadData();
        continueInit();
    });

    elBtnMockLogin.addEventListener('click', () => {
        const username = elMockUsernameInput.value.trim();
        if (!username) {
            alert('テスト用の名前を入力してください。');
            return;
        }
        performGoogleLogin('mock_token_' + username);
    });

    // Handle signout click
    elBtnSignOut.addEventListener('click', () => {
        playSFX('fail');
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            });
    });

    // Check if session already exists
    fetch('/api/user/profile')
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('Not logged in');
        })
        .then(data => {
            gameState.authMode = 'online';
            elAuthOverlay.classList.add('hidden');
            applySyncedData(data);
            continueInit();
        })
        .catch(() => {
            elAuthOverlay.classList.remove('hidden');
            initGoogleAuth();
        });
}

function continueInit() {
    checkWeeklyReset();
    
    // Bind Tab Switching Navigation
    elNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Setup interactive task/intensity togglers
    elTaskIdentity.addEventListener('click', () => {
        if (gameState.isStudying) return; // Prevent change mid-session
        playSFX('click');
        currentTaskIndex = (currentTaskIndex + 1) % TASKS.length;
        elTaskIdentity.innerText = TASKS[currentTaskIndex];
    });

    elTaskIntensity.addEventListener('click', () => {
        if (gameState.isStudying) return;
        playSFX('click');
        currentIntensityIndex = (currentIntensityIndex + 1) % INTENSITIES.length;
        elTaskIntensity.innerText = INTENSITIES[currentIntensityIndex];
        elTaskIntensity.className = 'meta-value interactive-select';
        if (currentIntensityIndex === 0) elTaskIntensity.classList.add('highlighted');
    });

    // Make clock clickable in idle mode to adjust duration
    elStudyTimer.addEventListener('click', () => {
        if (gameState.isStudying) return;
        playSFX('click');
        const nextDurations = { 15: 25, 25: 45, 45: 60, 60: 15 };
        gameState.focusDurationMins = nextDurations[gameState.focusDurationMins] || 45;
        saveData();
        updateUI();
        showMessage(`集中目標時間を ${gameState.focusDurationMins} 分に更新しました。`);
    });

    // Setup settings selectors
    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.addEventListener('click', () => {
            playSFX('click');
            document.querySelectorAll('.btn-duration').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.focusDurationMins = parseInt(btn.getAttribute('data-mins'), 10);
            saveData();
            updateUI();
        });
    });

    elSettingsUsername.addEventListener('input', (e) => {
        gameState.classTitle = e.target.value.trim() || '学者ローグ';
        elClassTitle.innerText = gameState.classTitle;
        saveData();
    });

    elSettingsSFX.addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
        saveData();
        playSFX('click');
    });

    // Resume session if it was active
    if (gameState.isStudying && gameState.currentSessionStart) {
        startVisuals();
    } else {
        stopVisuals();
    }
    
    updateUI();
    
    // Start main game loop (updates clock countdown and stability timer)
    if (mainLoopId) clearInterval(mainLoopId);
    mainLoopId = setInterval(gameLoop, 1000);
    
    // Start CRT telemetry diagnostic text flicker loop
    if (telemetryTimerId) clearInterval(telemetryTimerId);
    telemetryTimerId = setInterval(updateTelemetryText, 3000);
    updateTelemetryText();

    // Core Event Listeners
    elBtnToggleStudy.addEventListener('click', toggleStudy);
    elBtnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        playSFX('fail');
        showMessage('ログアウトアクセス拒否。キーカード認証プロトコルが必要です。');
    });
    elBtnExportCSV.addEventListener('click', exportLogsToCSV);
    elBtnUseItem.addEventListener('click', useCertificate);
    elBtnReincarnate.addEventListener('click', () => {
        playSFX('fail');
        if (confirm('ニューラルコアを強制崩壊させますか？現在の世代のランは終了します。')) {
            die('手動によるニューラルコア崩壊シーケンスが承認されました。');
            switchTab('timer');
        }
    });
    elBtnWipe.addEventListener('click', () => {
        playSFX('fail');
        if (confirm('警告: 全てのシステムデータベース（過去の転生記録を含む）を完全に消去します。この操作は取り消せません。')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });
    elBtnRestart.addEventListener('click', reincarnate);

    // Setup friends search listener
    elBtnFriendSearch.addEventListener('click', searchFriends);
}

// Tab switcher
function switchTab(tabName) {
    playSFX('click');
    
    // Update active nav button
    elNavItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Hide all views
    elViewTimer.classList.add('hidden');
    elViewQuests.classList.add('hidden');
    elViewStats.classList.add('hidden');
    elViewFriends.classList.add('hidden');
    elViewInventory.classList.add('hidden');
    elViewArchive.classList.add('hidden');
    elViewSettings.classList.add('hidden');

    // Show selected view
    if (tabName === 'timer') elViewTimer.classList.remove('hidden');
    else if (tabName === 'quests') { elViewQuests.classList.remove('hidden'); renderQuests(); }
    else if (tabName === 'stats') { elViewStats.classList.remove('hidden'); renderStatsExpanded(); }
    else if (tabName === 'friends') { elViewFriends.classList.remove('hidden'); loadFriendsList(); }
    else if (tabName === 'inventory') { elViewInventory.classList.remove('hidden'); renderInventory(); updateInventorySidebar(); }
    else if (tabName === 'archive') { elViewArchive.classList.remove('hidden'); renderArchiveTab(); }
    else if (tabName === 'settings') { elViewSettings.classList.remove('hidden'); loadSettingsPanel(); }
}

// Data Management
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        gameState = { ...gameState, ...JSON.parse(data) };
        // Ensure arrays and strings exist
        if (!gameState.logs) gameState.logs = [];
        if (!gameState.pastRecords) gameState.pastRecords = [];
        if (!gameState.classTitle) gameState.classTitle = '学者ローグ';
        if (gameState.soundEnabled === undefined) gameState.soundEnabled = true;
        if (!gameState.focusDurationMins) gameState.focusDurationMins = 45;
        if (!gameState.claimedQuests) gameState.claimedQuests = { weekly: null, daily: null, streak: 0 };
    } else {
        // First time initialization
        gameState.lastTimerStart = Date.now();
        gameState.runStartDate = Date.now();
        setNextWeeklyReset();
        
        // Seed logs so it matches the beautiful reference mockup
        const dayMs = 24 * 60 * 60 * 1000;
        gameState.logs = [
            { timestamp: Date.now() - dayMs, duration: 45, task: 'アルゴリズム学習', intensity: '超集中', expGained: 150 },
            { timestamp: Date.now() - 2 * dayMs, duration: 120, task: 'UIデザイン修正', intensity: 'システム分析', expGained: 400 },
            { timestamp: Date.now() - 2 * dayMs, duration: 30, task: 'メール整理', intensity: 'システム保守', expGained: 50 }
        ];
        gameState.totalStudyMins = 195;
        gameState.streakDays = 15; // Start with streak of 15 Solar Cycles as shown in image
        gameState.level = 24; // Start at Level 24 to match mockup profile
        gameState.exp = 53500; // EXP that places them in Level 24
        
        saveData();
    }
    
    // Set indexes to match loaded choices if possible
    currentTaskIndex = 0;
    currentIntensityIndex = 0;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    syncStateToServer();
}

// Time Utilities
function getNextSundayMidnight() {
    const now = new Date();
    const result = new Date(now);
    result.setHours(0, 0, 0, 0);
    const daysUntilNextSunday = 7 - now.getDay();
    result.setDate(result.getDate() + (daysUntilNextSunday === 0 ? 7 : daysUntilNextSunday));
    return result.getTime();
}

function setNextWeeklyReset() {
    gameState.weeklyResetDate = getNextSundayMidnight();
}

function formatTimeDiff(ms) {
    if (ms < 0) ms = 0;
    const totalSecs = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const s = String(totalSecs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function formatMinSec(ms) {
    if (ms < 0) ms = 0;
    const totalSecs = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const s = String(totalSecs % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// Game Core Loop
function gameLoop() {
    const now = Date.now();
    
    // 1. Update active focus timer
    if (gameState.isStudying && gameState.currentSessionStart) {
        const elapsedMs = now - gameState.currentSessionStart;
        const targetMs = gameState.focusDurationMins * 60 * 1000;
        const remainingMs = targetMs - elapsedMs;
        
        if (remainingMs <= 0) {
            completeFocusSession();
            return;
        }
        elStudyTimer.innerText = formatMinSec(remainingMs);
    }

    // 2. Weekly Reset Check
    checkWeeklyReset();

    // 3. System Vital Stability Timer (Death Condition)
    if (gameState.lastTimerStart) {
        if (gameState.isStudying) {
            // Keep death timer fully extended during active focus study
            gameState.lastTimerStart = now;
        }
        
        const msSinceLastStart = now - gameState.lastTimerStart;
        const msRemaining = DEATH_LIMIT_MS - msSinceLastStart;
        
        if (msRemaining <= 0) {
            die('You failed to initiate cognitive study focus within 24 hours. Vital system synchronization collapsed.');
            return;
        } else {
            // Calculate Sync Rate Percentage
            const syncPercent = Math.max(0, Math.min(100, Math.floor((msRemaining / DEATH_LIMIT_MS) * 100)));
            elSyncRate.innerText = `${syncPercent}%`;
            elDeathTimer.innerText = formatTimeDiff(msRemaining);
            
            // Adjust warning colors on profile & countdown timer
            if (syncPercent < 10) {
                elDeathTimer.style.color = 'var(--color-red)';
                elDeathTimer.style.animation = 'flashRed 0.5s infinite alternate';
                elSyncRate.style.color = 'var(--color-red)';
            } else if (syncPercent < 25) {
                elDeathTimer.style.color = 'var(--text-gold)';
                elDeathTimer.style.animation = 'none';
                elSyncRate.style.color = 'var(--text-gold)';
            } else {
                elDeathTimer.style.color = 'var(--text-cyan)';
                elDeathTimer.style.animation = 'none';
                elSyncRate.style.color = 'var(--text-cyan)';
            }
        }
    }
}

function checkWeeklyReset() {
    const now = Date.now();
    if (gameState.weeklyResetDate && now >= gameState.weeklyResetDate) {
        if (gameState.weeklyStudyMins < WEEKLY_GOAL_MINS) {
            die('週の学習目標ノルマを達成できませんでした。集中不足によりコアが崩壊しました。');
        } else {
            gameState.weeklyStudyMins = 0;
            setNextWeeklyReset();
            saveData();
            showMessage('週間目標達成。バイタル安定データベースが再調整されました。');
        }
    }
}

// Focus Session Management
function toggleStudy() {
    const now = Date.now();
    if (gameState.isStudying) {
        // TERMINATE EARLY
        const elapsedMs = now - gameState.currentSessionStart;
        const elapsedMins = Math.floor(elapsedMs / 60000);
        
        if (elapsedMins >= 1) {
            if (confirm(`セッションを早期終了し、これまでに完了した ${elapsedMins} 分間の集中を記録しますか？`)) {
                saveFocusSession(elapsedMins);
            }
        } else {
            if (confirm('セッションを終了しますか？1分未満のセッションは記録されません。')) {
                playSFX('fail');
                gameState.isStudying = false;
                gameState.currentSessionStart = null;
                stopVisuals();
                updateUI();
                showMessage('セッションが強制終了されました。データは破棄されました。');
            }
        }
    } else {
        // INITIATE STUDY
        gameState.isStudying = true;
        gameState.currentSessionStart = now;
        gameState.lastTimerStart = now; // Instantly push survival timer
        playSFX('start');
        startVisuals();
        updateUI();
        showMessage(`ニューラルコアフォーカス開始: ${TASKS[currentTaskIndex]} // ${INTENSITIES[currentIntensityIndex]}`);
    }
    saveData();
}

function completeFocusSession() {
    saveFocusSession(gameState.focusDurationMins);
}

function saveFocusSession(mins) {
    const expGained = mins * 10;
    addExp(expGained);
    
    gameState.weeklyStudyMins += mins;
    gameState.totalStudyMins += mins;
    
    // Check daily streak (requires at least 15 min session)
    if (mins >= 15) {
        updateStreak();
    }
    
    // Register log
    const taskName = TASKS[currentTaskIndex].replace('.PRC', '');
    gameState.logs.push({
        timestamp: Date.now(),
        duration: mins,
        task: taskName,
        intensity: INTENSITIES[currentIntensityIndex],
        expGained: expGained
    });
    
    // Reset state
    gameState.isStudying = false;
    gameState.currentSessionStart = null;
    gameState.lastTimerStart = Date.now(); // Fully reset desync countdown
    
    playSFX('complete');
    stopVisuals();
    saveData();
    updateUI();
    
    showMessage(`セッション記録完了: +${expGained} EXP // 集中時間 ${mins}分`);
}

function updateStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (gameState.lastDailyCheckIn !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (gameState.lastDailyCheckIn === yesterdayStr) {
            gameState.streakDays++;
        } else {
            // Streak broken or brand new
            gameState.streakDays = 1;
        }
        
        gameState.lastDailyCheckIn = todayStr;
        
        // Certificate reward is now manually claimed via Quests tab

    }
}

function useCertificate() {
    if (gameState.certCount > 0) {
        playSFX('item');
        gameState.certCount--;
        gameState.lastTimerStart = Date.now(); // Reset death timer to full 24h
        selectedItemIndex = null;
        saveData();
        renderInventory();
        updateInventorySidebar();
        updateUI();
        showMessage('怠惰回避証明書を使用: バイタル安定度が24時間延長されました。');
    } else {
        playSFX('fail');
        alert('インベントリに証明書がありません。');
    }
}

function addExp(amount) {
    if (amount <= 0) return;
    gameState.exp += amount;
    
    // Level formula: Level = Math.floor(Math.sqrt(totalEXP / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(gameState.exp / 100)) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        showMessage(`レベルアップ！コア安定度ランクが LV ${gameState.level} に上昇しました！`);
    }
}

function die(reason) {
    clearInterval(mainLoopId);
    playSFX('fail');
    stopVisuals();
    
    // Calculate survival days
    const survivalMs = Date.now() - gameState.runStartDate;
    const survivalDays = Math.floor(survivalMs / (1000 * 60 * 60 * 24));
    
    // Append to past records list
    gameState.pastRecords.push({
        level: gameState.level,
        survivalDays: survivalDays,
        date: new Date().toLocaleDateString()
    });
    
    // Print GameOver Stats
    elDeathReason.innerText = reason;
    elFinalLevel.innerText = gameState.level;
    elSurvivalDays.innerText = survivalDays;
    elModalGameOver.classList.remove('hidden');
    
    // Reset core active data, but keep past logs & legacy achievements & sound state
    gameState.exp = 0;
    gameState.level = 1;
    gameState.weeklyStudyMins = 0;
    gameState.lastTimerStart = null;
    gameState.streakDays = 0;
    gameState.isStudying = false;
    gameState.currentSessionStart = null;
    
    saveData();
}

function reincarnate() {
    playSFX('start');
    gameState.runStartDate = Date.now();
    gameState.lastTimerStart = Date.now();
    setNextWeeklyReset();
    saveData();
    elModalGameOver.classList.add('hidden');
    
    // Re-trigger loop
    mainLoopId = setInterval(gameLoop, 1000);
    updateUI();
    switchTab('timer');
}

// Telemetry visual logic
function updateTelemetryText() {
    if (!elTelemetryRow1 || !elTelemetryRow2) return;
    
    if (gameState.isStudying) {
        const heart = Math.floor(70 + Math.random() * 25);
        const bpm = Math.floor(10 + Math.random() * 80) / 10;
        elTelemetryRow1.innerText = `リンク: 接続中 // CPU: ${bpm}Hz // NET: 98.9%`;
        elTelemetryRow2.innerText = `同期中... 脈拍: ${heart}BPM // 神経状態: 集中中`;
    } else {
        elTelemetryRow1.innerText = `リンク: スタンバイ // CPU: 0.12Hz // NET: スリープ`;
        elTelemetryRow2.innerText = `アイドル状態 // 脈拍: --- // 神経状態: スリープ`;
    }
}

function startVisuals() {
    elCharacterSprite.src = 'assets/character.png';
    elCharacterSprite.classList.add('walking');
    if (elCharacterSprite.parentElement) {
        elCharacterSprite.parentElement.classList.add('walking');
    }
    elBgLayer.classList.add('scrolling');
    
    elFocusStatusDot.classList.add('active');
    elFocusStatusText.innerText = 'コアフォーカス：アクティブ';
    elMonitorLinkStatus.innerText = 'オンライン';
    elMonitorLinkStatus.className = 'monitor-status online';
}

function stopVisuals() {
    elCharacterSprite.src = 'assets/character.png';
    elCharacterSprite.classList.remove('walking');
    if (elCharacterSprite.parentElement) {
        elCharacterSprite.parentElement.classList.remove('walking');
    }
    elBgLayer.classList.remove('scrolling');
    
    elFocusStatusDot.classList.remove('active');
    elFocusStatusText.innerText = 'コアフォーカス：待機中';
    elMonitorLinkStatus.innerText = 'オフライン';
    elMonitorLinkStatus.className = 'monitor-status';
}

function showMessage(msg) {
    elGameMessage.innerText = msg;
    elGameMessage.classList.remove('hidden');
    
    // Force a CSS reflow to re-trigger slide animations
    elGameMessage.style.animation = 'none';
    elGameMessage.offsetHeight;
    elGameMessage.style.animation = null;
}

// Dynamic UI Renderers
function updateUI() {
    // Left profile rendering
    elPlayerLevel.innerText = `LV ${gameState.level}`;
    elClassTitle.innerText = gameState.classTitle;
    
    if (gameState.authMode === 'online' && gameState.avatar) {
        const elPlayerAvatar = document.getElementById('player-avatar');
        if (elPlayerAvatar) elPlayerAvatar.src = gameState.avatar;
    }
    
    // Calculate Exp progress range
    const currentLvlExp = Math.pow(gameState.level - 1, 2) * 100;
    const nextLvlExp = Math.pow(gameState.level, 2) * 100;
    const expRange = nextLvlExp - currentLvlExp;
    const expProgress = gameState.exp - currentLvlExp;
    const expPercent = Math.min(100, Math.max(0, (expProgress / expRange) * 100));
    elExpFill.style.width = `${expPercent}%`;
    elPlayerExp.innerText = `EXP: ${gameState.exp - currentLvlExp} / ${expRange}`;

    // Timer clock face (if not studying)
    if (!gameState.isStudying) {
        elStudyTimer.innerText = `${String(gameState.focusDurationMins).padStart(2, '0')}:00`;
    }

    // Toggle Study button text
    if (gameState.isStudying) {
        elBtnToggleStudy.innerText = 'セッション終了';
        elBtnToggleStudy.style.background = 'var(--color-red)';
        elBtnToggleStudy.style.color = '#fff';
    } else {
        elBtnToggleStudy.innerText = 'セッション開始';
        elBtnToggleStudy.style.background = 'var(--text-gold)';
        elBtnToggleStudy.style.color = 'var(--bg-primary)';
    }

    // Command Center values
    elStreakCount.innerText = gameState.streakDays;
    
    const uptimeHrs = (gameState.totalStudyMins / 60).toFixed(1);
    elTotalUptimeVal.innerText = `${uptimeHrs}h`;
    
    // Calculate sync rate increase
    const percentSyncRate = Math.min(100, Math.round((gameState.weeklyStudyMins / WEEKLY_GOAL_MINS) * 100));
    elUptimePercentage.innerText = `+${percentSyncRate}% WEEKLY GOAL`;

    // Tasks cycle displays
    elTaskIdentity.innerText = TASKS[currentTaskIndex];
    elTaskIntensity.innerText = INTENSITIES[currentIntensityIndex];
    elTaskIntensity.className = 'meta-value interactive-select';
    if (currentIntensityIndex === 0) elTaskIntensity.classList.add('highlighted');

    // Render Bottom charts
    renderStreakChart();
    renderUptimeSparkline();
    renderDataAllocation();
    renderArchiveLogs();
}

function renderStreakChart() {
    if (!elStreakChart) return;
    elStreakChart.innerHTML = '';
    
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    now.setHours(0,0,0,0);
    const startOfToday = now.getTime();
    
    // Compute study durations for the last 7 days
    const dailyMins = Array(7).fill(0);
    gameState.logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0,0,0,0);
        const daysAgo = Math.floor((startOfToday - logDate.getTime()) / dayMs);
        if (daysAgo >= 0 && daysAgo < 7) {
            dailyMins[6 - daysAgo] += log.duration;
        }
    });
    
    const maxMins = Math.max(30, ...dailyMins);
    
    // Append divs
    for (let i = 0; i < 7; i++) {
        const mins = dailyMins[i];
        const barHeightPercent = Math.min(100, Math.max(12, (mins / maxMins) * 100));
        
        const bar = document.createElement('div');
        bar.className = 'streak-bar';
        if (mins > 0) bar.className += ' active';
        if (i === 6) bar.className += ' current';
        bar.style.height = `${barHeightPercent}%`;
        bar.title = `${mins}m focus session`;
        elStreakChart.appendChild(bar);
    }
}

function renderUptimeSparkline() {
    if (!elUptimeSparkline) return;
    elUptimeSparkline.innerHTML = '';
    
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    now.setHours(0,0,0,0);
    const startOfToday = now.getTime();
    
    const dailyMins = Array(7).fill(0);
    gameState.logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0,0,0,0);
        const daysAgo = Math.floor((startOfToday - logDate.getTime()) / dayMs);
        if (daysAgo >= 0 && daysAgo < 7) {
            dailyMins[6 - daysAgo] += log.duration;
        }
    });
    
    const maxVal = Math.max(30, ...dailyMins);
    const width = elUptimeSparkline.clientWidth || 180;
    const height = 35;
    
    const points = dailyMins.map((mins, index) => {
        const x = (index / 6) * width;
        const y = height - (mins / maxVal) * (height - 6) - 3;
        return `${x},${y}`;
    }).join(' ');
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#00d2ff');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('points', points);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    svg.appendChild(path);
    
    // Draw dots
    dailyMins.forEach((mins, index) => {
        const x = (index / 6) * width;
        const y = height - (mins / maxVal) * (height - 6) - 3;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '2.5');
        circle.setAttribute('fill', index === 6 ? '#ffffff' : '#00d2ff');
        svg.appendChild(circle);
    });
    
    elUptimeSparkline.appendChild(svg);
}

function renderDataAllocation() {
    let deepMins = 0, analysisMins = 0, maintMins = 0;
    
    gameState.logs.forEach(log => {
        if (log.intensity === 'DEEP_WORK' || log.intensity === '超集中') deepMins += log.duration;
        else if (log.intensity === 'ANALYSIS' || log.intensity === 'システム分析') analysisMins += log.duration;
        else if (log.intensity === 'SYSTEM_MAINT' || log.intensity === 'システム保守') maintMins += log.duration;
    });
    
    const totalAllocated = deepMins + analysisMins + maintMins || 1;
    
    const deepP = Math.round((deepMins / totalAllocated) * 100);
    const analysisP = Math.round((analysisMins / totalAllocated) * 100);
    const maintP = Math.round((maintMins / totalAllocated) * 100);
    
    elAllocDeepPercent.innerText = `${deepP}%`;
    elAllocBarDeep.style.width = `${deepP}%`;
    
    elAllocAnalysisPercent.innerText = `${analysisP}%`;
    elAllocBarAnalysis.style.width = `${analysisP}%`;
    
    elAllocMaintPercent.innerText = `${maintP}%`;
    elAllocBarMaint.style.width = `${maintP}%`;
}

function renderArchiveLogs() {
    if (!elArchiveLogsTbody) return;
    elArchiveLogsTbody.innerHTML = '';
    
    // Display the last 3 logs on dashboard timer view
    const latestLogs = [...gameState.logs].reverse().slice(0, 3);
    
    if (latestLogs.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" style="text-align:center; color:var(--text-muted);">フォーカス履歴はありません</td>`;
        elArchiveLogsTbody.appendChild(tr);
        return;
    }
    
    latestLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        
        const tr = document.createElement('tr');
        
        let typeClass = 'maint-type';
        if (log.intensity === 'DEEP_WORK' || log.intensity === '超集中') typeClass = 'deep-type';
        else if (log.intensity === 'ANALYSIS' || log.intensity === 'システム分析') typeClass = 'analysis-type';
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>
                <div>${log.task}</div>
                <div style="font-size:8px; color:var(--text-muted); margin-top:2px;">集中 ${log.duration}分 // ${log.intensity}</div>
            </td>
            <td class="${typeClass}">+${log.expGained}</td>
        `;
        elArchiveLogsTbody.appendChild(tr);
    });
}

// Sub-Tab Renderers
function renderQuests() {
    if (!elQuestsListContainer) return;
    elQuestsListContainer.innerHTML = '';
    
    // Quest 1: Weekly Stability Goal
    const weeklyMinsGoal = 14 * 60;
    const weeklyPercent = Math.min(100, Math.floor((gameState.weeklyStudyMins / weeklyMinsGoal) * 100));
    const weeklyHrs = (gameState.weeklyStudyMins / 60).toFixed(1);
    const isCompletedWeekly = gameState.weeklyStudyMins >= weeklyMinsGoal;
    const isClaimedWeekly = gameState.claimedQuests.weekly === gameState.weeklyResetDate;
    
    const quest1 = createQuestNode(
        '継続的な稼働時間の確保',
        'weekly',
        '今週は最低14時間学習し、バイタルコアの同期を維持してください。',
        weeklyPercent,
        `${weeklyHrs}時間 / 14時間`,
        '+500 EXP',
        isCompletedWeekly,
        isClaimedWeekly,
        () => {
            addExp(500);
            gameState.claimedQuests.weekly = gameState.weeklyResetDate;
            saveData();
            renderQuests();
            updateUI();
        }
    );
    elQuestsListContainer.appendChild(quest1);
    
    // Quest 2: Daily Focus Checkin
    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = gameState.logs.some(log => {
        return new Date(log.timestamp).toISOString().split('T')[0] === todayStr;
    });
    const isClaimedDaily = gameState.claimedQuests.daily === todayStr;
    const quest2 = createQuestNode(
        '毎日のニューラル調整',
        'daily',
        '本日中に最低1回フォーカスセッションを開始し、完了させてください。',
        completedToday ? 100 : 0,
        completedToday ? '1 / 1' : '0 / 1',
        '+100 EXP',
        completedToday,
        isClaimedDaily,
        () => {
            addExp(100);
            gameState.claimedQuests.daily = todayStr;
            saveData();
            renderQuests();
            updateUI();
        }
    );
    elQuestsListContainer.appendChild(quest2);
    
    // Quest 3: Streak Challenge
    const nextMilestone = Math.ceil((gameState.streakDays + 1) / 7) * 7 || 7;
    const currentMilestoneBase = nextMilestone - 7;
    const streakProgress = gameState.streakDays - currentMilestoneBase;
    const streakPercent = Math.floor((streakProgress / 7) * 100);
    
    const completedMilestone = Math.floor(gameState.streakDays / 7) * 7;
    const isCompletedStreak = completedMilestone > 0 && completedMilestone > gameState.claimedQuests.streak;
    
    const displayMilestone = isCompletedStreak ? completedMilestone : nextMilestone;
    const displayProgress = isCompletedStreak ? 7 : streakProgress;
    const displayPercent = isCompletedStreak ? 100 : streakPercent;
    
    const quest3 = createQuestNode(
        '継続稼働ストリーク',
        'streak',
        '毎日学習を継続してください。7日ごとに「怠惰回避証明書」を獲得します。',
        displayPercent,
        `${displayProgress} / 7 サイクル (累計${gameState.streakDays})`,
        '怠惰回避証明書 x1',
        isCompletedStreak,
        false,
        () => {
            gameState.certCount++;
            gameState.claimedQuests.streak = completedMilestone;
            showMessage('獲得: 怠惰回避証明書 x1 // システム維持時間を延長できます');
            saveData();
            renderQuests();
            renderInventory();
            updateUI();
        }
    );
    elQuestsListContainer.appendChild(quest3);
}

function createQuestNode(title, type, description, progressPercent, progressText, rewardText, isCompleted, isClaimed, onClaim) {
    const item = document.createElement('div');
    item.className = 'quest-item';
    
    const details = document.createElement('div');
    details.className = 'quest-details';
    
    const header = document.createElement('div');
    header.className = 'quest-header';
    
    const label = document.createElement('span');
    label.className = 'quest-label';
    label.innerText = title;
    
    const tag = document.createElement('span');
    tag.className = 'quest-type-tag';
    tag.innerText = type === 'weekly' ? '週間' : type === 'daily' ? 'デイリー' : '継続';
    
    header.appendChild(label);
    header.appendChild(tag);
    
    const desc = document.createElement('div');
    desc.className = 'quest-desc';
    desc.innerText = description;
    
    const progressRow = document.createElement('div');
    progressRow.className = 'quest-progress-row';
    
    const barBg = document.createElement('div');
    barBg.className = 'quest-bar-bg';
    
    const barFill = document.createElement('div');
    barFill.className = 'quest-bar-fill';
    barFill.style.width = `${progressPercent}%`;
    
    barBg.appendChild(barFill);
    
    const progressTxt = document.createElement('span');
    progressTxt.className = 'quest-progress-txt';
    progressTxt.innerText = progressText;
    
    progressRow.appendChild(barBg);
    progressRow.appendChild(progressTxt);
    
    details.appendChild(header);
    details.appendChild(desc);
    details.appendChild(progressRow);
    
    const status = document.createElement('div');
    status.className = 'quest-status';
    
    const reward = document.createElement('div');
    reward.className = 'quest-reward';
    reward.innerHTML = `<div>報酬</div><div>${rewardText}</div>`;
    
    const statusBtn = document.createElement('button');
    statusBtn.className = 'quest-status-btn';
    if (isClaimed) {
        statusBtn.classList.add('completed');
        statusBtn.innerText = '達成済';
        statusBtn.disabled = true;
    } else if (isCompleted) {
        statusBtn.classList.add('claimable');
        statusBtn.innerText = '受け取る';
        statusBtn.addEventListener('click', () => {
            playSFX('item');
            if(onClaim) onClaim();
        });
    } else {
        statusBtn.classList.add('active');
        statusBtn.innerText = '進行中';
        statusBtn.disabled = true;
    }
    
    status.appendChild(reward);
    status.appendChild(statusBtn);
    
    item.appendChild(details);
    item.appendChild(status);
    
    return item;
}

function renderInventory() {
    if (!elInventoryGrid) return;
    elInventoryGrid.innerHTML = '';
    
    // 3x4 slots grid (12 slots)
    for (let i = 0; i < 12; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        
        if (i === 0 && gameState.certCount > 0) {
            slot.className += ' occupied';
            if (selectedItemIndex === 0) slot.className += ' selected';
            
            const img = document.createElement('img');
            img.src = 'assets/cert.png';
            img.className = 'item-img';
            slot.appendChild(img);
            
            const qty = document.createElement('div');
            qty.className = 'item-qty';
            qty.innerText = `x${gameState.certCount}`;
            slot.appendChild(qty);
            
            slot.addEventListener('click', () => {
                playSFX('click');
                selectedItemIndex = 0;
                renderInventory();
                updateInventorySidebar();
            });
        } else if (i > 3) {
            slot.className += ' locked';
        } else {
            // Active empty slot
            slot.addEventListener('click', () => {
                playSFX('click');
                selectedItemIndex = null;
                renderInventory();
                updateInventorySidebar();
            });
        }
        elInventoryGrid.appendChild(slot);
    }
}

function updateInventorySidebar() {
    if (!elInventorySidebar || !elItemTitle || !elItemDescription || !elBtnUseItem) return;
    
    if (selectedItemIndex === 0 && gameState.certCount > 0) {
        elItemTitle.innerText = '怠惰回避証明書';
        elItemDescription.innerText = '使用すると、バイタル安定度のカウントダウン（死亡タイマー）を24時間にリセットできます。脳内インベントリから適用してください。';
        elBtnUseItem.classList.remove('hidden');
        elBtnUseItem.innerText = 'システム拡張を起動';
    } else {
        elItemTitle.innerText = 'アイテム未選択';
        elItemDescription.innerText = 'ニューラル・インベントリのスロットからアイテムを選択して、システム拡張を適用してください。';
        elBtnUseItem.classList.add('hidden');
    }
}

// Stats Tab Renderer
function renderStatsExpanded() {
    if (!elStatsExpandedContainer) return;
    
    const totalSessions = gameState.logs.length;
    const uptimeHrs = (gameState.totalStudyMins / 60).toFixed(1);
    
    let deepMins = 0, analysisMins = 0, maintMins = 0;
    gameState.logs.forEach(log => {
        if (log.intensity === 'DEEP_WORK' || log.intensity === '超集中') deepMins += log.duration;
        else if (log.intensity === 'ANALYSIS' || log.intensity === 'システム分析') analysisMins += log.duration;
        else if (log.intensity === 'SYSTEM_MAINT' || log.intensity === 'システム保守') maintMins += log.duration;
    });
    const totalAllocated = deepMins + analysisMins + maintMins || 1;
    const deepP = Math.round((deepMins / totalAllocated) * 100);
    const analysisP = Math.round((analysisMins / totalAllocated) * 100);
    const maintP = Math.round((maintMins / totalAllocated) * 100);
    
    const now = Date.now();
    const msRemaining = DEATH_LIMIT_MS - (now - gameState.lastTimerStart);
    const syncPercent = Math.max(0, Math.min(100, Math.floor((msRemaining / DEATH_LIMIT_MS) * 100)));
    const statusText = syncPercent > 15 ? 'STABLE' : 'CRITICAL';
    
    elStatsExpandedContainer.innerHTML = `
        <div class="stats-extended-panel">
            <h3>現在のシステム稼働状態</h3>
            <div class="stats-row-item">
                <span>継続ストリーク</span>
                <span>${gameState.streakDays} サイクル</span>
            </div>
            <div class="stats-row-item">
                <span>累計稼働時間</span>
                <span>${uptimeHrs}時間</span>
            </div>
            <div class="stats-row-item">
                <span>完了セッション数</span>
                <span>${totalSessions} 回</span>
            </div>
            <div class="stats-row-item">
                <span>現在の階級</span>
                <span>${gameState.classTitle}</span>
            </div>
        </div>
        <div class="stats-extended-panel">
            <h3>集中パターンの分析</h3>
            <div class="stats-row-item">
                <span>超集中時間 (超集中)</span>
                <span>${deepP}% (${deepMins}分)</span>
            </div>
            <div class="stats-row-item">
                <span>分析時間 (システム分析)</span>
                <span>${analysisP}% (${analysisMins}分)</span>
            </div>
            <div class="stats-row-item">
                <span>メンテナンス時間 (保守)</span>
                <span>${maintP}% (${maintMins}分)</span>
            </div>
            <div class="stats-row-item">
                <span>平均セッション時間</span>
                <span>${totalSessions ? Math.round(gameState.totalStudyMins / totalSessions) : 0} 分</span>
            </div>
        </div>
        <div class="stats-extended-panel">
            <h3>ニューラルコア健全性</h3>
            <div class="stats-row-item">
                <span>バイタル同期率</span>
                <span style="color: ${syncPercent > 15 ? 'var(--text-cyan)' : 'var(--color-red)'}; font-weight:bold;">${syncPercent}%</span>
            </div>
            <div class="stats-row-item">
                <span>同期安定状態</span>
                <span style="color: ${statusText === 'STABLE' ? 'var(--color-green)' : 'var(--color-red)'}; font-weight:bold;">${statusText === 'STABLE' ? '安定' : '危険'}</span>
            </div>
            <div class="stats-row-item">
                <span>同期切断カウントダウン</span>
                <span>${formatTimeDiff(msRemaining)}</span>
            </div>
            <div class="stats-row-item">
                <span>所持証明書数</span>
                <span>x${gameState.certCount}</span>
            </div>
        </div>
    `;
}

// Archive/Legacy View Render
function renderArchiveTab() {
    if (!elFullHistoryTbody || !elRecordsList) return;
    elFullHistoryTbody.innerHTML = '';
    elRecordsList.innerHTML = '';
    
    // 1. Render all history logs
    if (gameState.logs.length === 0) {
        elFullHistoryTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted)">履歴アーカイブが見つかりません</td></tr>`;
    } else {
        [...gameState.logs].reverse().forEach(log => {
            const date = new Date(log.timestamp);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            
            const tr = document.createElement('tr');
            let typeClass = 'maint-type';
            if (log.intensity === 'DEEP_WORK' || log.intensity === '超集中') typeClass = 'deep-type';
            else if (log.intensity === 'ANALYSIS' || log.intensity === 'システム分析') typeClass = 'analysis-type';
            
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>
                    <div>${log.task}</div>
                    <div style="font-size:8px; color:var(--text-muted); margin-top:2px;">集中 ${log.duration}分 // ${log.intensity}</div>
                </td>
                <td class="${typeClass}">+${log.expGained}</td>
            `;
            elFullHistoryTbody.appendChild(tr);
        });
    }

    // 2. Render Reincarnation logs
    if (gameState.pastRecords.length === 0) {
        elRecordsList.innerHTML = '<li>過去の転生データはありません。</li>';
    } else {
        [...gameState.pastRecords].reverse().forEach((r, i) => {
            const li = document.createElement('li');
            li.innerHTML = `第 ${gameState.pastRecords.length - i} 世代 [${r.date}] // コア安定度: <span style="color:var(--text-gold); font-weight:bold;">LV ${r.level}</span> // 生存期間: <span style="color:var(--text-cyan); font-weight:bold;">${r.survivalDays}日</span>`;
            elRecordsList.appendChild(li);
        });
    }
}

// Settings View Load
function loadSettingsPanel() {
    elSettingsUsername.value = gameState.classTitle;
    elSettingsSFX.checked = gameState.soundEnabled;
    
    document.querySelectorAll('.btn-duration').forEach(btn => {
        const mins = parseInt(btn.getAttribute('data-mins'), 10);
        if (mins === gameState.focusDurationMins) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Export Focus Logs as CSV
function exportLogsToCSV() {
    playSFX('click');
    if (gameState.logs.length === 0) {
        alert('ログがまだ記録されていません。');
        return;
    }
    
    let csvContent = "日付,タスク名,集中時間(分),集中度,獲得EXP\n";
    gameState.logs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        csvContent += `"${dateStr}","${log.task}",${log.duration},"${log.intensity}",${log.expGained}\n`;
    });
    
    // Trigger file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pixel_study_rpg_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('ログをCSVファイルに出力しました。');
}

init();

// --- Authentication, Sync, and Friends System Helpers ---

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function initGoogleAuth() {
    if (typeof google === 'undefined') {
        setTimeout(initGoogleAuth, 500);
        return;
    }
    
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "dark", size: "large", width: 280 }
    );
}

function handleCredentialResponse(response) {
    performGoogleLogin(response.credential);
}

function performGoogleLogin(token) {
    fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: token })
    })
    .then(res => {
        if (!res.ok) throw new Error('認証サーバーエラー');
        return res.json();
    })
    .then(data => {
        gameState.authMode = 'online';
        elAuthOverlay.classList.add('hidden');
        applySyncedData(data);
        continueInit();
        showMessage('ニューラル接続確立: 同期データベース接続完了。');
    })
    .catch(err => {
        console.error(err);
        alert('ログイン処理に失敗しました。');
    });
}

function applySyncedData(data) {
    gameState = { ...gameState, ...data.user };
    gameState.logs = data.logs || [];
    gameState.pastRecords = data.pastRecords || [];
    gameState.authMode = 'online';
    saveData(); // saves to local storage as well for backup
}

function syncStateToServer() {
    if (gameState.authMode !== 'online') return;
    
    // Debounce sync requests
    if (syncTimeoutId) clearTimeout(syncTimeoutId);
    
    syncTimeoutId = setTimeout(() => {
        const bodyData = {
            class_title: gameState.classTitle,
            level: gameState.level,
            exp: gameState.exp,
            streak_days: gameState.streakDays,
            total_study_mins: gameState.totalStudyMins,
            weekly_study_mins: gameState.weeklyStudyMins,
            cert_count: gameState.certCount,
            last_timer_start: gameState.lastTimerStart,
            last_daily_checkin: gameState.lastDailyCheckIn,
            run_start_date: gameState.runStartDate,
            sound_enabled: gameState.soundEnabled ? 1 : 0,
            focus_duration_mins: gameState.focusDurationMins,
            is_studying: gameState.isStudying ? 1 : 0,
            claimed_quests: gameState.claimedQuests,
            logs: gameState.logs,
            pastRecords: gameState.pastRecords
        };
        
        fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        })
        .then(res => {
            if (!res.ok) console.warn('Database sync warning');
        })
        .catch(err => console.error('Database sync error:', err));
    }, 500);
}

// Friends System UI Loaders
function loadFriendsList() {
    if (gameState.authMode !== 'online') {
        elFriendsList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px 0;">オンラインモードでのみフレンド機能を利用できます。</div>';
        elFriendRequestsReceived.innerHTML = '';
        elFriendRequestsSent.innerHTML = '';
        return;
    }

    fetch('/api/friends')
        .then(res => res.json())
        .then(data => {
            renderFriendsList(data.friends);
            renderPendingRequests(data.pendingReceived, data.pendingSent);
        })
        .catch(err => console.error('Failed to load friends list:', err));
}

function renderFriendsList(friends) {
    elFriendsList.innerHTML = '';
    if (friends.length === 0) {
        elFriendsList.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding: 20px 0;">同期中のフレンドはいません。</div>';
        return;
    }

    friends.forEach(f => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        
        // Calculate vital stability for friend
        const msRemaining = (24 * 60 * 60 * 1000) - (Date.now() - f.last_timer_start);
        const syncPercent = Math.max(0, Math.min(100, Math.floor((msRemaining / (24 * 60 * 60 * 1000)) * 100)));
        
        const avatarSrc = f.avatar || 'assets/character.png';
        const studyClass = f.is_studying ? 'studying' : '';
        const studyStatusText = f.is_studying ? 'フォーカス集中中' : '待機中';
        
        card.innerHTML = `
            <div class="friend-card-left">
                <div class="friend-avatar-wrapper">
                    <img class="friend-card-avatar" src="${avatarSrc}" onerror="this.src='assets/character.png'">
                    <span class="friend-status-indicator ${studyClass}"></span>
                </div>
                <div class="friend-card-details">
                    <span class="friend-card-name">${f.name}</span>
                    <span class="friend-card-subtitle">${studyStatusText} // 同期率 ${syncPercent}%</span>
                </div>
            </div>
            <div class="friend-card-right">
                <span class="friend-card-rank">${f.class_title}</span>
                <span class="friend-card-stats">LV ${f.level} // ${f.streak_days} サイクル</span>
                <button class="btn-mini-action decline" style="margin-top: 4px; padding: 2px 6px; font-size: 8px;" onclick="unfriend(${f.id})">解除</button>
            </div>
        `;
        elFriendsList.appendChild(card);
    });
}

function renderPendingRequests(received, sent) {
    elFriendRequestsReceived.innerHTML = '';
    if (received.length === 0) {
        elFriendRequestsReceived.innerHTML = '<div style="font-size:10px; color:var(--text-muted);">届いている申請はありません。</div>';
    } else {
        received.forEach(r => {
            const item = document.createElement('div');
            item.className = 'friend-request-item';
            const avatar = r.avatar || 'assets/character.png';
            item.innerHTML = `
                <div class="friend-request-info">
                    <img class="friend-mini-avatar" src="${avatar}" onerror="this.src='assets/character.png'">
                    <span class="friend-mini-name">${r.name}</span>
                </div>
                <div style="display:flex; gap: 4px;">
                    <button class="btn-mini-action accept" onclick="acceptFriend(${r.id})">承認</button>
                    <button class="btn-mini-action decline" onclick="declineFriend(${r.id})">却下</button>
                </div>
            `;
            elFriendRequestsReceived.appendChild(item);
        });
    }

    elFriendRequestsSent.innerHTML = '';
    if (sent.length === 0) {
        elFriendRequestsSent.innerHTML = '<div style="font-size:10px; color:var(--text-muted);">送信済みの申請はありません。</div>';
    } else {
        sent.forEach(s => {
            const item = document.createElement('div');
            item.className = 'friend-request-item';
            const avatar = s.avatar || 'assets/character.png';
            item.innerHTML = `
                <div class="friend-request-info">
                    <img class="friend-mini-avatar" src="${avatar}" onerror="this.src='assets/character.png'">
                    <span class="friend-mini-name">${s.name}</span>
                </div>
                <button class="btn-mini-action decline" onclick="declineFriend(${s.id})">取消</button>
            `;
            elFriendRequestsSent.appendChild(item);
        });
    }
}

function searchFriends() {
    const val = elFriendSearchInput.value.trim();
    if (!val) return;

    fetch('/api/users/search?q=' + encodeURIComponent(val))
        .then(res => res.json())
        .then(users => {
            elSearchResultsContainer.innerHTML = '';
            if (users.length === 0) {
                elSearchResultsContainer.innerHTML = '<div style="font-size:10px; color:var(--text-muted); padding: 5px;">該当するユーザーはいません。</div>';
                return;
            }

            users.forEach(u => {
                const item = document.createElement('div');
                item.className = 'friend-search-result';
                const avatar = u.avatar || 'assets/character.png';
                item.innerHTML = `
                    <div class="friend-search-info">
                        <img class="friend-mini-avatar" src="${avatar}" onerror="this.src='assets/character.png'">
                        <div>
                            <div class="friend-mini-name">${u.name}</div>
                            <div class="friend-mini-email">${u.email}</div>
                        </div>
                    </div>
                    <button class="btn-mini-action" onclick="sendFriendRequest(${u.id})">申請</button>
                `;
                elSearchResultsContainer.appendChild(item);
            });
        })
        .catch(err => console.error('Failed to search users:', err));
}

function sendFriendRequest(id) {
    fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showMessage('フレンド申請を送信しました。');
            loadFriendsList();
            elSearchResultsContainer.innerHTML = '';
            elFriendSearchInput.value = '';
        } else {
            alert('申請の送信に失敗しました。');
        }
    })
    .catch(err => console.error(err));
}

function acceptFriend(id) {
    fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showMessage('フレンド申請を承認しました。');
            loadFriendsList();
        }
    })
    .catch(err => console.error(err));
}

function declineFriend(id) {
    fetch('/api/friends/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showMessage('申請を取り消し／却下しました。');
            loadFriendsList();
        }
    })
    .catch(err => console.error(err));
}

function unfriend(id) {
    if (confirm('このフレンドとの同期を解除しますか？')) {
        declineFriend(id);
    }
}

// Expose event handler functions globally for HTML templates
window.acceptFriend = acceptFriend;
window.declineFriend = declineFriend;
window.sendFriendRequest = sendFriendRequest;
window.unfriend = unfriend;
