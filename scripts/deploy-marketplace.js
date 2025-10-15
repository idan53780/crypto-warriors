const hre = require("hardhat");

async function main() {
    console.log("🏪 Deploying Marketplace Contract...\n");

    // Existing WarriorNFT contract address (deployed on Sepolia)
    const WARRIOR_NFT_ADDRESS = '0x58488197989BEc8B1625C9817fB082E90CfaF9E5';
     //const WARRIOR_NFT_ADDRESS = '0xD6d23B55aE77a2C7569046b248c3a4Bba1c8a2AB'; // old


    console.log("📋 Using existing WarriorNFT contract:");
    console.log("   WarriorNFT:", WARRIOR_NFT_ADDRESS);
    console.log("");

    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔑 Deploying with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
    
    if (balance.eq(0)) {
        console.error("❌ ERROR: Account has no ETH! Get testnet ETH from faucet.");
        process.exit(1);
    }
    console.log("");

    // Deploy Marketplace
    console.log("🚀 Deploying Marketplace contract...");
    const Marketplace = await hre.ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(WARRIOR_NFT_ADDRESS);
    
    console.log("⏳ Waiting for deployment...");
    await marketplace.deployed();
    console.log("✅ Marketplace deployed to:", marketplace.address);
    console.log("");

    // Summary
    console.log("=".repeat(70));
    console.log("🎉 MARKETPLACE DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log("\n📊 Contract Addresses:");
    console.log("   WarriorNFT:   ", WARRIOR_NFT_ADDRESS);
    console.log("   Marketplace:  ", marketplace.address, "⬅️ NEW!");
    
    console.log("\n💡 How It Works:");
    console.log("   1. Seller approves Marketplace contract for their warrior");
    console.log("   2. Seller lists warrior with price");
    console.log("   3. Buyer browses listings and purchases");
    console.log("   4. 10% royalty automatically paid to creator");
    console.log("   5. 90% paid to seller");

    console.log("\n📝 COPY THIS FOR YOUR FRONTEND:");
    console.log("─".repeat(70));
    console.log(`const CONTRACT_ADDRESSES = {
    warToken: '0x38F844f8175ff5282261Bc37EDe5A78A160b499e',
    warriorNFT: '0x58488197989BEc8B1625C9817fB082E90CfaF9E5',
    gameEngine: '0x6977f79689588c0EDdb6A9bFAEf3f72a7B61Ce26',
    marketplace: '${marketplace.address}'  // ⬅️ ADD THIS!
};`);
    console.log("─".repeat(70));

    console.log("\n🔧 Next Steps:");
    console.log("   1. Run: node scripts/extract-marketplace-abi.js");
    console.log("   2. Add marketplace address to app.js");
    console.log("   3. Update frontend code");
    console.log("   4. Test listing and buying!");
    console.log("");

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            warriorNFT: WARRIOR_NFT_ADDRESS,
            marketplace: marketplace.address
        }
    };

    fs.writeFileSync(
        'marketplace-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("💾 Deployment info saved to marketplace-deployment.json");
    console.log("🔗 View on Etherscan: https://sepolia.etherscan.io/address/" + marketplace.address);
    console.log("\n" + "=".repeat(70) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error);
        process.exit(1);
    });