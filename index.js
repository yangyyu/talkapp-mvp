// 引入必要模組
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 創建 Express 應用和 HTTP 伺服器
const app = express();
const server = http.createServer(app);

// 初始化 Socket.IO
const io = new Server(server);

// 設定靜態檔案路徑
app.use(express.static('public'));

// 等待配對的用戶列表
const waitingUsers = [];

// 當有用戶連接時觸發
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 嘗試配對
    if (waitingUsers.length > 0) {
        // 有等待中的用戶，進行配對
        const partnerSocket = waitingUsers.shift(); // 取出第一位等待用戶
        socket.partner = partnerSocket.id;
        partnerSocket.partner = socket.id;

        // 通知雙方配對成功
        socket.emit('matched', '已成功配對，開始聊天!');
        partnerSocket.emit('matched', '已成功配對，開始聊天!');
    } else {
        // 無等待用戶，將自己加入等待列表
        waitingUsers.push(socket);
        socket.emit('waiting', '找個人聊天...');
    }

    // 接收訊息
    socket.on('chat message', (msg) => {
        if (socket.partner) {
            // 傳送訊息給配對的對象
            io.to(socket.partner).emit('chat message', msg);
        } else {
            socket.emit('chat message', '還沒配對到人，請稍後...');
        }
    });

    // 當用戶斷線時觸發
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // 如果用戶在等待列表中，將其移除
        const index = waitingUsers.indexOf(socket);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }

        // 通知配對的對象
        if (socket.partner) {
            io.to(socket.partner).emit('chat message', '對方已離開，請重新整理頁面加入配對。');
            const partnerSocket = io.sockets.sockets.get(socket.partner);
            if (partnerSocket) {
                partnerSocket.partner = null;
                partnerSocket.emit('waiting', '對方已離開，請重新整理頁面加入配對。');
                waitingUsers.push(partnerSocket); // 重新加入等待列表
            }
        }
    });

    socket.on('leave chat', () => {
        console.log(`User left chat: ${socket.id}`);
        if (socket.partner) {
            io.to(socket.partner).emit('partner left'); // 通知對方
            const partnerSocket = io.sockets.sockets.get(socket.partner);
            if (partnerSocket) {
                partnerSocket.partner = null;
            }
        }
        socket.partner = null; // 清空自己的配對關係
    });
});

// 啟動伺服器
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
