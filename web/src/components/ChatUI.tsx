"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";

export type ChatMessage = {
	id: string;
	from: "user" | "ai";
	text: string;
	ts: number;
};

export type Booking = {
	service: string;
	date: string;
	time: string;
	location: string;
	contact: string;
	amountEth: string;
};

function formatTime(ts: number) {
	const d = new Date(ts);
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatUI({ explorerBase, contractAddress }: { explorerBase: string; contractAddress: string }) {
	type Step = "service" | "datetime" | "location" | "seller" | "amount" | "confirm" | "ready";
	const SERVICE_OPTIONS = ["Haircut", "House Cleaning", "Dog Walking"] as const;

	const [messages, setMessages] = useState<ChatMessage[]>([
		{ id: crypto.randomUUID(), from: "ai", text: "Welcome! I’ll help you book and lock payment in escrow.", ts: Date.now() },
		{ id: crypto.randomUUID(), from: "ai", text: "Which service do you need? (Haircut, House Cleaning, Dog Walking)", ts: Date.now() },
	]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [status, setStatus] = useState<"Awaiting Payment" | "Funds Locked" | "Released" | "Refunded" | "Expired">("Awaiting Payment");
	const [lastTx, setLastTx] = useState<{ hash: string; url: string } | null>(null);
	const [booking, setBooking] = useState<Booking>({ service: "", date: "", time: "", location: "", contact: "", amountEth: "" });
	const [escrowId, setEscrowId] = useState<number | null>(null);
	const [step, setStep] = useState<Step>("service");
	const bottomRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

	function isAddress(val: string) {
		return /^0x[a-fA-F0-9]{40}$/.test(val.trim());
	}

	function parseMessage(text: string) {
		const updates: Partial<Booking> = {};
		const lower = text.toLowerCase();

		for (const s of SERVICE_OPTIONS) {
			if (lower.includes(s.toLowerCase())) { updates.service = s; break; }
		}

		const timeMatch = text.match(/\b(\d{1,2}(:\d{2})?\s?(am|pm)?)\b/i);
		if (timeMatch) updates.time = timeMatch[1].toUpperCase();

		if (/\btoday\b/i.test(text)) {
			const d = new Date();
			updates.date = d.toISOString().slice(0,10);
		} else if (/\btomorrow\b/i.test(text)) {
			const d = new Date(); d.setDate(d.getDate()+1);
			updates.date = d.toISOString().slice(0,10);
		} else {
			const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
			if (dateMatch) updates.date = dateMatch[1];
		}

		const addrMatch = text.match(/(0x[a-fA-F0-9]{40})/);
		if (addrMatch) updates.contact = addrMatch[1];

		const amtMatch = text.match(/\b(\d+(?:\.\d+)?)(?=\s*eth|\s*$)/i);
		if (amtMatch) updates.amountEth = amtMatch[1];

		const locMatch = text.match(/\b(?:at|in)\s+([^,.]+)(?:[,.]|$)/i);
		if (locMatch && !isAddress(locMatch[1])) updates.location = locMatch[1].trim();

		return updates;
	}

	function nextPrompt(current: Step, b: Booking): { next: Step; prompt: string } {
		if (!b.service) return { next: "service", prompt: "Which service do you need? (Haircut, House Cleaning, Dog Walking)" };
		if (!b.date || !b.time) return { next: "datetime", prompt: "What date and time? (e.g., 2025-08-31 at 2pm)" };
		if (!b.location) return { next: "location", prompt: "Where should the service take place?" };
		if (!b.contact || !isAddress(b.contact)) return { next: "seller", prompt: "What is the seller wallet address? (0x...)" };
		if (!b.amountEth || Number(b.amountEth) <= 0) return { next: "amount", prompt: "How much to lock (ETH)? (e.g., 0.05)" };
		if (current !== "ready") return { next: "confirm", prompt: `Confirm: ${b.service} on ${b.date} ${b.time} at ${b.location}, seller ${b.contact}, amount ${b.amountEth} ETH. Reply 'confirm'.` };
		return { next: "ready", prompt: "All set. Press Lock Payment to continue." };
	}

	async function sendMessage() {
		if (!input.trim()) return;
		const txt = input.trim();
		const userMsg: ChatMessage = { id: crypto.randomUUID(), from: "user", text: txt, ts: Date.now() };
		setMessages(m => [...m, userMsg]);
		setInput("");
		setIsTyping(true);

		setBooking(prev => {
			const merged = { ...prev, ...parseMessage(txt) } as Booking;
			let next = step;
			const lc = txt.toLowerCase();
			if (lc === "confirm" || lc === "ok" || lc === "yes") next = "ready";
			const { next: calcNext, prompt } = nextPrompt(next, merged);
			setStep(calcNext === "confirm" && (lc === "confirm" || next === "ready") ? "ready" : calcNext);
			setTimeout(() => {
				setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: calcNext === "confirm" && (lc === "confirm" || next === "ready") ? "Confirmed. Press Lock Payment when ready." : prompt, ts: Date.now() }]);
				setIsTyping(false);
			}, 300);
			return merged;
		});
	}

	const canLock = Boolean(booking.service && booking.date && booking.time && booking.location && isAddress(booking.contact) && Number(booking.amountEth) > 0);

	async function lockPayment() {
		setIsTyping(true);
		try {
			if (!canLock) {
				const { prompt } = nextPrompt(step, booking);
				setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Missing info. ${prompt}`, ts: Date.now() }]);
				return;
			}
			const res = await fetch("/api/escrow/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
				seller: booking.contact,
				amountEth: booking.amountEth,
				timeoutSecs: 3600,
			}) });
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setEscrowId(data.id);
			setStatus("Funds Locked");
			setLastTx({ hash: data.txHash, url: `${explorerBase}/tx/${data.txHash}` });
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Funds locked. Escrow #${data.id}.`, ts: Date.now() }]);
			setStep("ready");
		} catch (e: any) {
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Failed to lock: ${e.message}` , ts: Date.now() }]);
		} finally { setIsTyping(false); }
	}

	async function release() {
		if (escrowId == null) return;
		setIsTyping(true);
		try {
			const res = await fetch("/api/escrow/release", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: escrowId }) });
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setStatus("Released");
			setLastTx({ hash: data.txHash, url: `${explorerBase}/tx/${data.txHash}` });
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Released escrow #${escrowId} to seller.`, ts: Date.now() }]);
		} catch (e: any) {
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Failed to release: ${e.message}` , ts: Date.now() }]);
		} finally { setIsTyping(false); }
	}

	async function refund() {
		if (escrowId == null) return;
		setIsTyping(true);
		try {
			const res = await fetch("/api/escrow/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: escrowId }) });
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setStatus("Refunded");
			setLastTx({ hash: data.txHash, url: `${explorerBase}/tx/${data.txHash}` });
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Refunded escrow #${escrowId}.`, ts: Date.now() }]);
		} catch (e: any) {
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Failed to refund: ${e.message}` , ts: Date.now() }]);
		} finally { setIsTyping(false); }
	}

	async function expire() {
		if (escrowId == null) return;
		setIsTyping(true);
		try {
			const res = await fetch("/api/escrow/expire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: escrowId }) });
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setStatus("Expired");
			setLastTx({ hash: data.txHash, url: `${explorerBase}/tx/${data.txHash}` });
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Escrow #${escrowId} expired. Buyer can refund.`, ts: Date.now() }]);
		} catch (e: any) {
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: `Failed to expire: ${e.message}` , ts: Date.now() }]);
		} finally { setIsTyping(false); }
	}

	function QuickReplies() {
		if (step === "service") {
			return (
				<div className="flex gap-2 flex-wrap mt-2">
					{SERVICE_OPTIONS.map(s => (
						<button key={s} className="px-2 py-1 text-xs bg-white rounded shadow" onClick={() => handleQuickService(s)}>{s}</button>
					))}
				</div>
			);
		}
		if (step === "confirm") {
			return (
				<div className="flex gap-2 flex-wrap mt-2">
					<button className="px-2 py-1 text-xs bg-white rounded shadow" onClick={() => handleConfirm()}>Confirm</button>
				</div>
			);
		}
		return null;
	}

	function handleQuickService(s: string) {
		setBooking(b => ({ ...b, service: s }));
		const { next, prompt } = nextPrompt("service", { ...booking, service: s });
		setStep(next);
		setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: prompt, ts: Date.now() }]);
	}

	function handleConfirm() {
		setStep("ready");
		setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: "Confirmed. Press Lock Payment to continue.", ts: Date.now() }]);
	}

	return (
		<div className="max-w-2xl mx-auto p-2 sm:p-4">
			<div className="flex items-center justify-between mb-2">
				<div className="text-sm">Status: <span className={classNames("px-2 py-1 rounded text-white", {
					"bg-gray-500": status === "Awaiting Payment",
					"bg-green-600": status === "Funds Locked",
					"bg-blue-600": status === "Released",
					"bg-yellow-600": status === "Expired",
					"bg-red-600": status === "Refunded",
				})}>{status}</span></div>
				{lastTx && <a className="text-xs text-blue-700 underline" href={lastTx.url} target="_blank" rel="noreferrer">View tx</a>}
			</div>

			<div className="bg-white rounded shadow p-3">
				<div className="space-y-2 max-h-[50vh] overflow-y-auto p-2" style={{ background: "#efeae2" }}>
					{messages.map(m => (
						<div key={m.id} className={classNames("flex", { "justify-end": m.from === "user" })}>
							<div className={classNames("max-w-[70%] rounded px-3 py-2 text-sm", m.from === "user" ? "bg-green-100" : "bg-white")}
								style={{ boxShadow: "0 1px rgba(0,0,0,0.1)" }}>
								<div>{m.text}</div>
								<div className="text-[10px] text-gray-500 text-right mt-1">{formatTime(m.ts)}</div>
							</div>
						</div>
					))}
					{isTyping && (
						<div className="flex">
							<div className="bg-white rounded px-3 py-2">
								<div className="typing"><span></span><span></span><span></span></div>
							</div>
						</div>
					)}
					<div ref={bottomRef} />
				</div>

				<QuickReplies />

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
					<div className="space-y-2">
						<select className="w-full border rounded p-2" value={booking.service} onChange={e => setBooking({ ...booking, service: e.target.value })}>
							<option>Haircut</option>
							<option>House Cleaning</option>
							<option>Dog Walking</option>
						</select>
						<input className="w-full border rounded p-2" type="date" value={booking.date} onChange={e => setBooking({ ...booking, date: e.target.value })} />
						<input className="w-full border rounded p-2" type="time" value={booking.time} onChange={e => setBooking({ ...booking, time: e.target.value })} />
					</div>
					<div className="space-y-2">
						<input className="w-full border rounded p-2" placeholder="Location" value={booking.location} onChange={e => setBooking({ ...booking, location: e.target.value })} />
						<input className="w-full border rounded p-2" placeholder="Seller Address (0x...)" value={booking.contact} onChange={e => setBooking({ ...booking, contact: e.target.value })} />
						<input className="w-full border rounded p-2" placeholder="Amount (ETH)" value={booking.amountEth} onChange={e => setBooking({ ...booking, amountEth: e.target.value })} />
					</div>
				</div>

				<div className="flex gap-2 mt-3 flex-wrap">
					<input className="flex-1 border rounded p-2" placeholder="Type a message" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
					<button className="bg-green-600 text-white px-3 py-2 rounded" onClick={sendMessage}>Send</button>
				</div>

				<div className="flex gap-2 mt-3 flex-wrap">
					<button className={classNames("px-3 py-2 rounded text-white", canLock ? "bg-yellow-600" : "bg-yellow-300 cursor-not-allowed")} onClick={lockPayment} disabled={!canLock}>Lock Payment</button>
					<button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={release}>Mark Delivered</button>
					<button className="bg-red-600 text-white px-3 py-2 rounded" onClick={refund}>Refund</button>
					<button className="bg-gray-700 text-white px-3 py-2 rounded" onClick={expire}>Simulate Expiry</button>
				</div>

				<div className="text-xs text-gray-500 mt-2">Contract: {contractAddress}</div>
			</div>
		</div>
	);
}