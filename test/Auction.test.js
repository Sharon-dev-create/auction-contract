const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction", function () {
  let Auction, AuctionNFT, AuctionToken;
  let auction, nft, token;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    Auction = await ethers.getContractFactory("Auction");
    AuctionNFT = await ethers.getContractFactory("AuctionNFT");
    AuctionToken = await ethers.getContractFactory("AuctionToken");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    auction = await Auction.deploy();
    await auction.deployed();

    nft = await AuctionNFT.deploy();
    await nft.deployed();

    token = await AuctionToken.deploy(1000);
    await token.deployed();

    await token.transfer(addr1.address, ethers.parseUnits("100", 18));
    await token.transfer(addr2.address, ethers.parseUnits("100", 18));
  });

  describe("createAuction", function () {
    it("Should create an auction with NFT escrow", async function () {
      const tokenURI = "https://example.com/nft/1";
      await nft.createNFT(tokenURI, owner.address);
      const tokenId = (await nft.tokenCounter()) - 1n;
      const duration = 3600;
      const paymentToken = ethers.ZeroAddress;
      const item = "Test NFT";

      await nft.approve(auction.address, tokenId);

      const block = await ethers.provider.getBlock("latest");
      await expect(
        auction.createAuction(nft.address, tokenId, paymentToken, duration, item)
      )
        .to.emit(auction, "AuctionCreated")
        .withArgs(1, owner.address, item, nft.address, tokenId, paymentToken, block.timestamp + duration);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.seller).to.equal(owner.address);
      expect(auctionData.nftContract).to.equal(nft.address);
      expect(auctionData.tokenId).to.equal(tokenId);
      expect(auctionData.paymentToken).to.equal(paymentToken);
      expect(auctionData.owner).to.equal(owner.address);
      expect(auctionData.highestBidder).to.equal(ethers.ZeroAddress);
      expect(auctionData.highestBid).to.equal(0);
      expect(auctionData.ended).to.equal(false);
    });
  });

  describe("ETH auctions", function () {
    beforeEach(async function () {
      const tokenURI = "https://example.com/nft/1";
      await nft.createNFT(tokenURI, owner.address);
      this.tokenId = (await nft.tokenCounter()) - 1n;
      await nft.approve(auction.address, this.tokenId);
      await auction.createAuction(nft.address, this.tokenId, ethers.ZeroAddress, 3600, "ETH NFT");
    });

    it("Should accept ETH bids and end auction", async function () {
      const bidAmount = ethers.parseEther("1");
      await auction.connect(addr1).bid(1, bidAmount, { value: bidAmount });

      const auctionData = await auction.getAuction(1);
      expect(auctionData.highestBidder).to.equal(addr1.address);
      expect(auctionData.highestBid).to.equal(bidAmount);

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(auction.endAuction(1))
        .to.emit(auction, "AuctionEnded")
        .withArgs(1, addr1.address, bidAmount, ethers.ZeroAddress);

      expect(await nft.ownerOf(this.tokenId)).to.equal(addr1.address);
    });
  });

  describe("ERC20 auctions", function () {
    beforeEach(async function () {
      const tokenURI = "https://example.com/nft/2";
      await nft.createNFT(tokenURI, owner.address);
      this.tokenId = (await nft.tokenCounter()) - 1n;
      await nft.approve(auction.address, this.tokenId);
      await auction.createAuction(nft.address, this.tokenId, token.address, 3600, "ERC20 NFT");
    });

    it("Should accept ERC20 bids and end auction", async function () {
      const bidAmount = ethers.parseUnits("10", 18);
      await token.connect(addr1).approve(auction.address, bidAmount);
      await auction.connect(addr1).bid(1, bidAmount);

      const auctionData = await auction.getAuction(1);
      expect(auctionData.highestBidder).to.equal(addr1.address);
      expect(auctionData.highestBid).to.equal(bidAmount);
      expect(auctionData.paymentToken).to.equal(token.address);

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(auction.endAuction(1))
        .to.emit(auction, "AuctionEnded")
        .withArgs(1, addr1.address, bidAmount, token.address);

      expect(await nft.ownerOf(this.tokenId)).to.equal(addr1.address);
      expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits("810", 18));
    });
  });
});
