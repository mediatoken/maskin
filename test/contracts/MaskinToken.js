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
  const writer                  = accounts[3];
  const system_wallet           = accounts[4];
  const deputation              = accounts[5];
  const guess                   = accounts[6];

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

    let addAdminFunc = web3ABI.encodeFunctionCall(
      abiAddAdminFunction,
      [admin]
    );

    await web3.eth.sendTransaction({from: ownerToken, to: MaskinTokenInstance.address, value: 0, data: addAdminFunc, gas: 3000000});
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

  describe("mint()", function() {
    beforeEach(async function () {
      await MaskinTokenInstance.preMint({from: ownerToken}).should.be.fulfilled;
    });

    it("Should allow mint tokens whenever writer posts new article if caller is admin", async function() {
      let previousWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let previousAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let previousSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      assert.equal(previousWriterBalance, 0);
      assert.equal(previousAllHoldersBalance, 0);
      assert.equal(previousSystemWalletBalance, 0);

      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;
      await MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: admin}).should.be.fulfilled;

      let afterWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let afterAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let afterSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      afterWriterBalance.minus(bn.tokens(7000)).should.be.bignumber.equal(previousWriterBalance);
      afterAllHoldersBalance.minus(bn.tokens(2000)).should.be.bignumber.equal(previousAllHoldersBalance);
      afterSystemWalletBalance.minus(bn.tokens(1000)).should.be.bignumber.equal(previousSystemWalletBalance);
    });

    it("Should reject mint if caller is not admin ", async function() {
      MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: guess}).should.be.rejected;
    });

    it("Catch event log", async function() {
      const {logs} = await MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: admin}).should.be.fulfilled;
      const mintLog = logs.find(e => e.event === 'Mint');
      mintLog.should.exist;
      (mintLog.args.to).should.equal(writer);
      (mintLog.args.value).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);
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

      let previousWriterBalance = await MaskinTokenInstance.balanceOf(writer).should.be.fulfilled;
      let previousAllHoldersBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      let previousSystemWalletBalance = await MaskinTokenInstance.balanceOf(system_wallet).should.be.fulfilled;

      assert.equal(previousWriterBalance, 0);
      assert.equal(previousAllHoldersBalance, 0);
      assert.equal(previousSystemWalletBalance, 0);

      await MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: admin}).should.be.fulfilled;

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
