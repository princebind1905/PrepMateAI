import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="relative flex flex-col items-center justify-center p-8 min-h-[calc(100vh-70px)] overflow-hidden">
            <div
                className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(closest-side, #6366f1, transparent)' }}
            />

            <div className="relative text-center max-w-3xl mb-20 animate-[fadeIn_0.8s_ease-out]">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
                    AI-Powered Interview Prep
                </span>
                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                    Master Your Next Interview.
                </h1>
                <p className="text-xl text-gray-400 leading-relaxed mb-10 px-4">
                    Upload your resume, paste the job description, and let our AI generate a personalized, highly accurate interview report in seconds.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {user ? (
                        <Link to="/dashboard" className="btn-primary text-base">Go to Dashboard</Link>
                    ) : (
                        <>
                            <Link to="/register" className="btn-primary text-base">Get Started</Link>
                            <Link to="/login" className="btn-secondary text-base">Login</Link>
                        </>
                    )}
                </div>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
                <div className="minimal-card p-8 hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Resume Analysis</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">We parse your resume to understand your unique background and skill set.</p>
                </div>
                <div className="minimal-card p-8 hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">🎯</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Job Matching</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">We compare your profile against the specific job description you provide.</p>
                </div>
                <div className="minimal-card p-8 hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">💡</div>
                    <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Get actionable insights, potential interview questions, and prep strategies.</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
