import { Route, Routes } from 'react-router-dom';
import LobbyPage from './pages/lobby';
import MultiRoomPage from './pages/multiroom';
import RoomPage from './pages/room';

function App() {
    return (
        <>
            <Routes>
                <Route path='/' element={<LobbyPage />} />
                <Route path='/room/:roomId' element={<RoomPage />} />
                <Route
                    path='/multiroom/:roomId'
                    element={<MultiRoomPage />}
                />{' '}
                // Add this route
            </Routes>
        </>
    );
}

export default App;
