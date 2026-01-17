import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJamiyaStore } from '../store/jamiyaStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Reorder } from 'framer-motion';
import { Plus, X, ArrowLeft, Dna } from 'lucide-react';
import type { Member } from '../types';

export default function AddMembers() {
    const navigate = useNavigate();
    const { currentJamiya, addMember, removeMember, setMembers } = useJamiyaStore();
    const [newName, setNewName] = useState('');

    const handleAdd = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newName.trim()) return;
        addMember(newName.trim());
        setNewName('');
    };

    if (!currentJamiya) {
        return <div className="p-8 text-center">الرجاء إنشاء جمعية أولاً <Button onClick={() => navigate('/')}>العودة</Button></div>;
    }

    return (
        <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="flex items-center justify-between mb-6" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h1 className="text-2xl font-bold" style={{ fontSize: '1.5rem' }}>إضافة الأعضاء</h1>
                <div className="text-muted" style={{ color: 'var(--text-secondary)' }}>
                    {currentJamiya.members.length} أعضاء
                </div>
            </div>

            <Card className="mb-6">
                <form onSubmit={handleAdd} className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Input
                        placeholder="اسم العضو"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                    />
                    <Button type="submit" variant="secondary">
                        <Plus className="h-5 w-5" />
                    </Button>
                </form>
            </Card>

            <div className="mb-8">
                <Reorder.Group axis="y" values={currentJamiya.members} onReorder={setMembers}>
                    {currentJamiya.members.map((member) => (
                        <Reorder.Item key={member.id} value={member} style={{ listStyle: 'none' }}>
                            <MemberItem member={member} onRemove={() => removeMember(member.id)} />
                        </Reorder.Item>
                    ))}
                </Reorder.Group>

                {currentJamiya.members.length === 0 && (
                    <div className="text-center text-muted p-4" style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        أضف الأعضاء للبدء
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Button
                    variant="primary"
                    className="w-full py-4 text-lg"
                    disabled={currentJamiya.members.length < 2}
                    onClick={() => navigate('/generate')}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}
                >
                    <Dna className="ml-2" />
                    توليد القرعة
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => navigate('/')} style={{ width: '100%' }}>
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    تعديل البيانات
                </Button>
            </div>
        </div>
    );
}

function MemberItem({ member, onRemove }: { member: Member, onRemove: () => void }) {
    // Simple Avatar Generator
    const initials = member.name.substring(0, 2).toUpperCase();
    const colorHash = member.id.charCodeAt(0) % 5;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    const bg = colors[colorHash];

    return (
        <div className="glass-hover flex items-center justify-between p-3 mb-2 rounded-lg cursor-grab active:cursor-grabbing bg-[rgba(255,255,255,0.03)]"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                    style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initials}
                </div>
                <span className="font-medium">{member.name}</span>
            </div>
            <button onClick={onRemove} className="text-muted hover:text-red-500 transition-colors p-2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
