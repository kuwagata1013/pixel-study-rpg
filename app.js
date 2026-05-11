// App State & Data
const STORAGE_KEY = 'pixel_study_rpg_data';
const WEEKLY_GOAL_MINS = 14 * 60;
const DEATH_LIMIT_MS = 24 * 60 * 60 * 1000;

let gameState = {
    exp: 0,
    level: 1,
    weeklyStudyMins: 0,
    lastTimerStart: null, // timestamp when the timer was last started
    lastDailyCheckIn: null, // string 'YYYY-MM-DD' for streak tracking
    streakDays: 0,
    certCount: 0,
    isStudying: false,
    currentSessionStart: null,
    runStartDate: Date.now(),
    pastRecords: [],
    weeklyResetDate: null // next Sunday 24:00 timestamp
};

// DOM Elements
const elDeathTimer = document.getElementById('death-timer');
const elWeeklyFill = document.getElementById('weekly-fill');
const elWeeklyText = document.getElementById('weekly-text');
const elCertCount = document.getElementById('cert-count');
const elPlayerLevel = document.getElementById('player-level');
const elExpFill = document.getElementById('exp-fill');
const elPlayerExp = document.getElementById('player-exp');
const elBgLayer = document.getElementById('bg-layer');
const elCharacterSprite = document.getElementById('character-sprite');
const elStudyTimer = document.getElementById('study-timer');
const elBtnToggleStudy = document.getElementById('btn-toggle-study');
const elBtnUseCert = document.getElementById('btn-use-cert');
const elBtnShowStats = document.getElementById('btn-show-stats');
const elModalRecords = document.getElementById('modal-records');
const elRecordsList = document.getElementById('records-list');
const elBtnCloseRecords = document.getElementById('btn-close-records');
const elModalGameOver = document.getElementById('modal-gameover');
const elDeathReason = document.getElementById('death-reason');
const elFinalLevel = document.getElementById('final-level');
const elSurvivalDays = document.getElementById('survival-days');
const elBtnRestart = document.getElementById('btn-restart');
const elGameMessage = document.getElementById('game-message');

let mainLoopId = null;

// Initialization
function init() {
    loadData();
    checkWeeklyReset();
    
    // Resume session if it was active
    if (gameState.isStudying && gameState.currentSessionStart) {
        startVisuals();
    } else {
        stopVisuals();
    }
    
    updateUI();
    
    // Start Game Loop
    mainLoopId = setInterval(gameLoop, 1000);

    // Event Listeners
    elBtnToggleStudy.addEventListener('click', toggleStudy);
    elBtnUseCert.addEventListener('click', useCertificate);
    elBtnShowStats.addEventListener('click', showStats);
    elBtnCloseRecords.addEventListener('click', () => elModalRecords.classList.add('hidden'));
    elBtnRestart.addEventListener('click', reincarnate);
}

// Data Management
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        gameState = { ...gameState, ...JSON.parse(data) };
    } else {
        // First time initialization
        gameState.lastTimerStart = Date.now();
        gameState.runStartDate = Date.now();
        setNextWeeklyReset();
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

// Time & Logic Utilities
function getNextSundayMidnight() {
    const now = new Date();
    const result = new Date(now);
    result.setHours(0, 0, 0, 0);
    // 0 = Sunday, 1 = Monday...
    const daysUntilNextSunday = 7 - now.getDay();
    // If today is Sunday and it's already past 00:00, next reset is in 7 days
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

// Game Logic
function gameLoop() {
    const now = Date.now();
    
    if (gameState.isStudying && gameState.currentSessionStart) {
        // Update study timer
        const sessionMs = now - gameState.currentSessionStart;
        elStudyTimer.innerText = formatTimeDiff(sessionMs);
    }

    // 1. Weekly Check
    checkWeeklyReset();

    // 2. Daily Check (Death Condition)
    if (gameState.lastTimerStart) {
        if (gameState.isStudying) {
            // Reset death timer constantly while studying so they don't die while active
            gameState.lastTimerStart = now;
        }
        
        const msSinceLastStart = now - gameState.lastTimerStart;
        const msRemaining = DEATH_LIMIT_MS - msSinceLastStart;
        
        if (msRemaining <= 0) {
            die('You failed to start your study timer within 24 hours. The slacker demon consumed you.');
            return; // Stop processing
        } else {
            elDeathTimer.innerText = formatTimeDiff(msRemaining);
            if (msRemaining < 3600000) { // < 1 hour
                elDeathTimer.style.color = '#ef233c'; // red
            } else {
                elDeathTimer.style.color = '#4cc9f0'; // normal blue/cyan
            }
        }
    }
}

function checkWeeklyReset() {
    const now = Date.now();
    if (gameState.weeklyResetDate && now >= gameState.weeklyResetDate) {
        if (gameState.weeklyStudyMins < WEEKLY_GOAL_MINS) {
            die('You failed to reach 14 hours of study this week. Your resolve crumbled.');
        } else {
            // Survived the week, reset weekly stats
            gameState.weeklyStudyMins = 0;
            setNextWeeklyReset();
            saveData();
            showMessage('Week Cleared! Weekly time reset.');
        }
    }
}

function die(reason) {
    clearInterval(mainLoopId);
    stopVisuals();
    
    // Calculate survival days
    const survivalMs = Date.now() - gameState.runStartDate;
    const survivalDays = Math.floor(survivalMs / (1000 * 60 * 60 * 24));
    
    // Save to past records
    gameState.pastRecords.push({
        level: gameState.level,
        survivalDays: survivalDays,
        date: new Date().toLocaleDateString()
    });
    
    // Show death modal
    elDeathReason.innerText = reason;
    elFinalLevel.innerText = gameState.level;
    elSurvivalDays.innerText = survivalDays;
    elModalGameOver.classList.remove('hidden');
    
    // Reset data (keep past records & certs)
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
    gameState.runStartDate = Date.now();
    gameState.lastTimerStart = Date.now();
    setNextWeeklyReset();
    saveData();
    elModalGameOver.classList.add('hidden');
    updateUI();
    mainLoopId = setInterval(gameLoop, 1000);
}

// Actions
function toggleStudy() {
    const now = Date.now();
    if (gameState.isStudying) {
        // STOP STUDYING
        gameState.isStudying = false;
        const sessionMs = now - gameState.currentSessionStart;
        const sessionMins = Math.floor(sessionMs / 60000);
        
        // Add Exp
        addExp(sessionMins * 10);
        gameState.weeklyStudyMins += sessionMins;
        
        // Check Streak (>= 15 mins)
        if (sessionMins >= 15) {
            updateStreak();
        }
        
        gameState.currentSessionStart = null;
        elBtnToggleStudy.innerText = 'Start Study';
        elBtnToggleStudy.classList.remove('btn-danger');
        elBtnToggleStudy.classList.add('btn-primary');
        stopVisuals();
        
    } else {
        // START STUDYING
        gameState.isStudying = true;
        gameState.currentSessionStart = now;
        gameState.lastTimerStart = now; // Update daily check!
        elBtnToggleStudy.innerText = 'Stop & Save';
        elBtnToggleStudy.classList.remove('btn-primary');
        elBtnToggleStudy.classList.add('btn-danger');
        startVisuals();
    }
    
    saveData();
    updateUI();
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
            gameState.streakDays = 1; // broken streak
        }
        
        gameState.lastDailyCheckIn = todayStr;
        
        // Give certificate if streak is multiple of 7
        if (gameState.streakDays % 7 === 0) {
            gameState.certCount++;
            showMessage('Obtained 1x Slacker Certificate!');
        }
    }
}

function useCertificate() {
    if (gameState.certCount > 0) {
        gameState.certCount--;
        gameState.lastTimerStart = Date.now();
        saveData();
        updateUI();
        showMessage('Timer Extended by 24h!');
    } else {
        alert('You do not have any Slacker Certificates!');
    }
}

function addExp(amount) {
    if (amount <= 0) return;
    gameState.exp += amount;
    
    // Level formula: Level = Math.floor(Math.sqrt(totalEXP / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(gameState.exp / 100)) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        showMessage(`Level Up! You are now Level ${gameState.level}!`);
    }
}

function showMessage(msg) {
    elGameMessage.innerText = msg;
    elGameMessage.classList.remove('hidden');
    // Re-trigger animation
    elGameMessage.style.animation = 'none';
    elGameMessage.offsetHeight; // trigger reflow
    elGameMessage.style.animation = null;
}

// UI Updates
function updateUI() {
    elPlayerLevel.innerText = `LV ${gameState.level}`;
    elPlayerExp.innerText = `${gameState.exp} EXP`;
    
    // Calculate Exp progress to next level
    // Current level req: (L-1)^2 * 100
    // Next level req: L^2 * 100
    const currentLvlExp = Math.pow(gameState.level - 1, 2) * 100;
    const nextLvlExp = Math.pow(gameState.level, 2) * 100;
    const expRange = nextLvlExp - currentLvlExp;
    const expProgress = gameState.exp - currentLvlExp;
    const expPercent = Math.min(100, Math.max(0, (expProgress / expRange) * 100));
    elExpFill.style.width = `${expPercent}%`;
    
    // Weekly Progress
    const weekHrs = Math.floor(gameState.weeklyStudyMins / 60);
    const weekMins = gameState.weeklyStudyMins % 60;
    elWeeklyText.innerText = `${weekHrs}h ${weekMins}m / 14h`;
    const weekPercent = Math.min(100, (gameState.weeklyStudyMins / WEEKLY_GOAL_MINS) * 100);
    elWeeklyFill.style.width = `${weekPercent}%`;
    
    // Certs
    elCertCount.innerText = `x${gameState.certCount}`;
    
    // Buttons
    // Helper to update study button UI
    function updateStudyButton(isStudying) {
        if (isStudying) {
            elBtnToggleStudy.innerText = 'Stop & Save';
            elBtnToggleStudy.classList.remove('btn-primary');
            elBtnToggleStudy.classList.add('btn-danger');
        } else {
            elBtnToggleStudy.innerText = 'Start Study';
            elBtnToggleStudy.classList.remove('btn-danger');
            elBtnToggleStudy.classList.add('btn-primary');
        }
    }

    // Update button based on current state
    updateStudyButton(gameState.isStudying);
}

function startVisuals() {
    elCharacterSprite.src = 'assets/character.png';
    elCharacterSprite.classList.add('walking');
    elBgLayer.classList.add('scrolling');
    elStudyTimer.classList.remove('hidden');
}

function stopVisuals() {
    elCharacterSprite.src = 'assets/character.png';
    elCharacterSprite.classList.remove('walking');
    elBgLayer.classList.remove('scrolling');
    elStudyTimer.classList.add('hidden');
}

function showStats() {
    elRecordsList.innerHTML = '';
    if (gameState.pastRecords.length === 0) {
        elRecordsList.innerHTML = '<li>No legacy records found.</li>';
    } else {
        // Sort by level descending or just chronological
        [...gameState.pastRecords].reverse().forEach((r, i) => {
            const li = document.createElement('li');
            li.innerText = `Gen ${gameState.pastRecords.length - i} [${r.date}] - LV ${r.level}, Survived: ${r.survivalDays} days`;
            elRecordsList.appendChild(li);
        });
    }
    elModalRecords.classList.remove('hidden');
}

init();
