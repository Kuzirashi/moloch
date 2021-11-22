const BN = require('bn.js')
const deploymentParams = require('../deployment-params')
const { PolyjuiceAccounts, PolyjuiceHttpProvider } = require('@polyjuice-provider/web3');
const Web3 = require('web3');
const { AddressTranslator } = require('nervos-godwoken-integration');

const {
  getDeployedMoloch,
  getFirstAccount,
  getApprovedTokens,
  hasEnoughTokens,
  hasEnoughAllowance,
  giveAllowance
} = require('./utils')

const nervosProviderConfig = {
  web3Url: 'http://localhost:8024'
};

const provider = new PolyjuiceHttpProvider(nervosProviderConfig.web3Url, nervosProviderConfig);

const polyjuiceAccounts = new PolyjuiceAccounts(nervosProviderConfig);

const web3 = new Web3(provider);
web3.eth.accounts = polyjuiceAccounts;
web3.eth.Contract.setProvider(provider, web3.eth.accounts);
const summoner = web3.eth.accounts.wallet.add('0xd9066ff9f753a1898709b568119055660a77d9aae4d7a4ad677b8fb3d2a571e5');

const addressTranslator = new AddressTranslator({
  RPC_URL: nervosProviderConfig.web3Url,
  CKB_URL: '',
  INDEXER_URL: '',
  deposit_lock_script_type_hash: '',
  eth_account_lock_script_type_hash: '0xe8bb99adf14fbe8394ff8562ac990445fd51f34e29216a41d514d80af9ce32cf',
  portal_wallet_lock_hash: '',
  rollup_type_hash: '0xd8e81522b747cba430ad442787412fb7413aa2189bc7cc4e53762dff02acd6f9',
  rollup_type_script: {
    args: '',
    code_hash: '',
    hash_type: ''
  }
});
const summonerPolyAddress = addressTranslator.ethAddressToGodwokenShortAddress(summoner.address);

task('moloch-deploy', 'Deploys a new instance of the Moloch DAO')
  .setAction(async () => {
    if (deploymentParams.SUMMONER === '' || deploymentParams.TOKEN === '') {
      console.error('Please set the deployment parameters in deployment-params.js')
      return
    }

    // Make sure everything is compiled
    await run('compile')

    console.log('Deploying a new DAO to the network ')
    // console.log(
    //   'Deployment parameters:\n',
    //   '  summoner:', deploymentParams.SUMMONER, '\n',
    //   '  token:', deploymentParams.TOKEN, '\n',
    //   '  periodSeconds:', deploymentParams.PERIOD_DURATION_IN_SECONDS, '\n',
    //   '  votingPeriods:', deploymentParams.VOTING_DURATON_IN_PERIODS, '\n',
    //   '  gracePeriods:', deploymentParams.GRACE_DURATON_IN_PERIODS, '\n',
    //   '  abortPeriods:', deploymentParams.ABORT_WINDOW_IN_PERIODS, '\n',
    //   '  proposalDeposit:', deploymentParams.PROPOSAL_DEPOSIT, '\n',
    //   '  dilutionBound:', deploymentParams.DILUTION_BOUND, '\n',
    //   '  processingReward:', deploymentParams.PROCESSING_REWARD, '\n'
    // )

    const Confirm = require('prompt-confirm')
    // const prompt = new Confirm('Please confirm that the deployment parameters are correct')
    // const confirmation = await prompt.run()

    // if (!confirmation) {
    //   return
    // }
   
    // console.log(artifacts.require('Moloch'));

    const Token = new web3.eth.Contract(artifacts.require('Token')._json.abi);

    const token = await Token.deploy({
        data: artifacts.require('Token')._json.bytecode,
        arguments: [
          'dCKB',
          'dCKB',
          '999999999999999999999999990000000000000'
        ]
    }).send({
        from: summoner.address,
        gas: 6000000,
    });

    console.log(`Deployed token: ${token.options.address}`)

    const Moloch = new web3.eth.Contract(artifacts.require('Moloch')._json.abi);

    console.log("Deploying...")

    const deployTx = Moloch.deploy({
        data: artifacts.require('Moloch')._json.bytecode,
        arguments: [
          summonerPolyAddress,
          [token.options.address],
          deploymentParams.PERIOD_DURATION_IN_SECONDS,
          deploymentParams.VOTING_DURATON_IN_PERIODS,
          deploymentParams.GRACE_DURATON_IN_PERIODS,
          deploymentParams.PROPOSAL_DEPOSIT,
          deploymentParams.DILUTION_BOUND,
          deploymentParams.PROCESSING_REWARD
        ]
    }).send({
        from: summoner.address,
        gas: 6000000,
    });

    const moloch = await deployTx;

    console.log("")
    console.log('Moloch DAO deployed. Address:', moloch.options.address)
    console.log("Set this address in buidler.config.js's networks section to use the other tasks")
  })

task('moloch-submit-proposal', 'Submits a proposal')
  .addParam('applicant', 'The address of the applicant')
  .addParam('tribute', "The number of token's wei offered as tribute")
  .addParam('shares', 'The number of shares requested')
  .addParam('details', "The proposal's details")
  .setAction(async ({ applicant, tribute: tributeOffered, shares: sharesRequested, details }) => {
    // Make sure everything is compiled
    await run('compile')

    const moloch = await getDeployedMoloch(web3)
    if (moloch === undefined) {
      return
    }

    const token = await getApprovedTokens(web3)
    if (token === undefined) {
      return
    }

    const proposalDeposit = await moloch.methods.proposalDeposit().call();
    const sender = summonerPolyAddress

    if (!await hasEnoughTokens(token, sender, proposalDeposit)) {
      console.error("You don't have enough tokens to pay the deposit")
      return
    }

    if (!await hasEnoughAllowance(token, sender, moloch, proposalDeposit)) {
      await giveAllowance(token, summoner.address, moloch, proposalDeposit)
    }

    if (new BN(tributeOffered).gt(new BN(0))) {
      if (!await hasEnoughTokens(token, sender, tributeOffered)) {
        console.error("The applicant doesn't have enough tokens to pay the tribute")
        return
      }

      if (!await hasEnoughAllowance(token, sender, moloch, tributeOffered)) {
        console.error('The applicant must give allowance to the DAO before being proposed')
        return
      }
    }

    const lootRequested = 1;
    const tributeToken = token.options.address;
    applicant = sender;
    const paymentRequested = 1;
    const paymentToken = token.options.address;

    const receipt = await moloch.methods.submitProposal(
      applicant,
      sharesRequested,
      lootRequested,
      tributeOffered,
      tributeToken,
      paymentRequested,
      paymentToken,
      details
    ).send({
      from: summoner.address
    });

    const proposalIndex = receipt.events.SubmitProposal.returnValues.proposalId

    console.log('Submitted proposal number', proposalIndex.toString())
  })

task('moloch-submit-vote', 'Submits a vote')
  .addParam('proposal', 'The proposal number', undefined, types.int)
  .addParam('vote', 'The vote (yes/no)')
  .setAction(async ({ proposal, vote }) => {
    // Make sure everything is compiled
    await run('compile')

    const moloch = await getDeployedMoloch()
    if (moloch === undefined) {
      return
    }

    if (vote.toLowerCase() !== 'yes' && vote.toLowerCase() !== 'no') {
      console.error('Invalid vote. It must be "yes" or "no".')
      return
    }

    const voteNumber = vote.toLowerCase() === 'yes' ? 1 : 2

    await moloch.submitVote(proposal, voteNumber)
    console.log('Vote submitted')
  })

task('moloch-process-proposal', 'Processes a proposal')
  .addParam('proposal', 'The proposal number', undefined, types.int)
  .setAction(async ({ proposal }) => {
    // Make sure everything is compiled
    await run('compile')

    const moloch = await getDeployedMoloch()
    if (moloch === undefined) {
      return
    }

    await moloch.processProposal(proposal)
    console.log('Proposal processed')
  })

task('moloch-ragequit', 'Ragequits, burning some shares and getting tokens back')
  .addParam('shares', 'The amount of shares to burn')
  .setAction(async ({ shares }) => {
    // Make sure everything is compiled
    await run('compile')

    const moloch = await getDeployedMoloch()
    if (moloch === undefined) {
      return
    }

    await moloch.ragequit(shares)
    console.log(`Burn ${shares} shares`)
  })

task('moloch-update-delegate', 'Updates your delegate')
  .addParam('delegate', "The new delegate's address")
  .setAction(async ({ delegate }) => {
    // Make sure everything is compiled
    await run('compile')

    const moloch = await getDeployedMoloch()
    if (moloch === undefined) {
      return
    }

    await moloch.updateDelegateKey(delegate)
    console.log(`Delegate updated`)
  })
