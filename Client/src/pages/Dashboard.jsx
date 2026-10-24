import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ReportView from '../components/ReportView';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_JD_CHARS = 30;
const MAX_JD_CHARS = 8000;

const STEPS = [
    'Reading your resume…',
    'Analyzing the job requirements…',
    'Matching your skills to the role…',
    'Writing tailored interview questions…',
    'Building your preparation plan…',
];

const reportTitle = (r) => {
    const firstLine = (r.jobDescription || '').split('\n').find((l) => l.trim()) || 'Untitled role';
    return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
};

const badgeColor = (score) =>
    score >= 75 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : score >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';

const Dashboard = () => {
    const [resume, setResume] = useState(null);
    const [selfDescription, setSelfDescription] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const resultRef = useRef(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const { data } = await api.get('/api/interview');
                setReports(data.reports);
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to load previous reports');
            } finally {
                setReportsLoading(false);
            }
        };
        fetchReports();
    }, []);

    // Cycle through progress messages while the report is being generated
    useEffect(() => {
        if (!loading) return undefined;
        const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
        return () => clearInterval(id);
    }, [loading]);

    const pickFile = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Please upload a PDF file.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            toast.error('Resume must be under 5MB.');
            return;
        }
        setResume(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        pickFile(e.dataTransfer.files?.[0]);
    };

    const openReport = (r) => {
        setReport(r);
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('Delete this interview report? This cannot be undone.')) return;
        try {
            await api.delete(`/api/interview/${reportId}`);
            setReports((cur) => cur.filter((item) => item._id !== reportId));
            setReport((cur) => (cur?._id === reportId ? null : cur));
            toast.success('Report deleted');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete report');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!resume) return toast.error('Please upload your resume (PDF).');
        if (jobDescription.trim().length < MIN_JD_CHARS) {
            return toast.error('Please paste a fuller job description (at least a few sentences).');
        }

        const formData = new FormData();
        formData.append('resume', resume);
        formData.append('selfDescription', selfDescription);
        formData.append('jobDescription', jobDescription);

        setStep(0);
        setLoading(true);
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
            const { data } = await api.post('/api/interview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 180000,
            });
            setReport(data.report);
            setReports((cur) => [data.report, ...cur]);
            toast.success('Report generated!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative p-4 sm:p-6 max-w-[1440px] mx-auto min-h-[calc(100vh-70px)]">
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
                {/* ---------- Left column: form + history ---------- */}
                <div className="flex flex-col gap-6">
                    <div className="minimal-card overflow-hidden">
                        <div className="border-b border-dark-border bg-white/[0.02] px-6 py-5">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-lg text-indigo-300">✦</span>
                                <div>
                                    <h2 className="font-semibold text-white">Build a new report</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">Takes about 30–60 seconds</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-300">Resume (PDF)</label>
                                <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => pickFile(e.target.files?.[0])}
                                    id="resume-upload"
                                    className="sr-only"
                                />
                                <label
                                    htmlFor="resume-upload"
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    className={`group flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-5 text-center text-sm break-all cursor-pointer transition-all ${
                                        dragging ? 'border-indigo-400 bg-indigo-500/10 text-white'
                                        : resume ? 'border-indigo-500/40 bg-indigo-500/5 text-gray-200'
                                        : 'border-dark-border hover:border-gray-500 hover:bg-white/5 text-gray-400'
                                    }`}
                                >
                                    <span className={`text-2xl transition-transform ${resume ? '' : 'group-hover:-translate-y-0.5'}`}>{resume ? '✓' : '↑'}</span>
                                    <span className={resume ? 'text-gray-200' : 'text-gray-300'}>{resume ? resume.name : 'Drop your PDF here'}</span>
                                    <span className="text-xs text-gray-600">
                                        {resume ? `${(resume.size / 1024).toFixed(0)} KB · click to replace` : 'or click to browse · PDF up to 5MB'}
                                    </span>
                                </label>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="self-desc" className="text-sm font-medium text-gray-300">
                                    About you <span className="text-gray-600 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    id="self-desc"
                                    value={selfDescription}
                                    onChange={(e) => setSelfDescription(e.target.value.slice(0, 2000))}
                                    placeholder="Goals, career change, anything the resume doesn't show…"
                                    rows="3"
                                    className="input-minimal resize-y text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="job-desc" className="text-sm font-medium text-gray-300">Job description *</label>
                                <textarea
                                    id="job-desc"
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
                                    placeholder="Paste the full job description here…"
                                    rows="8"
                                    required
                                    className="input-minimal resize-y text-sm"
                                />
                                <span className="text-xs text-gray-600 self-end">{jobDescription.length} / {MAX_JD_CHARS}</span>
                            </div>

                            <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm" disabled={loading}>
                                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <span>✦</span>}
                                {loading ? 'Generating your report…' : 'Generate interview report'}
                            </button>
                        </form>
                    </div>

                    <section className="minimal-card p-6" aria-labelledby="history-heading">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 id="history-heading" className="text-sm font-semibold text-white">Previous reports</h2>
                                <p className="mt-1 text-xs text-gray-600">Revisit your preparation anytime</p>
                            </div>
                            <span className="rounded-full border border-dark-border bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-gray-500">{reports.length}</span>
                        </div>
                        {reportsLoading ? (
                            <div className="flex items-center gap-3 text-sm text-gray-500"><div className="spinner w-5 h-5" />Loading…</div>
                        ) : reports.length === 0 ? (
                            <p className="text-sm text-gray-600">No reports yet — generate your first one above.</p>
                        ) : (
                            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                                {reports.map((r) => (
                                    <li
                                        key={r._id}
                                        className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${
                                            report?._id === r._id ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-dark-border hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        <button type="button" className="text-left flex-1 min-w-0" onClick={() => openReport(r)}>
                                            <span className="block text-sm text-white truncate">{reportTitle(r)}</span>
                                            <span className="block text-xs text-gray-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</span>
                                        </button>
                                        {r.matchScore !== undefined && (
                                            <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${badgeColor(r.matchScore)}`}>{r.matchScore}</span>
                                        )}
                                        <button
                                            type="button"
                                            aria-label="Delete report"
                                            className="text-gray-600 hover:text-red-400 transition-colors"
                                            onClick={() => handleDeleteReport(r._id)}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* ---------- Right column: result ---------- */}
                <div ref={resultRef} className="minimal-card min-h-[600px] scroll-mt-24 p-5 sm:p-7 flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
                            <div className="spinner mb-6" />
                            <p className="text-sm text-gray-200 mb-4">{STEPS[step]}</p>
                            <div className="w-56 h-1 bg-dark-border rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-600 mt-4">Usually 20–60 seconds</p>
                        </div>
                    ) : report ? (
                        <ReportView key={report._id} report={report} />
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center text-gray-600">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-dark-border flex items-center justify-center text-3xl mb-4 opacity-70">📄</div>
                            <p className="text-sm">Your report will appear here.</p>
                            <p className="text-xs text-gray-700 mt-1">Fill out the form to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
