// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Auction {
    struct AuctionItem {
        address seller;
        string item;
        address owner;
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
        bool ended;
    }

    mapping(uint256 => AuctionItem) public auctions;
    uint256 public auctionCount;

    event AuctionCreated(uint256 auctionId, address seller, string item, uint256 endTime);
    event BidPlaced(uint256 auctionId, address bidder, uint256 bid);
    event AuctionEnded(uint256 auctionId, address winner, uint256 finalBid);

    function createAuction(string memory _item, uint256 _duration) public {
        auctionCount++;
        auctions[auctionCount] = AuctionItem({
            seller: msg.sender,
            item: _item,
            owner: msg.sender,
            highestBidder: address(0),
            highestBid: 0,
            endTime: block.timestamp + _duration,
            ended: false
        });
        emit AuctionCreated(auctionCount, msg.sender, _item, block.timestamp + _duration);
    }

    function bid(uint256 _auctionId) public payable {
        AuctionItem storage auction = auctions[_auctionId];
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid must be higher than current highest bid");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    function endAuction(uint256 _auctionId) public {
        AuctionItem storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            payable(auction.seller).transfer(auction.highestBid);
            auction.owner = auction.highestBidder;
        }

        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);
    }

    function getAuction(uint256 _auctionId) public view returns (
        address seller,
        string memory item,
        address owner,
        address highestBidder,
        uint256 highestBid,
        uint256 endTime,
        bool ended
    ) {
        AuctionItem memory auction = auctions[_auctionId];
        return (
            auction.seller,
            auction.item,
            auction.owner,
            auction.highestBidder,
            auction.highestBid,
            auction.endTime,
            auction.ended
        );
    }
}