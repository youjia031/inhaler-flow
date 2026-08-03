// api/log.js
export default function handler(req, res) {
    console.log('📝 收到 Log 請求');
    console.log('🌐 來源:', req.headers.origin || 'unknown');
    console.log('📦 內容:', req.body);
    console.log('⏰ 時間:', new Date().toISOString());

    res.status(200).json({
        success: true,
        message: 'Log 已記錄',
        timestamp: new Date().toISOString()
    });
}