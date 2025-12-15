import React, { useState } from 'react';
import styles from '../page.module.css';

interface GameCenterProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    friendsList: any[];
    chats: any[];
    onOpenChat: (chatId: string) => void;
    onStartGame: (friendId: string, gameType: string) => void;
}

export default function GameCenter({ isOpen, onClose, user, friendsList, chats, onOpenChat, onStartGame }: GameCenterProps) {
    const [selectedGame, setSelectedGame] = useState<'tictactoe' | 'rps' | 'coinflip' | 'dice' | null>(null);
    const [selectedFriend, setSelectedFriend] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter for active games
    const activeGames = chats.filter((c) => c.game && c.game.status === 'ongoing');

    return (
        <div className={styles.settingsPanel} role="dialog" aria-modal="true" style={{ width: 400, height: 600, display: 'flex', flexDirection: 'column' }}>
            <div className={styles.settingsInner} style={{ height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3>Game Center 🎮</h3>
                    <button className={styles.sendBtn} onClick={onClose} style={{ padding: '6px 12px' }}>Close</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Active Games Section */}
                    {activeGames.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--accent-1)' }}>Active Games</div>
                            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {activeGames.map((chat) => {
                                    const otherUid = chat.members?.find((m: string) => m !== user.uid);
                                    const friend = friendsList.find((f) => f.uid === otherUid);
                                    const name = friend?.username || friend?.name || otherUid || 'Unknown';

                                    return (
                                        <li key={chat.id} className={styles.notificationItem} onClick={() => { onOpenChat(chat.id); onClose(); }}>
                                            <div style={{ fontWeight: 600 }}>Vs. {name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                                                {chat.game.type === 'rps' ? 'Rock Paper Scissors' : chat.game.type === 'coinflip' ? 'Coin Flip' : chat.game.type === 'dice' ? 'Dice Roll' : 'Tic-Tac-Toe'}
                                                {' • '}
                                                {chat.game.status === 'finished' ? 'Finished' : (chat.game.turn === user.uid ? 'Your Turn' : 'Ongoing')}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {/* New Game Section */}
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--accent-1)' }}>Start New Game</div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>1. Choose Game</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <button
                                    className={styles.sendBtn}
                                    style={{ background: selectedGame === 'tictactoe' ? 'var(--accent)' : 'rgba(0,0,0,0.05)', color: selectedGame === 'tictactoe' ? 'white' : 'var(--accent-1)' }}
                                    onClick={() => setSelectedGame('tictactoe')}
                                >
                                    🧩 Tic-Tac-Toe
                                </button>
                                <button
                                    className={styles.sendBtn}
                                    style={{ background: selectedGame === 'rps' ? 'var(--accent)' : 'rgba(0,0,0,0.05)', color: selectedGame === 'rps' ? 'white' : 'var(--accent-1)' }}
                                    onClick={() => setSelectedGame('rps')}
                                >
                                    ✂️ Rock Paper Scissors
                                </button>
                                <button
                                    className={styles.sendBtn}
                                    style={{ background: selectedGame === 'coinflip' ? 'var(--accent)' : 'rgba(0,0,0,0.05)', color: selectedGame === 'coinflip' ? 'white' : 'var(--accent-1)' }}
                                    onClick={() => setSelectedGame('coinflip')}
                                >
                                    🪙 Coin Flip
                                </button>
                                <button
                                    className={styles.sendBtn}
                                    style={{ background: selectedGame === 'dice' ? 'var(--accent)' : 'rgba(0,0,0,0.05)', color: selectedGame === 'dice' ? 'white' : 'var(--accent-1)' }}
                                    onClick={() => setSelectedGame('dice')}
                                >
                                    🎲 Dice Roll
                                </button>
                            </div>
                        </div>

                        {selectedGame && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>2. Choose Friend</label>
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}>
                                    {friendsList.length === 0 ? (
                                        <div style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>No friends found. Add some friends first!</div>
                                    ) : (
                                        <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                                            {friendsList.map((f) => (
                                                <li
                                                    key={f.uid}
                                                    className={styles.chatItem}
                                                    style={{ background: selectedFriend === f.uid ? 'rgba(0,0,0,0.05)' : undefined }}
                                                    onClick={() => setSelectedFriend(f.uid)}
                                                >
                                                    <div className={styles.chatAvatar} style={{ width: 32, height: 32 }} />
                                                    <div style={{ fontSize: 14 }}>{f.username || f.name}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            className={styles.sendBtn}
                            disabled={!selectedGame || !selectedFriend}
                            style={{ width: '100%', opacity: (!selectedGame || !selectedFriend) ? 0.5 : 1 }}
                            onClick={() => {
                                if (selectedFriend && selectedGame) {
                                    onStartGame(selectedFriend, selectedGame);
                                    onClose();
                                }
                            }}
                        >
                            Start Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
