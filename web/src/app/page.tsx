import ChatUI from "@/components/ChatUI";

export default function Page() {
  const explorerBase = process.env.NEXT_PUBLIC_EXPLORER_BASE || "https://amoy.polygonscan.com";
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
  return (
    <main className="min-h-screen">
      <ChatUI explorerBase={explorerBase} contractAddress={contract} />
    </main>
  );
}
