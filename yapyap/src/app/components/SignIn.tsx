"use client";

import React, { useEffect } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace("/chat");
    });
    return () => unsub();
  }, [router]);

  async function handleSignIn() {
    if (!auth) return alert("Auth not initialized");
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/chat");
    } catch (e) {
      console.error(e);
      alert("Sign-in failed");
    }
  }

  return (
    <main className={styles.root} style={{ padding: 24 }}>
      <div className={styles.welcome}>
        <h1>Welcome to Yapyap</h1>
        <p>Sign in with Google to continue to your chats.</p>
        <div style={{ marginTop: 12 }}>
          <button className={styles.sendBtn} onClick={handleSignIn} style={{ padding: "10px 18px" }}>
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  );
}
