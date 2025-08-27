import { NextRequest } from "next/server";
import { ethers } from "ethers";
import abi from "@/abi/Escrow.json" assert { type: "json" };

export async function POST(req: NextRequest) {
	try {
		const { id } = await req.json();
		const rpc = process.env.POLYGON_AMOY_RPC || process.env.RPC_URL;
		const pk = process.env.PRIVATE_KEY;
		const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
		if (!rpc || !pk || !contractAddress) return Response.json({ error: "Server env missing" }, { status: 500 });
		const provider = new ethers.JsonRpcProvider(rpc);
		const wallet = new ethers.Wallet(pk, provider);
		const contract = new ethers.Contract(contractAddress, abi.abi, wallet);
		const tx = await contract.releaseToSeller(Number(id));
		const receipt = await tx.wait();
		return Response.json({ txHash: receipt?.hash });
	} catch (e: any) {
		return Response.json({ error: e.message || "Failed" }, { status: 500 });
	}
}