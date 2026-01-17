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
        const inputSalt = (document.getElementById('salt-input') as HTMLInputElement)?.value || '';
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

        try {
            // 1. Sync Jam3iya to Server (Create Record)
            const jamResponse = await fetch(`${apiUrl}/api/jam3iya`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentJamiya.name,
                    amount: currentJamiya.amount,
                    startDate: currentJamiya.startDate,
                    members: currentJamiya.members.map(m => m.name) // Server creates new IDs for members
                })
            });

            if (!jamResponse.ok) {
                console.error('Failed to sync Jam3iya to server');
                // Fallback to local generation if server fails? 
                // For now, let's throw to alert user, or fallback silently?
                // Throwing is safer for "Transparency" -> User knows something is wrong.
                throw new Error('فشل الاتصال بالسيرفر. يرجى التحقق من الإنترنت.');
            }

            const jamData = await jamResponse.json();
            const serverId = jamData.id;

            // 2. Generate Draw on Server (Source of Truth)
            const drawResponse = await fetch(`${apiUrl}/api/jam3iya/${serverId}/draw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salt: inputSalt,
                    externalEvent: externalEvent || undefined
                })
            });

            if (!drawResponse.ok) {
                throw new Error('فشل توليد القرعة على السيرفر.');
            }

            const drawData = await drawResponse.json();

            // 3. Update Local Store with Server Data (Critical: Update ID and Results)
            // We need to map server results to our store format
            // Server returns: results: [{ memberId, memberName, score, month }]
            // Our store expects local Member IDs? 
            // Wait, server created NEW Member IDs.
            // So we must update our local currentJamiya members to match server IDs.

            // Re-construct members from server response or use what we have?
            // Technically, we should replace local jamiya with server jamiya.

            // Let's update Store:
            // Update Jamiya ID
            useJamiyaStore.getState().updateJamiyaParts({ id: serverId }); // Use getState to avoid closure staleness if needed, but setDraw handles it.
            // Actually, we should update the whole object ideally.
            // But let's just proceed with Draw Data which contains everything relevant for Results.

            // The Results page displays names. DrawData has names.

            setDraw({
                id: drawData.id,
                jamiyaId: serverId,
                seed: drawData.seed,
                inputs: drawData.inputs,
                results: drawData.results, // These have server memberIds.
                createdAt: drawData.createdAt,
                isLocked: true
            });

            // Also update the currentJamiya ID primarily so Verify link works
            useJamiyaStore.getState().updateJamiyaParts({ id: serverId });

            navigate('/results');

        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الاتصال بالسيرفر. سيتم التوليد محلياً (لن يعمل التحقق عبر الإنترنت).');

            // Fallback: Local Generation (Legacy Logic)
            await fallbackLocalGenerate(inputSalt);
        } finally {
            setIsGenerating(false);
        }
    };

    const fallbackLocalGenerate = async (salt: string) => {
        const timestamp = Date.now();
        const inputs: SeedInputs = {
            members: currentJamiya.members.map(m => m.id),
            timestamp,
            salt,
            externalEvent: externalEvent || undefined
        };

        const seed = generateSeed(inputs);
        const rankedMembers = generateFairOrder(seed, inputs.members);

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
