import { useState } from 'react';
import toast from 'react-hot-toast';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'technical', label: 'Technical' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'gaps', label: 'Skill Gaps' },
    { id: 'plan', label: 'Prep Plan' },
];

const scoreTone = (score) =>
    score >= 75 ? { text: 'text-green-400', stroke: '#4ade80', label: 'Strong match' }
    : score >= 50 ? { text: 'text-yellow-400', stroke: '#facc15', label: 'Partial match' }
    : { text: 'text-red-400', stroke: '#f87171', label: 'Weak match' };

const severityStyle = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const ScoreRing = ({ score }) => {
    const tone = scoreTone(score);
    const r = 40;
    const circumference = 2 * Math.PI * r;
    return (
        <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r} fill="none" stroke={tone.stroke} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - score / 100)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${tone.text}`}>{score}</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">/ 100</span>
            </div>
        </div>
    );
};

const QuestionList = ({ items, answerLabel }) => {
    return (
        <div className="flex flex-col gap-3">
            {items.map((q, i) => {
                return (
                    <div key={i} className="border border-dark-border rounded-lg bg-dark-bg overflow-hidden">
                        <div className="w-full flex items-start gap-4 p-4 text-left">
                            <span className="text-white font-medium">
                                <span className="text-gray-500 mr-2">{i + 1}.</span>{q.question}
                            </span>
                        </div>
                        <div className="px-4 pb-4 flex flex-col gap-3 animate-[fadeIn_0.25s_ease-out]">
                            {q.intension && (
                                <p className="text-sm text-indigo-300/80">
                                    <span className="text-gray-500">Why they ask: </span>{q.intension}
                                </p>
                            )}
                            {q.answer && (
                                <div className="text-sm text-gray-300 bg-white/5 rounded-lg p-4 whitespace-pre-line leading-relaxed">
                                    <strong className="text-white block mb-1">{answerLabel}</strong>
                                    {q.answer}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const toPlainText = (r) => [
    `INTERVIEW PREP REPORT — Match ${r.matchScore}/100`,
    '', 'SUMMARY', r.summary,
    '', 'TECHNICAL QUESTIONS',
    ...(r.technicalQuestions || []).map((q, i) => `${i + 1}. ${q.question}\n   Answer: ${q.answer}`),
    '', 'BEHAVIORAL QUESTIONS',
    ...(r.behavioralQuestions || []).map((q, i) => `${i + 1}. ${q.question}\n   Answer: ${q.answer}`),
    '', 'SKILL GAPS',
    ...(r.skillGaps || []).map((g) => `- ${g.skill} (${g.severity})`),
    '', 'PREPARATION PLAN',
    ...(r.preparationPlan || []).map((p) => `${p.day}: ${p.focus}\n${(p.tasks || []).map((t) => `  • ${t}`).join('\n')}`),
].join('\n');

const ReportView = ({ report }) => {
    const [tab, setTab] = useState('overview');
    const tone = scoreTone(report.matchScore ?? 0);
    const gaps = report.skillGaps || [];
    const highGaps = gaps.filter((g) => g.severity === 'high');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(toPlainText(report));
            toast.success('Report copied to clipboard');
        } catch {
            toast.error('Could not copy report');
        }
    };

    return (
        <div className="animate-[fadeIn_0.4s_ease-out] text-gray-300">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">Personalized analysis</p>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Interview Prep Report</h2>
                </div>
                <button type="button" onClick={copy} className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs">
                    <span>↗</span> Copy report
                </button>
            </div>

            <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-dark-border bg-dark-bg p-1" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`rounded-lg px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                            tab === t.id ? 'bg-indigo-500/15 text-indigo-200 shadow-sm' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="flex flex-col gap-6">
                    <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-transparent p-6 sm:flex-row">
                        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl" />
                        <ScoreRing score={report.matchScore ?? 0} />
                        <div className="relative">
                            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${tone.text}`}>{tone.label}</p>
                            <p className="leading-relaxed text-gray-300">{report.summary || 'Summary unavailable'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            ['Technical Qs', report.technicalQuestions?.length || 0],
                            ['Behavioral Qs', report.behavioralQuestions?.length || 0],
                            ['High-priority gaps', highGaps.length],
                            ['Prep days', report.preparationPlan?.length || 0],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-dark-border bg-dark-bg p-4 transition-colors hover:border-gray-600">
                                <div className="text-2xl font-bold text-white">{value}</div>
                                <div className="text-xs text-gray-500 mt-1">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'technical' && <QuestionList items={report.technicalQuestions || []} answerLabel="Expected answer" />}
            {tab === 'behavioral' && <QuestionList items={report.behavioralQuestions || []} answerLabel="STAR guide" />}

            {tab === 'gaps' && (
                gaps.length === 0 ? (
                    <p className="text-sm text-gray-500">No major skill gaps found for this role. 🎉</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[...gaps].sort((a, b) => ['high', 'medium', 'low'].indexOf(a.severity) - ['high', 'medium', 'low'].indexOf(b.severity))
                            .map((gap, i) => (
                            <div key={i} className="bg-dark-bg border border-dark-border p-4 rounded-lg flex items-center justify-between gap-3">
                                <span className="text-gray-200 text-sm">{gap.skill}</span>
                                <span className={`text-[10px] px-2 py-1 rounded font-semibold uppercase tracking-widest border ${severityStyle[gap.severity] || severityStyle.medium}`}>
                                    {gap.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === 'plan' && (
                <div className="relative border-l border-dark-border ml-3 flex flex-col gap-8 pb-2">
                    {(report.preparationPlan || []).map((plan, i) => (
                        <div key={i} className="pl-6 relative">
                            <div className="absolute w-2 h-2 bg-indigo-500 rounded-full -left-[4.5px] top-1.5 ring-4 ring-dark-card" />
                            <strong className="text-white block">{plan.day}: {plan.focus}</strong>
                            <ul className="list-disc pl-5 text-gray-400 text-sm space-y-1.5 mt-2">
                                {(plan.tasks || []).map((task, j) => <li key={j}>{task}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportView;
