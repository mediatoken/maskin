const BigNumber = web3.BigNumber;
const web3ABI = require('web3-eth-abi');

const HasAdmin      = artifacts.require("./HasAdmin.sol");
const HasOperator   = artifacts.require("./HasOperator.sol");
const BalanceSheet  = artifacts.require("./BalanceSheet.sol");
const bn = require('../helpers/bignumber.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();


function check(accounts, deployTokenCb) {
  const owner         = accounts[0];
  const admin         = accounts[1];
  const operator      = accounts[2];
  const non_owner     = accounts[3];
  const mandator      = accounts[4];
  const non_mandator  = accounts[5];
  const purchaser     = accounts[6];
  const beneficiary   = accounts[7];
  const writer        = accounts[8];

  var token, balanceSheet;

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
  });

  describe('setDelegatedFrom()', function() {
    it('Should allow owner set delegated from', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
    });

    it('Should reject non-owner set delegated from', async function() {
      await token.setDelegatedFrom(mandator, {from: non_owner}).should.be.rejected;
    });

    it('mandator will be changed', async function() {
      let _oldmandator = token.delegatedFrom();
      assert.notEqual(_oldmandator, mandator);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      let _currmandator = token.delegatedFrom();
      assert.notEqual(_currmandator, mandator);
    });

    it ('Should log event', async function() {
      const {logs} = await token.setDelegatedFrom(mandator, {from:owner}).should.be.fulfilled;
      const delegateEvent = logs.find(e => e.event === 'DelegatedFromSet');
      delegateEvent.should.exist;
      (delegateEvent.args.addr).should.equal(mandator);
    });
  });

  describe('delegateTotalSupply()', function() {
    let _amount = bn.tokens(100);
    beforeEach(async function() {
      let {logs} = await token.submitMintRequest(mandator, _amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('Should allow mandator to get totalSupply', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _totalSupply = await token.delegateTotalSupply({from : mandator}).should.be.fulfilled;
      _totalSupply.should.be.bignumber.equal(_amount);
    });

    it('Should reject non-mandator to get totalSupply', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _totalSupply = await token.delegateTotalSupply({from : non_mandator}).should.be.rejected;
    });
  });

  describe('delegateBalanceOf()', function() {
    beforeEach(async function() {
      let _amount = bn.tokens(100);
      let {logs} = await token.submitMintRequest(writer, _amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('Should allow mandator to get delegateBalanceOf', async function() {
      let _amount_70 = bn.tokens(70);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _delegateBalanceOf = await token.delegateBalanceOf(writer, {from : mandator}).should.be.fulfilled;
      _delegateBalanceOf.should.be.bignumber.equal(_amount_70);
    });

    it('Should reject non-mandator to get delegateBalanceOf', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _delegateBalanceOf = await token.delegateBalanceOf({from : non_mandator}).should.be.rejected;
    });
  });

  describe('delegateTransfer()', function() {
    beforeEach(async function() {
      let _amount = bn.tokens(100);
      let {logs} = await token.submitMintRequest(writer, _amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('should allow to transfer tokens', async function() {
      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);
      var amount = bn.tokens(10);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      await token.delegateTransfer(purchaser, amount, writer, {from: mandator}).should.be.fulfilled;
      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amount));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amount));
    });

    it('should reject to transfer tokens by non-mandator', async function() {
      var amount = bn.tokens(10);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      await token.delegateTransfer(purchaser, amount, writer, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateAllowance()', function() {
    it('Should have expected initial value', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      (await token.delegateAllowance(writer, purchaser, {from: mandator})).should.be.bignumber.equal(0);
    });

    it('Should reject if call from non-mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateAllowance(writer, purchaser, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateTransferFrom()', function() {
    var amount = bn.tokens(100);
    beforeEach(async function() {
      let _amount = bn.tokens(100);
      let {logs} = await token.submitMintRequest(writer, _amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('Should allow tranferFrom ', async function() {
      var amounts_100 = bn.tokens(100);
      var amounts_70 = bn.tokens(70);
      var amounts_60 = bn.tokens(60);
      var amounts_10 = bn.tokens(10);

      await token.approve(purchaser, amounts_10, {from: writer}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(writer);
      var balance2Before = await token.balanceOf(purchaser);

      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateTransferFrom(writer, purchaser, amounts_10, purchaser, {from: mandator}).should.be.fulfilled;

      var balance1After = await token.balanceOf(writer);
      var balance2After = await token.balanceOf(purchaser);

      balance1After.should.be.bignumber.equal(balance1Before.minus(amounts_10));
      balance2After.should.be.bignumber.equal(balance2Before.plus(amounts_10));
    });

    it('Should reject tranferFrom if the call is called by non_mandator ', async function() {
      await token.approve(purchaser, amount, {from: writer}).should.be.fulfilled;

      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateTransferFrom(writer, purchaser, amount, purchaser, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateApprove()', function() {
    var amount = bn.tokens(100);
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('should allow to delegateApprove tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateApprove(purchaser, amount.minus(bn.tokens(1)), writer, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateApprove tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateApprove(purchaser, amount.minus(bn.tokens(1)), writer, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateIncreaseApproval()', function() {
    var amount = bn.tokens(100);
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('should allow to delegateIncreaseApproval tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateIncreaseApproval(purchaser, amount.minus(bn.tokens(1)), writer, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateIncreaseApproval tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateIncreaseApproval(purchaser, amount.minus(bn.tokens(1)), writer, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateDecreaseApproval()', function() {
    var amount = bn.tokens(100);
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('should allow to delegateDecreaseApproval tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateDecreaseApproval(purchaser, amount.minus(bn.tokens(1)), writer, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateDecreaseApproval tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateDecreaseApproval(purchaser, amount.minus(bn.tokens(1)), writer, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateBurn()', function() {
    var amount = bn.tokens(100);
    beforeEach(async function () {
      let {logs} = await token.submitMintRequest(writer, amount, {from: operator}).should.be.fulfilled;
      const submitMintLog = logs.find(e => e.event === 'MintSubmission');
      submitMintLog.should.exist;

      await token.confirmMintRequest(submitMintLog.args.mintRequestID, {from: admin}).should.be.fulfilled;
    });

    it('should allow to delegateBurn tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateBurn(writer, bn.tokens(10), 'delegateBurn', {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateBurn tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateBurn(writer, bn.tokens(10), 'delegateBurn', {from: non_mandator}).should.be.rejected;
    });
  });
}

module.exports.check = check;
