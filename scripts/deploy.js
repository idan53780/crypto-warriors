const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting CryptoWarriors deployment...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString(), "\n");

    // 1. Deploy WarToken (ERC20)
    console.log("📝 Deploying WarToken...");
    const WarToken = await hre.ethers.getContractFactory("WarToken");
    const initialSupply = 1000000; // 1 million tokens
    const warToken = await WarToken.deploy(initialSupply);
    await warToken.deployed();
    console.log("✅ WarToken deployed to:", warToken.address);
    console.log("   Initial supply:", initialSupply, "WAR tokens\n");

    // 2. Deploy WarriorNFT
    console.log("📝 Deploying WarriorNFT...");
    const WarriorNFT = await hre.ethers.getContractFactory("WarriorNFT");
    const warriorNFT = await WarriorNFT.deploy();
    await warriorNFT.deployed();
    console.log("✅ WarriorNFT deployed to:", warriorNFT.address, "\n");

    // 3. Deploy GameEngine
    console.log("📝 Deploying GameEngine...");
    const GameEngine = await hre.ethers.getContractFactory("GameEngine");
    const gameEngine = await GameEngine.deploy(warToken.address, warriorNFT.address);
    await gameEngine.deployed();
    console.log("✅ GameEngine deployed to:", gameEngine.address, "\n");

    // 4. Setup permissions
    console.log("🔧 Setting up permissions...");
    
    // Authorize GameEngine to mint/burn WAR tokens
    const tx1 = await warToken.setGameContract(gameEngine.address, true);
    await tx1.wait();
    console.log("✅ GameEngine authorized to manage WAR tokens");

    // Transfer WarriorNFT ownership to GameEngine
    const tx2 = await warriorNFT.transferOwnership(gameEngine.address);
    await tx2.wait();
    console.log("✅ WarriorNFT ownership transferred to GameEngine\n");

    // 5. Mint initial tokens to deployer for testing
    console.log("🎁 Minting initial WAR tokens for testing...");
    const mintAmount = hre.ethers.utils.parseEther("10000"); // 10,000 WAR
    const tx3 = await warToken.mint(deployer.address, mintAmount);
    await tx3.wait();
    console.log("✅ Minted 10,000 WAR tokens to deployer\n");

    // Summary
    console.log("=" .repeat(60));
    console.log("🎮 CRYPTOWARRIORS DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("   WarToken:    ", warToken.address);
    console.log("   WarriorNFT:  ", warriorNFT.address);
    console.log("   GameEngine:  ", gameEngine.address);
    
    console.log("\n🔗 Add these addresses to your frontend config.js:");
    console.log(`
const CONTRACT_ADDRESSES = {
    warToken: '${warToken.address}',
    warriorNFT: '${warriorNFT.address}',
    gameEngine: '${gameEngine.address}'
};
    `);

    console.log("\n📝 Next Steps:");
    console.log("   1. Update CONTRACT_ADDRESSES in app.js");
    console.log("   2. Get testnet ETH from faucet");
    console.log("   3. Buy WAR tokens or request from deployer");
    console.log("   4. Create your first warrior!");
    console.log("   5. Enter battles and climb the leaderboard!");
    
    console.log("\n💡 Useful Commands:");
    console.log("   - View on Etherscan: https://sepolia.etherscan.io/address/" + gameEngine.address);
    console.log("   - Verify contracts: npx hardhat verify --network sepolia <address>");
    
    console.log("\n" + "=" .repeat(60) + "\n");

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            warToken: warToken.address,
            warriorNFT: warriorNFT.address,
            gameEngine: gameEngine.address
        }
    };
    
    fs.writeFileSync(
        'deployment-info.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployment-info.json\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });