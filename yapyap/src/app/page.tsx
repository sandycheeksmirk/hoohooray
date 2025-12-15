'use client'
import styles from "./page.module.css";

export default function Page() {
	const chats = [
		{ id: 1, name: "Alex", last: "See you soon", time: "12:34" },
		{ id: 2, name: "Design Team", last: "New assets uploaded", time: "09:11" },
		{ id: 3, name: "Sam", last: "Let's ship it", time: "Yesterday" },
	];

	const messages = [
		{ id: 1, text: "Hey, are you free today?", me: false, time: "12:30" },
		{ id: 2, text: "Yes, free after 2pm", me: true, time: "12:31" },
		{ id: 3, text: "Great — let's catch up then.", me: false, time: "12:32" },
		{ id: 4, text: "Sounds good. See you!", me: true, time: "12:33" },
	];

	return (
		<main className={styles.root}>
			<div className={styles.container}>
				<aside className={styles.sidebar}>
					<div className={styles.logo}>Telegram — BW</div>

					<div className={styles.search}>
						<input placeholder="Search" />
					</div>

					<ul className={styles.chatList}>
						{chats.map((c) => (
							<li className={styles.chatItem} key={c.id}>
								<div className={styles.chatAvatar} />
								<div className={styles.chatMeta}>
									<div className={styles.chatName}>{c.name}</div>
									<div className={styles.chatLast}>{c.last}</div>
								</div>
								<div className={styles.chatTime}>{c.time}</div>
							</li>
						))}
					</ul>
				</aside>

				<section className={styles.chatArea}>
					<header className={styles.chatHeader}>
						<div className={styles.headerAvatar} />
						<div className={styles.headerMeta}>
							<div className={styles.headerName}>Alex</div>
							<div className={styles.headerStatus}>online</div>
						</div>
					</header>

					<div className={styles.messages}>
						{messages.map((m) => (
							<div
								key={m.id}
								className={`${styles.msg} ${m.me ? styles.msgMe : styles.msgOther}`}
							>
								<div className={styles.msgText}>{m.text}</div>
								<div className={styles.msgTime}>{m.time}</div>
							</div>
						))}
					</div>

					<form className={styles.inputBar} onSubmit={(e) => e.preventDefault()}>
						<input className={styles.messageInput} placeholder="Message" />
						<button className={styles.sendBtn} type="submit">
							Send
						</button>
					</form>
				</section>
			</div>
		</main>
	);
}
