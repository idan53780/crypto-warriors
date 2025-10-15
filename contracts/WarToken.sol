// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WarToken
 * @dev ERC20 token used as in-game currency for CryptoWarriors
 * Players earn WAR tokens by winning battles and spend them on actions
 */
contract WarToken is ERC20, Ownable {
    
    // Cost configurations
    uint256 public MINT_WARRIOR_COST = 100 * 10**18;  // 100 WAR
    uint256 public BATTLE_ENTRY_COST = 10 * 10**18;   // 10 WAR
    uint256 public HEAL_COST = 5 * 10**18;            // 5 WAR
    
    // Battle reward
    uint256 public BATTLE_REWARD = 20 * 10**18;       // 20 WAR
    
    // Authorized game contracts
    mapping(address => bool) public gameContracts;
    
    event GameContractUpdated(address indexed gameContract, bool authorized);
    event TokensEarnedInGame(address indexed player, uint256 amount, string reason);
    event TokensSpentInGame(address indexed player, uint256 amount, string reason);

    constructor(uint256 initialSupply) ERC20("WarToken", "WAR") Ownable() {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /**
     * @dev Authorize a game contract to mint/burn tokens
     */
    function setGameContract(address gameContract, bool authorized) external onlyOwner {
        gameContracts[gameContract] = authorized;
        emit GameContractUpdated(gameContract, authorized);
    }

    /**
     * @dev Mint tokens as battle rewards (only callable by authorized game contracts)
     */
    function rewardPlayer(address player, uint256 amount, string memory reason) external {
        require(gameContracts[msg.sender], "Not authorized game contract");
        _mint(player, amount);
        emit TokensEarnedInGame(player, amount, reason);
    }

    /**
     * @dev Burn tokens for game actions (only callable by authorized game contracts)
     */
    function spendInGame(address player, uint256 amount, string memory reason) external {
        require(gameContracts[msg.sender], "Not authorized game contract");
        _burn(player, amount);
        emit TokensSpentInGame(player, amount, reason);
    }

    /**
     * @dev Admin mint function for initial distribution/events
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Players can buy tokens (simplified - in production use DEX)
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokensToMint = msg.value * 1000; // 1 ETH = 1000 WAR
        _mint(msg.sender, tokensToMint);
    }

    /**
     * @dev Update game economy parameters
     */
    function updateCosts(
        uint256 mintCost,
        uint256 battleCost,
        uint256 healCost,
        uint256 battleReward)
     external onlyOwner {
        MINT_WARRIOR_COST = mintCost;
        BATTLE_ENTRY_COST = battleCost;
        HEAL_COST = healCost;
        BATTLE_REWARD = battleReward;
    }

    /**
     * @dev Withdraw ETH from token sales
     */
    function withdraw() external onlyOwner {
     payable(owner()).transfer(address(this).balance);
    }
}