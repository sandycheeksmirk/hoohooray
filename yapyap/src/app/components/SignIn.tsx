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
    <main className={styles.root}>
      <div className={styles.signinCardWrap}>
        <div className={styles.signinCard} role="dialog" aria-modal="true">
          <div className={styles.signinIcon}>→</div>
          <h1>Sign in with Google</h1>
          <p>Make a new doc to bring your words, data, and teams together. For free</p>

          <div style={{ marginTop: 8 }}>
            <button className={styles.googleBtn} onClick={handleSignIn} aria-label="Sign in with Google">
              <svg viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="#4285f4" d="M533.5 278.4c0-18.6-1.6-37-4.8-54.7H272v103.5h147.4c-6.4 34.5-25.2 63.8-53.8 83.4v69.3h86.9c50.9-46.9 80-116.1 80-201.9z"/><path fill="#34a853" d="M272 544.3c73.6 0 135.4-24.1 180.6-65.4l-86.9-69.3c-24.2 16.3-55.1 25.9-93.7 25.9-71.9 0-132.8-48.6-154.6-113.9H28.1v71.7C73.3 482.3 166.6 544.3 272 544.3z"/><path fill="#fbbc04" d="M117.4 325.5c-10.8-32.6-10.8-67.6 0-100.2V153.7H28.1c-39.4 78.7-39.4 172.4 0 251.1l89.3-79.3z"/><path fill="#ea4335" d="M272 109.9c39.8-.6 77.2 14 105.8 40.9l79.3-79.3C407.4 24.8 345.6 0 272 0 166.6 0 73.3 62 28.1 153.7l89.3 71.8C139.2 158.5 200.1 109.9 272 109.9z"/></svg>
              Sign in with Google
            </button>
          </div>

          <div className={styles.smallActions}>Only Google sign-in is supported</div>
        </div>
      </div>
    </main>
  );
}
