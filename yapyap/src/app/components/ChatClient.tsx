"use client";
import GameCenter from "./GameCenter";
import ActiveGame from "./ActiveGame";

import React, { useEffect, useState, useRef } from "react";
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
  getDocs,
  arrayUnion,
  where,
} from "firebase/firestore";
import { auth, googleProvider } from "../lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

type Chat = {
  id: string;
  name?: string;
  last?: string;
  updatedAt?: any;
  members?: string[];
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiPanelRef = useRef<HTMLDivElement | null>(null);
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

  const emojiList = ["😀", "😁", "😂", "😍", "😎", "😅", "👍", "🙏", "🎉", "🔥", "❤️", "🤖", "🎲", "✋", "💬"];

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
    } catch (e) { }
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
    } catch (e) { }
  }, [color]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-format", format);
      localStorage.setItem("format", format);
    } catch (e) { }
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
    } catch (e) { }
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
    } catch (e) { }
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
      } catch (e) { }
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
  const [profile, setProfile] = useState<{ username?: string; name?: string; friends?: string[] } | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ uid: u.uid, name: u.displayName || undefined, photo: u.photoURL || undefined });
        // ensure a user profile doc exists (account creation)
        try {
          const userRef = doc(db, "users", u.uid);
          setDoc(userRef, { name: u.displayName || null, photo: u.photoURL || null, createdAt: serverTimestamp() }, { merge: true } as any);
        } catch (e) {
          console.error("Error creating user doc", e);
        }
      } else setUser(null);
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
  const [pendingRequests, setPendingRequests] = useState<Array<any>>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [gameCenterOpen, setGameCenterOpen] = useState(false);
  const [game, setGame] = useState<any>(null);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const gameMenuRef = useRef<HTMLDivElement | null>(null);
  const [friendsList, setFriendsList] = useState<Array<{ uid: string; username?: string; name?: string; photo?: string }>>([]);

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

  async function startNewGame(friendUid: string, gameType: string = 'tictactoe') {
    if (!user) return;
    // 1. Ensure chat exists and switch to it
    await openDM(friendUid);

    // wait a bit for selected to update? actually openDM sets selected immediately but the game hook relies on it.
    // We can just get the chat ID deterministically.
    const ids = [user.uid, friendUid].sort();
    const chatId = `dm_${ids[0]}_${ids[1]}`;

    const chatRef = doc(db, "chats", chatId);

    // 2. Initialize Game
    let gameData: any = {};

    if (gameType === 'tictactoe') {
      const sorted = [...ids]; // ids are already sorted
      const marks: Record<string, string> = {};
      marks[sorted[0]] = "X";
      marks[sorted[1]] = "O";
      gameData = {
        type: 'tictactoe',
        board: Array(9).fill(null),
        turn: sorted[0], // First alphabetically goes first
        marks,
        status: "pending",
        requestedBy: user.uid,
        startedAt: serverTimestamp()
      };
    } else if (gameType === 'rps') {
      gameData = {
        type: 'rps',
        players: ids,
        moves: {},
        status: 'pending',
        requestedBy: user.uid,
        startedAt: serverTimestamp()
      };
    }

    try {
      await updateDoc(chatRef, { game: gameData, updatedAt: serverTimestamp() } as any);

      // Send system message
      const messagesCol = collection(db, `chats/${chatId}/messages`);
      await addDoc(messagesCol, {
        text: "🎮 sent a game request",
        uid: user.uid,
        name: user.name || "Anonymous",
        isSystem: true,
        createdAt: serverTimestamp(),
      });
      await updateDoc(chatRef, { last: "🎮 Game Request", lastBy: user.name || null, updatedAt: serverTimestamp() });

      setGameOpen(true);
    } catch (e) {
      console.error("Error starting game", e);
      setFriendStatus("Could not start game");
    }
  }

  async function acceptGame() {
    if (!user || !selected) return;
    const chatRef = doc(db, "chats", selected);
    try {
      // We can just update status to ongoing. 
      // For TicTacToe, state is pre-initialized. For RPS, state is pre-initialized.
      await updateDoc(chatRef, {
        "game.status": "ongoing",
        "game.startedAt": serverTimestamp(),
        updatedAt: serverTimestamp()
      } as any);

      // Send system message
      const messagesCol = collection(db, `chats/${selected}/messages`);
      await addDoc(messagesCol, {
        text: "✅ accepted game request",
        uid: user.uid,
        name: user.name || "Anonymous",
        isSystem: true,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error accepting game", e);
    }
  }

  async function declineGame() {
    if (!user || !selected) return;
    const chatRef = doc(db, "chats", selected);
    try {
      // Either set status to 'declined' (so they see it) or just nullify it.
      // Let's set to declined then nullify after a timeout or just declined.
      // Simplest: set game to null.
      await updateDoc(chatRef, { game: null, updatedAt: serverTimestamp() } as any);
      setGameOpen(false);

      const messagesCol = collection(db, `chats/${selected}/messages`);
      await addDoc(messagesCol, {
        text: "🚫 declined game request",
        uid: user.uid,
        name: user.name || "Anonymous",
        isSystem: true,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error declining game", e);
    }
  }

  async function addFriendById(id: string): Promise<boolean> {
    if (!user) { setFriendStatus("Not signed in"); return false; }
    const clean = id.trim().toLowerCase();
    if (!clean) { setFriendStatus("Enter an ID"); return false; }
    try {
      const mapping = await getDoc(doc(db, "usernames", clean));
      if (!mapping.exists()) { setFriendStatus("ID not found"); return false; }
      const otherUid = (mapping.data() as any).uid as string;
      if (!otherUid) { setFriendStatus("Invalid user mapping"); return false; }
      if (otherUid === user.uid) { setFriendStatus("That's you"); return false; }
      // send a friend request instead of auto-creating a chat
      const requestsQ = query(collection(db, "friendRequests"), where("fromUid", "==", user.uid), where("toUid", "==", otherUid), where("status", "==", "pending"));
      const existing = await getDocs(requestsQ);
      if (!existing.empty) { setFriendStatus("Request already pending"); return false; }

      await addDoc(collection(db, "friendRequests"), {
        fromUid: user.uid,
        toUid: otherUid,
        fromUsername: profile?.username || null,
        toUsername: clean,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setFriendStatus("Request sent");
      // optionally add to outgoing requests list on our user doc
      try {
        await updateDoc(doc(db, "users", user.uid), { outgoingRequests: arrayUnion(otherUid) } as any);
      } catch (e) {
        /* non-fatal */
      }
      return true;
    } catch (e) {
      console.error(e);
      setFriendStatus("Error adding friend");
      return false;
    }
  }

  // listen for incoming friend requests
  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      return;
    }
    const q = query(collection(db, "friendRequests"), where("toUid", "==", user.uid), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user?.uid]);

  // load friends list (fetch user docs listed in profile.friends)
  useEffect(() => {
    async function loadFriends() {
      const f = (profile as any)?.friends as string[] | undefined;
      if (!f || f.length === 0) {
        setFriendsList([]);
        return;
      }
      try {
        const docs = await Promise.all(f.map((uid) => getDoc(doc(db, "users", uid))));
        setFriendsList(
          docs
            .filter((d) => d.exists())
            .map((d) => ({ uid: d.id, ...(d.data() as any) }))
        );
      } catch (e) {
        console.error("Error loading friends", e);
        setFriendsList([]);
      }
    }
    loadFriends();
  }, [profile?.friends]);

  // auto-open game request if needed
  useEffect(() => {
    if (game && game.status === 'pending' && game.requestedBy !== user?.uid && !gameOpen) {
      setGameOpen(true);
    }
  }, [game?.status, game?.requestedBy]);

  // watch selected chat doc for game state updates
  useEffect(() => {
    if (!selected) {
      setGame(null);
      return;
    }
    const chatRef = doc(db, "chats", selected);
    const unsub = onSnapshot(chatRef, (snap) => {
      const data = snap.exists() ? (snap.data() as any) : null;
      setGame(data?.game || null);
    });
    return () => unsub();
  }, [selected]);

  function checkWinner(board: Array<string | null>) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }



  async function makeMove(move: any) {
    if (!user || !selected) return;
    const chatRef = doc(db, "chats", selected);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(chatRef as any);
        if (!snap.exists()) throw new Error("no chat");
        const g = (snap.data() as any).game;
        if (!g || g.status !== "ongoing") throw new Error("no game");

        let updates: any = {};

        if (g.type === 'rps') {
          // Rock Paper Scissors Logic
          if (g.moves && g.moves[user.uid]) throw new Error("already moved");

          const newMoves = { ...g.moves, [user.uid]: move };
          const players = g.players || [];

          // Check if both moved
          if (players.every((p: string) => newMoves[p])) {
            // Determine winner
            const p1 = players[0];
            const p2 = players[1];
            const m1 = newMoves[p1];
            const m2 = newMoves[p2];

            let winner = null;
            if (m1 === m2) winner = 'draw';
            else if (
              (m1 === 'rock' && m2 === 'scissors') ||
              (m1 === 'scissors' && m2 === 'paper') ||
              (m1 === 'paper' && m2 === 'rock')
            ) {
              winner = p1;
            } else {
              winner = p2;
            }

            updates = {
              ...g,
              moves: newMoves,
              status: 'finished',
              winner,
              updatedAt: serverTimestamp()
            };
          } else {
            // Waiting for other player
            updates = {
              ...g,
              moves: newMoves,
              updatedAt: serverTimestamp()
            };
          }

        } else {
          // Tic Tac Toe Logic (Default)
          const index = move as number;
          if (g.turn !== user.uid) throw new Error("not your turn");
          const board = g.board || Array(9).fill(null);
          if (board[index]) throw new Error("occupied");
          const newBoard = [...board];
          const mark = g.marks[user.uid];
          newBoard[index] = mark;
          const winnerMark = checkWinner(newBoard);
          let status = "ongoing";
          let winner: string | null = null;
          let nextTurn: string | null = null;
          if (winnerMark) {
            status = "finished";
            winner = Object.keys(g.marks).find((k) => g.marks[k] === winnerMark) || null;
          } else if (newBoard.every(Boolean)) {
            status = "finished";
            winner = null;
          } else {
            nextTurn = Object.keys(g.marks).find((k) => k !== user.uid) || null;
          }
          updates = { ...g, board: newBoard, turn: nextTurn, status, winner, updatedAt: serverTimestamp() };
        }

        tx.update(chatRef as any, { game: updates, updatedAt: serverTimestamp() } as any);
      });
    } catch (e) {
      console.error(e);
      setFriendStatus("Move failed");
    }
  }

  // open notifications when new friend requests arrive
  useEffect(() => {
    if (pendingRequests.length > 0 && !notificationsOpen) {
      setNotificationsOpen(true);
    }
  }, [pendingRequests.length]);

  // close emoji panel when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (emojiOpen && emojiPanelRef.current && !(emojiPanelRef.current as any).contains(e.target)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [emojiOpen]);

  // close game menu when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (gameMenuOpen && gameMenuRef.current && !(gameMenuRef.current as any).contains(e.target)) {
        setGameMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [gameMenuOpen]);

  async function acceptRequest(req: any) {
    try {
      const otherUid = req.fromUid as string;
      const otherUsername = req.fromUsername as string || "";
      const ids = [user!.uid, otherUid].sort();
      const chatId = `dm_${ids[0]}_${ids[1]}`;
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          members: [user!.uid, otherUid],
          name: `DM: ${otherUsername || otherUid}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      // mark request accepted
      await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted", respondedAt: serverTimestamp() });
      // add each other to friends lists
      await updateDoc(doc(db, "users", user!.uid), { friends: arrayUnion(otherUid) } as any);
      await updateDoc(doc(db, "users", otherUid), { friends: arrayUnion(user!.uid) } as any);
      setFriendStatus("Friend request accepted");
      // fetch the friend's profile and add to local friends list immediately
      try {
        const otherDoc = await getDoc(doc(db, "users", otherUid));
        if (otherDoc.exists()) {
          const data = otherDoc.data() as any;
          setFriendsList((prev) => {
            if (prev.find((p) => p.uid === otherUid)) return prev;
            return [...prev, { uid: otherDoc.id, username: data.username, name: data.name, photo: data.photo }];
          });
        }
      } catch (e) {
        /* ignore */
      }
      setSelected(chatId);
      setNotificationsOpen(false);
    } catch (e) {
      console.error(e);
      setFriendStatus("Error accepting request");
    }
  }

  async function openDM(otherUid: string, otherLabel?: string) {
    if (!user) return;
    const ids = [user.uid, otherUid].sort();
    const chatId = `dm_${ids[0]}_${ids[1]}`;
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        members: [user.uid, otherUid],
        name: `DM: ${otherLabel || otherUid}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    setSelected(chatId);
    // mark the chat as read and focus the message input so the user can type immediately
    try { markRead(chatId); } catch (e) { /* ignore */ }
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  async function declineRequest(req: any) {
    try {
      await updateDoc(doc(db, "friendRequests", req.id), { status: "declined", respondedAt: serverTimestamp() });
      setFriendStatus("Friend request declined");
    } catch (e) {
      console.error(e);
      setFriendStatus("Error declining request");
    }
  }

  useEffect(() => {
    if (!user || !profile?.username) {
      setChats([]);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );
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
      setFriendStatus("Select a friend or add one by ID to start a conversation");
      setSettingsOpen(true);
      return;
    }

    let chatMeta = chats.find((c) => c.id === selected) as Chat | undefined;
    // If local chats haven't been updated yet (we just created the chat), fetch the chat doc
    if (!chatMeta) {
      try {
        const chatRef = doc(db, "chats", selected as string);
        const snap = await getDoc(chatRef);
        if (snap.exists()) {
          chatMeta = { id: snap.id, ...(snap.data() as any) } as Chat;
        }
      } catch (e) {
        console.error("Error fetching chat", e);
      }
    }

    if (!chatMeta || !chatMeta.members || !chatMeta.members.includes(user!.uid)) {
      setFriendStatus("You can only send messages in chats with friends you added");
      setSettingsOpen(true);
      return;
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

          <div style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Friends</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className={styles.sendBtn} title="Game Center" onClick={() => setGameCenterOpen(true)} style={{ padding: "6px 10px" }}>🎮</button>
                <button className={styles.sendBtn} onClick={() => { if (!profile?.username) { setSettingsOpen(true); setUsernameStatus("Create an ID to add friends"); return; } setAddFriendOpen((s) => !s); }} style={{ padding: "6px 10px" }}>Add</button>
              </div>
            </div>
            <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
              {friendsList.length === 0 ? (
                <li style={{ fontSize: 13, color: "var(--muted)" }}>No friends yet</li>
              ) : (
                friendsList.map((f) => (
                  <li key={f.uid} className={styles.chatItem} style={{ cursor: "pointer" }} onClick={() => openDM(f.uid, f.username || f.name || f.uid)}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>                    {f.photo ? (
                      <img src={f.photo} alt={f.username || f.name || "avatar"} style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover" }} />
                    ) : (
                      <div className={styles.chatAvatar} />
                    )}                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{f.username || f.name || f.uid}</div>
                        {f.name && <div style={{ fontSize: 12, color: "var(--muted)" }}>{f.name}</div>}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
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
            {
              (() => {
                const chat = chats.find((c) => c.id === selected);
                if (chat && chat.members && user && chat.members.length === 2) {
                  const other = chat.members.find((m) => m !== user.uid)!;
                  const friend = friendsList.find((f) => f.uid === other);
                  const label = chat.name || (friend?.username || friend?.name || other);
                  return (
                    <>
                      {friend?.photo ? (
                        <img src={friend.photo} alt={label} style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover" }} />
                      ) : (
                        <div className={styles.headerAvatar} />
                      )}
                      <div className={styles.headerMeta}>
                        <div className={styles.headerName}>{label}</div>
                        <div className={styles.headerStatus}>online</div>
                      </div>
                    </>
                  );
                }
                // If a chat isn't present locally, try to infer the label from the selected DM id
                const fallbackLabel = (() => {
                  const found = chats.find((c) => c.id === selected);
                  if (found) return found.name;
                  if (selected && selected.startsWith("dm_") && user) {
                    const parts = selected.split("_");
                    if (parts.length === 3) {
                      const other = parts[1] === user.uid ? parts[2] : parts[1];
                      const friend = friendsList.find((f) => f.uid === other);
                      return friend ? (friend.username || friend.name || other) : other;
                    }
                  }
                  return "No chat selected";
                })();

                return (
                  <>
                    <div className={styles.headerAvatar} />
                    <div className={styles.headerMeta}>
                      <div className={styles.headerName}>{fallbackLabel}</div>
                      <div className={styles.headerStatus}>online</div>
                    </div>
                  </>
                );
              })()
            }

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setNotificationsOpen((s) => !s)}
                className={styles.notifBtn}
                style={{ position: "relative" }}
              >
                🔔
                {(unreadChats.length + pendingRequests.length) > 0 && (
                  <span className={styles.badge}>{unreadChats.length + pendingRequests.length}</span>
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

              {/* Game button for 1:1 chats */}
              {chats.find((c) => c.id === selected && c.members && c.members.length === 2) && (
                <div style={{ position: "relative" }} ref={gameMenuRef}>
                  {game && game.status === 'pending' && game.requestedBy !== user?.uid ? (
                    <button
                      aria-label="Accept Game"
                      title="Accept Game Request"
                      onClick={() => setGameOpen(true)}
                      className={styles.sendBtn}
                      style={{ padding: 8, minWidth: 84, background: '#10b981', color: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}
                    >
                      📩 Accept!
                    </button>
                  ) : (
                    <button
                      aria-label="Games"
                      title="Games"
                      onClick={() => setGameMenuOpen((s) => !s)}
                      className={styles.sendBtn}
                      style={{ padding: 8, minWidth: 84 }}
                    >
                      🎮 Game
                    </button>
                  )}
                  {gameMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: 40, width: 180, background: "var(--panel, rgba(0,0,0,0.7))", borderRadius: 6, padding: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 70 }}>
                      <button
                        className={styles.sendBtn}
                        onClick={async () => {
                          setGameMenuOpen(false);
                          if (!profile?.username) { setSettingsOpen(true); setUsernameStatus("Create an ID to play"); return; }

                          // Determine friend UID from selected chat
                          const chat = chats.find(c => c.id === selected);
                          if (!chat || !chat.members) return;
                          const other = chat.members.find(m => m !== user.uid);
                          if (!other) return;

                          await startNewGame(other, 'tictactoe');
                        }}
                        style={{ width: "100%", textAlign: "left", padding: "8px 10px" }}
                      >
                        🧩 Tic-Tac-Toe
                      </button>

                      <button
                        className={styles.sendBtn}
                        onClick={async () => {
                          setGameMenuOpen(false);
                          if (!profile?.username) { setSettingsOpen(true); setUsernameStatus("Create an ID to play"); return; }

                          // Determine friend UID from selected chat
                          const chat = chats.find(c => c.id === selected);
                          if (!chat || !chat.members) return;
                          const other = chat.members.find(m => m !== user.uid);
                          if (!other) return;

                          await startNewGame(other, 'rps');
                        }}
                        style={{ width: "100%", textAlign: "left", padding: "8px 10px", marginTop: 4 }}
                      >
                        ✂️ Rock Paper Scissors
                      </button>
                    </div>
                  )}
                </div>
              )}


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

          {addFriendOpen && (
            <div className={styles.settingsPanel} role="dialog" aria-modal="true" style={{ left: 280 }}>
              <div className={styles.settingsInner}>
                <h3>Add Friend</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input placeholder="friend-id" value={friendId} onChange={(e) => setFriendId(e.target.value)} />
                  <button className={styles.sendBtn} onClick={async () => { const ok = await addFriendById(friendId); if (ok) { setAddFriendOpen(false); setFriendId(""); } }}>Send Request</button>
                </div>
                {friendStatus && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{friendStatus}</div>}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button className={styles.sendBtn} onClick={() => setAddFriendOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {gameOpen && game && (
            <ActiveGame
              game={game}
              user={user}
              opponent={
                (game.players || (game.marks && Object.keys(game.marks)))
                  ?.filter((uid: string) => uid !== user?.uid)
                  .map((uid: string) => friendsList.find(f => f.uid === uid) || { uid })
                [0]
              }
              onMove={makeMove}
              onClose={() => setGameOpen(false)}
              onRestart={() => selected && startNewGame(
                (game.players || Object.keys(game.marks)).find((id: string) => id !== user?.uid)!,
                game.type
              )}
              onAccept={acceptGame}
              onDecline={declineGame}
            />
          )}

          <GameCenter
            isOpen={gameCenterOpen}
            onClose={() => setGameCenterOpen(false)}
            user={user}
            friendsList={friendsList}
            chats={chats}
            onOpenChat={(id) => { setSelected(id); setGameOpen(true); }}
            onStartGame={startNewGame}
          />

          {notificationsOpen && (
            <div className={styles.notificationPanel} role="dialog" aria-modal="true">
              <div className={styles.notificationInner}>
                <h3>Notifications</h3>

                {pendingRequests.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Friend Requests</div>
                    <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
                      {pendingRequests.map((r) => (
                        <li key={r.id} className={styles.notificationItem} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.fromUsername || r.fromUid}</div>
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>Wants to be your friend</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className={styles.sendBtn} onClick={() => acceptRequest(r)}>Accept</button>
                            <button className={styles.sendBtn} onClick={() => declineRequest(r)}>Decline</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" className={styles.sendBtn} onClick={() => setEmojiOpen((s) => !s)} title="Emoji" aria-label="Emoji" style={{ padding: 8 }}>
                  😊
                </button>
                {emojiOpen && (
                  <div ref={emojiPanelRef} style={{ position: "absolute", bottom: 56, left: 8, width: 260, background: "var(--panel, rgba(0,0,0,0.7))", padding: 8, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 60 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {emojiList.map((em) => (
                        <button
                          key={em}
                          type="button"
                          className={styles.sendBtn}
                          onClick={() => {
                            setInput((prev) => prev + em);
                            setEmojiOpen(false);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          style={{ padding: 6 }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                className={styles.messageInput}
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message"
                style={{ flex: 1, marginLeft: 8 }}
              />

              <button className={styles.sendBtn} type="submit" style={{ marginLeft: 8 }}>
                Send
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
