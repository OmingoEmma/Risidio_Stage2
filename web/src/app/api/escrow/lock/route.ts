import { NextRequest } from "next/server";
import { ethers } from "ethers";
import abi from "@/abi/Escrow.json" assert { type: "json" };

export async function POST(req: NextRequest) {
	try {
		const { seller, amountEth, timeoutSecs } = await req.json();
		if (!seller || !ethers.isAddress(seller)) return Response.json({ error: "Invalid seller" }, { status: 400 });
		const amt = parseFloat(String(amountEth));
		if (!(amt > 0)) return Response.json({ error: "Invalid amount" }, { status: 400 });
		const to = Number(timeoutSecs) || 3600;

		const rpc = process.env.POLYGON_AMOY_RPC || process.env.RPC_URL;
		const pk = process.env.PRIVATE_KEY;
		const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
		if (!rpc || !pk || !contractAddress) return Response.json({ error: "Server env missing" }, { status: 500 });

		const provider = new ethers.JsonRpcProvider(rpc);
		const wallet = new ethers.Wallet(pk, provider);
		const contract = new ethers.Contract(contractAddress, abi.abi, wallet);

		const tx = await contract.createEscrow(seller, to, { value: ethers.parseEther(String(amt)) });
		const receipt = await tx.wait();

		// read nextId - 1 as the created id
		const nextId: bigint = await contract.nextId();
		const id = Number(nextId - 1n);
		return Response.json({ id, txHash: receipt?.hash });
	} catch (e: any) {
		return Response.json({ error: e.message || "Failed" }, { status: 500 });
	}
}