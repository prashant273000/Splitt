import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/Home';
import Login from './pages/Login';
import PostRide from './pages/PostRide';
import PostIntent from './pages/PostIntent';

const queryClient = new QueryClient();

function Nav() {
  return (
    <nav className="bg-white shadow-sm p-4 flex gap-4">
      <Link to="/" className="font-bold">
        Splitt
      </Link>
      <Link to="/post-ride">Post Ride</Link>
      <Link to="/post-intent">Post Intent</Link>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/post-ride" element={<PostRide />} />
          <Route path="/post-intent" element={<PostIntent />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
