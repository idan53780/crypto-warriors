// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface for WarToken
interface IWarToken {
    function spendInGame(address player, uint256 amount, string memory reason) external;
    function rewardPlayer(address player, uint256 amount, string memory reason) external;
    function MINT_WARRIOR_COST() external view returns (uint256);
    function BATTLE_ENTRY_COST() external view returns (uint256);
    function HEAL_COST() external view returns (uint256);
    function BATTLE_REWARD() external view returns (uint256);
}

// Interface for WarriorNFT
interface IWarriorNFT {
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
    
    function mintWarrior(address to, string memory name, string memory warriorClass) external returns (uint256);
    function getWarrior(uint256 tokenId) external view returns (Warrior memory);
    function updateWarriorAfterBattle(uint256 tokenId, bool won, uint256 experienceGained, uint256 healthLost) external;
    function healWarrior(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title GameEngine
 * @dev Complex contract managing game logic, battles, and economy
 */
contract GameEngine is Ownable, ReentrancyGuard {
    
    IWarToken public warToken;
    IWarriorNFT public warriorNFT;

    // Battle system
    struct Battle {
        uint256 battleId;
        address player1;
        address player2;
        uint256 warrior1Id;
        uint256 warrior2Id;
        address winner;
        uint256 timestamp;
        bool completed;
    }

    struct BattleQueue {
        address player;
        uint256 warriorId;
        uint256 timestamp;
    }

    mapping(uint256 => Battle) public battles;
    uint256 public battleCounter;
    
    BattleQueue[] public battleQueue;
    mapping(address => bool) public inQueue;

    // Leaderboard
    struct PlayerStats {
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalEarnings;
        uint256 rank;
    }

    mapping(address => PlayerStats) public playerStats;
    address[] public leaderboard;

    // Events
    event WarriorCreated(address indexed player, uint256 indexed tokenId, string name, string class);
    event BattleQueued(address indexed player, uint256 indexed warriorId);
    event BattleStarted(uint256 indexed battleId, address player1, address player2, uint256 warrior1Id, uint256 warrior2Id);
    event BattleCompleted(uint256 indexed battleId, address indexed winner, uint256 rewardAmount);
    event WarriorHealed(address indexed player, uint256 indexed warriorId);
    event LeaderboardUpdated(address indexed player, uint256 newRank);

    constructor(address _warToken, address _warriorNFT) Ownable() {
        warToken = IWarToken(_warToken);
        warriorNFT = IWarriorNFT(_warriorNFT);
    }

    /**
     * @dev Create a new warrior by spending WAR tokens
     */
    function createWarrior(string memory name, string memory class) external nonReentrant {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(_isValidClass(class), "Invalid warrior class");

        uint256 cost = warToken.MINT_WARRIOR_COST();
        warToken.spendInGame(msg.sender, cost, "Mint Warrior");

        uint256 tokenId = warriorNFT.mintWarrior(msg.sender, name, class);
        
        emit WarriorCreated(msg.sender, tokenId, name, class);
    }

    /**
     * @dev Enter battle queue
     */
    function enterBattleQueue(uint256 warriorId) external nonReentrant {
        require(warriorNFT.ownerOf(warriorId) == msg.sender, "Not warrior owner");
        require(!inQueue[msg.sender], "Already in queue");
        
        IWarriorNFT.Warrior memory warrior = warriorNFT.getWarrior(warriorId);
        require(warrior.health > warrior.maxHealth / 4, "Warrior too weak, heal first");

        uint256 cost = warToken.BATTLE_ENTRY_COST();
        warToken.spendInGame(msg.sender, cost, "Battle Entry");

        battleQueue.push(BattleQueue({
            player: msg.sender,
            warriorId: warriorId,
            timestamp: block.timestamp
        }));
        
        inQueue[msg.sender] = true;
        emit BattleQueued(msg.sender, warriorId);

        // Auto-match if 2+ players in queue
        if (battleQueue.length >= 2) {
            _startBattle();
        }
    }

    /**
     * @dev Start a battle between queued players
     */
    function _startBattle() private {
        require(battleQueue.length >= 2, "Not enough players");

        BattleQueue memory player1 = battleQueue[0];
        BattleQueue memory player2 = battleQueue[1];

        // Remove from queue
        battleQueue[0] = battleQueue[battleQueue.length - 1];
        battleQueue.pop();
        if (battleQueue.length > 0) {
            battleQueue[0] = battleQueue[battleQueue.length - 1];
            battleQueue.pop();
        }

        inQueue[player1.player] = false;
        inQueue[player2.player] = false;

        // Create battle
        uint256 battleId = battleCounter++;
        battles[battleId] = Battle({
            battleId: battleId,
            player1: player1.player,
            player2: player2.player,
            warrior1Id: player1.warriorId,
            warrior2Id: player2.warriorId,
            winner: address(0),
            timestamp: block.timestamp,
            completed: false
        });

        emit BattleStarted(battleId, player1.player, player2.player, player1.warriorId, player2.warriorId);

        // Execute battle immediately
        _executeBattle(battleId);
    }

    /**
     * @dev Execute battle logic
     */
    function _executeBattle(uint256 battleId) private {
        Battle storage battle = battles[battleId];
        
        IWarriorNFT.Warrior memory w1 = warriorNFT.getWarrior(battle.warrior1Id);
        IWarriorNFT.Warrior memory w2 = warriorNFT.getWarrior(battle.warrior2Id);

        // Battle simulation
        uint256 power1 = _calculatePower(w1);
        uint256 power2 = _calculatePower(w2);

        // Add randomness
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, battleId, power1, power2))) % 100;
        
        bool player1Wins;
        if (power1 > power2) {
            player1Wins = random < 70; // 70% chance if stronger
        } else if (power2 > power1) {
            player1Wins = random < 30; // 30% chance if weaker
        } else {
            player1Wins = random < 50; // 50/50 if equal
        }

        address winner = player1Wins ? battle.player1 : battle.player2;
        address loser = player1Wins ? battle.player2 : battle.player1;
        uint256 winnerWarriorId = player1Wins ? battle.warrior1Id : battle.warrior2Id;
        uint256 loserWarriorId = player1Wins ? battle.warrior2Id : battle.warrior1Id;

        // Update warrior stats
        uint256 expGained = 50;
        uint256 healthLost = 20;
        warriorNFT.updateWarriorAfterBattle(winnerWarriorId, true, expGained, healthLost / 2);
        warriorNFT.updateWarriorAfterBattle(loserWarriorId, false, expGained / 2, healthLost);

        // Reward winner
        uint256 reward = warToken.BATTLE_REWARD();
        warToken.rewardPlayer(winner, reward, "Battle Victory");

        // Update stats
        playerStats[winner].totalWins++;
        playerStats[winner].totalEarnings += reward;
        playerStats[loser].totalLosses++;

        // Update battle
        battle.winner = winner;
        battle.completed = true;

        // Update leaderboard
        _updateLeaderboard(winner);
        _updateLeaderboard(loser);

        emit BattleCompleted(battleId, winner, reward);
    }

    /**
     * @dev Calculate warrior power for battle
     */
    function _calculatePower(IWarriorNFT.Warrior memory warrior) private pure returns (uint256) {
        return (warrior.attack * 2) + warrior.defense + (warrior.health / 2) + (warrior.level * 10);
    }

    /**
     * @dev Heal warrior
     */
    function healWarrior(uint256 warriorId) external nonReentrant {
        require(warriorNFT.ownerOf(warriorId) == msg.sender, "Not warrior owner");
        
        uint256 cost = warToken.HEAL_COST();
        warToken.spendInGame(msg.sender, cost, "Heal Warrior");
        
        warriorNFT.healWarrior(warriorId);
        emit WarriorHealed(msg.sender, warriorId);
    }

    /**
     * @dev Update leaderboard
     */
    function _updateLeaderboard(address player) private {
        bool exists = false;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            leaderboard.push(player);
        }

        // Simple bubble sort for top players (in production use better algorithm)
        for (uint256 i = 0; i < leaderboard.length; i++) {
            for (uint256 j = i + 1; j < leaderboard.length; j++) {
                if (playerStats[leaderboard[j]].totalWins > playerStats[leaderboard[i]].totalWins) {
                    address temp = leaderboard[i];
                    leaderboard[i] = leaderboard[j];
                    leaderboard[j] = temp;
                }
            }
        }

        // Update ranks
        for (uint256 i = 0; i < leaderboard.length && i < 100; i++) {
            playerStats[leaderboard[i]].rank = i + 1;
        }
    }

    /**
     * @dev Get leaderboard
     */
    function getLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory) {
        uint256 size = count < leaderboard.length ? count : leaderboard.length;
        address[] memory topPlayers = new address[](size);
        uint256[] memory wins = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            topPlayers[i] = leaderboard[i];
            wins[i] = playerStats[leaderboard[i]].totalWins;
        }

        return (topPlayers, wins);
    }

    /**
     * @dev Get player stats
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    /**
     * @dev Get battle details
     */
    function getBattle(uint256 battleId) external view returns (Battle memory) {
        return battles[battleId];
    }

    /**
     * @dev Check if class is valid
     */
    function _isValidClass(string memory class) private pure returns (bool) {
        return (
            keccak256(bytes(class)) == keccak256(bytes("Knight")) ||
            keccak256(bytes(class)) == keccak256(bytes("Mage")) ||
            keccak256(bytes(class)) == keccak256(bytes("Archer"))
        );
    }

    /**
     * @dev Get queue length
     */
    function getQueueLength() external view returns (uint256) {
        return battleQueue.length;
    }
}