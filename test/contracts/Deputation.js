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


contract('Deputation', function(accounts) {
  const ownerToken              = accounts[0];
  const ownerBalanceSheet       = accounts[1];
  const admin                   = accounts[2];
  const writer                  = accounts[3];
  const system_wallet           = accounts[4];
  const deputation              = accounts[5];
  const guess                   = accounts[6];

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

    let addAdminFunc = web3ABI.encodeFunctionCall(
      abiAddAdminFunction,
      [admin]
    );

    await web3.eth.sendTransaction({from: ownerToken, to: MaskinTokenInstance.address, value: 0, data: addAdminFunc, gas: 3000000});
    await web3.eth.sendTransaction({from: deputation, to: DeputationInstance.address, value: 0, data: addAdminFunc, gas: 3000000});
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
      const {logs} = await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;
      const setTokenLog = logs.find(e => e.event === 'SetToken');
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

      await MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: admin}).should.be.fulfilled;

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

      const {logs} = await DeputationInstance.distribute(holders, amounts, {from: admin}).should.be.fulfilled;
      const distributeLog = logs.find(e => e.event === 'FundsDistributed');
      distributeLog.should.exist;
      for(let i = 0; i < TOTAL; i++) {
        (distributeLog.args.holders[i]).should.equal(holders[i]);
        val = new BigNumber(distributeLog.args.amounts[i]);
        val.should.be.bignumber.equal(amounts[i]);
      }
    });
  });
});
