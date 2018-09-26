const web3ABI = require('web3-eth-abi');
const BigNumber = web3.BigNumber;
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

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });

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

  describe('totalSupply()', function() {
    it('should allow to get totalSupply', async function() {
      let _currTotalSupply = await token.totalSupply();
      _currTotalSupply.should.be.bignumber.equal(0);
    });
  });

  describe('approve()', function() {
    it('should allow to approve tokens', async function() {
      await token.approve(purchaser, bn.tokens(100), {from: writer}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      await token.approve(purchaser, amount, {from: writer}).should.be.fulfilled;
      var allowance = await token.allowance(writer, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount);
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      const {logs} = await token.approve(purchaser, amount, {from: writer}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(writer);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('increaseApproval()', function() {
    it('should allow to increase the amount of tokens that an owner allowed to a spender', async function() {
      await token.increaseApproval(purchaser, bn.tokens(100), {from: writer}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      await token.approve(purchaser, amount, {from: writer}).should.be.fulfilled;
      await token.increaseApproval(purchaser, amount, {from: writer}).should.be.fulfilled;
      var allowance = await token.allowance(writer, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount.times(2));
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      const {logs} = await token.increaseApproval(purchaser, amount, {from: writer}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(writer);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('decreaseApproval()', function() {
    it('should allow to decrease the amount of tokens that an owner allowed to a spender', async function() {
      await token.decreaseApproval(purchaser, bn.tokens(100), {from: writer}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      var subtractedValue = bn.tokens(1);
      await token.approve(purchaser, amount.plus(subtractedValue), {from: writer}).should.be.fulfilled;
      await token.decreaseApproval(purchaser, subtractedValue, {from: writer}).should.be.fulfilled;
      var allowance = await token.allowance(writer, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount);
    });

    it('allowance should equal 0 if subtracted value is greater than the last allowed value', async function() {
      var amount = bn.tokens(100);
      var subtractedValue = bn.MAX_UINT;
      await token.approve(purchaser, amount, {from: writer}).should.be.fulfilled;
      await token.decreaseApproval(purchaser, subtractedValue, {from: writer}).should.be.fulfilled;
      var allowance = await token.allowance(writer, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(0);
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      var subtractedValue = bn.tokens(1);
      await token.approve(purchaser, amount.plus(subtractedValue), {from: writer}).should.be.fulfilled;
      const {logs} = await token.decreaseApproval(purchaser, subtractedValue, {from: writer}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(writer);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('allowance()', function() {
    it('should have expected initial value', async function() {
      (await token.allowance(writer, purchaser, {from: purchaser})).should.be.bignumber.equal(0);
    });

    it('approval of an amount which exceeds max uint256 should allow to use 0 tokens', async function() {
      await token.approve(purchaser, bn.OVER_UINT, {from: writer}).should.be.fulfilled;
      (await token.allowance(writer, purchaser, {from: purchaser})).should.be.bignumber.equal(0);
    });
  });

  describe('setBalanceSheet()', function() {
    it('should allow owner to set BalanceSheet', async function() {
      let _newBalanceSheet = await BalanceSheet.new({from:owner});
      await _newBalanceSheet.transferOwnership(token.address).should.be.fulfilled;
      await token.setBalanceSheet(_newBalanceSheet.address, {from : owner}).should.be.fulfilled;
    });

    it('should reject non-owner', async function() {
      let _unknowUser = accounts[4];
      let _newBalanceSheet = await BalanceSheet.new({from:owner});
      await _newBalanceSheet.transferOwnership(token.address).should.be.fulfilled;
      await token.setBalanceSheet(_newBalanceSheet.address, {from : _unknowUser}).should.be.rejected;
    });
  });

  describe('transferFrom()', function() {
    it('should allow to transfer tokens', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      await token.transferFrom(writer, purchaser, amounts_10, {from: purchaser}).should.be.fulfilled;
    });

    it('should update balances', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transferFrom(writer, purchaser, amounts_10, {from: purchaser}).should.be.fulfilled;
      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amounts_10));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amounts_10));
    });

    it("should log Transfer event", async function () {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      const {logs} = await token.transferFrom(writer, purchaser, amounts_10, {from: purchaser}).should.be.fulfilled;
      const xferEvent = logs.find(e => e.event === 'Transfer');
      xferEvent.should.exist;
      (xferEvent.args.from).should.equal(writer);
      (xferEvent.args.to).should.equal(purchaser);
      (xferEvent.args.value).should.be.bignumber.equal(amounts_10);
    });

    it('should reject transferring to invalid address', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      await token.transferFrom(writer, 0x0, amounts_10, {from: purchaser}).should.be.rejected;
    });

    it('should reject transferring an amount of tokens which is greater than allowance', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      await token.transferFrom(writer, purchaser, amounts_10.plus(bn.tokens(1)), {from: purchaser}).should.be.rejected;
    });

    it('should reject transferring an amount of max uint256', async function() {
      var totalTokens = await token.INITIAL_SUPPLY();

      await token.mint(writer, totalTokens, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, bn.MAX_UINT, {from: writer}).should.be.fulfilled;
      await token.transferFrom(writer, purchaser, bn.MAX_UINT, {from: purchaser}).should.be.rejected;
    });

    it('transferring an amount which exceeds max uint256 should be equivalent 0 tokens', async function() {
      var totalTokens = await token.INITIAL_SUPPLY();

      await token.mint(writer, totalTokens, {from: admin}).should.be.fulfilled;
      await token.approve(purchaser, bn.OVER_UINT, {from: writer}).should.be.fulfilled;
      (await token.allowance(writer, purchaser)).should.be.bignumber.equal(0);

      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transferFrom(writer, purchaser, bn.OVER_UINT, {from: purchaser}).should.be.fulfilled;
      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before);
      balance1After.should.be.bignumber.equal(balance1Before);
    });
  });

  describe('transfer()', function() {
    it('should allow to transfer tokens', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.transfer(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
    });

    it('should update balances', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);

      await token.transfer(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amounts_10));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amounts_10));
    });

    it("should log Transfer event", async function () {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      const {logs} = await token.transfer(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      const xferEvent = logs.find(e => e.event === 'Transfer');
      xferEvent.should.exist;
      (xferEvent.args.from).should.equal(writer);
      (xferEvent.args.to).should.equal(purchaser);
      (xferEvent.args.value).should.be.bignumber.equal(amounts_10);
    });

    it('should burn transferring token if writer transfers to zero address', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_70 = bn.tokens(70);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.transfer(0x0, amounts_70, {from: writer}).should.be.fulfilled;
      let _currentBalance = await token.balanceOf(writer);
      _currentBalance.should.be.bignumber.equal(0);
    });

    it('should reject transferring an amount of tokens which is greater than balance', async function() {
      let amounts_100 = bn.tokens(100);
      let amounts_10 = bn.tokens(10);

      await token.mint(writer, amounts_100, {from: admin}).should.be.fulfilled;
      await token.transfer(purchaser, bn.tokens(101), {from: writer}).should.be.rejected;
    });

    it('should reject transferring an amount of max uint256', async function() {
      var totalTokens = await token.INITIAL_SUPPLY();
      await token.mint(writer, totalTokens, {from: admin}).should.be.fulfilled;
      await token.transfer(purchaser, bn.MAX_UINT, {from: writer}).should.be.rejected;
    });

    it('transferring an amount which exceeds max uint256 should be equivalent 0 tokens', async function() {
      var totalTokens = await token.INITIAL_SUPPLY();
      await token.mint(writer, totalTokens, {from: admin}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transfer(purchaser, bn.OVER_UINT, {from: writer}).should.be.fulfilled;
      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before);
      balance1After.should.be.bignumber.equal(balance1Before);
    });
  });
}

module.exports.check = check;
