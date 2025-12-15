import React, { useState, useEffect } from 'react';
import styles from '../page.module.css';

interface CallOverlayProps {
    call: any;
    user: any;
    onAccept: () => void;
    onDecline: () => void;
    onEnd: () => void;
}

export default function CallOverlay({ call, user, onAccept, onDecline, onEnd }: CallOverlayProps) {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval: any;
        if (call.status === 'connected') {
            const startTime = call.connectedAt?.seconds ? call.connectedAt.seconds * 1000 : Date.now();
            interval = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [call.status, call.connectedAt]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isCaller = call.caller === user.uid;
    const isVideo = call.type === 'video';

    if (!call) return null;

    return (
        <div className={styles.settingsPanel} style={{ background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
                background: '#1a1a1a',
                padding: 40,
                borderRadius: 24,
                width: 320,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                border: '1px solid #333'
            }}>

                <div style={{ width: 100, height: 100, borderRadius: 50, background: '#333', marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
                    {/* Placeholder for avatar */}
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                        {isVideo ? '📹' : '👤'}
                    </div>
                </div>

                <h2 style={{ marginBottom: 8, fontSize: 24 }}>{call.callerName || 'Unknown'}</h2>

                <div style={{ marginBottom: 40, color: 'var(--muted)', fontSize: 16 }}>
                    {call.status === 'ringing' ? (isCaller ? 'Calling...' : 'Incoming Call...') : 'Connected'}
                    {call.status === 'connected' && ` • ${formatTime(duration)}`}
                </div>

                <div style={{ display: 'flex', gap: 32 }}>
                    {call.status === 'ringing' && !isCaller && (
                        <button
                            onClick={onAccept}
                            style={{
                                width: 64, height: 64, borderRadius: 32,
                                background: '#10b981', border: 'none',
                                fontSize: 24, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                            }}
                        >
                            📞
                        </button>
                    )}

                    <button
                        onClick={call.status === 'ringing' && !isCaller ? onDecline : onEnd}
                        style={{
                            width: 64, height: 64, borderRadius: 32,
                            background: '#ef4444', border: 'none',
                            fontSize: 24, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        {call.status === 'ringing' && !isCaller ? '✖' : '📞'}
                    </button>
                </div>
            </div>
        </div>
    );
}
