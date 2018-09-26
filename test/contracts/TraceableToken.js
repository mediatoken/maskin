const BigNumber = web3.BigNumber;
const BalanceSheet = artifacts.require("./BalanceSheet");
const HasAdmin      = artifacts.require("./HasAdmin.sol");
const web3ABI = require('web3-eth-abi');

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const bn = require('./helpers/bignumber.js');


function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var owner = accounts[0];
  var admin = accounts[1];
  var writer = accounts[2];
  var purchaser = accounts[3];
  var guess = accounts[4];

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner});

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;

    await token.preMint().should.be.fulfilled;

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

    await web3.eth.sendTransaction({from: owner, to: token.address, value: 0, data: addAdminFunc, gas: 3000000});
  });

  describe('mint()', function() {
    it("add beneficiary address to the holders set", async function () {
      await token.mint(writer, bn.tokens(100), {from: admin});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
      (await token.getHolder(0)).should.be.equal(owner);
    });

    it("should not add existed address to the holders set", async function () {
      await token.mint(writer, bn.tokens(100), {from: admin});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
      (await token.getHolder(0)).should.be.equal(owner);
      await token.mint(writer, bn.tokens(200), {from: purchaser}).should.be.rejected;
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
    });
  });

  describe('transfer()', function() {
    it("add target address to the holders set", async function () {
      await token.mint(writer, bn.tokens(1000), {from: admin});
      await token.transfer(purchaser, bn.tokens(10), {from: writer});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
    });

    it("should not add existed address to the holders set", async function () {
      await token.mint(writer, bn.tokens(1000), {from: admin});
      await token.transfer(purchaser, bn.tokens(100), {from: writer});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
      (await token.getHolder(4)).should.be.equal(purchaser);

      await token.transfer(writer, bn.tokens(10), {from: purchaser});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
      (await token.getHolder(4)).should.be.equal(purchaser);
    });
  });

  describe('transferFrom()', function() {
    it("add target address to the holders set", async function () {
      await token.mint(writer, bn.tokens(1000), {from: admin});
      await token.approve(guess, bn.tokens(100), {from: writer});
      await token.transferFrom(writer, purchaser, bn.tokens(100), {from: guess});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
    });

    it("should not add existed address to the holders set", async function () {
      await token.mint(owner, bn.tokens(1000), {from: admin});
      await token.mint(purchaser, bn.tokens(1000), {from: admin});
      await token.approve(writer, bn.tokens(1000));
      await token.transferFrom(owner, writer, bn.tokens(100), {from: writer});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);

      await token.approve(writer, bn.tokens(1000), {from: purchaser})
      await token.transferFrom(purchaser, writer, bn.tokens(100), {from: writer});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
    });
  });

  describe('getTheNumberOfHolders()', function() {
    it("should return the number of token holders exactly", async function () {
      await token.mint(guess, bn.tokens(1000), {from: admin}).should.be.fulfilled;
      await token.mint(writer, bn.tokens(100), {from: admin}).should.be.fulfilled;
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
    });

    it("should not be called by non-owner", async function () {
      await token.getTheNumberOfHolders({from: guess}).should.be.rejected;
    });
  });

  describe('getHolder()', function() {
    it("should return the specified token holder", async function () {
      await token.mint(guess, bn.tokens(1000), {from: admin}).should.be.fulfilled;
      await token.mint(writer, bn.tokens(100), {from: admin}).should.be.fulfilled;
      (await token.getHolder(1)).should.be.equal(guess);
      (await token.getHolder(3)).should.be.equal(writer);
    });

    it("should not be called by non-owner", async function () {
      await token.getHolder({from: guess}).should.be.rejected;
    });
  });
};

module.exports.check = check;
