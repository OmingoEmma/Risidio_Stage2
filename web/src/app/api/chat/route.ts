import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { message } = await req.json();
		const mode = (process.env.USE_AI || "mock").toLowerCase();
		if (mode === "live") {
			const { OpenAI } = await import("openai");
			const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
			const sys = "You are a booking assistant that guides the user to: 1) choose a service, 2) date/time, 3) location/contact (seller address), 4) confirm payment amount and timeout. Keep answers concise and focused on booking.";
			const r = await client.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: sys },
					{ role: "user", content: String(message || "") }
				],
				temperature: 0.2,
			});
			const reply = r.choices?.[0]?.message?.content || "I can help you book a service. Try 'Haircut tomorrow 2pm'.";
			return Response.json({ reply, intent: "booking", slots: {} });
		}
		// mock
		const text: string = String(message || "").toLowerCase();
		let reply = "I can help you book a service. Try 'Haircut tomorrow 2pm'.";
		if (/(haircut|clean|dog)/.test(text) && /(today|tomorrow|\d{1,2}\/?\d{1,2})/.test(text)) {
			reply = "Great! Please share your location, seller wallet address (0x...), and preferred time.";
		} else if (/0x[a-f0-9]{40}/i.test(text)) {
			reply = "Got the seller address. Enter amount in ETH and press Lock Payment.";
		}
		return Response.json({ reply, intent: "booking", slots: {} });
	} catch (e: any) {
		return Response.json({ reply: "I can help you book a service. Try 'Haircut tomorrow 2pm'." });
	}
}