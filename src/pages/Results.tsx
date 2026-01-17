import { useState } from 'react';
import { useJamiyaStore } from '../store/jamiyaStore';
import { generatePdf } from '../lib/pdf';
import { verifyDraw } from '../lib/verify';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Download, CheckCircle, AlertTriangle, Shield, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Results() {
    const { currentJamiya, currentDraw } = useJamiyaStore();
    const [showVerify, setShowVerify] = useState(false);

    if (!currentJamiya || !currentDraw) {
        return <div className="p-8 center">لا توجد نتائج.</div>;
    }

    const handleDownload = () => {
        generatePdf({
            jam3iyaName: currentJamiya.name,
            amount: currentJamiya.amount,
            date: new Date(currentDraw.createdAt).toLocaleDateString(),
            seed: currentDraw.seed,
            inputs: currentDraw.inputs,
            results: currentDraw.results
        });
    };

    const verification = verifyDraw({
        seed: currentDraw.seed,
        inputs: currentDraw.inputs,
        results: currentDraw.results.map(r => ({ memberId: r.memberId, score: r.score }))
    });

    return (
        <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 mb-4">
                    <Shield size={14} />
                    <span>موثقة ومقفلة</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{currentJamiya.name}</h1>
                <p className="text-muted">الترتيب النهائي الرسمي</p>
            </div>

            <div className="flex flex-col gap-6">
                {/* Timeline */}
                <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {currentDraw.results.map((item, idx) => (
                        <Card key={item.memberId} className="flex items-center gap-4 relative overflow-hidden" style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                            <div className="text-2xl font-bold text-muted opacity-20 absolute left-4">
                                #{idx + 1}
                            </div>

                            <div className="bg-[var(--accent-primary)] w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.month}
                            </div>

                            <div className="flex-1">
                                <div className="text-xs text-muted">الشهر {item.month}</div>
                                <div className="font-bold text-lg">{item.memberName}</div>
                            </div>

                            <div className="text-right hidden sm:block">
                                <div className="text-xs text-muted font-mono" title={item.score}>
                                    {item.score.substring(0, 8)}...
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Button variant="primary" onClick={handleDownload} style={{ width: '100%' }}>
                        <Download className="ml-2 h-4 w-4" />
                        تحميل PDF
                    </Button>
                    <Button variant="secondary" onClick={() => setShowVerify(!showVerify)} style={{ width: '100%' }}>
                        <CheckCircle className="ml-2 h-4 w-4" />
                        التحقق التقني
                    </Button>
                </div>

                {/* Navigation & Link */}
                <div className="flex flex-col gap-4 mt-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-sm text-muted mb-2">رابط هذه القرعة (للمشاركة والحفظ):</p>
                        <div className="flex items-center gap-2 p-2 bg-black/50 rounded font-mono text-xs select-all text-ellipsis overflow-hidden">
                            {window.location.href}
                        </div>
                        <Button
                            variant="ghost"
                            className="mt-2 text-xs w-full py-1 h-auto"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('تم نسخ الرابط!');
                            }}
                        >
                            نسخ الرابط
                        </Button>
                    </div>

                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" style={{ width: '100%' }}>
                            العودة للصفحة الرئيسية
                        </Button>
                    </Link>
                </div>

                {/* Verification Expansion */}
                {showVerify && (
                    <Card className="bg-black/40 border-green-500/30">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            {verification.isValid ? <Check className="text-green-500" /> : <AlertTriangle className="text-red-500" />}
                            نتيجة التحقق التلقائي
                        </h3>
                        <p className="text-sm text-green-400 mb-4">{verification.details}</p>

                        <div className="text-xs font-mono text-muted space-y-2" style={{ wordBreak: 'break-all' }}>
                            <div className="p-2 bg-black/50 rounded flex justify-between items-center">
                                <span>
                                    <strong>ID:</strong> {currentJamiya.id || 'Local'}
                                </span>
                                <Button
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentJamiya.id || '');
                                        alert('تم نسخ المعرف (ID)');
                                    }}
                                >
                                    نسخ
                                </Button>
                            </div>
                            <div className="p-2 bg-black/50 rounded">
                                <strong>SEED:</strong> {currentDraw.seed}
                            </div>
                            <div className="p-2 bg-black/50 rounded">
                                <strong>Inputs Hash:</strong> {JSON.stringify(currentDraw.inputs).substring(0, 50)}...
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 text-center">
                                <Link to="/verify">
                                    <Button variant="outline" className="w-full text-xs">
                                        <Shield className="mr-2 h-3 w-3" />
                                        الذهاب لصفحة التحقق المستقل
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
