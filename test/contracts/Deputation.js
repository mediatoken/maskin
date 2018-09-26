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

const MaskinToken       = artifacts.require("./MaskinToken.sol");
const Deputation        = artifacts.require("./Deputation.sol");
const BalanceSheet      = artifacts.require("./BalanceSheet.sol");
const HasAdmin          = artifacts.require("./HasAdmin.sol");


contract('Deputation', function(accounts) {
  const ownerToken              = accounts[0];
  const ownerBalanceSheet       = accounts[1];
  const admin                   = accounts[2];
  const writer                  = accounts[3];
  const system_wallet           = accounts[4];
  const deputation              = accounts[5];
  const guess                   = accounts[6];

  const TEN_THOUSAND_TOKENS     = bn.tokens(10000);
  const HUNDRED_TOKENS          = bn.tokens(100);
  const TEN_TOKENS              = bn.tokens(10);

  const ListAddressesFilename   = './helpers/ThousandAddresses.txt';

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

    readEachLineSync(path.resolve(__dirname, ListAddressesFilename), function(line) {
      ListAddresses.push(line);
    });
  });

  describe("setToken()", function() {
    it("Should allow set new token address", async function() {
      const {logs} = await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;
      const setTokenLog = logs.find(e => e.event === 'SetToken');
      setTokenLog.should.exist;
      (setTokenLog.args.maskinToken).should.equal(MaskinTokenInstance.address);
    });
  });

  describe("distribute()", function() {
    const TOTAL = 20;
    let holders;
    let amounts = [];

    beforeEach(async function () {
      await MaskinTokenInstance.mint(writer, TEN_THOUSAND_TOKENS, {from: admin}).should.be.fulfilled;

      holders = ListAddresses.slice(0, TOTAL);
      for(let i = 0; i < TOTAL; i++) {
        amounts.push(HUNDRED_TOKENS);
      }
    });

    it("Should allow tokens to holders", async function() {
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      const {logs} = await DeputationInstance.distribute(holders, amounts).should.be.fulfilled;

      let holderBalance;
      for(let i = 0; i < TOTAL; i++) {
        holderBalance = await MaskinTokenInstance.balanceOf(holders[i]).should.be.fulfilled;
        holderBalance.should.be.bignumber.equal(HUNDRED_TOKENS);
      }

      const distributeLog = logs.find(e => e.event === 'FundsDistributed');
      distributeLog.should.exist;
      let val;
      for(let i = 0; i < TOTAL; i++) {
        (distributeLog.args.holders[i]).should.equal(holders[i]);
        val = new BigNumber(distributeLog.args.amounts[i]);
        val.should.be.bignumber.equal(HUNDRED_TOKENS);
      }
    });

    it("Should reject if Deputation contains null Maskin token address", async function() {
      await DeputationInstance.distribute(holders, amounts).should.be.rejected;
    });

    it("Should reject if the number of holders is different from the number of amounts", async function() {
      holders = ListAddresses.slice(0, TOTAL + TOTAL);
      await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;

      await DeputationInstance.distribute(holders, amounts).should.be.rejected;
    });

    // it("Catch event log", async function() {
    //   await DeputationInstance.setToken(MaskinTokenInstance.address, {from: deputation}).should.be.fulfilled;
    //
    //   await DeputationInstance.distribute(holders, amounts).should.be.fulfilled;
    //   const {logs} = await DeputationInstance.distribute(holders, amounts).should.be.fulfilled;
    //   const distributeLog = logs.find(e => e.event === 'FundsDistributed');
    //   distributeLog.should.exist;
    //   for(let i = 0; i < TOTAL; i++) {
    //     (distributeLog.args.holders[i]).should.equal(holders[i]);
    //     (distributeLog.args.amounts[i]).should.be.bignumber.equal(amounts[i]);
    //   }
    // });
  });
});
