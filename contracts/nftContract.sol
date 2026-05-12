// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionNFT is ERC721URIStorage, Ownable {

    uint256 public tokenCounter;

    constructor() ERC721("Auction NFT ", "ANFT") Ownable(msg.sender) {
        tokenCounter = 0;
    }
    
    function createNFT(string memory tokenURI,
    address recipient) public onlyOwner returns (uint256) {

        uint256 newItemId = tokenCounter;
  
        _safeMint(recipient, newItemId);

        _setTokenURI(newItemId, tokenURI);

        tokenCounter = tokenCounter + 1;

        return newItemId;      
    }
}