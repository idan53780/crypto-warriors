// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IWarriorNFT {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function tokenCreator(uint256 tokenId) external view returns (address);
}

/**
 * @title Marketplace
 * @dev P2P marketplace for buying/selling warriors with 10% creator royalty
 */
contract Marketplace is ReentrancyGuard, Ownable {
    
    IWarriorNFT public warriorNFT;
    
    uint256 public constant ROYALTY_PERCENTAGE = 10;
    uint256 public constant PERCENTAGE_DENOMINATOR = 100;
    
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    
    // tokenId => Listing
    mapping(uint256 => Listing) public listings;
    
    // Track all active listings
    uint256[] public activeListings;
    mapping(uint256 => uint256) public listingIndex; // tokenId => index in activeListings
    
    // Events
    event WarriorListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event WarriorDelisted(uint256 indexed tokenId, address indexed seller);
    event WarriorSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty);
    event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    
    constructor(address _warriorNFT) Ownable() {
        warriorNFT = IWarriorNFT(_warriorNFT);
    }
    
    /**
     * @dev List warrior for sale
     */
    function listWarrior(uint256 tokenId, uint256 price) external nonReentrant {
        require(warriorNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(warriorNFT.getApproved(tokenId) == address(this), "Marketplace not approved");
        require(!listings[tokenId].active, "Already listed");
        
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });
        
        // Add to active listings
        listingIndex[tokenId] = activeListings.length;
        activeListings.push(tokenId);
        
        emit WarriorListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev Update listing price
     */
    function updatePrice(uint256 tokenId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Not listed");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit PriceUpdated(tokenId, oldPrice, newPrice);
    }
    
    /**
     * @dev Remove listing
     */
    function delistWarrior(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Not listed");
        
        listing.active = false;
        
        // Remove from active listings
        _removeFromActiveListings(tokenId);
        
        emit WarriorDelisted(tokenId, msg.sender);
    }
    
    /**
     * @dev Buy listed warrior
     */
    function buyWarrior(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        
        require(listing.active, "Warrior not listed");
        require(msg.value == listing.price, "Incorrect price");
        require(warriorNFT.ownerOf(tokenId) == listing.seller, "Seller no longer owns warrior");
        require(msg.sender != listing.seller, "Cannot buy your own warrior");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // Calculate royalty
        address creator = warriorNFT.tokenCreator(tokenId);
        uint256 royalty = (price * ROYALTY_PERCENTAGE) / PERCENTAGE_DENOMINATOR;
        uint256 sellerAmount = price - royalty;
        
        // Mark as sold
        listing.active = false;
        
        // Remove from active listings
        _removeFromActiveListings(tokenId);
        
        // Transfer NFT
        warriorNFT.transferFrom(seller, msg.sender, tokenId);
        
        // Pay seller and creator
        payable(seller).transfer(sellerAmount);
        payable(creator).transfer(royalty);
        
        emit WarriorSold(tokenId, seller, msg.sender, price, royalty);
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
    
    /**
     * @dev Get all active listings
     */
    function getActiveListings() external view returns (uint256[] memory) {
        return activeListings;
    }
    
    /**
     * @dev Get active listing count
     */
    function getActiveListingCount() external view returns (uint256) {
        return activeListings.length;
    }
    
    /**
     * @dev Internal function to remove listing from active array
     */
    function _removeFromActiveListings(uint256 tokenId) private {
        uint256 index = listingIndex[tokenId];
        uint256 lastIndex = activeListings.length - 1;
        
        if (index != lastIndex) {
            uint256 lastTokenId = activeListings[lastIndex];
            activeListings[index] = lastTokenId;
            listingIndex[lastTokenId] = index;
        }
        
        activeListings.pop();
        delete listingIndex[tokenId];
    }
}