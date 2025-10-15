const fs = require('fs');
const path = require('path');

async function extractABI() {
    console.log("📜 Extracting Marketplace ABI...\n");

    try {
        // Read the compiled artifact
        const marketplaceArtifact = require('../artifacts/contracts/Marketplace.sol/Marketplace.json');
        const marketplaceABI = marketplaceArtifact.abi;

        console.log("✅ Marketplace ABI:", marketplaceABI.length, "functions/events");
        console.log("");

        // Create js directory if it doesn't exist
        const jsDir = path.join(__dirname, '../js');
        if (!fs.existsSync(jsDir)) {
            console.log("📁 Creating js/ directory...");
            fs.mkdirSync(jsDir, { recursive: true });
        }

        // Write to JS file
        fs.writeFileSync(
            path.join(jsDir, 'marketplaceABI.js'),
            `const MARKETPLACE_ABI = ${JSON.stringify(marketplaceABI, null, 2)};`
        );

        console.log("✅ marketplaceABI.js created");
        console.log("\n📁 ABI saved to js/ directory");
        console.log("\n🎯 Key functions in Marketplace:");
        console.log("   - listWarrior(tokenId, price)");
        console.log("   - delistWarrior(tokenId)");
        console.log("   - buyWarrior(tokenId)");
        console.log("   - updatePrice(tokenId, newPrice)");
        console.log("   - getActiveListings()");
        console.log("   - getListing(tokenId)");
        console.log("");

    } catch (error) {
        console.error("❌ Error extracting ABI:");
        console.error(error.message);
        console.error("\n💡 Make sure you compiled contracts first:");
        console.error("   npx hardhat compile");
        process.exit(1);
    }
}

extractABI()
    .then(() => {
        console.log("✅ Marketplace ABI extraction complete!\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });