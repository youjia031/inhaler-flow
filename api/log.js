// api/log.js - 完整後端（支援六款遊戲）

// 記憶體儲存（Vercel 無狀態，僅用於當前請求）
let gameStats = {
    totalGames: 0,
    totalScores: 0,
    highScore: 0,
    totalBossesDefeated: 0,
    totalItemsCollected: 0,
    averageScore: 0,
    games: [],
    // 新增：各遊戲統計
    gameStats: {
        flight: { played: 0, highScore: 0, totalScore: 0 },
        artist: { played: 0, highScore: 0, totalScore: 0 },
        candle: { played: 0, highScore: 0, totalScore: 0 },
        mage: { played: 0, highScore: 0, totalScore: 0 },
        dandelion: { played: 0, highScore: 0, totalScore: 0 },
        crystal: { played: 0, highScore: 0, totalScore: 0 }
    },
    // 新增：玩家成就
    achievements: {
        totalUnlocked: 0,
        list: []
    }
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
        case 'game_stats':
            handleGameStats(req, res);
            break;
        default:
            res.status(404).json({ error: 'Unknown endpoint' });
    }
}

// ===== 日誌處理（擴充支援遊戲類型） =====
function handleLog(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { message, level, data, type, game } = req.body;
    
    // 記錄到 Vercel 日誌
    const timestamp = new Date().toISOString();
    const gameInfo = game ? `[${game}]` : '';
    console.log(`[${timestamp}] ${gameInfo} [${level || 'INFO'}] ${message}`);
    if (data) {
        console.log('Data:', JSON.stringify(data, null, 2));
    }

    // 根據日誌類型更新統計
    if (type === 'game_over') {
        updateGameStats(data, game);
    } else if (type === 'boss_defeated') {
        gameStats.totalBossesDefeated++;
    } else if (type === 'item_collected') {
        gameStats.totalItemsCollected++;
    } else if (type === 'achievement_unlocked') {
        if (data && data.achievement) {
            gameStats.achievements.totalUnlocked++;
            gameStats.achievements.list.push({
                name: data.achievement,
                timestamp: timestamp,
                game: game || 'unknown'
            });
        }
    } else if (type === 'game_start') {
        // 記錄遊戲開始
        if (game && gameStats.gameStats[game]) {
            gameStats.gameStats[game].played++;
        }
    }

    res.status(200).json({ 
        success: true, 
        timestamp,
        stats: gameStats 
    });
}

// ===== 統計資料（擴充） =====
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
            games: [],
            gameStats: {
                flight: { played: 0, highScore: 0, totalScore: 0 },
                artist: { played: 0, highScore: 0, totalScore: 0 },
                candle: { played: 0, highScore: 0, totalScore: 0 },
                mage: { played: 0, highScore: 0, totalScore: 0 },
                dandelion: { played: 0, highScore: 0, totalScore: 0 },
                crystal: { played: 0, highScore: 0, totalScore: 0 }
            },
            achievements: {
                totalUnlocked: 0,
                list: []
            }
        };
        res.status(200).json({ success: true, message: 'Stats reset' });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 各遊戲獨立統計 =====
function handleGameStats(req, res) {
    if (req.method === 'GET') {
        const game = req.query.game;
        if (game && gameStats.gameStats[game]) {
            res.status(200).json({
                game: game,
                stats: gameStats.gameStats[game]
            });
        } else {
            res.status(200).json({
                games: gameStats.gameStats
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 排行榜（擴充支援遊戲模式） =====
function handleLeaderboard(req, res) {
    if (req.method === 'POST') {
        const { playerName, score, level, gameMode, game } = req.body;
        const entry = {
            playerName: playerName || '匿名玩家',
            score: score || 0,
            level: level || 1,
            gameMode: gameMode || 'standard',
            game: game || 'flight',
            timestamp: new Date().toISOString()
        };
        
        if (!global.leaderboard) global.leaderboard = [];
        global.leaderboard.push(entry);
        global.leaderboard.sort((a, b) => b.score - a.score);
        if (global.leaderboard.length > 100) {
            global.leaderboard = global.leaderboard.slice(0, 100);
        }
        
        res.status(200).json({ success: true, entry });
    } else if (req.method === 'GET') {
        const limit = parseInt(req.query.limit) || 10;
        const game = req.query.game;
        let leaderboard = global.leaderboard || [];
        
        // 如果指定遊戲，只返回該遊戲的記錄
        if (game) {
            leaderboard = leaderboard.filter(entry => entry.game === game);
        }
        
        res.status(200).json({
            leaderboard: leaderboard.slice(0, limit),
            total: leaderboard.length
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 成就系統（擴充） =====
function handleAchievements(req, res) {
    const achievements = {
        // 通用成就
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
        // 各遊戲專屬成就
        'artist_master': {
            id: 'artist_master',
            name: '🎨 繪畫大師',
            description: '完成 10 幅畫作',
            condition: (stats) => stats.game === 'artist' && stats.paintings >= 10,
            reward: 300
        },
        'candle_escape': {
            id: 'candle_escape',
            name: '🕯️ 迷宮逃脫者',
            description: '逃出迷宮 5 次',
            condition: (stats) => stats.game === 'candle' && stats.escapes >= 5,
            reward: 300
        },
        'mage_winner': {
            id: 'mage_winner',
            name: '⚔️ 破魔者',
            description: '擊敗 20 個敵人',
            condition: (stats) => stats.game === 'mage' && stats.enemiesDefeated >= 20,
            reward: 300
        },
        'dandelion_delivery': {
            id: 'dandelion_delivery',
            name: '🌿 頂級快遞員',
            description: '送達 20 朵花',
            condition: (stats) => stats.game === 'dandelion' && stats.deliveries >= 20,
            reward: 300
        },
        'crystal_carver': {
            id: 'crystal_carver',
            name: '💎 雕刻大師',
            description: '完成 10 件作品',
            condition: (stats) => stats.game === 'crystal' && stats.pieces >= 10,
            reward: 300
        }
    };

    if (req.method === 'GET') {
        const game = req.query.game;
        let result = achievements;
        if (game) {
            // 只返回特定遊戲的成就
            const gamePrefixes = {
                'artist': 'artist_',
                'candle': 'candle_',
                'mage': 'mage_',
                'dandelion': 'dandelion_',
                'crystal': 'crystal_'
            };
            const prefix = gamePrefixes[game] || '';
            result = {};
            for (const key in achievements) {
                if (key === 'first_game' || key === 'score_1000' || key === 'score_5000' || 
                    key === 'boss_hunter' || key === 'item_collector' || key.startsWith(prefix)) {
                    result[key] = achievements[key];
                }
            }
        }
        res.status(200).json({ achievements: result });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

// ===== 挑戰系統（擴充） =====
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
        },
        // 新遊戲專屬挑戰
        'artist_challenge': {
            id: 'artist_challenge',
            name: '🎨 一日畫家',
            description: '在風之繪師中完成 5 幅畫作',
            reward: 250,
            progress: 0,
            target: 5,
            completed: false
        },
        'candle_challenge': {
            id: 'candle_challenge',
            name: '🕯️ 迷宮探險家',
            description: '在燭光遠征中收集 10 顆寶石',
            reward: 250,
            progress: 0,
            target: 10,
            completed: false
        },
        'mage_challenge': {
            id: 'mage_challenge',
            name: '⚔️ 法術大師',
            description: '在魔導士破魔中釋放 30 次法術',
            reward: 250,
            progress: 0,
            target: 30,
            completed: false
        },
        'dandelion_challenge': {
            id: 'dandelion_challenge',
            name: '🌿 快遞達人',
            description: '在蒲公英快遞中送達 10 朵花',
            reward: 250,
            progress: 0,
            target: 10,
            completed: false
        },
        'crystal_challenge': {
            id: 'crystal_challenge',
            name: '💎 雕刻新星',
            description: '在玻璃心大師中完成 5 件作品',
            reward: 250,
            progress: 0,
            target: 5,
            completed: false
        }
    };

    if (req.method === 'GET') {
        const game = req.query.game;
        let result = challenges;
        if (game) {
            const gameMap = {
                'artist': 'artist_challenge',
                'candle': 'candle_challenge',
                'mage': 'mage_challenge',
                'dandelion': 'dandelion_challenge',
                'crystal': 'crystal_challenge'
            };
            const challengeId = gameMap[game];
            if (challengeId) {
                result = {};
                result[challengeId] = challenges[challengeId];
                // 加上通用挑戰
                for (const key in challenges) {
                    if (key === 'daily_1' || key === 'speed_demon' || key === 'no_hit_1') {
                        result[key] = challenges[key];
                    }
                }
            }
        }
        res.status(200).json({ challenges: result });
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

// ===== 輔助函數（擴充） =====
function updateGameStats(data, game) {
    if (!data) return;
    
    gameStats.totalGames++;
    gameStats.totalScores += data.score || 0;
    gameStats.highScore = Math.max(gameStats.highScore, data.score || 0);
    gameStats.averageScore = Math.floor(gameStats.totalScores / gameStats.totalGames);
    
    // 更新各遊戲統計
    if (game && gameStats.gameStats[game]) {
        const gs = gameStats.gameStats[game];
        gs.played++;
        gs.totalScore += data.score || 0;
        gs.highScore = Math.max(gs.highScore, data.score || 0);
    }
    
    // 儲存遊戲記錄
    gameStats.games.push({
        score: data.score || 0,
        level: data.level || 1,
        mode: data.mode || 'standard',
        game: game || 'flight',
        timestamp: new Date().toISOString(),
        duration: data.duration || 0,
        bossDefeated: data.bossDefeated || 0,
        gameSpecific: data.gameSpecific || {}  // 各遊戲專屬數據
    });
    
    if (gameStats.games.length > 50) {
        gameStats.games = gameStats.games.slice(-50);
    }
}
