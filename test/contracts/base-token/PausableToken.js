const BigNumber = web3.BigNumber;
const web3ABI = require('web3-eth-abi');

const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const HasAdmin = artifacts.require("./HasAdmin.sol");

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('../helpers/bignumber.js');


function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var owner = accounts[0];
  var admin = accounts[1];
  var writer = accounts[2];
  var purchaser = accounts[3];
  var beneficiary = accounts[4];

  const amount_100Tokens = bn.tokens(100);
  const amount_70Tokens = bn.tokens(70);
  const amount_10Tokens = bn.tokens(10);

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner});

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;

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

  describe('when not paused', function() {
    it('should allow approval', async function() {
      await token.mint(purchaser, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.approve(writer, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transfer()', async function() {
      await token.mint(purchaser, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.transfer(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval()', async function() {
      await token.increaseApproval(writer, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval()', async function() {
      await token.decreaseApproval(writer, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom()', async function() {
      await token.mint(purchaser, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.approve(writer, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, writer, amount_10Tokens, {from: writer}).should.be.fulfilled;
    });

    it('should allow burn()', async function() {
      await token.mint(writer, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.burn(bn.tokens(8), "burn without pause", {from : writer}).should.be.fulfilled;
    });
  });

  describe('pause()', function() {
    beforeEach(async function () {
      await token.pause().should.be.fulfilled;
    });

    it('paused() should return true', async function() {
      (await token.paused()).should.be.equal(true);
    });

    it('non-owner can not invoke pause()', async function() {
      await token.unpause().should.be.fulfilled;
      await token.pause({from: purchaser}).should.be.rejected;
    });

    it('should allow minting', async function() {
      await token.mint(writer, amount_100Tokens, {from: admin}).should.be.fulfilled;
    });

    it('should reject transfer()', async function() {
      await token.mint(writer, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.transfer(purchaser, amount_100Tokens, {from: writer}).should.be.rejected;
    });

    it('should reject approval', async function() {
      await token.approve(writer, amount_10Tokens, {from: purchaser}).should.be.rejected;
    });

    it('should reject increaseApproval()', async function() {
      await token.increaseApproval(writer, amount_10Tokens, {from: purchaser}).should.be.rejected;
    });

    it('should reject decreaseApproval()', async function() {
      await token.decreaseApproval(writer, amount_10Tokens, {from: purchaser}).should.be.rejected;
    });

    it('should reject transferFrom()', async function() {
      await token.mint(purchaser, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.unpause();
      await token.approve(writer, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
      await token.pause();
      await token.transferFrom(purchaser, writer, amount_10Tokens, {from: writer}).should.be.rejected;
    });

    it('should reject burn()', async function() {
      await token.mint(writer, amount_100Tokens, {from: admin}).should.be.fulfilled;
      await token.burn(amount_10Tokens, "burn when pause", {from : writer}).should.be.rejected;
    });
  });

  describe('unpause()', function() {
    beforeEach(async function () {
      await token.pause().should.be.fulfilled;
      await token.unpause().should.be.fulfilled;

      await token.mint(purchaser, amount_100Tokens, {from: admin}).should.be.fulfilled;
    });

    it('paused() should return false', async function() {
      (await token.paused()).should.be.equal(false);
    });

    it('non-owner can not invoke unpause()', async function() {
      await token.pause().should.be.fulfilled;
      await token.unpause({from: purchaser}).should.be.rejected;
    });

    it('should allow transfer()', async function() {
      await token.transfer(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow approval', async function() {
      await token.approve(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval()', async function() {
      await token.increaseApproval(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval()', async function() {
      await token.decreaseApproval(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom()', async function() {
      await token.approve(beneficiary, amount_10Tokens, {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary, amount_10Tokens, {from: beneficiary}).should.be.fulfilled;
    });

    it('should allow burn()', async function() {
      await token.burn(amount_10Tokens, "burn when unpause", {from : purchaser}).should.be.fulfilled;
    });
  });
}

module.exports.check = check;
