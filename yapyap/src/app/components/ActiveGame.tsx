import React, { useState } from 'react';
import styles from '../page.module.css';

interface ActiveGameProps {
    game: any;
    user: any;
    opponent: any;
    onMove: (move: any) => void;
    onClose: () => void;
    onRestart: () => void;
    onAccept?: () => void;
    onDecline?: () => void;
}

export default function ActiveGame({ game, user, opponent, onMove, onClose, onRestart, onAccept, onDecline }: ActiveGameProps) {
    if (!game) return null;

    const isTicTacToe = game.type === 'tictactoe' || !game.type; // Default to tictactoe for backward compat
    const isRPS = game.type === 'rps';

    return (
        <div className={styles.settingsPanel} role="dialog" aria-modal="true" style={{ left: 480, width: 300 }}>
            <div className={styles.settingsInner}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{isRPS ? 'Rock Paper Scissors' : 'Tic-Tac-Toe'}</h3>
                    <button className={styles.sendBtn} onClick={onClose} style={{ padding: '4px 8px', fontSize: 12 }}>✕</button>
                </div>

                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                    Vs: {opponent?.username || opponent?.name || 'Friend'}
                </div>

                {game.status === 'pending' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        {game.requestedBy === user.uid ? (
                            <div style={{ color: 'var(--muted)' }}>
                                Waiting for {opponent?.username || 'opponent'} to accept...
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 12 }}>{opponent?.username || 'Friend'} wants to play!</div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button className={styles.sendBtn} onClick={onAccept} style={{ background: 'var(--accent)' }}>Accept</button>
                                    <button className={styles.sendBtn} onClick={onDecline} style={{ background: '#333' }}>Decline</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {game.status !== 'pending' && isTicTacToe && (
                    <TicTacToeBoard game={game} user={user} onMove={onMove} />
                )}

                {game.status !== 'pending' && isRPS && (
                    <RPSBoard game={game} user={user} onMove={onMove} />
                )}

                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {getStatusText(game, user, opponent)}
                    </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    {game.status === 'finished' && <button className={styles.sendBtn} onClick={onRestart}>Play Again</button>}
                    <button className={styles.sendBtn} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function getStatusText(game: any, user: any, opponent: any) {
    if (game.status === 'pending') {
        if (game.requestedBy === user.uid) return 'Request Sent';
        return 'Game Request';
    }
    if (game.status === 'finished') {
        if (game.winner === user.uid) return 'You Won! 🎉';
        if (game.winner === 'draw' || !game.winner) return 'It\'s a Draw! 🤝';
        return `${opponent?.username || 'Opponent'} Won!`;
    }

    if (game.type === 'rps') {
        const myMove = game.moves?.[user.uid];
        const opMove = game.moves?.[opponent?.uid];
        if (myMove && opMove) return 'Revealing...';
        if (myMove) return 'Waiting for opponent...';
        return 'Make your move!';
    }

    // Tic Tac Toe
    if (game.turn === user.uid) return 'Your Turn';
    return `${opponent?.username || 'Opponent'}'s Turn`;
}

function TicTacToeBoard({ game, user, onMove }: any) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Array.from({ length: 9 }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => {
                        if (game.status === 'ongoing' && game.turn === user?.uid) onMove(i);
                    }}
                    disabled={game.board?.[i] || game.status !== 'ongoing' || game.turn !== user?.uid}
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        cursor: (game.status === 'ongoing' && game.turn === user?.uid && !game.board?.[i]) ? 'pointer' : 'default',
                        color: 'var(--accent-1)'
                    }}
                >
                    {game.board?.[i] || ''}
                </button>
            ))}
        </div>
    );
}

function RPSBoard({ game, user, onMove }: any) {
    const moves = ['🪨', '📄', '✂️'];
    const labels = ['Rock', 'Paper', 'Scissors'];
    const values = ['rock', 'paper', 'scissors'];

    const myMove = game.moves?.[user.uid];

    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {values.map((val, i) => (
                <button
                    key={val}
                    onClick={() => {
                        if (game.status === 'ongoing' && !myMove) onMove(val);
                    }}
                    disabled={!!myMove || game.status !== 'ongoing'}
                    style={{
                        flex: 1,
                        padding: '12px 4px',
                        background: myMove === val ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        cursor: (!myMove && game.status === 'ongoing') ? 'pointer' : 'default',
                        opacity: (myMove && myMove !== val) ? 0.5 : 1
                    }}
                >
                    <div style={{ fontSize: 24 }}>{moves[i]}</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>{labels[i]}</div>
                </button>
            ))}
        </div>
    );
}
