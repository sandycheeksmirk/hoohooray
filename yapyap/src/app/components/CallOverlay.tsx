import React, { useState, useEffect, useRef } from 'react';
import styles from '../page.module.css';

interface CallOverlayProps {
    call: any;
    user: any;
    onAccept: () => void;
    onDecline: () => void;
    onEnd: () => void;
    localStream?: MediaStream | null;
    remoteStream?: MediaStream | null;
}

export default function CallOverlay({ call, user, onAccept, onDecline, onEnd, localStream, remoteStream }: CallOverlayProps) {
    const [duration, setDuration] = useState(0);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isCaller = call.caller === user.uid;
    const isVideo = call.type === 'video';

    if (!call) return null;

    return (
        <div className={styles.settingsPanel} style={{ background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', inset: 0, position: 'fixed', width: '100%', height: '100%', zIndex: 100 }}>
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                maxWidth: 800,
                maxHeight: 600,
                background: '#1a1a1a',
                borderRadius: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}>

                {/* Remote Video (Full Size) */}
                <div style={{ flex: 1, background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {remoteStream ? (
                        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            <div style={{ width: 120, height: 120, borderRadius: 60, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>
                                👤
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{call.callerName || 'User'}</div>
                            <div style={{ color: 'var(--muted)' }}>
                                {call.status === 'ringing' ? (isCaller ? 'Calling...' : 'Incoming Call...') : 'Connecting...'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Local Video (PiP) */}
                {localStream && isVideo && (
                    <div style={{ position: 'absolute', top: 20, right: 20, width: 120, height: 160, borderRadius: 12, overflow: 'hidden', background: '#333', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}

                {/* Controls */}
                <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', position: 'absolute', bottom: 0, width: '100%' }}>

                    {call.status === 'connected' && (
                        <div style={{ position: 'absolute', top: -40, color: 'white', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
                            {formatTime(duration)}
                        </div>
                    )}

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
