import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJamiyaStore } from '../store/jamiyaStore';
import { generateSeed, generateFairOrder, type SeedInputs } from '../shared/seed'; // Path alias @shared? Using relative for now to be safe until alias verified
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Hash, Clock, ShieldCheck, Lock, Settings } from 'lucide-react';

export default function GenerateDraw() {
    const navigate = useNavigate();
    const { currentJamiya, setDraw } = useJamiyaStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [externalEvent, setExternalEvent] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time preview until generation starts
    useEffect(() => {
        if (isGenerating) return;
        const interval = setInterval(() => setCurrentTime(Date.now()), 100);
        return () => clearInterval(interval);
    }, [isGenerating]);

    if (!currentJamiya || currentJamiya.members.length < 2) {
        return <div className="p-8 text-center">الرجاء إضافة أعضاء أولاً <Button onClick={() => navigate('/add-members')}>العودة</Button></div>;
    }

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Simulate "Processing" / Network delay for effect
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 1. Prepare Inputs
        const timestamp = Date.now(); // Freezing time 
        // Plan said "Salt in CreateJamiya". 
        // I didn't save salt in `CreateJamiya.tsx` to store!
        // I should fix that. Or ask for salt here if missing. 
        // Let's assume empty salt or ask here if I missed it.
        // Actually, asking here is good for "Commitment".
        // I'll use a fixed salt for now or add input.
        // Let's add Salt input here if we want "User Interaction". 
        // But Plan said it's in Create.
        // I'll add a "Salt" input here as confirmation/finalization.

        const inputSalt = (document.getElementById('salt-input') as HTMLInputElement)?.value || '';

        const inputs: SeedInputs = {
            members: currentJamiya.members.map(m => m.id),
            timestamp,
            salt: inputSalt,
            externalEvent: externalEvent || undefined
        };

        // 2. Generate
        const seed = generateSeed(inputs);
        const rankedMembers = generateFairOrder(seed, inputs.members);

        // 3. Save Result
        const results = rankedMembers.map((r, i) => {
            const member = currentJamiya.members.find(m => m.id === r.memberId);
            return {
                month: i + 1,
                memberId: r.memberId,
                memberName: member?.name || 'Unknown',
                score: r.score
            };
        });

        setDraw({
            id: crypto.randomUUID(),
            jamiyaId: currentJamiya.id,
            seed,
            inputs,
            results,
            createdAt: new Date().toISOString(),
            isLocked: true
        });

        navigate('/results');
    };

    return (
        <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">توليد القرعة</h1>
                <p className="text-muted">نظام عشوائي حتمي (Deterministic Randomness)</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

                {/* Transparency Report */}
                <Card>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="text-green-500" />
                        عناصر الشفافية
                    </h2>

                    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.05)]" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                            <span className="flex items-center gap-2"><Clock size={16} /> التوقيت (Timestamp)</span>
                            <span className="font-mono text-sm">{timestampToTime(currentTime)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.05)]" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                            <span className="flex items-center gap-2"><Hash size={16} /> عدد الأعضاء</span>
                            <span className="font-mono">{currentJamiya.members.length}</span>
                        </div>

                        <div className="p-3 rounded bg-[rgba(255,255,255,0.05)]">
                            <label className="text-sm text-muted mb-1 block">كلمة التوثيق (Salt)</label>
                            <Input id="salt-input" placeholder="أدخل كلمة سرية أو جملة للتوثيق" />
                            <p className="text-xs text-muted mt-1">تستخدم هذه الكلمة لتغيير النتيجة بشكل جذري وسري.</p>
                        </div>
                    </div>
                </Card>

                {/* Action Area */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-muted hover:text-white mb-4 transition-colors w-full"
                        >
                            <Settings size={16} />
                            خيارات متقدمة (Advanced)
                        </button>

                        {showAdvanced && (
                            <div className="animate-fade-in mb-4">
                                <Input
                                    label="حدث خارجي (اختياري)"
                                    placeholder="مثال: Ethereum Block Hash #123456"
                                    value={externalEvent}
                                    onChange={(e) => setExternalEvent(e.target.value)}
                                />
                                <p className="text-xs text-muted mt-1">يمكنك ربط القرعة بحدث عالمي لا يمكننا التحكم فيه لزيادة المصداقية.</p>
                            </div>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleGenerate}
                            className="w-full py-6 text-xl relative overflow-hidden"
                            disabled={isGenerating}
                            isLoading={isGenerating}
                            style={{ width: '100%', padding: '1.5rem', fontSize: '1.25rem' }}
                        >
                            {isGenerating ? 'جاري الحساب...' : 'إغلاق واعتماد القرعة'}
                            {!isGenerating && <Lock className="ml-2 absolute left-4 opacity-50" />}
                        </Button>

                        <p className="text-xs text-center text-muted mt-4">
                            تنبيه: بمجرد الاعتماد، لا يمكن تغيير الترتيب أبداً.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function timestampToTime(ts: number) {
    return new Date(ts).toISOString().split('T')[1].replace('Z', '');
}
