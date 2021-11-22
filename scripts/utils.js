const BN = require('bn.js')

const buidlerArguments = {
  network: 'godwoken-local'
};

// These functions are meant to be run from tasks, so the
// BuidlerRuntimeEnvironment is available in the global scope.

/**
 * Returns the deployed instance of the Moloch DAO, or undefined if its
 * address hasn't been set in the config.
 */
async function getDeployedMoloch (web3) {
  const molochAddress = getMolochAddress()
  if (!molochAddress) {
    console.error(`Please, set the DAO's address in buidler.config.js's networks.${buidlerArguments.network}.deployedContracts.moloch`)
    return
  }

  return new web3.eth.Contract(artifacts.require('Moloch')._json.abi, molochAddress);
}

/**
 * Returns the deployed instance of the MolochPool contract, or undefined if its
 * address hasn't been set in the config.
 */
async function getDeployedPool () {
  const poolAddress = getPoolAddress()
  if (!poolAddress) {
    console.error(`Please, set the Pool's address in buidler.config.js's networks.${buidlerArguments.network}.deployedContracts.pool`)
    return
  }

  const Pool = artifacts.require('MolochPool')
  return Pool.at(poolAddress)
}

/**
 * Returns the deployed instance of the Moloch DAO's approved token, or
 * undefined if the DAO's address hasn't been set in the config.
 */
async function getApprovedTokens (web3) {
  const moloch = await getDeployedMoloch(web3)
  if (moloch === undefined) {
    return
  }

  const tokenAddress = await moloch.methods.approvedTokens(0).call();

  return new web3.eth.Contract(artifacts.require('IERC20')._json.abi, tokenAddress);
}

/**
 * Returns the address of the Moloch DAO as set in the config, or undefined if
 * it hasn't been set.
 */
function getMolochAddress () {
  return config.networks[buidlerArguments.network].deployedContracts.moloch
}

/**
 * Returns the address of the MolochPool as set in the config, or undefined if
 * it hasn't been set.
 */
function getPoolAddress () {
  return config.networks[buidlerArguments.network].deployedContracts.pool
}

async function giveAllowance (tokenContract, allowanceGiver, receiverContract, amount) {
  return tokenContract.methods.approve(receiverContract.options.address, amount).send({
    from: allowanceGiver
  });
}

async function hasEnoughAllowance (tokenContract, allowanceGiver, receiverContract, amount) {
  const allowance = await tokenContract.methods.allowance(allowanceGiver, receiverContract.options.address).call();
  return new BN(allowance).gte(new BN(amount))
}

async function hasEnoughTokens (tokenContract, tokensOwner, amount) {
  const balance = await tokenContract.methods.balanceOf(tokensOwner).call();

  console.log({
    balance,
    amount
  });

  return new BN(balance).gte(new BN(amount))
}

async function getFirstAccount () {
  const accounts = await web3.eth.getAccounts()
  return accounts[0]
}

async function hasEnoughPoolShares (pool, owner, amount) {
  const shares = await pool.donors(owner);
  
  return shares.gte(new BN(amount));
}

module.exports = {
  getDeployedMoloch,
  getDeployedPool,
  getApprovedTokens,
  getMolochAddress,
  getPoolAddress,
  giveAllowance,
  hasEnoughAllowance,
  hasEnoughTokens,
  getFirstAccount,
  hasEnoughPoolShares
}
