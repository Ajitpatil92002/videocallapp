import { useCallback, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/socket-provider';
import { peerService } from '../services/peer';

const RoomPage = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const socket = useSocket();
    const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
    const [myStream, setMyStream] = useState<MediaStream | undefined>();
    const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>();

    const handleUserJoined = useCallback(
        ({ email, id }: { email: string; id: string }) => {
            console.log(`Email ${email} joined room`);
            setRemoteSocketId(id);
        },
        []
    );

    const handleCallUser = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        const offer = await peerService.getOffer();
        socket.emit('user:call', { to: remoteSocketId, offer });
        setMyStream(stream);
    }, [remoteSocketId, socket]);

    const handleIncomingCall = useCallback(
        async ({
            from,
            offer,
        }: {
            from: string;
            offer: RTCSessionDescriptionInit;
        }) => {
            setRemoteSocketId(from);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });
            setMyStream(stream);
            console.log(`Incoming Call`, from, offer);
            const ans = await peerService.getAnswer(offer);
            socket.emit('call:accepted', { to: from, ans });
        },
        [socket]
    );

    const sendStreams = useCallback(() => {
        if (myStream) {
            for (const track of myStream.getTracks()) {
                peerService.peer.addTrack(track, myStream);
            }
        }
    }, [myStream]);

    const handleCallAccepted = useCallback(
        ({ from, ans }: { from: string; ans: RTCSessionDescriptionInit }) => {
            peerService.setLocalDescription(ans);
            console.log('Call Accepted!');
            sendStreams();
        },
        [sendStreams]
    );

    const handleNegoNeeded = useCallback(async () => {
        const offer = await peerService.getOffer();
        socket.emit('peer:nego:needed', { offer, to: remoteSocketId });
    }, [remoteSocketId, socket]);

    useEffect(() => {
        peerService.peer.addEventListener(
            'negotiationneeded',
            handleNegoNeeded
        );
        return () => {
            peerService.peer.removeEventListener(
                'negotiationneeded',
                handleNegoNeeded
            );
        };
    }, [handleNegoNeeded]);

    const handleNegoNeedIncoming = useCallback(
        async ({
            from,
            offer,
        }: {
            from: string;
            offer: RTCSessionDescriptionInit;
        }) => {
            const ans = await peerService.getAnswer(offer);
            socket.emit('peer:nego:done', { to: from, ans });
        },
        [socket]
    );

    const handleNegoNeedFinal = useCallback(
        async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
            await peerService.setLocalDescription(ans);
        },
        []
    );

    useEffect(() => {
        peerService.peer.addEventListener(
            'track',
            async (ev: RTCTrackEvent) => {
                const remoteStream = ev.streams;
                console.log('GOT TRACKS!!');
                setRemoteStream(remoteStream[0]);
            }
        );
    }, []);

    useEffect(() => {
        socket.on('user:joined', handleUserJoined);
        socket.on('incomming:call', handleIncomingCall);
        socket.on('call:accepted', handleCallAccepted);
        socket.on('peer:nego:needed', handleNegoNeedIncoming);
        socket.on('peer:nego:final', handleNegoNeedFinal);

        return () => {
            socket.off('user:joined', handleUserJoined);
            socket.off('incomming:call', handleIncomingCall);
            socket.off('call:accepted', handleCallAccepted);
            socket.off('peer:nego:needed', handleNegoNeedIncoming);
            socket.off('peer:nego:final', handleNegoNeedFinal);
        };
    }, [
        socket,
        handleUserJoined,
        handleIncomingCall,
        handleCallAccepted,
        handleNegoNeedIncoming,
        handleNegoNeedFinal,
    ]);

    return (
        <div className='min-h-screen bg-gray-100 p-8'>
            <div className='max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden'>
                <header className='bg-blue-600 text-white p-4'>
                    <h1 className='text-2xl font-bold'>Video Chat Room</h1>
                    <p className='text-sm'>Room ID: {roomId}</p>
                </header>

                <main className='p-6'>
                    <div className='mb-6'>
                        <h2 className='text-xl font-semibold mb-2'>
                            Room Status
                        </h2>
                        <p className='text-lg'>
                            {remoteSocketId ? (
                                <span className='text-green-600'>
                                    Connected: {remoteSocketId}
                                </span>
                            ) : (
                                <span className='text-red-600'>
                                    No one in room
                                </span>
                            )}
                        </p>
                    </div>

                    <div className='mb-6'>
                        {myStream && (
                            <button
                                onClick={sendStreams}
                                className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 mr-4'
                            >
                                Send Stream
                            </button>
                        )}
                        {remoteSocketId && !myStream && (
                            <button
                                onClick={handleCallUser}
                                className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300'
                            >
                                Start Video Call
                            </button>
                        )}
                    </div>

                    {myStream && (
                        <div className='mb-6'>
                            <h3 className='text-lg font-semibold mb-2'>
                                My Stream
                            </h3>
                            <div className='aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden'>
                                <ReactPlayer
                                    url={myStream}
                                    playing
                                    muted
                                    width='100%'
                                    height='100%'
                                />
                            </div>
                        </div>
                    )}

                    {remoteStream && (
                        <div className='mb-6'>
                            <h3 className='text-lg font-semibold mb-2'>
                                Remote Stream
                            </h3>
                            <div className='aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden'>
                                <ReactPlayer
                                    url={remoteStream}
                                    playing
                                    width='100%'
                                    height='100%'
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default RoomPage;
