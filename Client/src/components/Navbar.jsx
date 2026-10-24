import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="sticky top-0 z-[100] bg-dark-bg/90 backdrop-blur-md border-b border-dark-border">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2.5 group">
                    <span className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                        P
                    </span>
                    <span className="text-lg font-bold tracking-tight text-white">
                        PrepMate<span className="text-indigo-400">AI</span>
                    </span>
                </Link>
                <div className="flex items-center gap-6">
                    {user ? (
                        <>
                            <Link to="/dashboard" className="text-sm text-gray-400 font-medium hover:text-white transition-colors">Dashboard</Link>
                            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-dark-border">
                                <span className="w-7 h-7 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-xs font-semibold text-gray-300 uppercase">
                                    {user.username?.charAt(0) || '?'}
                                </span>
                                <span className="text-sm text-gray-300 max-w-[120px] truncate">{user.username}</span>
                            </div>
                            <button onClick={logout} className="text-sm text-gray-400 font-medium hover:text-white transition-colors">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm text-gray-400 font-medium hover:text-white transition-colors">Login</Link>
                            <Link to="/register" className="btn-primary text-sm px-4 py-2">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
