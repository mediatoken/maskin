const web3ABI = require('web3-eth-abi');

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('../helpers/bignumber.js');

const HasOperator = artifacts.require("./HasOperator.sol");


contract('HasOperator', function(accounts) {
  const ownerHasOperator   = accounts[0];
  const candidateA      = accounts[1];
  const candidateB      = accounts[2];
  const candidateC      = accounts[3];
  const candidateD      = accounts[4];
  const candidateE      = accounts[5];
  const candidateF      = accounts[6];
  const guess           = accounts[7];

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

  const abiAddMultipleOperatorFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operators",
        "type": "address[]"
      }
    ],
    "name": "addOperator",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  const abiRemoveOperatorFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operator",
        "type": "address"
      }
    ],
    "name": "removeOperator",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  const abiRemoveMultipleOperatorFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operators",
        "type": "address[]"
      }
    ],
    "name": "removeOperator",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  var HasOperatorInstance;

  beforeEach(async function () {
    HasOperatorInstance  = await HasOperator.new({from: ownerHasOperator}).should.be.fulfilled;
    var web3 = HasOperator.web3;
  });

  describe("addOperator()", function() {
    it("Should allow add an operator if caller is owner", async function() {
      let addOperatorFunc = web3ABI.encodeFunctionCall(
        abiAddOperatorFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: ownerHasOperator,
        to: HasOperatorInstance.address,
        value: 0,
        data: addOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject add an operator if caller is not owner", async function() {
      let addOperatorFunc = web3ABI.encodeFunctionCall(
        abiAddOperatorFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasOperatorInstance.address,
        value: 0,
        data: addOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error)
      });
    });

    it("Should allow add many operators if caller is owner", async function() {
      let addOperatorFunc = web3ABI.encodeFunctionCall(
        abiAddMultipleOperatorFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: ownerHasOperator,
        to: HasOperatorInstance.address,
        value: 0,
        data: addOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject add many operators if caller is not owner", async function() {
      let addOperatorFunc = web3ABI.encodeFunctionCall(
        abiAddMultipleOperatorFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasOperatorInstance.address,
        value: 0,
        data: addOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });
  });

  describe("isOperator()", function() {
    it("Should allow call isOperator function from anyone", async function() {
      let addOperatorFunc = web3ABI.encodeFunctionCall(
        abiAddOperatorFunction,
        [candidateA]
      );

      await web3.eth.sendTransaction({from: ownerHasOperator, to: HasOperatorInstance.address, value: 0, data: addOperatorFunc, gas: 3000000});

      (await HasOperatorInstance.isOperator(candidateA)).should.equal(true);

      (await HasOperatorInstance.isOperator(candidateB)).should.equal(false);
    });
  });

  describe("removeOperator()", function() {
    it("Should allow remove an operator if caller is owner", async function() {
      let removeOperatorFunc = web3ABI.encodeFunctionCall(
        abiRemoveOperatorFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: ownerHasOperator,
        to: HasOperatorInstance.address,
        value: 0,
        data: removeOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject remove an operator if caller is not owner", async function() {
      let removeOperatorFunc = web3ABI.encodeFunctionCall(
        abiRemoveOperatorFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasOperatorInstance.address,
        value: 0,
        data: removeOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });

    it("Should allow remove many operators if caller is owner", async function() {
      let removeOperatorFunc = web3ABI.encodeFunctionCall(
        abiRemoveMultipleOperatorFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: ownerHasOperator,
        to: HasOperatorInstance.address,
        value: 0,
        data: removeOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject remove many operators if caller is not owner", async function() {
      let removeOperatorFunc = web3ABI.encodeFunctionCall(
        abiRemoveMultipleOperatorFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasOperatorInstance.address,
        value: 0,
        data: removeOperatorFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });
  });
});
