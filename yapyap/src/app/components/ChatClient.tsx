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
} from "firebase/firestore";

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

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* ignore in SSR */
    }
  }, [theme]);

  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      if (!selected && snap.docs.length) {
        setSelected(snap.docs[0].id);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selected) return;
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
  }, [selected]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
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
      me: true,
      createdAt: serverTimestamp(),
    });

    // update chat meta
    const chatRef = doc(db, "chats", selected as string);
    await updateDoc(chatRef, { last: input, updatedAt: serverTimestamp() });

    setInput("");
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
            <div className={styles.themeSelect}>
              <select
                aria-label="Theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
              >
                <option value="bw">Black & White</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </header>

          <div className={styles.messages}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.msg} ${m.me ? styles.msgMe : styles.msgOther}`}
              >
                <div className={styles.msgText}>{m.text}</div>
                <div className={styles.msgTime}>—</div>
              </div>
            ))}
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
