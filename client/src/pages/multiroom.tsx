import { useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/socket-provider';

interface RemoteUser {
    id: string;
    stream?: MediaStream;
    peer: RTCPeerConnection;
}

const MultiRoomPage = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const socket = useSocket();
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const [myStream, setMyStream] = useState<MediaStream | undefined>();
    const [mySocketId, setMySocketId] = useState<string | null>(null);
    const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});

    const createPeerConnection = useCallback(
        (userId: string) => {
            const peer = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });

            peer.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('multi:ice-candidate', {
                        to: userId,
                        candidate: event.candidate,
                    });
                }
            };

            peer.ontrack = event => {
                setRemoteUsers(prev =>
                    prev.map(user =>
                        user.id === userId
                            ? { ...user, stream: event.streams[0] }
                            : user
                    )
                );
            };

            peerConnectionsRef.current[userId] = peer;
            return peer;
        },
        [socket]
    );

    const handleUserJoined = useCallback(
        ({ id }: { id: string }) => {
            console.log(`User ${id} joined room`);
            if (id !== mySocketId) {
                setRemoteUsers(prev => [
                    ...prev,
                    { id, peer: createPeerConnection(id) },
                ]);
            }
        },
        [createPeerConnection, mySocketId]
    );

    const handleExistingUsers = useCallback(
        ({ users }: { users: string[] }) => {
            users.forEach(userId => {
                if (userId !== mySocketId) {
                    setRemoteUsers(prev => [
                        ...prev,
                        { id: userId, peer: createPeerConnection(userId) },
                    ]);
                }
            });
        },
        [createPeerConnection, mySocketId]
    );

    const handleCallUser = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        setMyStream(stream);
        socket.emit('multi:join', { roomId });

        remoteUsers.forEach(async user => {
            if (user.peer) {
                stream.getTracks().forEach(track => {
                    user.peer.addTrack(track, stream);
                });

                const offer = await user.peer.createOffer();
                await user.peer.setLocalDescription(offer);
                socket.emit('multi:offer', { to: user.id, offer });
            }
        });
    }, [roomId, socket, remoteUsers]);

    useEffect(() => {
        handleCallUser();

        if (socket.id) {
            setMySocketId(socket.id);
        }

        socket.on('multi:user:joined', handleUserJoined);
        socket.on('multi:existing:users', handleExistingUsers);
        socket.on('multi:offer', async ({ from, offer }) => {
            const peer = createPeerConnection(from);
            await peer.setRemoteDescription(offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('multi:answer', { to: from, ans: answer });

            if (myStream) {
                myStream.getTracks().forEach(track => {
                    peer.addTrack(track, myStream);
                });
            }
        });
        socket.on('multi:answer', async ({ from, ans }) => {
            const peer = peerConnectionsRef.current[from];
            if (peer) {
                await peer.setRemoteDescription(ans);
            }
        });
        socket.on('multi:ice-candidate', async ({ from, candidate }) => {
            const peer = peerConnectionsRef.current[from];
            if (peer) {
                await peer.addIceCandidate(candidate);
            }
        });
        socket.on('multi:user:left', ({ id }) => {
            setRemoteUsers(prev => prev.filter(user => user.id !== id));
            if (peerConnectionsRef.current[id]) {
                peerConnectionsRef.current[id].close();
                delete peerConnectionsRef.current[id];
            }
        });

        return () => {
            socket.off('multi:user:joined');
            socket.off('multi:existing:users');
            socket.off('multi:offer');
            socket.off('multi:answer');
            socket.off('multi:ice-candidate');
            socket.off('multi:user:left');
        };
    }, [
        socket,
        handleUserJoined,
        handleExistingUsers,
        createPeerConnection,
        handleCallUser,
        myStream,
    ]);

    return (
        <div className='min-h-screen bg-gray-100 p-8'>
            <div className='max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden'>
                <header className='bg-blue-600 text-white p-4'>
                    <h1 className='text-2xl font-bold'>
                        Multi-User Video Chat Room
                    </h1>
                    <p className='text-sm'>Room ID: {roomId}</p>
                </header>

                <main className='p-6'>
                    <div className='grid grid-cols-2 gap-4'>
                        {myStream && (
                            <div className='aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden'>
                                <ReactPlayer
                                    url={myStream}
                                    playing
                                    muted
                                    width='100%'
                                    height='100%'
                                />
                                <p className='absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded'>
                                    You
                                </p>
                            </div>
                        )}
                        {remoteUsers.map(
                            user =>
                                user.stream && (
                                    <div
                                        key={user.id}
                                        className='aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden'
                                    >
                                        <ReactPlayer
                                            url={user.stream}
                                            playing
                                            width='100%'
                                            height='100%'
                                        />
                                        <p className='absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded'>
                                            User {user.id.slice(0, 4)}
                                        </p>
                                    </div>
                                )
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MultiRoomPage;
