import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("Escrow", function () {
  async function deployFixture() {
    const [buyer, seller, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();
    return { escrow, buyer, seller, other };
  }

  it("create", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const amount = ethers.parseEther("1");
    const timeout = 60;

    const tx = await escrow.connect(buyer).createEscrow(await seller.getAddress(), timeout, { value: amount });
    const receipt = await tx.wait();

    const nextId = await escrow.nextId();
    expect(nextId).to.equal(1n);

    const deal = await escrow.getDeal(0);
    expect(deal.buyer).to.equal(await buyer.getAddress());
    expect(deal.seller).to.equal(await seller.getAddress());
    expect(deal.amount).to.equal(amount);
    expect(deal.status).to.equal(1); // Funded

    const fundedEvent = receipt!.logs.find((l) => (l as any).fragment?.name === "Funded");
    expect(fundedEvent).to.not.be.undefined;
  });

  it("only buyer can release", async function () {
    const { escrow, buyer, seller, other } = await deployFixture();
    const amount = ethers.parseEther("0.5");
    await escrow.connect(buyer).createEscrow(await seller.getAddress(), 60, { value: amount });

    await expect(escrow.connect(seller).releaseToSeller(0)).to.be.revertedWith("Only buyer");
    await expect(escrow.connect(other).releaseToSeller(0)).to.be.revertedWith("Only buyer");

    const sellerBalBefore = await ethers.provider.getBalance(await seller.getAddress());
    const releaseTx = await escrow.connect(buyer).releaseToSeller(0);
    await releaseTx.wait();
    const sellerBalAfter = await ethers.provider.getBalance(await seller.getAddress());
    expect(sellerBalAfter - sellerBalBefore).to.equal(amount);
  });

  it("refund path before release (buyer or seller)", async function () {
    const { escrow, buyer, seller, other } = await deployFixture();
    const amount = ethers.parseEther("0.2");
    await escrow.connect(buyer).createEscrow(await seller.getAddress(), 60, { value: amount });

    // seller can trigger refund before release
    const buyerBalBefore = await ethers.provider.getBalance(await buyer.getAddress());
    const tx = await escrow.connect(seller).refundToBuyer(0);
    await tx.wait();
    const buyerBalAfter = await ethers.provider.getBalance(await buyer.getAddress());
    expect(buyerBalAfter).to.be.greaterThan(buyerBalBefore);
  });

  it("expire then refund (only buyer after expire)", async function () {
    const { escrow, buyer, seller, other } = await deployFixture();
    const amount = ethers.parseEther("0.3");
    await escrow.connect(buyer).createEscrow(await seller.getAddress(), 1, { value: amount });

    // advance time
    await network.provider.send("evm_increaseTime", [2]);
    await network.provider.send("evm_mine");

    await expect(escrow.connect(other).expire(0)).to.be.revertedWith("Only party");
    await escrow.connect(seller).expire(0);

    // Only buyer can refund after expiry
    await expect(escrow.connect(seller).refundToBuyer(0)).to.be.revertedWith("Only buyer after expire");

    const buyerBalBefore = await ethers.provider.getBalance(await buyer.getAddress());
    const tx = await escrow.connect(buyer).refundToBuyer(0);
    await tx.wait();
    const buyerBalAfter = await ethers.provider.getBalance(await buyer.getAddress());
    expect(buyerBalAfter).to.be.greaterThan(buyerBalBefore);
  });
});