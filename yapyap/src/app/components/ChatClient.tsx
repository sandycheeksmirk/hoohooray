"use client";

import React, { useEffect, useState } from "react";
import styles from "../page.module.css";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  runTransaction,
  getDoc,
} from "firebase/firestore";
import { auth, googleProvider } from "../lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

type Chat = {
  id: string;
  name?: string;
  last?: string;
  updatedAt?: any;
};

type Message = {
  id: string;
  text: string;
  me?: boolean;
  createdAt?: any;
  uid?: string;
  name?: string;
};

export default function ChatClient() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "bw">(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "light" || t === "dark" || t === "bw") return t;
    } catch (e) {
      /* ignore */
    }
    return "bw";
  });

  const colorMap: Record<string, string> = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#f59e0b",
    green: "#10b981",
    blue: "#2563eb",
    purple: "#7c3aed",
  };

  const [color, setColor] = useState<string>(() => {
    try {
      return localStorage.getItem("accent") || colorMap.blue;
    } catch (e) {
      return colorMap.blue;
    }
  });

  const [format, setFormat] = useState<"bubble" | "compact" | "minimal">(() => {
    try {
      const f = localStorage.getItem("format");
      if (f === "compact" || f === "minimal") return f as any;
    } catch (e) {}
    return "bubble";
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* ignore in SSR */
    }
  }, [theme]);

  useEffect(() => {
    try {
      document.documentElement.style.setProperty("--accent", color);
      localStorage.setItem("accent", color);
    } catch (e) {}
  }, [color]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-format", format);
      localStorage.setItem("format", format);
    } catch (e) {}
  }, [format]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [font, setFont] = useState<string>(() => {
    try {
      return localStorage.getItem("font") || "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial";
    } catch (e) {
      return "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial";
    }
  });

  useEffect(() => {
    try {
      document.documentElement.style.setProperty("--app-font", font);
      localStorage.setItem("font", font);
    } catch (e) {}
  }, [font]);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("lastChecked") || "{}") as Record<string, number>;
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("lastChecked", JSON.stringify(lastChecked));
    } catch (e) {}
  }, [lastChecked]);

  function getTimeField(t: any) {
    if (!t) return 0;
    if (typeof t.toMillis === "function") return t.toMillis();
    if (t.seconds) return t.seconds * 1000;
    if (typeof t === "number") return t;
    return 0;
  }

  const unreadChats = chats.filter((c) => {
    const updated = getTimeField((c as any).updatedAt);
    return updated > (lastChecked[c.id] || 0);
  });

  function markRead(chatId: string) {
    setLastChecked((prev) => {
      const next = { ...prev, [chatId]: Date.now() };
      try {
        localStorage.setItem("lastChecked", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }

  function markAllRead() {
    const now = Date.now();
    const next = { ...lastChecked };
    unreadChats.forEach((c) => (next[c.id] = now));
    setLastChecked(next);
  }

  const [user, setUser] = useState<{ uid: string; name?: string; photo?: string } | null>(null);
  const [profile, setProfile] = useState<{ username?: string; name?: string } | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser({ uid: u.uid, name: u.displayName || undefined, photo: u.photoURL || undefined });
      else setUser(null);
    });
    return () => unsub();
  }, []);

  // load user profile (username etc.) from Firestore
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (s) => {
      setProfile(s.exists() ? (s.data() as any) : null);
    });
    return () => unsub();
  }, [user?.uid]);

  // prompt to create an ID if user has no username
  useEffect(() => {
    if (user && profile && !profile.username) {
      setSettingsOpen(true);
    }
  }, [user?.uid, profile?.username]);

  async function signIn() {
    if (!auth) return alert("Auth not initialized");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Sign-in failed", e);
    }
  }

  async function signOutUser() {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign-out failed", e);
    }
  }

  // username & friend functions
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [friendId, setFriendId] = useState("");
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  async function reserveUsername(name: string) {
    if (!user) return setUsernameStatus("Not signed in");
    const clean = name.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,32}$/.test(clean)) return setUsernameStatus("Use 3–32 chars: a-z 0-9 _ -");
    const unameRef = doc(db, "usernames", clean);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(unameRef as any);
        if (snap.exists()) throw new Error("taken");
        tx.set(unameRef, { uid: user.uid, createdAt: serverTimestamp() });
        const userRef = doc(db, "users", user.uid);
        tx.set(userRef, { username: clean, name: user.name || null, updatedAt: serverTimestamp() }, { merge: true } as any);
      });
      setUsernameStatus("Saved");
    } catch (e: any) {
      if (e && e.message === "taken") setUsernameStatus("ID already taken");
      else {
        console.error(e);
        setUsernameStatus("Error saving ID");
      }
    }
  }

  async function addFriendById(id: string) {
    if (!user) return setFriendStatus("Not signed in");
    const clean = id.trim().toLowerCase();
    if (!clean) return setFriendStatus("Enter an ID");
    try {
      const mapping = await getDoc(doc(db, "usernames", clean));
      if (!mapping.exists()) return setFriendStatus("ID not found");
      const otherUid = (mapping.data() as any).uid as string;
      if (!otherUid) return setFriendStatus("Invalid user mapping");
      if (otherUid === user.uid) return setFriendStatus("That's you");

      // deterministic chat id for DM
      const ids = [user.uid, otherUid].sort();
      const chatId = `dm_${ids[0]}_${ids[1]}`;
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        // create chat
        await setDoc(chatRef, {
          members: [user.uid, otherUid],
          name: `DM: ${clean}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setSelected(chatId);
      setFriendStatus("Chat opened");
      setSettingsOpen(false);
    } catch (e) {
      console.error(e);
      setFriendStatus("Error adding friend");
    }
  }

  useEffect(() => {
    if (!user || !profile?.username) {
      setChats([]);
      return;
    }
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      if (!selected && snap.docs.length) {
        setSelected(snap.docs[0].id);
      }
    });
    return () => unsub();
  }, [user?.uid, profile?.username]);

  useEffect(() => {
    if (!user || !selected || !profile?.username) return;
    const q = query(
      collection(db, `chats/${selected}/messages`),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
    });
    return () => unsub();
  }, [selected, profile?.username]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    if (!profile?.username) {
      setUsernameStatus("You must set an ID before sending messages");
      setSettingsOpen(true);
      return;
    }
    if (!selected) {
      // create a new chat
      const newChatRef = doc(collection(db, "chats"));
      await setDoc(newChatRef, {
        name: "New Chat",
        last: input,
        updatedAt: serverTimestamp(),
      });
      setSelected(newChatRef.id);
    }

    const messagesCol = collection(db, `chats/${selected}/messages`);
    await addDoc(messagesCol, {
      text: input,
      uid: user?.uid || null,
      name: user?.name || "Anonymous",
      createdAt: serverTimestamp(),
    });

    // update chat meta
    const chatRef = doc(db, "chats", selected as string);
    await updateDoc(chatRef, { last: input, lastBy: user?.name || null, updatedAt: serverTimestamp() });

    setInput("");
  }

  if (!user) {
    return (
      <main className={styles.root} style={{ padding: 12 }}>
        <div className={styles.welcome}>
          <h1>Welcome to Yapyap</h1>
          <p>Sign in with Google to continue to your chats.</p>
          <div style={{ marginTop: 12 }}>
            <button className={styles.sendBtn} onClick={() => signIn()} style={{ padding: "10px 18px" }}>
              Sign in with Google
            </button>
          </div>
        </div>
      </main>
    );
  }

  // enforce username creation before allowing use
  if (!profile?.username) {
    return (
      <main className={styles.root} style={{ padding: 12 }}>
        <div className={styles.welcome}>
          <h1>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
          <p>You must create an ID before using Yapyap.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input placeholder="Choose an ID (a-z0-9_- )" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
            <button className={styles.sendBtn} onClick={() => reserveUsername(usernameInput)} style={{ padding: "10px 18px" }}>
              Save ID
            </button>
            <button className={styles.sendBtn} onClick={() => signOutUser()} style={{ padding: "10px 18px" }}>Sign out</button>
          </div>
          {usernameStatus && <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>{usernameStatus}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.root} style={{ padding: 12 }}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>Telegram — BW (Live)</div>
          <div className={styles.search}>
            <input placeholder="Search" />
          </div>

          <ul className={styles.chatList}>
            {chats.map((c) => (
              <li
                className={styles.chatItem}
                key={c.id}
                onClick={() => setSelected(c.id)}
                style={{
                  background: selected === c.id ? "rgba(255,255,255,0.02)" : undefined,
                }}
              >
                <div className={styles.chatAvatar} />
                <div className={styles.chatMeta}>
                  <div className={styles.chatName}>{c.name || "Unnamed"}</div>
                  <div className={styles.chatLast}>{c.last || ""}</div>
                </div>
                <div className={styles.chatTime}></div>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.chatArea}>
          <header className={styles.chatHeader}>
            <div className={styles.headerAvatar} />
            <div className={styles.headerMeta}>
              <div className={styles.headerName}>
                {chats.find((c) => c.id === selected)?.name || "No chat selected"}
              </div>
              <div className={styles.headerStatus}>online</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setNotificationsOpen((s) => !s)}
                className={styles.notifBtn}
                style={{ position: "relative" }}
              >
                🔔
                {unreadChats.length > 0 && (
                  <span className={styles.badge}>{unreadChats.length}</span>
                )}
              </button>

              <button
                aria-label="Open settings"
                title="Settings"
                onClick={() => setSettingsOpen(true)}
                className={styles.sendBtn}
                style={{ padding: 8, minWidth: 90 }}
              >
                Settings
              </button>
            </div>
          </header>

          {settingsOpen && (
            <div className={styles.settingsPanel} role="dialog" aria-modal="true">
              <div className={styles.settingsInner}>
                <h3>Settings</h3>
                <label>
                  Theme
                  <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                    <option value="bw">Black & White</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>

                <label>
                  Accent
                  <div className={styles.colorSwatches} style={{ marginTop: 6 }}>
                    {Object.entries(colorMap).map(([key, hex]) => (
                      <button
                        key={key}
                        className={styles.swatch}
                        onClick={() => setColor(hex)}
                        style={{ background: hex, outline: color === hex ? "2px solid #fff" : "none" }}
                      />
                    ))}
                  </div>
                </label>

                <label>
                  Format
                  <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
                    <option value="bubble">Bubble</option>
                    <option value="compact">Compact</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>

                <label>
                  Font
                  <select value={font} onChange={(e) => setFont(e.target.value)}>
                    <option value="system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial">System</option>
                    <option value="var(--font-geist-sans)">Geist</option>
                    <option value="monospace">Monospace</option>
                    <option value="Georgia, serif">Serif</option>
                  </select>
                </label>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                  <h4 style={{ margin: "6px 0" }}>Your ID</h4>
                  {profile?.username ? (
                    <div style={{ fontSize: 13, marginBottom: 8 }}>Your ID: <strong>{profile.username}</strong></div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input placeholder="Choose an ID (a-z0-9_- )" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
                      <button className={styles.sendBtn} onClick={() => reserveUsername(usernameInput)}>Save</button>
                    </div>
                  )}
                  {usernameStatus && <div style={{ fontSize: 13, color: "var(--muted)" }}>{usernameStatus}</div>}

                  <h4 style={{ margin: "10px 0 6px" }}>Add friend by ID</h4>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input placeholder="friend-id" value={friendId} onChange={(e) => setFriendId(e.target.value)} />
                    <button className={styles.sendBtn} onClick={() => addFriendById(friendId)}>Add</button>
                  </div>
                  {friendStatus && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{friendStatus}</div>}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {user ? (
                    <>
                      <div style={{ alignSelf: "center", fontSize: 13 }}>{user.name}</div>
                      <button onClick={() => signOutUser()} className={styles.sendBtn}>Sign out</button>
                    </>
                  ) : (
                    <button onClick={() => signIn()} className={styles.sendBtn}>Sign in with Google</button>
                  )}

                  <button onClick={() => setSettingsOpen(false)} className={styles.sendBtn} disabled={!profile?.username} title={!profile?.username ? "Set an ID to close settings" : undefined}>Close</button>
                </div>
              </div>
            </div>
          )}
          {notificationsOpen && (
            <div className={styles.notificationPanel} role="dialog" aria-modal="true">
              <div className={styles.notificationInner}>
                <h3>Notifications</h3>
                {unreadChats.length === 0 ? (
                  <div>No new messages</div>
                ) : (
                  <>
                    <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
                      {unreadChats.map((c) => (
                        <li key={c.id} className={styles.notificationItem} onClick={() => { setSelected(c.id); markRead(c.id); setNotificationsOpen(false); }}>
                          <div style={{ fontWeight: 600 }}>{c.name || "Unnamed"}</div>
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>{(c as any).last || "New message"}</div>
                        </li>
                      ))}
                    </ul>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className={styles.sendBtn} onClick={() => { markAllRead(); setNotificationsOpen(false); }}>Mark all read</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div className={styles.messages}>
            {messages.map((m) => {
              const isMe = !!(m.uid && user && m.uid === user.uid);
              return (
                <div
                  key={m.id}
                  className={`${styles.msg} ${isMe ? styles.msgMe : styles.msgOther}`}
                >
                  <div className={styles.msgText}>{m.text}</div>
                  <div className={styles.msgTime}>{m.name ? m.name : ""}</div>
                </div>
              );
            })}
          </div>

          <form className={styles.inputBar} onSubmit={sendMessage}>
            <input
              className={styles.messageInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message"
            />
            <button className={styles.sendBtn} type="submit">
              Send
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
