import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { verifyDraw } from '../lib/verify';
import { Search, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Verify() {
    const [mode, setMode] = useState<'id' | 'manual'>('id');
    const [id, setId] = useState('');
    const [manualJson, setManualJson] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ isValid: boolean; details: string; seed?: string } | null>(null);
    const [error, setError] = useState('');

    const handleVerifyId = async () => {
        if (!id.trim()) return;
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            // Fetch draw data from API
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
            const response = await fetch(`${apiUrl}/api/jam3iya/${id}/draw`);

            if (!response.ok) {
                if (response.status === 404) throw new Error('لم يتم العثور على قرعة بهذا المعرف.');
                throw new Error('حدث خطأ أثناء جلب البيانات.');
            }

            const drawData = await response.json();

            // Client-side verification
            // The API returns the draw object which matches our DrawRecord interface
            const validation = verifyDraw({
                seed: drawData.seed,
                inputs: drawData.inputs,
                results: drawData.results.map((r: any) => ({ memberId: r.memberId, score: r.score }))
            });

            setResult({
                ...validation,
                seed: drawData.seed
            });

        } catch (err: any) {
            setError(err.message || 'فشل التحقق');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyManual = () => {
        if (!manualJson.trim()) return;
        setError('');
        setResult(null);

        try {
            const data = JSON.parse(manualJson);

            // Simple validation of JSON structure
            if (!data.seed || !data.inputs || !data.results) {
                throw new Error('البيانات غير مكتمة. يجب أن تحتوي على: seed, inputs, results');
            }

            const validation = verifyDraw({
                seed: data.seed,
                inputs: data.inputs,
                results: data.results.map((r: any) => ({ memberId: r.memberId, score: r.score }))
            });

            setResult({
                ...validation,
                seed: data.seed
            });

        } catch (err: any) {
            setError('JSON غير صالح: ' + err.message);
        }
    };

    return (
        <div className="container animate-fade-in max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
                <Shield className="w-16 h-16 mx-auto text-[var(--accent-primary)] mb-4" />
                <h1 className="text-3xl font-bold mb-2">التحقق من النزاهة</h1>
                <p className="text-muted">نظام التحقق المستقل للتأكد من عدم التلاعب بالنتائج.</p>
            </div>

            <Card className="mb-6">
                <div className="flex gap-4 border-b border-white/10 pb-4 mb-4">
                    <button
                        className={`flex-1 pb-2 text-sm font-medium transition-colors ${mode === 'id' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-muted hover:text-white'}`}
                        onClick={() => { setMode('id'); setResult(null); setError(''); }}
                    >
                        التحقق بالمعرف (ID)
                    </button>
                    <button
                        className={`flex-1 pb-2 text-sm font-medium transition-colors ${mode === 'manual' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-muted hover:text-white'}`}
                        onClick={() => { setMode('manual'); setResult(null); setError(''); }}
                    >
                        التحقق اليدوي (متقدم)
                    </button>
                </div>

                {mode === 'id' ? (
                    <div className="space-y-4">
                        <Input
                            label="معرف الجمعية (Jam3iya ID)"
                            placeholder="أدخل المعرف هنا (UUID)..."
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                        />
                        <Button
                            className="w-full"
                            onClick={handleVerifyId}
                            isLoading={isLoading}
                            disabled={!id}
                        >
                            <Search className="ml-2 h-4 w-4" />
                            تحقق الآن
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">بيانات JSON للقرعة</label>
                            <textarea
                                className="w-full h-48 bg-black/20 border border-white/10 rounded-lg p-3 text-xs font-mono focus:border-[var(--primary)] outline-none resize-none"
                                placeholder='{"seed": "...", "inputs": {...}, "results": [...]}'
                                value={manualJson}
                                onChange={(e) => setManualJson(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleVerifyManual}
                            disabled={!manualJson}
                        >
                            <Shield className="ml-2 h-4 w-4" />
                            تحقق من البيانات
                        </Button>
                    </div>
                )}
            </Card>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-center mb-6 animate-fade-in">
                    <AlertTriangle className="inline-block mb-1 mr-2" size={16} />
                    {error}
                </div>
            )}

            {result && (
                <Card className={`text-center animate-scale-in border-2 ${result.isValid ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {result.isValid ? (
                            <>
                                <CheckCircle className="w-20 h-20 text-green-500" />
                                <h2 className="text-2xl font-bold text-green-500">القرعة سليمة (Valid)</h2>
                                <p className="text-sm text-green-400/80">
                                    تم إعادة حساب النتائج محلياً وتطابقت تماماً مع السجلات.
                                </p>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-20 h-20 text-red-500" />
                                <h2 className="text-2xl font-bold text-red-500">فشل التحقق (Invalid)</h2>
                                <p className="text-sm text-red-400/80 font-mono text-left dir-ltr whitespace-pre-wrap">
                                    {result.details}
                                </p>
                            </>
                        )}

                        {result.isValid && (
                            <div className="mt-4 p-4 bg-black/40 rounded-lg w-full text-left">
                                <div className="text-xs text-muted font-mono break-all">
                                    <span className="text-[var(--primary)]">VERIFIED SEED:</span><br />
                                    {result.seed}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <div className="mt-8 text-center">
                <Link to="/">
                    <Button variant="ghost">رجوع للرئيسية</Button>
                </Link>
            </div>
        </div>
    );
}
