const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static('public'));


const waitingUsers = [];


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    
    if (waitingUsers.length > 0) {
       
        const partnerSocket = waitingUsers.shift(); 
        socket.partner = partnerSocket.id;
        partnerSocket.partner = socket.id;

        
        socket.emit('matched', '已成功配對，開始聊天!');
        partnerSocket.emit('matched', '已成功配對，開始聊天!');
    } else {
        // 無等待用戶，將自己加入等待列表
        waitingUsers.push(socket);
        socket.emit('waiting', '找個人聊天...');
    }

    
    socket.on('chat message', (msg) => {
        if (socket.partner) {
           
            io.to(socket.partner).emit('chat message', msg);
        } else {
            socket.emit('chat message', '還沒配對到人，請稍後...');
        }
    });

    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        
        const index = waitingUsers.indexOf(socket);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }

        
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
        socket.partner = null; 
    });
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
