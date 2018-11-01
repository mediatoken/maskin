const BigNumber     = web3.BigNumber;
const BalanceSheet  = artifacts.require("./BalanceSheet");
const HasAdmin      = artifacts.require("./HasAdmin.sol");
const HasOperator   = artifacts.require("./HasOperator.sol");

const web3ABI = require('web3-eth-abi');

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const bn = require('./helpers/bignumber.js');


function check(accounts, deployTokenCb) {
  const owner       = accounts[0];
  const admin       = accounts[1];
  const operator    = accounts[2];
  const writer      = accounts[3];
  const purchaser   = accounts[4];
  const guess       = accounts[5];

  const TEN_THOUSAND_TOKENS     = bn.tokens(10000);

  var token, balanceSheet;

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

    await web3.eth.sendTransaction({from: owner, to: token.address, value: 0, data: addAdminFunc, gas: 3000000});

    web3 = HasOperator.web3;
    await web3.eth.sendTransaction({from: owner, to: token.address, value: 0, data: addOperatorFunc, gas: 3000000});
    (await token.isOperator(operator)).should.equal(true);
  });

  describe('mint()', function() {
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it("add beneficiary address to the holders set", async function () {
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
      (await token.getHolder(0)).should.be.equal(owner);
    });

    it("should not add existed address to the holders set", async function () {

      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);

      let {logs} = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
    });
  });

  describe('transfer()', function() {
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it("add target address to the holders set", async function () {
      await token.transfer(purchaser, bn.tokens(10), {from: writer});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
    });

    it("should not add existed address to the holders set", async function () {
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
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it("add target address to the holders set", async function () {
      await token.approve(guess, bn.tokens(100), {from: writer});
      await token.transferFrom(writer, purchaser, bn.tokens(100), {from: guess});
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(5);
      (await token.getHolder(0)).should.be.equal(owner);
      (await token.getHolder(1)).should.be.equal(writer);
    });

    it("should not add existed address to the holders set", async function () {
      let {logs} = await token.submitMintRequest(purchaser, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(purchaser);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

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
      let submitMintRequestTransaction = await token.submitMintRequest(guess, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = (submitMintRequestTransaction.logs).find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(guess);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      submitMintRequestTransaction = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      submitMintLog = (submitMintRequestTransaction.logs).find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(4);
    });
  });

  describe('getHolder()', function() {
    it("should return the specified token holder", async function () {
      let submitMintRequestTransaction = await token.submitMintRequest(guess, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      let submitMintLog = (submitMintRequestTransaction.logs).find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(guess);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      submitMintRequestTransaction = await token.submitMintRequest(writer, TEN_THOUSAND_TOKENS, {from: operator}).should.be.fulfilled;
      submitMintLog = (submitMintRequestTransaction.logs).find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;
      (submitMintLog.args.sender).should.equal(writer);
      (submitMintLog.args.amount).should.be.bignumber.equal(TEN_THOUSAND_TOKENS);

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;

      (await token.getHolder(1)).should.be.equal(guess);
      (await token.getHolder(3)).should.be.equal(writer);
    });
  });
};

module.exports.check = check;
