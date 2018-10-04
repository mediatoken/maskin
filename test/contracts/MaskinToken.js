const web3ABI = require('web3-eth-abi');

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

const MaskinToken       = artifacts.require("./MaskinToken.sol");
const Deputation        = artifacts.require("./Deputation.sol");
const BalanceSheet      = artifacts.require("./BalanceSheet.sol");
const HasAdmin          = artifacts.require("./HasAdmin.sol");
const HasOperator       = artifacts.require("./HasOperator.sol");
const WithdrawalToken   = require("./WithdrawalToken.js");
const TraceableToken    = require("./TraceableToken.js");
const DelegateToken     = require("./delegate/DelegateToken.js");
const ClaimableEx       = require("./ownership/ClaimableEx.js");
const StandardToken     = require("./base-token/StandardToken.js");
const PausableToken     = require("./base-token/PausableToken.js");
const CanReclaimToken   = require("./zeppelin/contracts/ownership/CanReclaimToken.js");


contract('MaskinToken', function (accounts) {
  const ownerToken              = accounts[0];
  const ownerBalanceSheet       = accounts[1];
  const admin                   = accounts[2];
  const operator                = accounts[3];
  const writer                  = accounts[4];
  const system_wallet           = accounts[5];
  const deputation              = accounts[6];
  const guess                   = accounts[7];

  const TEN_THOUSAND_TOKENS     = bn.tokens(10000);

  var MaskinTokenInstance, DeputationInstance, BalanceSheetInstance;

  beforeEach(async function () {
    BalanceSheetInstance  = await BalanceSheet.new({from:ownerBalanceSheet}).should.be.fulfilled;
    DeputationInstance = await Deputation.new({from:deputation}).should.be.fulfilled;
    MaskinTokenInstance = await MaskinToken.new(system_wallet, DeputationInstance.address, {from:ownerToken}).should.be.fulfilled;

    await BalanceSheetInstance.transferOwnership(MaskinTokenInstance.address, {from:ownerBalanceSheet}).should.be.fulfilled;
    await MaskinTokenInstance.setBalanceSheet(BalanceSheetInstance.address).should.be.fulfilled;

    var web3 = HasAdmin.web3;

    const abiAddAdminFunction = {
      "constant": false,
      "inputs": [
        {
          "name": "_operator",
          "type": "address"
        }
      ],
      "name": "addAdmin",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    };

    const abiAddOperatorFunction = {
      "constant": false,
      "inputs": [
        {
          "name": "_operator",
          "type": "address"
        }
      ],
      "name": "addOperator",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    };

    let addAdminFunc = web3ABI.encodeFunctionCall(
      abiAddAdminFunction,
      [admin]
    );

    let addOperatorFunc = web3ABI.encodeFunctionCall(
      abiAddOperatorFunction,
      [operator]
    );

    await web3.eth.sendTransaction({from: ownerToken, to: MaskinTokenInstance.address, value: 0, data: addAdminFunc, gas: 3000000});

    web3 = HasOperator.web3;
    await web3.eth.sendTransaction({from: ownerToken, to: MaskinTokenInstance.address, value: 0, data: addOperatorFunc, gas: 3000000});
    (await MaskinTokenInstance.isOperator(operator)).should.equal(true);
  });

  describe("preMint()", function() {
    it("Balance of Maskin token owner should be INITIAL_SUPPLY at beginning time", async function() {
      let previousBalanceOwner = await MaskinTokenInstance.balanceOf(ownerToken);
      assert.equal(previousBalanceOwner, 0);

      await MaskinTokenInstance.preMint({from: ownerToken}).should.be.fulfilled;

      let totalInitTokens = await MaskinTokenInstance.INITIAL_SUPPLY();
      let afterBalanceOwner = await MaskinTokenInstance.balanceOf(ownerToken);

      afterBalanceOwner.minus(totalInitTokens).should.be.bignumber.equal(previousBalanceOwner);
    });

    it("Should reject if calling preMint() one more time", async function() {
      await MaskinTokenInstance.preMint({from: ownerToken}).should.be.fulfilled;

      await MaskinTokenInstance.preMint({from: ownerToken}).should.be.rejected;
    });

    it("Should reject if caller is not Maskin token owner", async function() {
      await MaskinTokenInstance.preMint({from: guess}).should.be.rejected;
    });
  });

  describe("submitMintRequest()", function() {
    it("Should allow if caller is operator", async function() {
      await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
    });

    it("Should allow increasing mintRequestCount number by 1 if invoking a submitMintRequest successfully", async function() {
      let previousMintRequestCount = await MaskinTokenInstance.mintRequestCount();
      await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let afterMintRequestCount = await MaskinTokenInstance.mintRequestCount();
      afterMintRequestCount.minus(1).should.be.bignumber.equal(previousMintRequestCount);
    });

    it("Should reject if the given address input is address 0", async function() {
      await MaskinTokenInstance.submitMintRequest(0, TEN_THOUSAND_TOKENS, {from: guess}).should.be.rejected;
    });

    it("Should reject if the given amount input is 0", async function() {
      await MaskinTokenInstance.submitMintRequest(writer, 0, {from: guess}).should.be.rejected;
    });

    it("Should reject if caller is not operator", async function() {
      await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: guess}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.mintRequestID).should.be.bignumber.equal(0);
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
    });
  });

  describe("getMintRequest()", function() {
    var submitMintLog;
    beforeEach(async function () {
      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
    });

    it("Should allow if the given mint request ID is valid", async function() {
      let mintRequest = await MaskinTokenInstance.getMintRequest(submitMintLog.args.mintRequestID).should.be.fulfilled;
      (mintRequest[0]).should.equal(writer);
      (mintRequest[1]).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
      assert.isFalse(mintRequest[2]);
    });

    it("Should reject if the given mint request ID is invalid", async function() {
      await MaskinTokenInstance.getMintRequest(submitMintLog.args.mintRequestID + 1).should.be.rejected;
    });
  });

  describe("confirmMintRequest()", function() {
    var submitMintLog;
    beforeEach(async function () {
      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
    });

    it("Should allow if caller is admin", async function() {
      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it("Should allow changing isExecuted value of the given mint request ID to True after being confirmed", async function() {
      let previousMintRequest = await MaskinTokenInstance.getMintRequest(submitMintLog.args.mintRequestID).should.be.fulfilled;
      assert.isFalse(previousMintRequest[2]);

      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      let afterMintRequest = await MaskinTokenInstance.getMintRequest(submitMintLog.args.mintRequestID).should.be.fulfilled;
      assert.isTrue(afterMintRequest[2]);
    });

    it("Should allow mint successfully after invoking a confirmMintRequest", async function() {
      let previousWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let previousAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let previousSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      let afterWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let afterAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let afterSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      afterWriterBalance.minus(bn.tokens(7000)).should.be.bignumber.equal(previousWriterBalance);
      afterAllHoldersBalance.minus(bn.tokens(2000)).should.be.bignumber.equal(previousAllHoldersBalance);
      afterSystemWalletBalance.minus(bn.tokens(1000)).should.be.bignumber.equal(previousSystemWalletBalance);
    });

    it("Should reject if caller is not admin", async function() {
      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: guess}).should.be.rejected;
    });

    it("Should reject if the given mint request ID is invalid", async function() {
      let currentMintRequestCount = await MaskinTokenInstance.mintRequestCount();
      await MaskinTokenInstance.confirmMintRequest(currentMintRequestCount + 1, {from: admin}).should.be.rejected;
    });

    it("Should reject if the given mint request ID is already confirmed", async function() {
      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let {logs} = await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
      let confirmMintRequestLog = logs.find(e => e.event === 'ConfirmMintRequest');
      confirmMintRequestLog.should.exist;
      (confirmMintRequestLog.args.mintRequestID).should.be.bignumber.equal(0);
      (confirmMintRequestLog.args.addr).should.equal(writer);
      (confirmMintRequestLog.args.value).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
    });
  });

  describe("changePaidRates()", function() {
    it("Should allow if caller is admin", async function() {
      await MaskinTokenInstance.changePaidRates(20, 60, {from: admin}).should.be.fulfilled;

      let holdersPaidRate = await MaskinTokenInstance.holdersPaidRate().should.be.fulfilled;
      let systemPaidRate = await MaskinTokenInstance.systemPaidRate().should.be.fulfilled;
      let writerPaidRate = await MaskinTokenInstance.writerPaidRate().should.be.fulfilled;

      assert.equal(holdersPaidRate, 20);
      assert.equal(systemPaidRate, 20);
      assert.equal(writerPaidRate, 60);
    });

    it("Should allow increasing balance of participants if changing paid rate successfully", async function() {
      await MaskinTokenInstance.changePaidRates(20, 60, {from: admin}).should.be.fulfilled;

      let previousWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let previousAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let previousSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      let afterWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let afterAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let afterSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      afterWriterBalance.minus(bn.tokens(6000)).should.be.bignumber.equal(previousWriterBalance);
      afterAllHoldersBalance.minus(bn.tokens(2000)).should.be.bignumber.equal(previousAllHoldersBalance);
      afterSystemWalletBalance.minus(bn.tokens(2000)).should.be.bignumber.equal(previousSystemWalletBalance);
    });

    it("Should reject if caller is not admin", async function() {
      await MaskinTokenInstance.changePaidRates(20, 60, {from: guess}).should.be.rejected;

      let holdersPaidRate = await MaskinTokenInstance.holdersPaidRate().should.be.fulfilled;
      let systemPaidRate = await MaskinTokenInstance.systemPaidRate().should.be.fulfilled;
      let writerPaidRate = await MaskinTokenInstance.writerPaidRate().should.be.fulfilled;

      assert.equal(holdersPaidRate, 20);
      assert.equal(systemPaidRate, 10);
      assert.equal(writerPaidRate, 70);
    });

    it("Should reject if system paid rate is greater than or equal to 100", async function() {
      await MaskinTokenInstance.changePaidRates(100, 60, {from: guess}).should.be.rejected;

      let holdersPaidRate = await MaskinTokenInstance.holdersPaidRate().should.be.fulfilled;
      let systemPaidRate = await MaskinTokenInstance.systemPaidRate().should.be.fulfilled;
      let writerPaidRate = await MaskinTokenInstance.writerPaidRate().should.be.fulfilled;

      assert.equal(holdersPaidRate, 20);
      assert.equal(systemPaidRate, 10);
      assert.equal(writerPaidRate, 70);
    });

    it("Should reject if writer paid rate is greater than or equal to 100", async function() {
      await MaskinTokenInstance.changePaidRates(20, 100, {from: guess}).should.be.rejected;

      let holdersPaidRate = await MaskinTokenInstance.holdersPaidRate().should.be.fulfilled;
      let systemPaidRate = await MaskinTokenInstance.systemPaidRate().should.be.fulfilled;
      let writerPaidRate = await MaskinTokenInstance.writerPaidRate().should.be.fulfilled;

      assert.equal(holdersPaidRate, 20);
      assert.equal(systemPaidRate, 10);
      assert.equal(writerPaidRate, 70);
    });

    it("Should reject if sum of system paid rate and writer paid rate is greater than 100", async function() {
      await MaskinTokenInstance.changePaidRates(50, 60, {from: guess}).should.be.rejected;

      let holdersPaidRate = await MaskinTokenInstance.holdersPaidRate().should.be.fulfilled;
      let systemPaidRate = await MaskinTokenInstance.systemPaidRate().should.be.fulfilled;
      let writerPaidRate = await MaskinTokenInstance.writerPaidRate().should.be.fulfilled;

      assert.equal(holdersPaidRate, 20);
      assert.equal(systemPaidRate, 10);
      assert.equal(writerPaidRate, 70);
    });

    it("Catch event log", async function() {
      const {logs} = await MaskinTokenInstance.changePaidRates(15, 65, {from: admin}).should.be.fulfilled;
      const ChangePaidRatesLog = logs.find(e => e.event === 'ChangePaidRates');
      ChangePaidRatesLog.should.exist;
      (ChangePaidRatesLog.args.systemPaidRate).should.be.bignumber.equal(15);
      (ChangePaidRatesLog.args.writerPaidRate).should.be.bignumber.equal(65);
    });
  });

  describe("changeWallet()", function() {
    it("Should allow if caller is admin", async function() {
      let previousWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      await MaskinTokenInstance.changeWallet(guess, {from: admin}).should.be.fulfilled;
      let afterWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      assert.notEqual(previousWalletAddress, afterWalletAddress);
      assert.equal(afterWalletAddress, guess);
    });

    it("Should reject if caller is not admin", async function() {
      let previousWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      await MaskinTokenInstance.changeWallet(guess, {from: writer}).should.be.rejected;
      let afterWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      assert.equal(previousWalletAddress, afterWalletAddress);
    });

    it("Should reject if wallet address is 0", async function() {
      let previousWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      await MaskinTokenInstance.changeWallet(0x0, {from: writer}).should.be.rejected;
      let afterWalletAddress = await MaskinTokenInstance.wallet().should.be.fulfilled;
      assert.equal(previousWalletAddress, afterWalletAddress);
    });

    it("Catch event log", async function() {
      const {logs} = await MaskinTokenInstance.changeWallet(guess, {from: admin}).should.be.fulfilled;
      const changeWalletLog = logs.find(e => e.event === 'ChangeWallet');
      changeWalletLog.should.exist;
      (changeWalletLog.args.addr).should.equal(guess);
    });
  });

  describe("changeDeputation()", function() {
    it("Should allow if caller is admin", async function() {
      let previousDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      await MaskinTokenInstance.changeDeputation(guess, {from: admin}).should.be.fulfilled;
      let afterDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      assert.notEqual(previousDeputationAddress, afterDeputationAddress);
      assert.equal(afterDeputationAddress, guess);
    });

    it("Should reject if caller is not admin", async function() {
      let previousDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      await MaskinTokenInstance.changeDeputation(guess, {from: writer}).should.be.rejected;
      let afterDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      assert.equal(previousDeputationAddress, afterDeputationAddress);
    });

    it("Should reject if deputation address is 0", async function() {
      let previousDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      await MaskinTokenInstance.changeDeputation(0x0, {from: writer}).should.be.rejected;
      let afterDeputationAddress = await MaskinTokenInstance.deputation().should.be.fulfilled;
      assert.equal(previousDeputationAddress, afterDeputationAddress);
    });

    it("Catch event log", async function() {
      const {logs} = await MaskinTokenInstance.changeDeputation(guess, {from: admin}).should.be.fulfilled;
      const changeDeputationLog = logs.find(e => e.event === 'ChangeDeputation');
      changeDeputationLog.should.exist;
      (changeDeputationLog.args.addr).should.equal(guess);
    });
  });

  describe("transferOwnership()", function() {
    it("Should allow if caller is Maskin token owner", async function() {
      let previousOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      await MaskinTokenInstance.transferOwnership(guess, {from: ownerToken}).should.be.fulfilled;
      let afterOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      assert.notEqual(previousOwnerAddress, afterOwnerAddress);
      assert.equal(afterOwnerAddress, guess);
    });

    it("Should reject if caller is not Maskin token owner", async function() {
      let previousOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      await MaskinTokenInstance.transferOwnership(guess, {from: writer}).should.be.rejected;
      let afterOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      assert.equal(previousOwnerAddress, afterOwnerAddress);
    });

    it("Should reject if new ownership address is the same as previous", async function() {
      let previousOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      await MaskinTokenInstance.transferOwnership(MaskinTokenInstance.address, {from: ownerToken}).should.be.rejected;
      let afterOwnerAddress = await MaskinTokenInstance.pendingOwner().should.be.fulfilled;
      assert.equal(previousOwnerAddress, afterOwnerAddress);
    });
  });

  describe('CanReclaimToken', function() {
    CanReclaimToken.check(accounts, deploy, deployContract);
  });

  describe('ClaimableEx', function() {
    ClaimableEx.check(accounts, deployContract);
  });

  describe('TraceableToken', function() {
    TraceableToken.check(accounts, deployContract);
  });

  describe('StandardToken', function() {
    StandardToken.check(accounts, deployContract);
  });

  describe('PausableToken', function() {
    PausableToken.check(accounts, deployContract)
  });

  describe('WithdrawalToken', function() {
    WithdrawalToken.check(accounts, deployContract)
  });

  describe('DelegateToken', function() {
    DelegateToken.check(accounts, deployContract);
  });

  async function deploy() {
    var deputationDeployed = await Deputation.new({from:deputation}).should.be.fulfilled;
    var _token = await MaskinToken.new(system_wallet, deputationDeployed.address, {from:ownerToken}).should.be.fulfilled;
    return _token;
  }

  async function deployContract() {
    return deploy();
  }
});
