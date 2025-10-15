// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title WarriorNFT
 * @dev NFT representing warriors with stats, ownership history, and creator royalties
 */
contract WarriorNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    
    // Royalty percentage (10% = 1000 basis points)
    uint256 public constant ROYALTY_PERCENTAGE = 10;
    uint256 public constant PERCENTAGE_DENOMINATOR = 100;

    // Warrior attributes
    struct Warrior {
        string name;
        uint256 attack;
        uint256 defense;
        uint256 health;
        uint256 maxHealth;
        uint256 level;
        uint256 experience;
        uint256 wins;
        uint256 losses;
        uint256 creationTime;
        string warriorClass;
    }

    // Mappings
    mapping(uint256 => Warrior) public warriors;
    mapping(uint256 => address) public tokenCreator;
    mapping(uint256 => address[]) public ownershipHistory;
    mapping(address => uint256[]) public ownerWarriors;

    // Events
    event WarriorMinted(uint256 indexed tokenId, address indexed owner, string name, string class);
    event WarriorTransferredWithRoyalty(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price, uint256 royalty);
    event WarriorLevelUp(uint256 indexed tokenId, uint256 newLevel);
    event WarriorStatsUpdated(uint256 indexed tokenId);

    constructor() ERC721("CryptoWarrior", "CWAR") Ownable() {}

    /**
     * @dev Mint a new warrior with random stats
     */
    function mintWarrior(
        address to,
        string memory name,
        string memory warriorClass
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        
        // Generate random stats based on class
        uint256 baseAttack = _generateStat(tokenId, "attack", warriorClass);
        uint256 baseDefense = _generateStat(tokenId, "defense", warriorClass);
        uint256 baseHealth = _generateStat(tokenId, "health", warriorClass);

        warriors[tokenId] = Warrior({
            name: name,
            attack: baseAttack,
            defense: baseDefense,
            health: baseHealth,
            maxHealth: baseHealth,
            level: 1,
            experience: 0,
            wins: 0,
            losses: 0,
            creationTime: block.timestamp,
            warriorClass: warriorClass
        });

        tokenCreator[tokenId] = to;
        ownershipHistory[tokenId].push(to);
        ownerWarriors[to].push(tokenId);

        emit WarriorMinted(tokenId, to, name, warriorClass);
        
        return tokenId;
    }

    /**
     * @dev Transfer warrior with 10% royalty to creator
     */
    function transferWarriorWithRoyalty(
        address to,
        uint256 tokenId
    ) public payable {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(msg.value > 0, "Must send payment");
        require(to != address(0), "Invalid recipient");

        address creator = tokenCreator[tokenId];
        uint256 royalty = (msg.value * ROYALTY_PERCENTAGE) / PERCENTAGE_DENOMINATOR;
        uint256 sellerAmount = msg.value - royalty;

        // Transfer royalty to creator
        payable(creator).transfer(royalty);

        // Transfer remaining amount to seller
        payable(msg.sender).transfer(sellerAmount);

        // Transfer the NFT
        _transfer(msg.sender, to, tokenId);

        // Update ownership history
        ownershipHistory[tokenId].push(to);
        ownerWarriors[to].push(tokenId);

        // Remove from previous owner's list
        _removeWarriorFromOwner(msg.sender, tokenId);

        emit WarriorTransferredWithRoyalty(tokenId, msg.sender, to, msg.value, royalty);
    }

    /**
     * @dev Get complete ownership history
     */
    function getOwnershipHistory(uint256 tokenId) public view returns (address[] memory) {
        return ownershipHistory[tokenId];
    }

    /**
     * @dev Get all warriors owned by an address
     */
    function getWarriorsByOwner(address owner) public view returns (uint256[] memory) {
        return ownerWarriors[owner];
    }

    /**
     * @dev Get warrior details
     */
    function getWarrior(uint256 tokenId) public view returns (Warrior memory) {
        require(_exists(tokenId), "Warrior does not exist");
        return warriors[tokenId];
    }

    /**
     * @dev Update warrior stats after battle (only game contract)
     */
    function updateWarriorAfterBattle(
        uint256 tokenId,
        bool won,
        uint256 experienceGained,
        uint256 healthLost
    ) external onlyOwner {
        Warrior storage warrior = warriors[tokenId];
        
        if (won) {
            warrior.wins++;
        } else {
            warrior.losses++;
        }

        warrior.experience += experienceGained;

        // Level up check
        uint256 requiredExp = warrior.level * 100;
        if (warrior.experience >= requiredExp) {
            warrior.level++;
            warrior.attack += 5;
            warrior.defense += 3;
            warrior.maxHealth += 10;
            warrior.health = warrior.maxHealth;
            emit WarriorLevelUp(tokenId, warrior.level);
        } else {
            // Apply damage
            if (healthLost >= warrior.health) {
                warrior.health = 1; // Warrior survives with 1 HP
            } else {
                warrior.health -= healthLost;
            }
        }

        emit WarriorStatsUpdated(tokenId);
    }

    /**
     * @dev Heal warrior (only game contract)
     */
    function healWarrior(uint256 tokenId) external onlyOwner {
        warriors[tokenId].health = warriors[tokenId].maxHealth;
        emit WarriorStatsUpdated(tokenId);
    }

    /**
     * @dev Generate random stat based on class
     */
    function _generateStat(uint256 tokenId, string memory statType, string memory class) private view returns (uint256) {
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, tokenId, statType, class))) % 50;
        
        // Class bonuses
        if (keccak256(bytes(class)) == keccak256(bytes("Knight"))) {
            if (keccak256(bytes(statType)) == keccak256(bytes("defense"))) return 70 + randomValue;
            if (keccak256(bytes(statType)) == keccak256(bytes("health"))) return 150 + randomValue;
            return 50 + randomValue;
        } else if (keccak256(bytes(class)) == keccak256(bytes("Mage"))) {
            if (keccak256(bytes(statType)) == keccak256(bytes("attack"))) return 80 + randomValue;
            return 40 + randomValue;
        } else if (keccak256(bytes(class)) == keccak256(bytes("Archer"))) {
            if (keccak256(bytes(statType)) == keccak256(bytes("attack"))) return 70 + randomValue;
            if (keccak256(bytes(statType)) == keccak256(bytes("defense"))) return 45 + randomValue;
            return 100 + randomValue;
        }
        
        return 50 + randomValue;
    }

    /**
     * @dev Remove warrior from owner's list
     */
    function _removeWarriorFromOwner(address owner, uint256 tokenId) private {
        uint256[] storage warriorsList = ownerWarriors[owner];
        for (uint256 i = 0; i < warriorsList.length; i++) {
            if (warriorsList[i] == tokenId) {
                warriorsList[i] = warriorsList[warriorsList.length - 1];
                warriorsList.pop();
                break;
            }
        }
    }

    /**
     * @dev Check if token exists (replaces deprecated _exists)
     */
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    super._burn(tokenId);
    }
}