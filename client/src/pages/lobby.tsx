import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/socket-provider';

const LobbyPage = () => {
    const [email, setEmail] = useState('');
    const [roomId, setRoomId] = useState('');
    const [roomType, setRoomType] = useState<'one-to-one' | 'one-to-many'>(
        'one-to-one'
    );

    const socket = useSocket();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (roomType === 'one-to-one') {
            socket.emit('room:join', { email, room: roomId });
        } else {
            navigate(`/multiroom/${roomId}`);
        }
    };

    const handleJoinRoom = useCallback((data: { room: string }) => {
        const { room } = data;
        navigate(`/room/${room}`);
    }, []);

    useEffect(() => {
        socket.on('room:join', handleJoinRoom);
        return () => {
            socket.off('room:join', handleJoinRoom);
        };
    }, [socket]);

    return (
        <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
            <div className='bg-white p-8 rounded-lg shadow-md w-full max-w-md'>
                <h1 className='text-3xl font-bold text-center mb-6 text-gray-800'>
                    Lobby
                </h1>
                <form className='space-y-4' onSubmit={handleSubmit}>
                    <div>
                        <label
                            htmlFor='email'
                            className='block text-sm font-medium text-gray-700 mb-1'
                        >
                            Email
                        </label>
                        <input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type='email'
                            id='email'
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor='roomid'
                            className='block text-sm font-medium text-gray-700 mb-1'
                        >
                            Room ID
                        </label>
                        <input
                            value={roomId}
                            onChange={e => setRoomId(e.target.value)}
                            type='text'
                            id='roomid'
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                            required
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Room Type
                        </label>
                        <div className='flex space-x-4'>
                            <label className='flex items-center'>
                                <input
                                    type='radio'
                                    value='one-to-one'
                                    checked={roomType === 'one-to-one'}
                                    onChange={() => setRoomType('one-to-one')}
                                    className='mr-2'
                                />
                                One-to-One
                            </label>
                            <label className='flex items-center'>
                                <input
                                    type='radio'
                                    value='one-to-many'
                                    checked={roomType === 'one-to-many'}
                                    onChange={() => setRoomType('one-to-many')}
                                    className='mr-2'
                                />
                                One-to-Many
                            </label>
                        </div>
                    </div>
                    <button
                        type='submit'
                        className='w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
                    >
                        Join
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LobbyPage;
