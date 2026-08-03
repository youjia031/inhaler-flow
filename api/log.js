// api/log.js - 整合所有後端功能

// 記憶體儲存（Vercel 無狀態，僅用於當前請求）
let gameStats = {
    totalGames: 0,
    totalScores: 0,
    highScore: 0,
    totalBossesDefeated: 0,
    totalItemsCollected: 0,
    averageScore: 0,
    games: []
};

export default function handler(req, res) {
    // 設定 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { path } = req.query;
    const action = path?.[0] || '';

    switch (action) {
        case 'log':
            handleLog(req, res);
            break;
        case 'stats':
            handleStats(req, res);
            break;
        case 'leaderboard':
            handleLeaderboard(req, res);
            break;
        case 'achievements':
            handleAchievements(req, res);
            break;
        case 'challenges':
            handleChallenges(req, res);
            break;
        default:
            res.status(404).json({ error: 'Unknown endpoint' });
    }
}

// ===== 日誌處理 =====
function handleLog(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { message, level, data, type } = req.body;
    
    // 記錄到 Vercel 日誌
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level || 'INFO'}] ${message}`);
    if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
    }

    // 根據日誌類型更新統計
    if (type === 'game_over') {
        updateGameStats(data);
    } else if (type === 'boss_defeated') {
        gameStats.totalBossesDefeated++;
    } else if (type === 'item_collected') {
        gameStats.totalItemsCollected++;
    }

    res.status(200).json({ 
        success: true, 
        timestamp,
        stats: gameStats 
    });
}

// ===== 統計資料 =====
function handleStats(req, res) {
    if (req.method === 'GET') {
        res.status(200).json({
            ...gameStats,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    } else if (req.method === 'POST') {
        // 重置統計
        gameStats = {
            totalGames: 0,
            totalScores: 0,
            highScore: 0,
            totalBossesDefeated: 0,
            totalItemsCollected: 0,
            averageScore: 0,
            games: []
        };
        res.status(200).json({ success: true, message: 'Stats reset' });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 排行榜 =====
function handleLeaderboard(req, res) {
    if (req.method === 'POST') {
        const { playerName, score, level, gameMode } = req.body;
        const entry = {
            playerName: playerName || '匿名玩家',
            score: score || 0,
            level: level || 1,
            gameMode: gameMode || 'standard',
            timestamp: new Date().toISOString()
        };
        
        // 儲存到記憶體（實際應用應使用資料庫）
        if (!global.leaderboard) global.leaderboard = [];
        global.leaderboard.push(entry);
        global.leaderboard.sort((a, b) => b.score - a.score);
        if (global.leaderboard.length > 100) {
            global.leaderboard = global.leaderboard.slice(0, 100);
        }
        
        res.status(200).json({ success: true, entry });
    } else if (req.method === 'GET') {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = global.leaderboard || [];
        res.status(200).json({
            leaderboard: leaderboard.slice(0, limit),
            total: leaderboard.length
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 成就系統 =====
function handleAchievements(req, res) {
    const achievements = {
        'first_game': {
            id: 'first_game',
            name: '🎮 初次飛行',
            description: '完成第一場遊戲',
            condition: (stats) => stats.totalGames >= 1,
            reward: 50
        },
        'score_1000': {
            id: 'score_1000',
            name: '⭐ 千分達人',
            description: '單場得分達到 1000 分',
            condition: (stats) => stats.lastScore >= 1000,
            reward: 100
        },
        'score_5000': {
            id: 'score_5000',
            name: '🏆 傳奇飛行員',
            description: '單場得分達到 5000 分',
            condition: (stats) => stats.lastScore >= 5000,
            reward: 500
        },
        'boss_hunter': {
            id: 'boss_hunter',
            name: '👹 獵龍者',
            description: '擊敗 10 個 Boss',
            condition: (stats) => stats.totalBossesDefeated >= 10,
            reward: 200
        },
        'item_collector': {
            id: 'item_collector',
            name: '🎁 收藏家',
            description: '收集 100 個道具',
            condition: (stats) => stats.totalItemsCollected >= 100,
            reward: 150
        },
        'level_20': {
            id: 'level_20',
            name: '⚡ 資深戰士',
            description: '達到第 20 關',
            condition: (stats) => stats.lastLevel >= 20,
            reward: 300
        },
        'combo_50': {
            id: 'combo_50',
            name: '🔥 Combo 大師',
            description: '達到 50 Combo',
            condition: (stats) => stats.maxCombo >= 50,
            reward: 200
        },
        'perfect_game': {
            id: 'perfect_game',
            name: '💎 完美通關',
            description: '滿血通關',
            condition: (stats) => stats.perfectGame === true,
            reward: 1000
        }
    };

    if (req.method === 'GET') {
        res.status(200).json({ achievements });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 挑戰系統 =====
function handleChallenges(req, res) {
    const challenges = {
        'daily_1': {
            id: 'daily_1',
            name: '📅 每日挑戰',
            description: '今日挑戰：使用呼吸控制通過 5 關',
            reward: 200,
            progress: 0,
            target: 5,
            completed: false
        },
        'speed_demon': {
            id: 'speed_demon',
            name: '⚡ 速度惡魔',
            description: '在 2.0x 倍速下存活 60 秒',
            reward: 150,
            progress: 0,
            target: 60,
            completed: false
        },
        'no_hit': {
            id: 'no_hit_1',
            name: '🛡️ 無傷大師',
            description: '在專家難度下不被擊中',
            reward: 500,
            progress: 0,
            target: 1,
            completed: false
        }
    };

    if (req.method === 'GET') {
        res.status(200).json({ challenges });
    } else if (req.method === 'POST') {
        const { challengeId, progress } = req.body;
        if (challenges[challengeId]) {
            challenges[challengeId].progress = progress;
            if (progress >= challenges[challengeId].target) {
                challenges[challengeId].completed = true;
            }
            res.status(200).json({ 
                success: true, 
                challenge: challenges[challengeId] 
            });
        } else {
            res.status(404).json({ error: 'Challenge not found' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 輔助函數 =====
function updateGameStats(data) {
    if (!data) return;
    
    gameStats.totalGames++;
    gameStats.totalScores += data.score || 0;
    gameStats.highScore = Math.max(gameStats.highScore, data.score || 0);
    gameStats.averageScore = Math.floor(gameStats.totalScores / gameStats.totalGames);
    
    // 儲存遊戲記錄
    gameStats.games.push({
        score: data.score || 0,
        level: data.level || 1,
        mode: data.mode || 'standard',
        timestamp: new Date().toISOString(),
        duration: data.duration || 0,
        bossDefeated: data.bossDefeated || 0
    });
    
    if (gameStats.games.length > 50) {
        gameStats.games = gameStats.games.slice(-50);
    }
}
