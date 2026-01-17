import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useJamiyaStore } from '../store/jamiyaStore'; // Assuming this exists now
import { UserPlus } from 'lucide-react';

export default function CreateJamiya() {
    const navigate = useNavigate();
    const { updateJamiyaParts } = useJamiyaStore();

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) return;

        updateJamiyaParts({
            name: formData.name,
            amount: parseFloat(formData.amount),
            startDate: formData.startDate,
            // Logic for new ID is handled in store if missing
        });

        navigate('/add-members');
    };

    return (
        <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
            <div className="flex flex-col items-center mb-8 text-center" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 className="text-4xl font-bold mb-2 text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    أهلاً في قُرعة
                </h1>
                <p className="text-lg text-muted" style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
                    أنظم جمعية، عادلة، شفافة، وللأبد.
                </p>
            </div>

            <Card className="w-full max-w-md mx-auto" style={{ maxWidth: '28rem', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <Input
                        label="اسم الجمعية"
                        placeholder="مثلاً: جمعية العائلة 2026"
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        required
                        autoFocus
                    />

                    <Input
                        label="المبلغ الشهري (للشخص)"
                        type="number"
                        placeholder="1000"
                        value={formData.amount}
                        onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                        required
                        min="1"
                    /* Icon example if Input supported it */
                    />

                    <Input
                        label="تاريخ البداية"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))}
                        required
                    />

                    <Button type="submit" variant="primary" className="w-full mt-2" style={{ width: '100%', marginTop: '0.5rem' }}>
                        <UserPlus className="ml-2 h-5 w-5" style={{ marginLeft: '0.5rem' }} />
                        بدء وإضافة الأعضاء
                    </Button>

                </form>
            </Card>
        </div>
    );
}
