const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction", function () {
  let Auction, auction, owner, addr1, addr2, addr3;

  beforeEach(async function () {
    Auction = await ethers.getContractFactory("Auction");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    auction = await Auction.deploy();
  });

  describe("createAuction", function () {
    it("Should create an auction", async function () {
      const item = "Test Item";
      const duration = 3600; // 1 hour

      await expect(auction.createAuction(item, duration))
        .to.emit(auction, "AuctionCreated")
        .withArgs(1, owner.address, item, (await ethers.provider.getBlock("latest")).timestamp + duration);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.seller).to.equal(owner.address);
      expect(auctionData.item).to.equal(item);
      expect(auctionData.owner).to.equal(owner.address);
      expect(auctionData.highestBidder).to.equal(ethers.ZeroAddress);
      expect(auctionData.highestBid).to.equal(0);
      expect(auctionData.ended).to.equal(false);
    });

    it("Should increment auction count", async function () {
      await auction.createAuction("Item1", 3600);
      await auction.createAuction("Item2", 3600);
      expect(await auction.auctionCount()).to.equal(2);
    });
  });

  describe("bid", function () {
    beforeEach(async function () {
      await auction.createAuction("Test Item", 3600);
    });

    it("Should accept first bid", async function () {
      const bidAmount = ethers.parseEther("1");

      await expect(auction.connect(addr1).bid(1, { value: bidAmount }))
        .to.emit(auction, "BidPlaced")
        .withArgs(1, addr1.address, bidAmount);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.highestBidder).to.equal(addr1.address);
      expect(auctionData.highestBid).to.equal(bidAmount);
    });

    it("Should refund previous bidder when new higher bid is placed", async function () {
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("2");

      await auction.connect(addr1).bid(1, { value: bid1 });
      const initialBalance = await addr1.getBalance();

      await auction.connect(addr2).bid(1, { value: bid2 });

      const finalBalance = await addr1.getBalance();
      expect(finalBalance.sub(initialBalance)).to.equal(bid1);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.highestBidder).to.equal(addr2.address);
      expect(auctionData.highestBid).to.equal(bid2);
    });

    it("Should reject bid lower than current highest", async function () {
      const bid1 = ethers.parseEther("2");
      const bid2 = ethers.parseEther("1");

      await auction.connect(addr1).bid(1, { value: bid1 });
      await expect(auction.connect(addr2).bid(1, { value: bid2 })).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("Should reject bid after auction ended", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(auction.connect(addr1).bid(1, { value: ethers.parseEther("1") })).to.be.revertedWith("Auction has ended");
    });
  });

  describe("endAuction", function () {
    beforeEach(async function () {
      await auction.createAuction("Test Item", 3600);
    });

    it("Should end auction and transfer funds to seller", async function () {
      const bidAmount = ethers.parseEther("1");

      await auction.connect(addr1).bid(1, { value: bidAmount });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      const initialSellerBalance = await owner.getBalance();

      await expect(auction.endAuction(1))
        .to.emit(auction, "AuctionEnded")
        .withArgs(1, addr1.address, bidAmount);

      const finalSellerBalance = await owner.getBalance();
      expect(finalSellerBalance.sub(initialSellerBalance)).to.equal(bidAmount);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.ended).to.equal(true);
      expect(auctionData.owner).to.equal(addr1.address);
    });

    it("Should not end auction before time", async function () {
      await expect(auction.endAuction(1)).to.be.revertedWith("Auction has not ended yet");
    });

    it("Should not end auction twice", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await auction.endAuction(1);
      await expect(auction.endAuction(1)).to.be.revertedWith("Auction already ended");
    });

    it("Should handle auction with no bids", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await auction.endAuction(1);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.ended).to.equal(true);
      expect(auctionData.owner).to.equal(owner.address); // Owner remains the same
    });
  });

  describe("getAuction", function () {
    it("Should return correct auction data", async function () {
      const item = "Test Item";
      const duration = 3600;

      await auction.createAuction(item, duration);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.seller).to.equal(owner.address);
      expect(auctionData.item).to.equal(item);
      expect(auctionData.owner).to.equal(owner.address);
      expect(auctionData.highestBidder).to.equal(ethers.ZeroAddress);
      expect(auctionData.highestBid).to.equal(0);
      expect(auctionData.ended).to.equal(false);
    });
  });
});