import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                {label && (
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn("input", className)}
                    {...props}
                />
                {error && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";
