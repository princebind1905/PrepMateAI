import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-70px)] p-6">
            <div className="minimal-card w-full max-w-sm p-8 shadow-2xl shadow-black/40 animate-[fadeIn_0.4s_ease-out]">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-1">Welcome back</h2>
                    <p className="text-sm text-gray-400">Log in to your account to continue</p>
                </div>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-gray-300">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="input-minimal"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-gray-300">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-minimal"
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-400">
                    <p>Don't have an account? <Link to="/register" className="text-white hover:underline transition-all">Sign up</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
