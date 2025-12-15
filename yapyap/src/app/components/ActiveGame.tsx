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
    const isCoinFlip = game.type === 'coinflip';
    const isDice = game.type === 'dice';

    return (
        <div className={styles.settingsPanel} role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, zIndex: 100, background: 'var(--panel)', color: 'var(--accent-1)' }}>
            <div className={styles.settingsInner}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{isRPS ? 'Rock Paper Scissors' : isCoinFlip ? 'Coin Flip' : isDice ? 'Dice Roll' : 'Tic-Tac-Toe'}</h3>
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
                    <RPSBoard game={game} user={user} onMove={onMove} opponent={opponent} />
                )}

                {game.status !== 'pending' && isCoinFlip && (
                    <CoinFlipBoard game={game} user={user} onMove={onMove} />
                )}

                {game.status !== 'pending' && isDice && (
                    <DiceBoard game={game} user={user} onMove={onMove} />
                )}

                <div style={{ marginTop: 16, textAlign: 'center', minHeight: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
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

    if (game.type === 'coinflip') {
        if (game.status === 'finished') {
            return game.winner === user.uid ? 'You Won!' : 'You Lost';
        }
        return 'Flipping...';
    }

    if (game.type === 'dice') {
        if (game.status === 'finished') {
            return `You rolled a ${game.result || '?'}`;
        }
        return 'Rolling...';
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
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
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

function RPSBoard({ game, user, onMove, opponent }: any) {
    const moves = ['🪨', '📄', '✂️'];
    const labels = ['Rock', 'Paper', 'Scissors'];
    const values = ['rock', 'paper', 'scissors'];

    const myMove = game.moves?.[user.uid];
    const opponentMove = game.moves?.[opponent?.uid];
    const isFinished = game.status === 'finished';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {values.map((val, i) => {
                    const selected = myMove === val;
                    const isOpponentMove = isFinished && opponentMove === val;

                    return (
                        <button
                            key={val}
                            onClick={() => {
                                if (game.status === 'ongoing' && !myMove) onMove(val);
                            }}
                            disabled={!!myMove || game.status !== 'ongoing'}
                            style={{
                                flex: 1,
                                padding: '12px 4px',
                                background: selected ? 'var(--accent)' : (isOpponentMove ? '#ef4444' : 'rgba(255,255,255,0.05)'),
                                border: selected ? '2px solid #fff' : (isOpponentMove ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'),
                                borderRadius: 8,
                                cursor: (!myMove && game.status === 'ongoing') ? 'pointer' : 'default',
                                opacity: (myMove && !selected && !isOpponentMove) ? 0.3 : 1,
                                position: 'relative'
                            }}
                        >
                            <div style={{ fontSize: 24 }}>{moves[i]}</div>
                            <div style={{ fontSize: 11, marginTop: 4 }}>{labels[i]}</div>
                            {isOpponentMove && (
                                <div style={{ position: 'absolute', top: -10, right: -10, background: '#ef4444', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                                    Them
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function CoinFlipBoard({ game, user, onMove }: any) {
    // Only one person needs to click "Flip" but we can just auto-flip on start or let anyone click.
    // Let's let the turn owner flip.
    const isMyTurn = game.status === 'ongoing' && !game.winner;

    return (
        <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
                {game.status === 'finished' ? (game.result === 'heads' ? '🪙 Heads' : '🦅 Tails') : '❓'}
            </div>
            {game.status === 'ongoing' && (
                <button
                    className={styles.sendBtn}
                    onClick={() => onMove('flip')}
                    style={{ width: '100%', padding: '12px' }}
                >
                    Flip Coin
                </button>
            )}
        </div>

    );
}

function DiceBoard({ game, user, onMove }: any) {
    return (
        <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
                {game.status === 'finished' ? `🎲 ${game.result}` : '🎲 ❓'}
            </div>
            {game.status === 'ongoing' && (
                <button
                    className={styles.sendBtn}
                    onClick={() => onMove('roll')}
                    style={{ width: '100%', padding: '12px' }}
                >
                    Roll Dice
                </button>
            )}
        </div>
    );
}
