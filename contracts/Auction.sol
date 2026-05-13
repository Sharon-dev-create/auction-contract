// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./nftContract.sol";
import "./ercToken.sol";

contract Auction {
    struct AuctionItem {
        address seller;
        string item;
        address nftContract;
        uint256 tokenId;
        address paymentToken;
        address owner;
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
        bool ended;
    }

    mapping(uint256 => AuctionItem) public auctions;
    uint256 public auctionCount;

    event AuctionCreated(
        uint256 auctionId,
        address seller,
        string item,
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 endTime
    );

    event BidPlaced(
        uint256 auctionId,
        address bidder,
        uint256 bid,
        address paymentToken
    );

    event AuctionEnded(
        uint256 auctionId,
        address winner,
        uint256 finalBid,
        address paymentToken
    );

    function createAuction(
        AuctionNFT _nftContract,
        uint256 _tokenId,
        address _paymentToken,
        uint256 _duration,
        string memory _item
    ) public {
        require(_duration > 0, "Duration must be greater than zero");
        require(_nftContract.ownerOf(_tokenId) == msg.sender, "Not owner of NFT");

        auctionCount++;

        auctions[auctionCount] = AuctionItem({
            seller: msg.sender,
            item: _item,
            nftContract: address(_nftContract),
            tokenId: _tokenId,
            paymentToken: _paymentToken,
            owner: msg.sender,
            highestBidder: address(0),
            highestBid: 0,
            endTime: block.timestamp + _duration,
            ended: false
        });

        _nftContract.transferFrom(msg.sender, address(this), _tokenId);

        emit AuctionCreated(
            auctionCount,
            msg.sender,
            _item,
            address(_nftContract),
            _tokenId,
            _paymentToken,
            block.timestamp + _duration
        );
    }

    function bid(uint256 _auctionId, uint256 _amount) public payable {
        AuctionItem storage auction = auctions[_auctionId];
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(_amount > auction.highestBid, "Bid must be higher than current highest bid");

        if (auction.paymentToken == address(0)) {
            require(msg.value == _amount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Send ETH only for ETH auctions");
            require(
                AuctionToken(auction.paymentToken).transferFrom(msg.sender, address(this), _amount),
                "ERC20 transfer failed"
            );
        }

        if (auction.highestBidder != address(0)) {
            _refundPreviousBid(auction);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = _amount;

        emit BidPlaced(_auctionId, msg.sender, _amount, auction.paymentToken);
    }

    function _refundPreviousBid(AuctionItem storage auction) internal {
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        if (auction.paymentToken == address(0)) {
            payable(previousBidder).transfer(previousBid);
        } else {
            require(
                AuctionToken(auction.paymentToken).transfer(previousBidder, previousBid),
                "Refund token transfer failed"
            );
        }
    }

    function endAuction(uint256 _auctionId) public {
        AuctionItem storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            if (auction.paymentToken == address(0)) {
                payable(auction.seller).transfer(auction.highestBid);
            } else {
                require(
                    AuctionToken(auction.paymentToken).transfer(auction.seller, auction.highestBid),
                    "Seller token transfer failed"
                );
            }

            AuctionNFT(auction.nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );
            auction.owner = auction.highestBidder;
        } else {
            AuctionNFT(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
        }

        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid, auction.paymentToken);
    }

    function getAuction(uint256 _auctionId)
        public
        view
        returns (
            address seller,
            string memory item,
            address nftContract,
            uint256 tokenId,
            address paymentToken,
            address owner,
            address highestBidder,
            uint256 highestBid,
            uint256 endTime,
            bool ended
        )
    {
        AuctionItem memory auction = auctions[_auctionId];
        return (
            auction.seller,
            auction.item,
            auction.nftContract,
            auction.tokenId,
            auction.paymentToken,
            auction.owner,
            auction.highestBidder,
            auction.highestBid,
            auction.endTime,
            auction.ended
        );
    }
}
