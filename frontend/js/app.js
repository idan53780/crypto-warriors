// Contract addresses
const CONTRACT_ADDRESSES = {
  warToken: "0x38F844f8175ff5282261Bc37EDe5A78A160b499e",
  warriorNFT: "0x58488197989BEc8B1625C9817fB082E90CfaF9E5",
  gameEngine: "0x6977f79689588c0EDdb6A9bFAEf3f72a7B61Ce26",
  marketplace: "0x1fA3e6EaA9C53ab5F8A326a160Ff080179D7c1d6",
};

let web3;
let account;
let warToken;
let warriorNFT;
let gameEngine;
let marketplace;
let recentBattles = [];
let battleEventSubscription = null;

// Initialize Web3 and contracts
async function init() {
  if (typeof window.ethereum === "undefined") {
    showError("Please install MetaMask to play CryptoWarriors!");
    return;
  }

  try {
    web3 = new Web3(window.ethereum);

    // Setup event listeners
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    document.getElementById("createWarrior").addEventListener("click", createWarrior);
    document.getElementById("enterBattle").addEventListener("click", enterBattle);
    document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);  
    document.getElementById("ethAmount").addEventListener("input", updateTokenPreview);  
    document.getElementById("listWarriorBtn").addEventListener("click", listWarriorForSale);
    document.getElementById("delistWarriorBtn").addEventListener("click", delistWarrior);
    document.getElementById("buyListedWarriorBtn").addEventListener("click", buyListedWarrior);
    document.getElementById("refreshListingsBtn").addEventListener("click", loadMarketplaceListings);  
    document.getElementById("sellWarriorSelect").addEventListener("change", onSellWarriorSelected); 
    document.getElementById("claimDailyGift").addEventListener("click", claimDailyGift);

    // Add force refresh button
    document
      .getElementById("forceRefreshAll")
      .addEventListener("click", async () => {
        console.log("🔄 FORCE refreshing all data (cache-busting)...");
        showSuccess("🔄 Force refreshing... (ignoring cache)");
        if (
          web3 &&
          web3.currentProvider &&
          web3.currentProvider.clearSubscriptions
        ) {
          web3.currentProvider.clearSubscriptions();
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await loadGameData();
        showSuccess("✅ All data refreshed with latest blockchain state!");
        console.log("✅ Force refresh complete!");
      });

    // Modal close
    document.querySelector(".modal-close").addEventListener("click", () => {
      document.getElementById("warriorModal").style.display = "none";
    });

    // Account change listener
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        account = accounts[0];
        loadGameData();
      }
    });
  } catch (error) {
    console.error("Initialization error:", error.message);
    showError("Failed to initialize Web3");
  }
}

// Connect MetaMask wallet
async function connectWallet() {
  console.log("🔘 Connect wallet clicked");

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    account = accounts[0];
    console.log("✅ Connected:", account);

    // Initialize contracts
    try {
      console.log("🔄 Initializing contracts...");
      console.log("WarToken address:", CONTRACT_ADDRESSES.warToken);
      console.log("WarriorNFT address:", CONTRACT_ADDRESSES.warriorNFT);
      console.log("GameEngine address:", CONTRACT_ADDRESSES.gameEngine);
      console.log("Marketplace address:", CONTRACT_ADDRESSES.marketplace);

      warToken = new web3.eth.Contract(
        WAR_TOKEN_ABI,
        CONTRACT_ADDRESSES.warToken
      );
      console.log("✅ WarToken initialized");

      warriorNFT = new web3.eth.Contract(
        WARRIOR_NFT_ABI,
        CONTRACT_ADDRESSES.warriorNFT
      );
      console.log("✅ WarriorNFT initialized");

      gameEngine = new web3.eth.Contract(
        GAME_ENGINE_ABI,
        CONTRACT_ADDRESSES.gameEngine
      );
      console.log("✅ GameEngine initialized");

      marketplace = new web3.eth.Contract(
        MARKETPLACE_ABI,
        CONTRACT_ADDRESSES.marketplace
      );
      console.log("✅ Marketplace initialized");
     

      // Verify contracts are accessible
      const network = await web3.eth.getChainId();
      console.log("📡 Connected to network:", network);

      console.log("✅ All contracts initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing contracts:", error);
      showError("Failed to initialize contracts: " + error.message);
      throw error;
    }

    // Update button -
    document.getElementById("connectWallet").textContent = `${account.substring(
      0,
      6
    )}...${account.substring(38)}`;

    showSuccess("Wallet connected successfully!");
    console.log("✅ Wallet connected");
    await loadGameData();

    // Start polling for updates (only if not already polling)
    if (!window.gameDataInterval) {
      window.gameDataInterval = setInterval(loadGameData, 30000);
      console.log("🔄 Started polling for game data updates");
    }

    initializeDailyGift(); // daily gift initialization
  } catch (error) {
    console.error("❌ Wallet connection error:", error.message);
    showError("Failed to connect wallet");
  }
}

// Load all game data

async function loadGameData() {
  if (!account) return;

  console.log(
    "🔄 Auto-refreshing game data...",
    new Date().toLocaleTimeString()
  );

  try {
    await Promise.all([
      loadWARBalance(),
      loadMyWarriors(),
      loadLeaderboard(),
      loadQueueStatus(),
      loadMarketplaceListings(),
    ]);
    checkDailyGiftStatus();
    await checkForBattleResults();
    console.log("✅ Game data refreshed");
  } catch (error) {
    console.error("Error loading game data:", error.message);
  }
}

//===================== PLAYER DATA FUNCTIONS ====================
// Load WAR token balance
async function loadWARBalance() {
  try {
    const balance = await warToken.methods.balanceOf(account).call();
    const balanceInWAR = web3.utils.fromWei(balance, "ether");
    document.getElementById("warBalance").textContent =
      parseFloat(balanceInWAR).toFixed(2);
  } catch (error) {
    console.error("Error loading WAR balance:", error.message);
    document.getElementById("warBalance").textContent = "Error";
  }
}

//===================== WARRIOR FUNCTIONS ====================

// Get all warriors owned by an address (workaround for contract bug)

async function getActualWarriorsByOwner(ownerAddress) {
  try {
    const warriorIds = [];
    let contractWarriorIds = [];
    try {
      contractWarriorIds = await warriorNFT.methods
        .getWarriorsByOwner(ownerAddress)
        .call();
    } catch (e) {
      console.log("Contract method failed, using fallback");
    }
    const potentialIds = new Set();
    contractWarriorIds.forEach((id) => potentialIds.add(parseInt(id)));

    console.log(`🔍 Checking ${potentialIds.size} potential warriors...`);

    for (const tokenId of potentialIds) {
      try {
        const owner = await warriorNFT.methods
          .ownerOf(tokenId)
          .call({}, "latest");
        if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
          warriorIds.push(tokenId.toString());
        }
      } catch (error) {
        continue;
      }
    }
    console.log(`✅ Verified ${warriorIds.length} actual warriors`);
    return warriorIds;
  } catch (error) {
    console.error("Error getting actual warriors:", error);
    try {
      const fallbackIds = await warriorNFT.methods
        .getWarriorsByOwner(ownerAddress)
        .call();
      console.log("⚠️ Using fallback warrior list");
      return fallbackIds;
    } catch (e) {
      return [];
    }
  }
}

let lastWarriorCount = 0;

// Load user's warriors
// Updated loadMyWarriors with workaround for contract bug
async function loadMyWarriors() {
  try {
    console.log("📊 Loading warriors for:", account);

    // ✅ USE ACTUAL OWNERSHIP CHECK (not broken contract array)
    const warriorIds = await getActualWarriorsByOwner(account);

    console.log("✅ Found warriors:", warriorIds);

    document.getElementById("warriorCount").textContent = warriorIds.length;

    const grid = document.getElementById("myWarriorsGrid");
    const select = document.getElementById("battleWarriorSelect");
    const sellSelect = document.getElementById("sellWarriorSelect");

    if (warriorIds.length === 0) {
      grid.innerHTML =
        '<div class="loading">No warriors yet. Create your first warrior!</div>';
      select.innerHTML =
        '<option value="">-- No warriors available --</option>';
      sellSelect.innerHTML =
        '<option value="">-- No warriors available --</option>';
      return;
    }

    grid.innerHTML = "";
    select.innerHTML = '<option value="">-- Select Warrior --</option>';
    sellSelect.innerHTML = '<option value="">-- Select a warrior --</option>';

    for (const id of warriorIds) {
      const warrior = await warriorNFT.methods.getWarrior(id).call();

      grid.appendChild(createWarriorCard(id, warrior));

      const option = document.createElement("option");
      option.value = id;
      option.textContent = `#${id} - ${warrior[0]} (Lvl ${warrior[5]})`;
      select.appendChild(option);

      const sellOption = document.createElement("option");
      sellOption.value = id;
      sellOption.textContent = `#${id} - ${warrior[0]} (Lvl ${warrior[5]}) - ${warrior[7]}W/${warrior[8]}L`;
      sellSelect.appendChild(sellOption);
    }

    console.log("✅ Warriors loaded successfully!");
  } catch (error) {
    console.error("Error loading warriors:", error.message);
    document.getElementById("warriorCount").textContent = "?";
    document.getElementById("myWarriorsGrid").innerHTML =
      '<div class="loading" style="color: #ff6b6b;">Error loading warriors. Please refresh.</div>';
  }
}

// Create warrior card element
function createWarriorCard(id, warrior) {
  const card = document.createElement("div");
  card.className = "warrior-card";

  const healthPercent = (Number(warrior[3]) / Number(warrior[4])) * 100;

  // Generate avatar
  const { image, description } = generateWarriorAvatar(
    id,
    account,
    warrior[10]
  );
  const imageContainer = document.createElement("div");
  imageContainer.className = "warrior-image";
  imageContainer.appendChild(image);

  card.appendChild(imageContainer);
  card.innerHTML += `
        <h3>${warrior[0]} #${id}</h3>
        <div class="warrior-stats">
            <div><strong>Appearance:</strong> ${description}</div>
            <div><strong>Class:</strong> ${warrior[10]}</div>
            <div><strong>Level:</strong> ${warrior[5]} | <strong>XP:</strong> ${
    warrior[6]
  }</div>
            
            <div style="margin-top: 10px;">
                <div><strong>Attack:</strong> ${warrior[1]}</div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${Math.min(
                      Number(warrior[1]),
                      100
                    )}%">
                        ${warrior[1]}
                    </div>
                </div>
            </div>
            
            <div>
                <div><strong>Defense:</strong> ${warrior[2]}</div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${Math.min(
                      Number(warrior[2]),
                      100
                    )}%">
                        ${warrior[2]}
                    </div>
                </div>
            </div>
            
            <div>
                <div><strong>Health:</strong> ${warrior[3]} / ${
    warrior[4]
  }</div>
                <div class="stat-bar health-bar">
                    <div class="stat-fill" style="width: ${healthPercent}%">
                        ${healthPercent.toFixed(0)}%
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 5px;">
                <strong>Record:</strong> ${warrior[7]}W - ${warrior[8]}L
            </div>
        </div>
        
        <div class="warrior-actions">
            <button onclick="healWarrior(${id})" ${
    healthPercent > 90 ? "disabled" : ""
  }>
                Heal(5 WAR)
            </button>
            <button onclick="showWarriorDetails(${id})">
                Details
            </button>
        </div>
    `;

  return card;
}

// Create new warrior
async function createWarrior() {
  const name = document.getElementById("warriorName").value.trim();
  const warriorClass = document.getElementById("warriorClass").value;

  if (!name) {
    showError("Please enter a warrior name");
    return;
  }

  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  try {
    showSuccess("Creating warrior... Please confirm transaction in MetaMask");

    await warToken.methods
      .approve(CONTRACT_ADDRESSES.gameEngine, web3.utils.toWei("100", "ether"))
      .send({ from: account });

    const tx = await gameEngine.methods
      .createWarrior(name, warriorClass)
      .send({ from: account });

    showSuccess(
      `Warrior created successfully! Transaction: ${tx.transactionHash}`
    );

    document.getElementById("warriorName").value = "";

    await loadMyWarriors();
    await loadWARBalance();
  } catch (error) {
    console.error("Error creating warrior:", error.message);
    showError("Failed to create warrior: " + error.message);
  }
}

//===================== BATTLE FUNCTIONS ====================

// Enter battle queue
async function enterBattle() {
  const warriorId = document.getElementById("battleWarriorSelect").value;

  if (!warriorId) {
    showError("Please select a warrior");
    return;
  }

  try {
    showSuccess("Entering battle queue... Please confirm transaction");

    await warToken.methods
      .approve(CONTRACT_ADDRESSES.gameEngine, web3.utils.toWei("10", "ether"))
      .send({ from: account });

    const tx = await gameEngine.methods
      .enterBattleQueue(warriorId)
      .send({ from: account });

    showSuccess("Entered battle queue! Waiting for opponent...");

    setTimeout(async () => {
      await loadGameData();
    }, 5000);
  } catch (error) {
    console.error("Error entering battle:", error.message);
    showError("Failed to enter battle: " + error.message);
  }
}

// Heal warrior
async function healWarrior(warriorId) {
  try {
    showSuccess("Healing warrior... Please confirm transaction");

    await warToken.methods
      .approve(CONTRACT_ADDRESSES.gameEngine, web3.utils.toWei("5", "ether"))
      .send({ from: account });

    await gameEngine.methods.healWarrior(warriorId).send({ from: account });

    showSuccess("Warrior healed successfully!");

    await loadMyWarriors();
    await loadWARBalance();
  } catch (error) {
    console.error("Error healing warrior:", error.message);
    showError("Failed to heal warrior: " + error.message);
  }
}

// ==================== MARKETPLACE FUNCTIONS ====================

// Load all marketplace listings
async function loadMarketplaceListings() {
  console.log("📋 Loading marketplace listings...");

  if (!marketplace) {
    console.warn("⚠️ Marketplace contract not initialized");
    return;
  }

  if (!account) {
    console.warn("⚠️ No account connected");
    return;
  }

  try {
    const bytecode = await web3.eth.getCode(CONTRACT_ADDRESSES.marketplace);
    if (bytecode === "0x") {
      console.error("❌ Marketplace contract not deployed");
      const listingsContainer = document.getElementById("marketplaceListings");
      listingsContainer.innerHTML = `
                <div class="loading" style="color: #ff6b6b;">
                    ⚠️ Marketplace contract not found<br>
                    <small>Address: ${CONTRACT_ADDRESSES.marketplace.substring(
                      0,
                      10
                    )}...</small>
                </div>
            `;
      return;
    }

    console.log("✅ Marketplace contract verified");

    const activeListingIds = await marketplace.methods
      .getActiveListings()
      .call();
    console.log("Active listings:", activeListingIds);

    const listingsContainer = document.getElementById("marketplaceListings");
    listingsContainer.innerHTML =
      '<div class="loading">Loading warriors...</div>';

    if (!activeListingIds || activeListingIds.length === 0) {
      listingsContainer.innerHTML =
        '<div class="loading">No warriors listed for sale</div>';
      return;
    }

    listingsContainer.innerHTML = "";

    for (const tokenId of activeListingIds) {
      try {
        const listing = await marketplace.methods.getListing(tokenId).call();

        if (!listing.active) {
          console.log(`Skipping inactive listing #${tokenId}`);
          continue;
        }

        let warrior;
        try {
          warrior = await warriorNFT.methods.getWarrior(tokenId).call();
        } catch (warriorError) {
          console.error(
            `Cannot load warrior #${tokenId} - skipping:`,
            warriorError.message
          );
          continue;
        }

        const currentOwner = await warriorNFT.methods.ownerOf(tokenId).call();
        if (currentOwner.toLowerCase() !== listing.seller.toLowerCase()) {
          console.log(`Listing #${tokenId} outdated - owner changed, skipping`);
          continue;
        }

        const listingCard = createMarketplaceListing(tokenId, warrior, listing);
        listingsContainer.appendChild(listingCard);
      } catch (error) {
        console.error(`Error loading listing ${tokenId}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error loading marketplace:", error);
    const listingsContainer = document.getElementById("marketplaceListings");
    listingsContainer.innerHTML = `
            <div class="loading" style="color: #ff6b6b;">
                ⚠️ Error loading marketplace<br>
                <small>${error.message}</small>
            </div>
        `;
  }
}

// Create marketplace listing card
function createMarketplaceListing(tokenId, warrior, listing) {
  const card = document.createElement("div");
  card.className = "warrior-card";

  const priceInETH = web3.utils.fromWei(listing.price, "ether");
  const healthPercent = (Number(warrior[3]) / Number(warrior[4])) * 100;
  const isOwnListing = listing.seller.toLowerCase() === account.toLowerCase();

  const { image, description } = generateWarriorAvatar(
    tokenId,
    listing.seller,
    warrior[10]
  );

  const imageContainer = document.createElement("div");
  imageContainer.className = "warrior-image";
  imageContainer.appendChild(image);

  card.appendChild(imageContainer);
  card.innerHTML += `
        <h3>${warrior[0]} #${tokenId}</h3>
        <div class="warrior-stats">
            <div style="background: rgba(255, 215, 0, 0.2); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                <strong style="color: #ffd700;">Price: ${parseFloat(
                  priceInETH
                ).toFixed(3)} ETH</strong>
            </div>
            <div><strong>Seller:</strong> ${listing.seller.substring(
              0,
              10
            )}...</div>
            <div><strong>Class:</strong> ${warrior[10]}</div>
            <div><strong>Level:</strong> ${warrior[5]} | <strong>XP:</strong> ${
    warrior[6]
  }</div>
            
            <div style="margin-top: 10px;">
                <div><strong>Attack:</strong> ${warrior[1]}</div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${Math.min(
                      Number(warrior[1]),
                      100
                    )}%">
                        ${warrior[1]}
                    </div>
                </div>
            </div>
            
            <div>
                <div><strong>Defense:</strong> ${warrior[2]}</div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${Math.min(
                      Number(warrior[2]),
                      100
                    )}%">
                        ${warrior[2]}
                    </div>
                </div>
            </div>
            
            <div>
                <div><strong>Health:</strong> ${warrior[3]} / ${
    warrior[4]
  }</div>
                <div class="stat-bar health-bar">
                    <div class="stat-fill" style="width: ${healthPercent}%">
                        ${healthPercent.toFixed(0)}%
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 5px;">
                <strong>Record:</strong> ${warrior[7]}W - ${warrior[8]}L
            </div>
        </div>
        
        <div class="warrior-actions">
            ${
              isOwnListing
                ? `<button onclick="quickDelist(${tokenId})" style="width: 100%;">Remove Listing</button>`
                : `<button onclick="quickBuy(${tokenId}, '${priceInETH}')" style="width: 100%;">Buy Now</button>`
            }
        </div>
    `;

  return card;
}

// List warrior for sale

// Updated listWarriorForSale with improved validation and feedback

async function listWarriorForSale() {
  console.log("📤 List warrior for sale clicked");

  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  let tokenId = document.getElementById("sellWarriorSelect").value;
  if (!tokenId || tokenId === "") {
    tokenId = document.getElementById("sellTokenId").value;
  }

  const priceETH = document.getElementById("listPrice").value;

  if (!tokenId || tokenId === "") {
    showError("Please select a warrior or enter a token ID");
    return;
  }

  if (!priceETH || priceETH === "") {
    showError("Please enter a price");
    return;
  }

  const tokenIdNum = parseInt(tokenId);
  if (isNaN(tokenIdNum) || tokenIdNum < 0) {
    showError("Invalid token ID");
    return;
  }

  const priceNum = parseFloat(priceETH);
  if (isNaN(priceNum) || priceNum < 0.001) {
    showError("Minimum price is 0.001 ETH");
    return;
  }

  if (!warriorNFT || !marketplace) {
    showError(
      "Contracts not initialized. Please refresh and reconnect wallet."
    );
    return;
  }

  try {
    // STEP 1: Verify ownership
    const owner = await warriorNFT.methods.ownerOf(tokenIdNum).call();

    if (owner.toLowerCase() !== account.toLowerCase()) {
      showError(`You don't own warrior #${tokenIdNum}`);
      return;
    }

    //  STEP 2: Check if already listed
    const listing = await marketplace.methods.getListing(tokenIdNum).call();
    if (listing && listing.active) {
      showError(
        "Warrior is already listed. Please delist it first to change the price."
      );
      return;
    }

    showSuccess(
      "Step 1/3: Approving marketplace... Please confirm in MetaMask"
    );

    //  STEP 3: Approve marketplace (CRITICAL!)
    const approveTx = await warriorNFT.methods
      .approve(CONTRACT_ADDRESSES.marketplace, tokenIdNum)
      .send({ from: account });

    console.log("✅ Approval transaction:", approveTx.transactionHash);

    //  STEP 4: VERIFY approval was successful
    const approvedAddress = await warriorNFT.methods
      .getApproved(tokenIdNum)
      .call();
    console.log("Approved address:", approvedAddress);
    console.log("Marketplace address:", CONTRACT_ADDRESSES.marketplace);

    if (
      approvedAddress.toLowerCase() !==
      CONTRACT_ADDRESSES.marketplace.toLowerCase()
    ) {
      showError(
        "⚠️ Approval failed! Marketplace was not approved. Please try again."
      );
      return;
    }

    showSuccess("✅ Approval confirmed! Step 2/3: Listing warrior...");

    //  STEP 5: List the warrior
    const priceWei = web3.utils.toWei(priceETH, "ether");

    const listTx = await marketplace.methods
      .listWarrior(tokenIdNum, priceWei)
      .send({ from: account });

    console.log("✅ Listing transaction:", listTx.transactionHash);

    showSuccess(`✅ Warrior #${tokenIdNum} listed for ${priceETH} ETH!`);

    // ✅ STEP 6: Verify listing
    const finalListing = await marketplace.methods
      .getListing(tokenIdNum)
      .call();
    if (finalListing.active) {
      console.log("✅ Listing verified on blockchain!");
    } else {
      showError("⚠️ Warning: Listing may not be active. Check marketplace.");
    }

    document.getElementById("sellTokenId").value = "";
    document.getElementById("listPrice").value = "";
    document.getElementById("sellWarriorSelect").value = "";

    document.getElementById("listStatus").innerHTML = `
            <div style="color: #90EE90; background: rgba(0,100,0,0.2); padding: 15px; border-radius: 8px; margin-top: 10px;">
                ✅ Listed successfully!<br>
                <strong>Warrior #${tokenIdNum}</strong><br>
                <strong>Price: ${priceETH} ETH</strong><br>
                <strong>Approval: ${approvedAddress.substring(
                  0,
                  10
                )}...</strong><br>
                <small>Buyers can now purchase your warrior</small>
            </div>
        `;

    setTimeout(async () => {
      await loadMarketplaceListings();
      await loadMyWarriors();
      await loadWARBalance();
      console.log("✅ Marketplace refreshed after listing!");
    }, 3000);
  } catch (error) {
    console.error("Error listing warrior:", error);

    if (error.code === 4001) {
      showError("Transaction cancelled by user");
    } else if (error.message.includes("Marketplace not approved")) {
      showError("Approval failed. Please try listing again.");
    } else {
      showError("Failed to list: " + error.message);
    }

    document.getElementById("listStatus").innerHTML = `
            <div style="color: #FF6B6B;">
                ❌ Listing failed<br>
                <small>${error.message}</small>
            </div>
        `;
  }
}

// Delist warrior
async function delistWarrior() {
  console.log("🗑️ Delist warrior clicked");

  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  let tokenId = document.getElementById("sellWarriorSelect").value;
  if (!tokenId || tokenId === "") {
    tokenId = document.getElementById("sellTokenId").value;
  }

  if (!tokenId || tokenId === "") {
    showError("Please select a warrior or enter a token ID");
    return;
  }

  const tokenIdNum = parseInt(tokenId);
  if (isNaN(tokenIdNum) || tokenIdNum < 0) {
    showError("Invalid token ID");
    return;
  }

  if (!marketplace) {
    showError("Marketplace contract not initialized");
    return;
  }

  try {
    const listing = await marketplace.methods.getListing(tokenIdNum).call();

    if (!listing || !listing.active) {
      showError(`Warrior #${tokenIdNum} is not listed for sale`);
      return;
    }

    if (listing.seller.toLowerCase() !== account.toLowerCase()) {
      showError(`You are not the seller of warrior #${tokenIdNum}`);
      return;
    }

    showSuccess("Removing listing... Please confirm transaction in MetaMask");

    await marketplace.methods.delistWarrior(tokenIdNum).send({ from: account });

    showSuccess(`✅ Warrior #${tokenIdNum} delisted successfully!`);

    document.getElementById("sellTokenId").value = "";
    document.getElementById("sellWarriorSelect").value = "";

    document.getElementById("listStatus").innerHTML = `
            <div style="color: #90EE90; background: rgba(0,100,0,0.2); padding: 15px; border-radius: 8px; margin-top: 10px;">
                ✅ Listing removed successfully!<br>
                <strong>Warrior #${tokenIdNum}</strong><br>
                <small>Your warrior is no longer for sale</small>
            </div>
        `;

    setTimeout(async () => {
      await loadMarketplaceListings();
      await loadMyWarriors();
      console.log("✅ Marketplace refreshed after delisting!");
    }, 2000);
  } catch (error) {
    console.error("Error delisting warrior:", error);

    if (error.code === 4001) {
      showError("Transaction cancelled by user");
    } else {
      showError("Failed to delist: " + error.message);
    }

    document.getElementById("listStatus").innerHTML = `
            <div style="color: #FF6B6B;">
                ❌ Delist failed<br>
                <small>${error.message}</small>
            </div>
        `;
  }
}

// Buy listed warrior
async function buyListedWarrior() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  const tokenId = document.getElementById("buyTokenId").value;

  if (!tokenId) {
    showError("Please enter a warrior ID");
    return;
  }

  const tokenIdNum = parseInt(tokenId);

  try {
    //  STEP 1: Get listing info
    const listing = await marketplace.methods.getListing(tokenIdNum).call();

    if (!listing.active) {
      showError("This warrior is not listed for sale");
      return;
    }

    //  STEP 2: Verify seller still owns it
    const currentOwner = await warriorNFT.methods.ownerOf(tokenIdNum).call();
    if (currentOwner.toLowerCase() !== listing.seller.toLowerCase()) {
      showError("Seller no longer owns this warrior. Listing is outdated.");
      return;
    }

    // ✅ STEP 3: Verify marketplace has approval
    const approvedAddress = await warriorNFT.methods
      .getApproved(tokenIdNum)
      .call();
    console.log("Approved for marketplace:", approvedAddress);
    console.log("Marketplace address:", CONTRACT_ADDRESSES.marketplace);

    if (
      approvedAddress.toLowerCase() !==
      CONTRACT_ADDRESSES.marketplace.toLowerCase()
    ) {
      showError(
        "⚠️ Marketplace not approved for this warrior! Seller must re-list."
      );
      return;
    }

    const priceETH = web3.utils.fromWei(listing.price, "ether");
    const royaltyETH = parseFloat(priceETH) * 0.1;
    const sellerGetsETH = parseFloat(priceETH) * 0.9;

    showSuccess(
      `Purchasing warrior #${tokenIdNum} for ${priceETH} ETH... Please confirm`
    );

    // ✅ STEP 4: Execute purchase
    const tx = await marketplace.methods.buyWarrior(tokenIdNum).send({
      from: account,
      value: listing.price,
      gas: 300000, // Ensure enough gas
    });

    console.log("✅ Purchase transaction:", tx.transactionHash);

    // ✅ STEP 5: VERIFY transfer happened
    const newOwner = await warriorNFT.methods.ownerOf(tokenIdNum).call();
    console.log("New owner:", newOwner);
    console.log("Buyer address:", account);

    if (newOwner.toLowerCase() === account.toLowerCase()) {
      showSuccess(`🎉 SUCCESS! Warrior #${tokenIdNum} is now YOURS!`);
    } else {
      showError(
        `⚠️ Transaction confirmed but warrior NOT transferred! Owner is: ${newOwner.substring(
          0,
          10
        )}...`
      );
    }

    document.getElementById("buyStatus").innerHTML = `
            <div style="color: #90EE90;">
                ✅ Purchase complete!<br>
                <small>Paid: ${priceETH} ETH</small><br>
                <small>Seller received: ${sellerGetsETH.toFixed(
                  4
                )} ETH</small><br>
                <small>Creator royalty: ${royaltyETH.toFixed(4)} ETH</small><br>
                <small>New owner: ${newOwner.substring(0, 10)}...</small><br>
                <small>Tx: ${tx.transactionHash.substring(0, 20)}...</small>
            </div>
        `;

    document.getElementById("buyTokenId").value = "";

    setTimeout(async () => {
      console.log("⏳ Waiting for blockchain to finalize...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await loadMarketplaceListings();
      await loadMyWarriors();
      await loadWARBalance();
      console.log("✅ Marketplace refreshed after purchase!");
    }, 5000);
  } catch (error) {
    console.error("Error buying warrior:", error);

    if (error.message.includes("Incorrect price")) {
      showError("Price has changed. Refresh and try again.");
    } else if (error.message.includes("not listed")) {
      showError("Warrior is no longer listed");
    } else if (error.message.includes("User denied")) {
      showError("Transaction cancelled");
    } else if (error.message.includes("Marketplace not approved")) {
      showError("⚠️ Marketplace is not approved! Seller must re-list warrior.");
    } else {
      showError("Purchase failed: " + error.message);
    }

    document.getElementById("buyStatus").innerHTML = "";
  }
}

// Quick buy from marketplace listing card
async function quickBuy(tokenId, priceETH) {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  const confirmed = confirm(
    `Buy Warrior #${tokenId} for ${priceETH} ETH?\n\n- Seller receives: ${(
      parseFloat(priceETH) * 0.9
    ).toFixed(4)} ETH\n- Creator royalty: ${(
      parseFloat(priceETH) * 0.1
    ).toFixed(4)} ETH`
  );

  if (!confirmed) return;

  try {
    // ✅ Verify marketplace has approval
    const approvedAddress = await warriorNFT.methods
      .getApproved(tokenId)
      .call();
    if (
      approvedAddress.toLowerCase() !==
      CONTRACT_ADDRESSES.marketplace.toLowerCase()
    ) {
      showError("⚠️ Marketplace not approved! Seller must re-list warrior.");
      return;
    }

    const listing = await marketplace.methods.getListing(tokenId).call();

    showSuccess(`Purchasing warrior #${tokenId}... Please confirm transaction`);

    const tx = await marketplace.methods.buyWarrior(tokenId).send({
      from: account,
      value: listing.price,
      gas: 300000, // Ensure enough gas
    });

    // ✅ Verify transfer
    const newOwner = await warriorNFT.methods.ownerOf(tokenId).call();
    if (newOwner.toLowerCase() === account.toLowerCase()) {
      showSuccess(`🎉 Warrior #${tokenId} is now YOURS!`);
    } else {
      showError(`⚠️ Purchase processed but warrior not transferred!`);
    }

    setTimeout(async () => {
      console.log("⏳ Waiting for blockchain to finalize...");
      showSuccess("⏳ Refreshing data...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await loadMarketplaceListings();
      await loadMyWarriors();
      await loadWARBalance();
      console.log("✅ Data refreshed!");
      showSuccess("✅ Purchase complete and data refreshed!");
    }, 5000);
  } catch (error) {
    console.error("Error buying warrior:", error);
    if (error.message.includes("Marketplace not approved")) {
      showError("⚠️ Cannot buy! Seller must re-approve marketplace.");
    } else {
      showError("Purchase failed: " + error.message);
    }
  }
}

// Quick delist from marketplace listing card
async function quickDelist(tokenId) {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  const confirmed = confirm(`Remove Warrior #${tokenId} from marketplace?`);
  if (!confirmed) return;

  try {
    showSuccess("Removing listing... Please confirm transaction");

    await marketplace.methods.delistWarrior(tokenId).send({ from: account });

    showSuccess(`✅ Warrior #${tokenId} delisted!`);

    setTimeout(async () => {
      await loadMarketplaceListings();
    }, 2000);
  } catch (error) {
    console.error("Error delisting:", error);
    showError("Failed to delist: " + error.message);
  }
}

// Show warrior details modal
async function showWarriorDetails(warriorId) {
  try {
    const warrior = await warriorNFT.methods.getWarrior(warriorId).call();
    const history = await warriorNFT.methods
      .getOwnershipHistory(warriorId)
      .call();
    const { image, description } = generateWarriorAvatar(
      warriorId,
      account,
      warrior[10]
    );

    const modal = document.getElementById("warriorModal");
    const details = document.getElementById("warriorDetails");

    const avatarContainer = document.createElement("div");
    avatarContainer.style.textAlign = "center";
    avatarContainer.style.marginBottom = "15px";
    avatarContainer.appendChild(image);

    details.innerHTML = `
            ${avatarContainer.outerHTML}
            <h2>${warrior[0]} #${warriorId}</h2>
            <div class="warrior-stats" style="font-size: 1.1em; line-height: 2;">
                <p><strong>Appearance:</strong> ${description}</p>
                <p><strong>Class:</strong> ${warrior[10]}</p>
                <p><strong>Level:</strong> ${warrior[5]}</p>
                <p><strong>Experience:</strong> ${warrior[6]} / ${
      Number(warrior[5]) * 100
    }</p>
                <p><strong>Attack:</strong> ${warrior[1]}</p>
                <p><strong>Defense:</strong> ${warrior[2]}</p>
                <p><strong>Health:</strong> ${warrior[3]} / ${warrior[4]}</p>
                <p><strong>Wins:</strong> ${warrior[7]}</p>
                <p><strong>Losses:</strong> ${warrior[8]}</p>
                <p><strong>Win Rate:</strong> ${calculateWinRate(
                  warrior[7],
                  warrior[8]
                )}%</p>
                
                <h3 style="margin-top: 20px; color: #ffd700;">Ownership History</h3>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${history
                      .map(
                        (addr, i) => `
                        <p>${i + 1}. ${addr}</p>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;

    modal.style.display = "flex";
  } catch (error) {
    console.error("Error loading warrior details:", error.message);
    showError("Failed to load warrior details");
  }
}

// Load leaderboard

async function loadLeaderboard() {
  try {
    const result = await gameEngine.methods.getLeaderboard(30).call();
    let players = [];
    let wins = [];

    if (result && typeof result === "object") {
      if (Array.isArray(result)) {
        players = result[0] || [];
        wins = result[1] || [];
      } else if (result[0] !== undefined) {
        players = Array.from(result[0] || []);
        wins = Array.from(result[1] || []);
      } else if (result.players) {
        players = Array.from(result.players);
        wins = Array.from(result.wins);
      }
    }

    const tbody = document.getElementById("leaderboardBody");

    if (!players || players.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No players yet</td></tr>';
      return;
    }

    tbody.innerHTML = "";

    for (let i = 0; i < players.length; i++) {
      try {
        const stats = await gameEngine.methods
          .getPlayerStats(players[i])
          .call();
        const winRate = calculateWinRate(stats.totalWins, stats.totalLosses);

        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${players[i].substring(0, 6)}...${players[i].substring(
          38
        )}</td>
                    <td>${stats.totalWins}</td>
                    <td>${stats.totalLosses}</td>
                    <td>${winRate}%</td>
                `;
        tbody.appendChild(row);
      } catch (e) {
        console.log("Skipping player", i, "due to error");
      }
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    const tbody = document.getElementById("leaderboardBody");
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center;">Failed to load leaderboard</td></tr>';
  }
}

// Load queue status
async function loadQueueStatus() {
  try {
    const queueLength = await gameEngine.methods.getQueueLength().call();
    const statusDiv = document.getElementById("queueStatus");

    if (queueLength == 0) {
      statusDiv.innerHTML = "🟢 Queue empty - Be the first to join!";
    } else if (queueLength == 1) {
      statusDiv.innerHTML = "🟡 1 warrior waiting - Join for instant battle!";
    } else {
      statusDiv.innerHTML = `🔴 ${queueLength} warriors in queue`;
    }
  } catch (error) {
    console.error("Error loading queue status:", error.message);
  }
}

// Calculate win rate percentage
function calculateWinRate(wins, losses) {
  const total = Number(wins) + Number(losses);
  if (total === 0) return 0;
  return ((Number(wins) / total) * 100).toFixed(1);
}

function showSuccess(message) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.className = "status-message";
  statusDiv.textContent = message;
  statusDiv.style.display = "block";
  setTimeout(() => (statusDiv.style.display = "none"), 10000);
}

function showError(message) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.className = "error-message";
  statusDiv.textContent = message;
  statusDiv.style.display = "block";
  setTimeout(() => (statusDiv.style.display = "none"), 10000);
}

// Buy WAR tokens with ETH
async function buyTokens() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  const ethAmount = document.getElementById("ethAmount").value;

  if (!ethAmount || ethAmount <= 0) {
    showError("Please enter a valid ETH amount");
    return;
  }

  try {
    const ethInWei = web3.utils.toWei(ethAmount, "ether");
    const warTokens = parseFloat(ethAmount) * 1000;

    showSuccess(
      `Buying ${warTokens} WAR tokens... Please confirm transaction in MetaMask`
    );

    const tx = await warToken.methods.buyTokens().send({
      from: account,
      value: ethInWei,
    });

    showSuccess(
      `🎉 Successfully purchased ${warTokens} WAR tokens! Transaction: ${tx.transactionHash.substring(
        0,
        10
      )}...`
    );

    document.getElementById(
      "buyStatus"
    ).innerHTML = `✅ Bought ${warTokens} WAR for ${ethAmount} ETH`;
    document.getElementById("buyStatus").style.color = "#90EE90";

    document.getElementById("ethAmount").value = "";

    await loadWARBalance();
  } catch (error) {
    console.error("Error buying tokens:", error);

    if (error.message.includes("insufficient funds")) {
      showError("Insufficient ETH balance");
    } else if (error.message.includes("User denied")) {
      showError("Transaction cancelled");
    } else {
      showError("Failed to buy tokens: " + error.message);
    }

    document.getElementById("buyStatus").innerHTML = "❌ Purchase failed";
    document.getElementById("buyStatus").style.color = "#FF6B6B";
  }
}

// Calculate and show how many WAR tokens will be received
function updateTokenPreview() {
  const ethAmount = document.getElementById("ethAmount").value;
  const buyStatus = document.getElementById("buyStatus");

  if (ethAmount && ethAmount > 0) {
    const warTokens = parseFloat(ethAmount) * 1000;
    buyStatus.innerHTML = `You will receive: ${warTokens.toLocaleString()} WAR tokens`;
    buyStatus.style.color = "#FFD700";
  } else {
    buyStatus.innerHTML = "";
  }
}

// Auto-fill token ID when warrior is selected from dropdown
function onSellWarriorSelected() {
  const select = document.getElementById("sellWarriorSelect");
  const input = document.getElementById("sellTokenId");

  if (select.value) {
    input.value = select.value;
    input.style.borderColor = "#228b22";
  } else {
    input.value = "";
    input.style.borderColor = "#8b6914";
  }
}

// ==================== DAILY GIFT FUNCTIONS ====================

// Check daily gift status and update UI
function checkDailyGiftStatus() {
  if (!account) return;

  const lastClaimKey = `lastClaim_${account.toLowerCase()}`;
  const lastClaimTime = localStorage.getItem(lastClaimKey);

  const statusDiv = document.getElementById("dailyGiftStatus");
  const claimButton = document.getElementById("claimDailyGift");

  if (!lastClaimTime) {
    // Never claimed before
    statusDiv.innerHTML = "🎁 Ready to claim your first gift!";
    statusDiv.style.color = "#90EE90";
    claimButton.disabled = false;
    return;
  }

  const now = Date.now();
  const timeSinceLastClaim = now - parseInt(lastClaimTime);
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  if (timeSinceLastClaim >= twentyFourHours) {
    // Can claim again
    statusDiv.innerHTML = "🎁 Ready to claim!";
    statusDiv.style.color = "#90EE90";
    claimButton.disabled = false;
  } else {
    // Still on cooldown
    const timeRemaining = twentyFourHours - timeSinceLastClaim;
    const hoursLeft = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutesLeft = Math.floor(
      (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
    );

    statusDiv.innerHTML = `⏰ Next claim in: ${hoursLeft}h ${minutesLeft}m`;
    statusDiv.style.color = "#FFD700";
    claimButton.disabled = true;
  }
}

// Claim daily gift
async function claimDailyGift() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  const lastClaimKey = `lastClaim_${account.toLowerCase()}`;
  const lastClaimTime = localStorage.getItem(lastClaimKey);
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Check if 24 hours have passed
  if (lastClaimTime) {
    const timeSinceLastClaim = now - parseInt(lastClaimTime);
    if (timeSinceLastClaim < twentyFourHours) {
      const timeRemaining = twentyFourHours - timeSinceLastClaim;
      const hoursLeft = Math.floor(timeRemaining / (60 * 60 * 1000));
      const minutesLeft = Math.floor(
        (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
      );
      showError(`You can claim again in ${hoursLeft}h ${minutesLeft}m`);
      return;
    }
  }

  try {
    showSuccess(
      "Claiming your daily gift... Please confirm transaction in MetaMask"
    );

    // Mint 100 WAR tokens
    const giftAmount = web3.utils.toWei("1000", "ether");

    const tx = await warToken.methods.buyTokens().send({
      from: account,
      value: web3.utils.toWei("0.1", "ether"), // 0.1 ETH = 100 WAR
    });

    // Save claim time
    localStorage.setItem(lastClaimKey, now.toString());

    showSuccess(
      "🎉 Successfully claimed 100 WAR tokens! Come back in 24 hours!"
    );

    // Update UI
    await loadWARBalance();
    checkDailyGiftStatus();
  } catch (error) {
    console.error("Error claiming daily gift:", error);

    if (error.message.includes("insufficient funds")) {
      showError(
        "Insufficient ETH balance. You need 0.1 ETH to claim the gift."
      );
    } else if (error.message.includes("User denied")) {
      showError("Transaction cancelled");
    } else {
      showError("Failed to claim gift: " + error.message);
    }
  }
}

// Initialize gift status on wallet connect
function initializeDailyGift() {
  if (account) {
    checkDailyGiftStatus();

    // Update status every minute
    setInterval(() => {
      if (account) {
        checkDailyGiftStatus();
      }
    }, 60000); // 60 seconds
  }
}

// ==================== BATTLE RESULT SYSTEM ====================

async function checkForBattleResults() {
    if (!account || !gameEngine) return;
    
    try {
        const stats = await gameEngine.methods.getPlayerStats(account).call();
        const currentWins = parseInt(stats.totalWins);
        const currentLosses = parseInt(stats.totalLosses);
        
        const lastWins = parseInt(localStorage.getItem(`lastWins_${account}`) || '0');
        const lastLosses = parseInt(localStorage.getItem(`lastLosses_${account}`) || '0');
        
        if (currentWins > lastWins) {
            showSuccess('🏆 VICTORY! You won a battle and earned 20 WAR tokens! 🎉');
            console.log('⚔️ Battle won!');
        }
        
        if (currentLosses > lastLosses) {
            showError('💀 DEFEAT! You lost a battle. Train harder and return! ⚔️');
            console.log('⚔️ Battle lost!');
        }
        
        localStorage.setItem(`lastWins_${account}`, currentWins.toString());
        localStorage.setItem(`lastLosses_${account}`, currentLosses.toString());
        
    } catch (error) {
        console.log('Could not check battle results:', error.message);
    }
}

/**
 * Show battle result modal
 */
function showBattleResultModal(battleResult, didWin) {
  const modal = document.getElementById("battleResultModal");
  const title = document.getElementById("battleResultTitle");
  const content = document.getElementById("battleResultContent");

  if (didWin) {
    title.innerHTML = "🏆 VICTORY! 🏆";
    title.style.color = "#90EE90";

    content.innerHTML = `
            <div style="font-size: 1.5em; color: #90EE90; margin-bottom: 20px;">
                <strong>YOU WON!</strong>
            </div>
            <div style="background: rgba(0, 150, 0, 0.2); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong style="color: #ffd700;">Your Warrior:</strong> ${battleResult.winnerName} (${battleResult.winnerClass})</p>
                <p><strong style="color: #ffd700;">Opponent:</strong> ${battleResult.loserName} (${battleResult.loserClass})</p>
                <p style="margin-top: 15px; font-size: 1.3em;"><strong style="color: #ffd700;">Reward: +${battleResult.reward} WAR</strong></p>
            </div>
            <p style="color: #90EE90;">Your warrior gains experience and glory!</p>
        `;
  } else {
    title.innerHTML = "💀 DEFEAT 💀";
    title.style.color = "#ff6b6b";

    content.innerHTML = `
            <div style="font-size: 1.5em; color: #ff6b6b; margin-bottom: 20px;">
                <strong>YOU LOST...</strong>
            </div>
            <div style="background: rgba(150, 0, 0, 0.2); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong style="color: #ffd700;">Your Warrior:</strong> ${battleResult.loserName} (${battleResult.loserClass})</p>
                <p><strong style="color: #ffd700;">Opponent:</strong> ${battleResult.winnerName} (${battleResult.winnerClass})</p>
                <p style="margin-top: 15px; font-size: 1.1em; color: #ff6b6b;">No reward this time...</p>
            </div>
            <p style="color: #ffa500;">Train harder and return for revenge!</p>
        `;
  }

  modal.style.display = "flex";

  // Auto-close after 8 seconds
  setTimeout(() => {
    closeBattleResultModal();
  }, 8000);
}

/**
 * Close battle result modal
 */
function closeBattleResultModal() {
  const modal = document.getElementById("battleResultModal");
  modal.style.display = "none";
}

// Make function globally available
window.closeBattleResultModal = closeBattleResultModal;

// Initialize on page load
window.addEventListener("load", init);
