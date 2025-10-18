# ⚔️ CryptoWarriors - Blockchain Battle Game

A decentralized NFT battle game built on Ethereum where players create unique warrior NFTs, battle other players, and trade warriors on an integrated marketplace.


## 🎮 Features

- **🗡️ Create Unique Warriors**: Mint NFT warriors with randomized stats (Attack, Defense, Health)
- **⚔️ Battle System**: Enter battle queue and auto-match with opponents for PvP combat
- **💰 WAR Token Economy**: In-game ERC20 currency for all transactions
- **🏪 NFT Marketplace**: Buy and sell warriors with automatic 10% creator royalty
- **🎁 Daily 100 tokens**: Claim daily  tokens -0.1eth (24-hour cooldown)
- **🏆 Leaderboard**: Track top players by wins and win rate
- **🎨 Unique Avatars**: Each warrior has procedurally generated visual appearance

## 🛠️ Tech Stack

### **Smart Contracts**
- Solidity ^0.8.20
- Hardhat (Development Framework)
- OpenZeppelin (ERC20, ERC721, ReentrancyGuard)
- Chainlink VRF (Randomness for battle outcomes)

### **Frontend**
- Vanilla JavaScript
- Web3.js
- HTML5/CSS3
- Medieval-themed UI design

### **Blockchain**
- Ethereum Sepolia Testnet
- MetaMask Integration

## 📋 Smart Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| WarToken | `0x38F844f8175ff5282261Bc37EDe5A78A160b499e` | ERC20 game currency |
| WarriorNFT | `0x58488197989BEc8B1625C9817fB082E90CfaF9E5` | ERC721 warrior NFTs |
| GameEngine | `0x6977f79689588c0EDdb6A9bFAEf3f72a7B61Ce26` | Battle logic & queue system |
| Marketplace | `0x1fA3e6EaA9C53ab5F8A326a160Ff080179D7c1d6` | NFT trading platform |

## 📂Project Structure 
```text
CryptoWarriors/
│
├── index.html # Main game interface (HTML structure and embedded CSS)
│
├── js/
│ ├── app.js # Core game logic and Web3 interactions
│ ├── warTokenABI.js # ABI for WAR Token smart contract
│ ├── warriorNFTABI.js # ABI for Warrior NFT smart contract
│ ├── gameEngineABI.js # ABI for Game Engine smart contract
│ └── avatarGenerator.js # Utility that dynamically generates warrior avatars
│
└── README.md # Project documentation (this file)
```
----------------------------------------------

## 🚀 Installation

### **Prerequisites**
- Node.js v16+ and npm
- MetaMask browser extension
- Sepolia ETH (from faucet)

### **Setup Steps**

1. Clone the repository:
```bash
git clone https://github.com/idan53780/crypto-warriors.git
cd crypto-warriors
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in root directory:
```
SEPOLIA_RPC_URL=your_alchemy_or_infura_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```
[How to get your Infura URL](#-how-to-get-your-infura-url-rpc-endpoint-for-a-blockchain-project) 📧

4. Compile contracts:
```bash
npx hardhat compile
```

5. play the game :
```bash
   npx http-server
```
6. *If step 5 is failing, you can open a bash in the root folder and run npx http-server from there*
## 🎯 How to Use

### **Playing the Game**

1. **Connect Wallet**
   - Open `frontend/index.html` in browser(for now use the 8080 port)🚧
   - Click "Connect MetaMask"
   - Approve connection

2. **Get WAR Tokens**
   - Buy tokens: 1 ETH = 1,000 WAR
   - Or claim daily gift: 0.1 ETH = 100 WAR (once per 24h)

3. **Create a Warrior**
   - Choose warrior class (Knight/Mage/Archer)
   - Enter name (costs 100 WAR)
   - Confirm transaction

4. **Battle**
   - Select warrior from dropdown
   - Click "Enter Battle" (costs 10 WAR)
   - Wait for opponent to join
   - Battle auto-executes
   - Winner receives 20 WAR

5. **Marketplace**
   - List warrior: Set price in ETH, approve, then list
   - Buy warrior: Enter token ID or click "Buy Now"
   - 10% royalty goes to original creator

### **For Developers**

Deploy contracts to Sepolia:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Extract ABIs for frontend:
```bash
node scripts/extractABIs.js
```

Run local frontend:
```bash
cd frontend
#    use local server
   npx http-server
```

## 🐛 Known Issues



### **Medium**
- [ ] Gas estimation fails when warrior already in battle queue
- [ ] Marketplace listings can become stale if warrior transferred outside marketplace
- [ ] RPC cache causes 20-30 second delay in UI updates after transactions

### **Minor**
- [ ] Battle queue status doesn't update in real-time (30-second polling)


### **Planned Improvements**
- [ ] Implement WebSocket for instant UI updates
- [ ] Add warrior leveling system
- [ ] Mobile responsive design

## 📊 Game Economics

- **Warrior Creation**: 100 WAR
- **Battle Entry**: 10 WAR
- **Battle Reward**: 20 WAR (winner only)
- **Healing**: 5 WAR
- **Marketplace Fee**: 10% creator royalty
- **Token Exchange**: 1 ETH = 1,000 WAR




## 👥 Team

- **Developer**: *Idan.Apoteker - github - idan53780*
- **Developer**: *Chananel Nahum*

## 🔗 Links

- [Contract on Etherscan](https://sepolia.etherscan.io/address/0x6977f79689588c0EDdb6A9bFAEf3f72a7B61Ce26)


## 💡 Acknowledgments

- OpenZeppelin for secure contract libraries
- Chainlink for VRF integration
- Medieval fantasy theme inspiration
---
⚔️ **Built with passion for blockchain gaming** ⚔️

---

## 🗃️Appendices

### How to get infura URL
## 🌐 How to Get Your Infura URL (RPC Endpoint) for a Blockchain Project

An **Infura URL** is a dedicated **Remote Procedure Call (RPC) Endpoint** that allows your decentralized application (dApp), script, or development environment (like Hardhat or Truffle) to connect and interact with a live blockchain network (such as Ethereum, Polygon, Arbitrum, etc.) without having to run your own full node.

---

## 🚀 Step 1: Create an Infura Account

1.  **Navigate to the Infura Website:** Go to [https://infura.io/](https://infura.io/) and sign up for an account.
2.  **Verify Email:** Complete the account creation process by verifying your email address.

## ✨ Step 2: Create a New Project

1.  **Access the Dashboard:** Log into the Infura dashboard at [https://app.infura.io/](https://app.infura.io/).
2.  **Create a Key:** Click the **"Create New Key"** button (or "Create New Project").
3.  **Select a Product:** When prompted, select the blockchain you intend to use (e.g., **Ethereum** or **IPFS**).
4.  **Name Your Project:** Give your project a clear, descriptive name (e.g., `my-defi-app-staging`).
5.  **Click "Create":** This action generates your unique **Project ID** (also called the **Web3 API Key**).

## 🔗 Step 3: Retrieve Your Infura URL (Endpoint)

After creating the project, you will be directed to the project details page where your endpoints are listed.

### Endpoint Structure

The Infura URL (your RPC Endpoint) is constructed by combining the base URL for the desired network with your unique Project ID:
**https://<network-name>.infura.io/v3/<YOUR_PROJECT_ID>**
## 🔒 Step 4: Security (CRITICAL)

**Your Project ID is a sensitive credential.** If exposed, others can use your Infura subscription limits, monitor your project's traffic, and potentially compromise your application's integrity.

### Never hardcode your Project ID directly in your source files.

Instead, always use **environment variables** to manage your keys securely
---


