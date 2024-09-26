import { Server } from 'socket.io';

const io = new Server(8000, {
    cors: {
        origin: 'http://localhost:5173',
    },
});

const emailToSocketIdMap = new Map<string, string>();
const socketidToEmailMap = new Map<string, string>();
const rooms = new Map<string, Set<string>>();

io.on('connection', socket => {
    console.log(`Socket Connected`, socket.id);

    // Existing one-to-one video call logic
    socket.on('room:join', data => {
        const { email, room } = data;
        emailToSocketIdMap.set(email, socket.id);
        socketidToEmailMap.set(socket.id, email);
        io.to(room).emit('user:joined', { email, id: socket.id });
        socket.join(room);
        io.to(socket.id).emit('room:join', data);
    });

    // Existing one-to-one call events
    socket.on('user:call', ({ to, offer }) => {
        io.to(to).emit('incomming:call', { from: socket.id, offer });
    });

    socket.on('call:accepted', ({ to, ans }) => {
        io.to(to).emit('call:accepted', { from: socket.id, ans });
    });

    socket.on('peer:nego:needed', ({ to, offer }) => {
        io.to(to).emit('peer:nego:needed', { from: socket.id, offer });
    });

    socket.on('peer:nego:done', ({ to, ans }) => {
        io.to(to).emit('peer:nego:final', { from: socket.id, ans });
    });

    // Modified one-to-many video call logic
    socket.on('multi:join', ({ roomId }) => {
        socket.join(roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId)!.add(socket.id);

        // Emit to all other users in the room
        socket.to(roomId).emit('multi:user:joined', { id: socket.id });

        // Send list of existing users to the new user
        const existingUsers = Array.from(rooms.get(roomId)!).filter(
            id => id !== socket.id
        );
        socket.emit('multi:existing:users', { users: existingUsers });
    });

    socket.on('multi:offer', ({ to, offer }) => {
        socket.to(to).emit('multi:offer', { from: socket.id, offer });
    });

    socket.on('multi:answer', ({ to, ans }) => {
        socket.to(to).emit('multi:answer', { from: socket.id, ans });
    });

    socket.on('multi:ice-candidate', ({ to, candidate }) => {
        socket
            .to(to)
            .emit('multi:ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            if (rooms.has(room)) {
                rooms.get(room)!.delete(socket.id);
                socket.to(room).emit('multi:user:left', { id: socket.id });
            }
        }
    });
});
