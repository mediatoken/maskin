const fs = require('fs');
const path = require('path');
const readEachLineSync = require('read-each-line-sync');
const web3ABI = require('web3-eth-abi');

const BigNumber = web3.BigNumber;
const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const bn = require('./helpers/bignumber.js');

const MaskinToken   = artifacts.require("./MaskinToken.sol");
const Deputation    = artifacts.require("./Deputation.sol");
const BalanceSheet  = artifacts.require("./BalanceSheet.sol");
const HasAdmin      = artifacts.require("./HasAdmin.sol");
const HasOperator   = artifacts.require("./HasOperator.sol");


contract('Deputation', function(accounts) {
  const ownerToken              = accounts[0];
  const ownerBalanceSheet       = accounts[1];
  const admin                   = accounts[2];
  const operator                = accounts[3];
  const writer                  = accounts[4];
  const system_wallet           = accounts[5];
  const deputation              = accounts[6];
  const guess                   = accounts[7];

  const TEN_THOUSAND_TOKENS     = bn.tokens(10000);
  const THOUSAND_TOKENS         = bn.tokens(1000);
  const HUNDRED_TOKENS          = bn.tokens(100);
  const TEN_TOKENS              = bn.tokens(10);

  const ListAddressesFilename   = './helpers/Addresses.txt';

  var MaskinTokenInstance, DeputationInstance, BalanceSheetInstance;
  var ListAddresses = [];

  beforeEach(async function () {
    BalanceSheetInstance  = await BalanceSheet.new({from:ownerBalanceSheet}).should.be.fulfilled;
    DeputationInstance = await Deputation.new({from:deputation}).should.be.fulfilled;
    MaskinTokenInstance = await MaskinToken.new(system_wallet, DeputationInstance.address, {from:ownerToken}).should.be.fulfilled;

    await BalanceSheetInstance.transferOwnership(MaskinTokenInstance.address, {from:ownerBalanceSheet}).should.be.fulfilled;
    await MaskinTokenInstance.setBalanceSheet(BalanceSheetInstance.address).should.be.fulfilled;

    await MaskinTokenInstance.preMint({from: ownerToken}).should.be.fulfilled;

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
    await web3.eth.sendTransaction({from: deputation, to: DeputationInstance.address, value: 0, data: addAdminFunc, gas: 3000000});

    web3 = HasOperator.web3;
    await web3.eth.sendTransaction({from: ownerToken, to: MaskinTokenInstance.address, value: 0, data: addOperatorFunc, gas: 3000000});
    (await MaskinTokenInstance.isOperator(operator)).should.equal(true);
  });

  describe("setToken()", function() {
    it("Should allow set new token address if caller is owner", async function() {
      let token;
      token = await DeputationInstance.token().should.be.fulfilled;
      assert.equal(token, 0);

      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      token = await DeputationInstance.token().should.be.fulfilled;
      assert.equal(token, MaskinTokenInstance.address);
    });

    it("Should reject set new token address if caller is not owner", async function() {
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: guess}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let {logs} = await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;
      let setTokenLog = logs.find(e => e.event === 'SetToken');
      setTokenLog.should.exist;
      (setTokenLog.args.maskinToken).should.equal(MaskinTokenInstance.address);
    });
  });

  describe("distribute()", function() {
    var TOTAL = 20;
    let holders;
    let amounts = [];

    beforeEach(async function () {
      readEachLineSync(path.resolve(__dirname, ListAddressesFilename), function(line) {
        ListAddresses.push(line);
      });

      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      holders = ListAddresses.slice(0, TOTAL);
      for(let i = 0; i < TOTAL; i++) {
        amounts[i] = HUNDRED_TOKENS;
      }
    });

    it("Should allow distribute tokens to holders if caller is admin", async function() {
      let previousHolderBalance = [];
      let afterHolderBalance = [];

      for(let i = 0; i < TOTAL; i++) {
        previousHolderBalance[i] = await MaskinTokenInstance.balanceOf(holders[i]).should.be.fulfilled;
        assert.equal(previousHolderBalance[i], 0);
      }

      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.fulfilled;

      for(let i = 0; i < TOTAL; i++) {
        afterHolderBalance[i] = await MaskinTokenInstance.balanceOf(holders[i]).should.be.fulfilled;
        afterHolderBalance[i].minus(HUNDRED_TOKENS).should.be.bignumber.equal(previousHolderBalance[i]);
      }
    });

    it("Should allow call distribute function many times util transferring tokens to all specified holders", async function() {
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      for(let i = 0; i < TOTAL; i++) {
        amounts[i] = TEN_TOKENS;
      }

      for(let i = 0; i < 10; i++) {
        holders = ListAddresses.slice(TOTAL * i, TOTAL * (i+1));
        await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.fulfilled;
      }
    });

    it("Should reject distribute tokens to holders if caller is not admin", async function() {
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      await DeputationInstance.distribute(holders, amounts, {from: guess}).should.be.rejected;
    });

    it("Should reject if Deputation contains null Maskin token address", async function() {
      let token = await DeputationInstance.token().should.be.fulfilled;
      assert.equal(token, 0);

      await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.rejected;
    });

    it("Should reject distribute tokens to holders if total of amounts is greater than balance of Deputation", async function() {
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      let deputationBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;
      deputationBalance.should.be.bignumber.equal(bn.tokens(2000));
      for(let i = 0; i < TOTAL; i++) {
        amounts[i] = THOUSAND_TOKENS;
      }

      await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.rejected;
    });

    it("Should reject if the number of holders is different from the number of amounts", async function() {
      holders = ListAddresses.slice(0, TOTAL + TOTAL);
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let val;
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      let {logs} = await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.fulfilled;
      let distributeLog = logs.find(e => e.event === 'FundsDistributed');
      distributeLog.should.exist;
      for(let i = 0; i < TOTAL; i++) {
        (distributeLog.args.holders[i]).should.equal(holders[i]);
        val = new BigNumber(distributeLog.args.amounts[i]);
        val.should.be.bignumber.equal(amounts[i]);
      }
    });
  });

  describe("reclaimToken()", function() {
    beforeEach(async function () {
      let {logs} = await MaskinTokenInstance.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await MaskinTokenInstance.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it("Should allow reclaim token if caller is owner", async function() {
      let abiReclaimTokenFunction = {
        "constant": false,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          }
        ],
        "name": "reclaimToken",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      };

      let reclaimTokenFunc = web3ABI.encodeFunctionCall(
        abiReclaimTokenFunction,
        [MaskinTokenInstance.address, guess]
      );

      web3 = Deputation.web3;
      await web3.eth.sendTransaction({
        from: deputation,
        to: DeputationInstance.address,
        value: 0,
        data: reclaimTokenFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should allow reclaim token which is equal to amount of current balance of this Deputation contract", async function() {
      let previousDeputationBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;

      let abiReclaimTokenFunction = {
        "constant": false,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          }
        ],
        "name": "reclaimToken",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      };

      let reclaimTokenFunc = web3ABI.encodeFunctionCall(
        abiReclaimTokenFunction,
        [MaskinTokenInstance.address, guess]
      );

      web3 = Deputation.web3;
      await web3.eth.sendTransaction({
        from: deputation,
        to: DeputationInstance.address,
        value: 0,
        data: reclaimTokenFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });

      let afterDeputationBalance = await MaskinTokenInstance.balanceOf(DeputationInstance.address).should.be.fulfilled;

      let guessBalance = await MaskinTokenInstance.balanceOf(guess).should.be.fulfilled;
      previousDeputationBalance.minus(afterDeputationBalance).should.be.bignumber.equal(guessBalance);
    });

    it("Should reject reclaim token if caller is not owner", async function() {
      let abiReclaimTokenFunction = {
        "constant": false,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          }
        ],
        "name": "reclaimToken",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      };

      let reclaimTokenFunc = web3ABI.encodeFunctionCall(
        abiReclaimTokenFunction,
        [MaskinTokenInstance.address, guess]
      );

      web3 = Deputation.web3;
      await web3.eth.sendTransaction({
        from: operator,
        to: DeputationInstance.address,
        value: 0,
        data: reclaimTokenFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error)
      });
    });
  });
});
