import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("=== Auction Contract Automated Script ===\n");

  // Get signers
  const [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("Bidder1:", bidder1.address);
  console.log("Bidder2:", bidder2.address);
  console.log("Bidder3:", bidder3.address);

  // Deploy contracts
  console.log("\n--- Deploying Contracts ---");
  const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
  const AuctionToken = await ethers.getContractFactory("AuctionToken");
  const Auction = await ethers.getContractFactory("Auction");

  const nft = await AuctionNFT.deploy();
  await nft.deployed();
  console.log("AuctionNFT deployed at:", nft.address);

  const token = await AuctionToken.deploy(10000);
  await token.deployed();
  console.log("AuctionToken deployed at:", token.address);

  const auction = await Auction.deploy();
  await auction.deployed();
  console.log("Auction deployed at:", auction.address);

  // Distribute ERC20 tokens
  console.log("\n--- Distributing ERC20 Tokens ---");
  await token.transfer(bidder1.address, ethers.parseUnits("1000", 18));
  await token.transfer(bidder2.address, ethers.parseUnits("1000", 18));
  await token.transfer(bidder3.address, ethers.parseUnits("1000", 18));
  console.log("Distributed 1000 ATK tokens to each bidder");

  // Create NFTs
  console.log("\n--- Creating NFTs ---");
  const nft1URI = "ipfs://QmExampleNFT1";
  const nft2URI = "ipfs://QmExampleNFT2";
  const nft3URI = "ipfs://QmExampleNFT3";

  await nft.createNFT(nft1URI, owner.address);
  await nft.createNFT(nft2URI, owner.address);
  await nft.createNFT(nft3URI, owner.address);
  console.log("Created 3 NFTs for owner");

  // ===== ETH AUCTION (NFT 0) =====
  console.log("\n--- ETH Auction (NFT #0) ---");
  const nftId1 = 0n;
  const duration = 3600;

  await nft.approve(auction.address, nftId1);
  const tx1 = await auction.createAuction(
    nft.address,
    nftId1,
    ethers.ZeroAddress, // ETH payment
    duration,
    "Rare NFT - ETH Auction"
  );
  await tx1.wait();
  console.log("✓ Auction 1 created (ETH payment)");

  // Bidders place bids on ETH auction
  console.log("\nBidding on Auction 1:");
  const ethBid1 = ethers.parseEther("1");
  const ethBid2 = ethers.parseEther("2");
  const ethBid3 = ethers.parseEther("3");

  let tx = await auction.connect(bidder1).bid(1, ethBid1, { value: ethBid1 });
  await tx.wait();
  console.log("✓ Bidder1 bids 1 ETH");

  tx = await auction.connect(bidder2).bid(1, ethBid2, { value: ethBid2 });
  await tx.wait();
  console.log("✓ Bidder2 bids 2 ETH (Bidder1 refunded 1 ETH)");

  tx = await auction.connect(bidder3).bid(1, ethBid3, { value: ethBid3 });
  await tx.wait();
  console.log("✓ Bidder3 bids 3 ETH (Bidder2 refunded 2 ETH)");

  // ===== ERC20 AUCTION 1 (NFT 1) =====
  console.log("\n--- ERC20 Auction 1 (NFT #1) ---");
  const nftId2 = 1n;

  await nft.approve(auction.address, nftId2);
  tx = await auction.createAuction(
    nft.address,
    nftId2,
    token.address, // ERC20 payment
    duration,
    "Classic NFT - ERC20 Auction"
  );
  await tx.wait();
  console.log("✓ Auction 2 created (ATK token payment)");

  // Bidders place bids on ERC20 auction
  console.log("\nBidding on Auction 2:");
  const tokenBid1 = ethers.parseUnits("100", 18);
  const tokenBid2 = ethers.parseUnits("200", 18);

  await token.connect(bidder1).approve(auction.address, tokenBid1);
  tx = await auction.connect(bidder1).bid(2, tokenBid1);
  await tx.wait();
  console.log("✓ Bidder1 bids 100 ATK");

  await token.connect(bidder2).approve(auction.address, tokenBid2);
  tx = await auction.connect(bidder2).bid(2, tokenBid2);
  await tx.wait();
  console.log("✓ Bidder2 bids 200 ATK (Bidder1 refunded 100 ATK)");

  // ===== ERC20 AUCTION 2 (NFT 2) =====
  console.log("\n--- ERC20 Auction 2 (NFT #2) ---");
  const nftId3 = 2n;

  await nft.approve(auction.address, nftId3);
  tx = await auction.createAuction(
    nft.address,
    nftId3,
    token.address,
    duration,
    "Legendary NFT - ERC20 Auction"
  );
  await tx.wait();
  console.log("✓ Auction 3 created (ATK token payment)");

  // No bids on auction 3 for demonstration
  console.log("(No bids placed on Auction 3)");

  // Fast forward time
  console.log("\n--- Fast Forwarding Time ---");
  await ethers.provider.send("evm_increaseTime", [3601]);
  await ethers.provider.send("evm_mine");
  console.log("✓ Advanced blockchain by 3601 seconds");

  // End auctions
  console.log("\n--- Ending Auctions ---");

  tx = await auction.endAuction(1);
  await tx.wait();
  console.log("✓ Auction 1 ended");
  console.log("  - NFT #0 transferred to Bidder3 (highest bidder)");
  console.log("  - Owner receives 3 ETH");

  tx = await auction.endAuction(2);
  await tx.wait();
  console.log("✓ Auction 2 ended");
  console.log("  - NFT #1 transferred to Bidder2 (highest bidder)");
  console.log("  - Owner receives 200 ATK");

  tx = await auction.endAuction(3);
  await tx.wait();
  console.log("✓ Auction 3 ended");
  console.log("  - NFT #2 returned to Owner (no bids)");

  // Verify final state
  console.log("\n--- Final State Verification ---");

  const nft0Owner = await nft.ownerOf(0);
  const nft1Owner = await nft.ownerOf(1);
  const nft2Owner = await nft.ownerOf(2);

  console.log("NFT Ownership:");
  console.log("  NFT #0:", nft0Owner === bidder3.address ? "✓ Bidder3" : "✗ Wrong owner");
  console.log("  NFT #1:", nft1Owner === bidder2.address ? "✓ Bidder2" : "✗ Wrong owner");
  console.log("  NFT #2:", nft2Owner === owner.address ? "✓ Owner" : "✗ Wrong owner");

  console.log("\nToken Balances:");
  const ownerTokenBalance = await token.balanceOf(owner.address);
  const bidder1TokenBalance = await token.balanceOf(bidder1.address);
  const bidder2TokenBalance = await token.balanceOf(bidder2.address);

  console.log("  Owner ATK:", ethers.formatUnits(ownerTokenBalance, 18), "ATK");
  console.log("  Bidder1 ATK:", ethers.formatUnits(bidder1TokenBalance, 18), "ATK");
  console.log("  Bidder2 ATK:", ethers.formatUnits(bidder2TokenBalance, 18), "ATK");

  console.log("\nAuction Details:");
  const auc1 = await auction.getAuction(1);
  const auc2 = await auction.getAuction(2);
  const auc3 = await auction.getAuction(3);

  console.log("  Auction 1 - Winner:", auc1.highestBidder === bidder3.address ? "✓ Bidder3" : "✗ Wrong");
  console.log("  Auction 2 - Winner:", auc2.highestBidder === bidder2.address ? "✓ Bidder2" : "✗ Wrong");
  console.log("  Auction 3 - No winner:", auc3.highestBidder === ethers.ZeroAddress ? "✓ Correct" : "✗ Wrong");

  console.log("\n=== Automated Script Completed Successfully ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
