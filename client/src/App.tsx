import { Route, Routes } from 'react-router-dom';
import LobbyPage from './pages/lobby';
import RoomPage from './pages/room';

function App() {
    return (
        <>
            <Routes>
                <Route path='/' element={<LobbyPage />} />
                <Route path='/room/:roomId' element={<RoomPage />} />
            </Routes>
        </>
    );
}

export default App;
