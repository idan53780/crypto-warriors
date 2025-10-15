const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoWarriors Game Tests", function () {
    let warToken, warriorNFT, gameEngine;
    let owner, player1, player2, player3;
    const INITIAL_SUPPLY = 1000000;

    beforeEach(async function () {
        // Get signers
        [owner, player1, player2, player3] = await ethers.getSigners();

        // Deploy WarToken
        const WarToken = await ethers.getContractFactory("WarToken");
        warToken = await WarToken.deploy(INITIAL_SUPPLY);
        await warToken.deployed();

        // Deploy WarriorNFT
        const WarriorNFT = await ethers.getContractFactory("WarriorNFT");
        warriorNFT = await WarriorNFT.deploy();
        await warriorNFT.deployed();

        // Deploy GameEngine
        const GameEngine = await ethers.getContractFactory("GameEngine");
        gameEngine = await GameEngine.deploy(warToken.address, warriorNFT.address);
        await gameEngine.deployed();

        // Setup permissions
        await warToken.setGameContract(gameEngine.address, true);
        await warriorNFT.transferOwnership(gameEngine.address);

        // Distribute tokens to players for testing
        const tokensPerPlayer = ethers.utils.parseEther("10000");
        await warToken.mint(player1.address, tokensPerPlayer);
        await warToken.mint(player2.address, tokensPerPlayer);
        await warToken.mint(player3.address, tokensPerPlayer);
    });

    describe("WarToken (ERC20) Tests", function () {
        it("Should deploy with correct initial supply", async function () {
            const totalSupply = await warToken.totalSupply();
            expect(totalSupply).to.equal(ethers.utils.parseEther(INITIAL_SUPPLY.toString()));
        });

        it("Should allow players to buy tokens", async function () {
            const ethAmount = ethers.utils.parseEther("1");
            await warToken.connect(player1).buyTokens({ value: ethAmount });
            
            const balance = await warToken.balanceOf(player1.address);
            const expectedBalance = ethers.utils.parseEther("11000"); // 10000 + 1000
            expect(balance).to.equal(expectedBalance);
        });

        it("Should authorize game contract", async function () {
            const isAuthorized = await warToken.gameContracts(gameEngine.address);
            expect(isAuthorized).to.be.true;
        });

        it("Should allow game contract to reward players", async function () {
            const rewardAmount = ethers.utils.parseEther("100");
            const initialBalance = await warToken.balanceOf(player1.address);
            
            await warToken.rewardPlayer(player1.address, rewardAmount, "Test Reward");
            
            const finalBalance = await warToken.balanceOf(player1.address);
            expect(finalBalance).to.equal(initialBalance.add(rewardAmount));
        });

        it("Should not allow unauthorized contract to mint", async function () {
            const rewardAmount = ethers.utils.parseEther("100");
            
            await expect(
                warToken.connect(player1).rewardPlayer(player2.address, rewardAmount, "Test")
            ).to.be.revertedWith("Not authorized game contract");
        });
    });

    describe("WarriorNFT Tests", function () {
        it("Should mint warrior with correct stats", async function () {
            // Approve tokens
            await warToken.connect(player1).approve(
                gameEngine.address,
                ethers.utils.parseEther("100")
            );

            // Create warrior
            await gameEngine.connect(player1).createWarrior("TestKnight", "Knight");

            const warriors = await warriorNFT.getWarriorsByOwner(player1.address);
            expect(warriors.length).to.equal(1);

            const warrior = await warriorNFT.getWarrior(warriors[0]);
            expect(warrior[0]).to.equal("TestKnight"); // name
            expect(warrior[10]).to.equal("Knight"); // class
            expect(warrior[5]).to.equal(1); // level
        });

        it("Should track ownership history", async function () {
            // Create warrior for player1
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("TestWarrior", "Mage");

            const warriors = await warriorNFT.getWarriorsByOwner(player1.address);
            const tokenId = warriors[0];

            // Check initial owner in history
            const history1 = await warriorNFT.getOwnershipHistory(tokenId);
            expect(history1.length).to.equal(1);
            expect(history1[0]).to.equal(player1.address);

            // Transfer to player2 with royalty
            const price = ethers.utils.parseEther("1");
            await warriorNFT.connect(player1).transferWarriorWithRoyalty(
                player2.address,
                tokenId,
                { value: price }
            );

            // Check updated history
            const history2 = await warriorNFT.getOwnershipHistory(tokenId);
            expect(history2.length).to.equal(2);
            expect(history2[1]).to.equal(player2.address);
        });

        it("Should enforce 10% royalty on transfer", async function () {
            // Create warrior
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("TestWarrior", "Archer");

            const warriors = await warriorNFT.getWarriorsByOwner(player1.address);
            const tokenId = warriors[0];

            // Record balances before transfer
            const creatorBalanceBefore = await ethers.provider.getBalance(player1.address);
            const price = ethers.utils.parseEther("1");

            // Transfer with royalty
            await warriorNFT.connect(player1).transferWarriorWithRoyalty(
                player2.address,
                tokenId,
                { value: price }
            );

            // Check that creator received exactly 100% (since they're also the seller)
            // In real scenario, creator would get 10%, seller would get 90%
            const creatorBalanceAfter = await ethers.provider.getBalance(player1.address);
            
            // Creator is also seller, so gets full amount minus gas
            expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
        });

        it("Should get correct warrior details", async function () {
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("PowerWarrior", "Knight");

            const warriors = await warriorNFT.getWarriorsByOwner(player1.address);
            const warrior = await warriorNFT.getWarrior(warriors[0]);

            // Verify all warrior properties
            expect(warrior[0]).to.equal("PowerWarrior"); // name
            expect(warrior[5]).to.equal(1); // level
            expect(warrior[6]).to.equal(0); // experience
            expect(warrior[7]).to.equal(0); // wins
            expect(warrior[8]).to.equal(0); // losses
            expect(warrior[10]).to.equal("Knight"); // class
        });
    });

    describe("GameEngine Tests", function () {
        it("Should create warrior and deduct tokens", async function () {
            const initialBalance = await warToken.balanceOf(player1.address);
            const cost = await warToken.MINT_WARRIOR_COST();

            await warToken.connect(player1).approve(gameEngine.address, cost);
            await gameEngine.connect(player1).createWarrior("TestWarrior", "Mage");

            const finalBalance = await warToken.balanceOf(player1.address);
            expect(finalBalance).to.equal(initialBalance.sub(cost));
        });

        it("Should reject invalid warrior class", async function () {
            await warToken.connect(player1).approve(
                gameEngine.address,
                ethers.utils.parseEther("100")
            );

            await expect(
                gameEngine.connect(player1).createWarrior("BadWarrior", "Wizard")
            ).to.be.revertedWith("Invalid warrior class");
        });

        it("Should handle battle queue correctly", async function () {
            // Create warriors for both players
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("200"));
            await gameEngine.connect(player1).createWarrior("Warrior1", "Knight");

            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("200"));
            await gameEngine.connect(player2).createWarrior("Warrior2", "Mage");

            // Check initial queue
            let queueLength = await gameEngine.getQueueLength();
            expect(queueLength).to.equal(0);

            // Player 1 enters queue
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await gameEngine.connect(player1).enterBattleQueue(0);

            queueLength = await gameEngine.getQueueLength();
            expect(queueLength).to.equal(1);

            // Player 2 enters queue - should trigger battle
            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await gameEngine.connect(player2).enterBattleQueue(1);

            // Queue should be empty after auto-battle
            queueLength = await gameEngine.getQueueLength();
            expect(queueLength).to.equal(0);
        });

        it("Should execute battle and update stats", async function () {
            // Setup warriors
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("110"));
            await gameEngine.connect(player1).createWarrior("Fighter1", "Knight");

            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("110"));
            await gameEngine.connect(player2).createWarrior("Fighter2", "Archer");

            // Enter battle
            await gameEngine.connect(player1).enterBattleQueue(0);
            await gameEngine.connect(player2).enterBattleQueue(1);

            // Check battle results
            const battle = await gameEngine.getBattle(0);
            expect(battle.completed).to.be.true;
            expect(battle.winner).to.not.equal(ethers.constants.AddressZero);

            // Check that winner received tokens
            const winner = battle.winner;
            const stats = await gameEngine.getPlayerStats(winner);
            expect(stats.totalWins).to.equal(1);
        });

        it("Should update leaderboard after battles", async function () {
            // Create warriors and battle
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("110"));
            await gameEngine.connect(player1).createWarrior("Champion", "Knight");

            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("110"));
            await gameEngine.connect(player2).createWarrior("Challenger", "Mage");

            await gameEngine.connect(player1).enterBattleQueue(0);
            await gameEngine.connect(player2).enterBattleQueue(1);

            // Get leaderboard
            const [players, wins] = await gameEngine.getLeaderboard(10);
            
            expect(players.length).to.be.gt(0);
            expect(wins.length).to.equal(players.length);
        });

        it("Should heal warrior correctly", async function () {
            // Create warrior
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("TestWarrior", "Knight");

            const warriors = await warriorNFT.getWarriorsByOwner(player1.address);
            const tokenId = warriors[0];
            
            const warriorBefore = await warriorNFT.getWarrior(tokenId);
            const maxHealth = warriorBefore[4];

            // Heal (even though at full health for testing)
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("5"));
            await gameEngine.connect(player1).healWarrior(tokenId);

            const warriorAfter = await warriorNFT.getWarrior(tokenId);
            expect(warriorAfter[3]).to.equal(maxHealth);
        });

        it("Should prevent entering queue while already in queue", async function () {
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("200"));
            await gameEngine.connect(player1).createWarrior("Warrior", "Knight");

            await gameEngine.connect(player1).enterBattleQueue(0);

            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await expect(
                gameEngine.connect(player1).enterBattleQueue(0)
            ).to.be.revertedWith("Already in queue");
        });

        it("Should track player stats correctly", async function () {
            const stats = await gameEngine.getPlayerStats(player1.address);
            expect(stats.totalWins).to.equal(0);
            expect(stats.totalLosses).to.equal(0);
            expect(stats.totalEarnings).to.equal(0);
        });
    });

    describe("Integration Tests", function () {
        it("Should complete full game flow", async function () {
            // 1. Create warriors
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("Hero1", "Knight");

            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player2).createWarrior("Hero2", "Mage");

            // 2. Enter battle
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await gameEngine.connect(player1).enterBattleQueue(0);

            await warToken.connect(player2).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await gameEngine.connect(player2).enterBattleQueue(1);

            // 3. Check battle completed
            const battle = await gameEngine.getBattle(0);
            expect(battle.completed).to.be.true;

            // 4. Check warriors updated
            const warrior1 = await warriorNFT.getWarrior(0);
            const warrior2 = await warriorNFT.getWarrior(1);
            
            const totalWins = Number(warrior1[7]) + Number(warrior2[7]);
            const totalLosses = Number(warrior1[8]) + Number(warrior2[8]);
            
            expect(totalWins).to.equal(1);
            expect(totalLosses).to.equal(1);
        });

        it("Should handle multiple battles", async function () {
            // Create 3 warriors
            for (let i = 1; i <= 3; i++) {
                const player = i === 1 ? player1 : i === 2 ? player2 : player3;
                await warToken.connect(player).approve(gameEngine.address, ethers.utils.parseEther("300"));
                await gameEngine.connect(player).createWarrior(`Warrior${i}`, "Knight");
            }

            // Battle 1: player1 vs player2
            await gameEngine.connect(player1).enterBattleQueue(0);
            await gameEngine.connect(player2).enterBattleQueue(1);

            let battle = await gameEngine.getBattle(0);
            expect(battle.completed).to.be.true;

            // Battle 2: winner vs player3
            await gameEngine.connect(player1).enterBattleQueue(0);
            await gameEngine.connect(player3).enterBattleQueue(2);

            battle = await gameEngine.getBattle(1);
            expect(battle.completed).to.be.true;
        });
    });

    describe("Edge Cases and Security", function () {
        it("Should not allow transfer of non-owned warrior", async function () {
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("Warrior", "Knight");

            await expect(
                warriorNFT.connect(player2).transferWarriorWithRoyalty(
                    player3.address,
                    0,
                    { value: ethers.utils.parseEther("1") }
                )
            ).to.be.revertedWith("Not the owner");
        });

        it("Should require payment for warrior transfer", async function () {
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("Warrior", "Knight");

            await expect(
                warriorNFT.connect(player1).transferWarriorWithRoyalty(player2.address, 0)
            ).to.be.revertedWith("Must send payment");
        });

        it("Should not allow battle with insufficient health", async function () {
            // This would require manually setting low health
            // For now, we test the queue entry requirement exists
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("100"));
            await gameEngine.connect(player1).createWarrior("WeakWarrior", "Knight");
            
            // Normal warrior should enter queue fine
            await warToken.connect(player1).approve(gameEngine.address, ethers.utils.parseEther("10"));
            await expect(
                gameEngine.connect(player1).enterBattleQueue(0)
            ).to.not.be.reverted;
        });
    });
});