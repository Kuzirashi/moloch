const hardhat = require("hardhat/config");
const { usePlugin } = hardhat;

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");
require("./scripts/moloch-tasks");
require("./scripts/pool-tasks");

const INFURA_API_KEY = "";
const MAINNET_PRIVATE_KEY = "";
const ROPSTEN_PRIVATE_KEY = "";
const ETHERSCAN_API_KEY = "";

module.exports = {
  networks: {
    develop: {
      url: "http://localhost:8545",
      deployedContracts: {
        moloch: "",
        pool: ""
      }
    },
    'godwoken-local': {
      url: "http://localhost:8024",
      deployedContracts: {
        moloch: "0x1878063fB61A337b12aED245728800dfE60f9159",
        pool: ""
      }
    },
    testnet: {
      url: "https://godwoken-testnet-web3-rpc.ckbapp.dev",
      deployedContracts: {
        moloch: "0xD072BFa86ebfd709D953F8b3DBb8da0D87D32Eb4",
        pool: ""
      }
    },
    /* ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [ROPSTEN_PRIVATE_KEY],
      deployedContracts: {
        moloch: "",
        pool: ""
      }
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [MAINNET_PRIVATE_KEY],
      deployedContracts: {
        moloch: "0x1fd169A4f5c59ACf79d0Fd5d91D1201EF1Bce9f1", // The original Moloch
        pool: ""
      }
    }, */
    coverage: {
      url: "http://localhost:8555"
    }
  },
  solidity: {
    version: "0.5.3",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  etherscan: {
    // The url for the Etherscan API you want to use.
    // For example, here we're using the one for the Ropsten test network
    url: "https://api.etherscan.io/api",
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  }
};
