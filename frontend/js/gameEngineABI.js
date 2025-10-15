const GAME_ENGINE_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "string", "name": "class", "type": "string" }
        ],
        "name": "createWarrior",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "warriorId", "type": "uint256" }
        ],
        "name": "enterBattleQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "warriorId", "type": "uint256" }
        ],
        "name": "healWarrior",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" }
        ],
        "name": "getPlayerStats",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "totalWins", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalLosses", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalEarnings", "type": "uint256" },
                    { "internalType": "uint256", "name": "rank", "type": "uint256" }
                ],
                "internalType": "struct GameEngine.PlayerStats",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "count", "type": "uint256" }
        ],
        "name": "getLeaderboard",
        "outputs": [
            { "internalType": "address[]", "name": "", "type": "address[]" },
            { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getQueueLength",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];