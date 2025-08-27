"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
	const [messages, setMessages] = useState<ChatMessage[]>([{
		id: crypto.randomUUID(), from: "ai", text: "Hi! I can help you book a service and lock funds in escrow. What do you need?", ts: Date.now()
	}]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [status, setStatus] = useState<"Awaiting Payment" | "Funds Locked" | "Released" | "Refunded" | "Expired">("Awaiting Payment");
	const [lastTx, setLastTx] = useState<{ hash: string; url: string } | null>(null);
	const [booking, setBooking] = useState<Booking>({ service: "Haircut", date: "", time: "", location: "", contact: "", amountEth: "0.05" });
	const [escrowId, setEscrowId] = useState<number | null>(null);
	const bottomRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

	async function sendMessage() {
		if (!input.trim()) return;
		const userMsg: ChatMessage = { id: crypto.randomUUID(), from: "user", text: input.trim(), ts: Date.now() };
		setMessages(m => [...m, userMsg]);
		setInput("");
		setIsTyping(true);
		try {
			const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg.text }) });
			const data = await res.json();
			const aiMsg: ChatMessage = { id: crypto.randomUUID(), from: "ai", text: data.reply ?? "I can help you book a service. Try 'Haircut tomorrow 2pm'.", ts: Date.now() };
			setMessages(m => [...m, aiMsg]);
		} catch (e) {
			setMessages(m => [...m, { id: crypto.randomUUID(), from: "ai", text: "Sorry, I had trouble replying.", ts: Date.now() }]);
		} finally {
			setIsTyping(false);
		}
	}

	async function lockPayment() {
		setIsTyping(true);
		try {
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
					<button className="bg-yellow-600 text-white px-3 py-2 rounded" onClick={lockPayment}>Lock Payment</button>
					<button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={release}>Mark Delivered</button>
					<button className="bg-red-600 text-white px-3 py-2 rounded" onClick={refund}>Refund</button>
					<button className="bg-gray-700 text-white px-3 py-2 rounded" onClick={expire}>Simulate Expiry</button>
				</div>

				<div className="text-xs text-gray-500 mt-2">Contract: {contractAddress}</div>
			</div>
		</div>
	);
}