const web3ABI = require('web3-eth-abi');

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('../helpers/bignumber.js');

const HasAdmin = artifacts.require("./HasAdmin.sol");


contract('HasAdmin', function(accounts) {
  const ownerHasAdmin   = accounts[0];
  const candidateA      = accounts[1];
  const candidateB      = accounts[2];
  const candidateC      = accounts[3];
  const candidateD      = accounts[4];
  const candidateE      = accounts[5];
  const candidateF      = accounts[6];
  const guess           = accounts[7];

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

  const abiAddMultipleAdminFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operators",
        "type": "address[]"
      }
    ],
    "name": "addAdmin",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  const abiRemoveAdminFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operator",
        "type": "address"
      }
    ],
    "name": "removeAdmin",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  const abiRemoveMultipleAdminFunction = {
    "constant": false,
    "inputs": [
      {
        "name": "_operators",
        "type": "address[]"
      }
    ],
    "name": "removeAdmin",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  };

  var HasAdminInstance;

  beforeEach(async function () {
    HasAdminInstance  = await HasAdmin.new({from: ownerHasAdmin}).should.be.fulfilled;
    var web3 = HasAdmin.web3;
  });

  describe("addAdmin()", function() {
    it("Should allow add an admin if caller is owner", async function() {
      let addAdminFunc = web3ABI.encodeFunctionCall(
        abiAddAdminFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: ownerHasAdmin,
        to: HasAdminInstance.address,
        value: 0,
        data: addAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject add an admin if caller is not owner", async function() {
      let addAdminFunc = web3ABI.encodeFunctionCall(
        abiAddAdminFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasAdminInstance.address,
        value: 0,
        data: addAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error)
      });
    });

    it("Should allow add many admins if caller is owner", async function() {
      let addAdminFunc = web3ABI.encodeFunctionCall(
        abiAddMultipleAdminFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: ownerHasAdmin,
        to: HasAdminInstance.address,
        value: 0,
        data: addAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject add many admins if caller is not owner", async function() {
      let addAdminFunc = web3ABI.encodeFunctionCall(
        abiAddMultipleAdminFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasAdminInstance.address,
        value: 0,
        data: addAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });
  });

  describe("isAdmin()", function() {
    it("Should allow call isAdmin function from anyone", async function() {
      let addAdminFunc = web3ABI.encodeFunctionCall(
        abiAddAdminFunction,
        [candidateA]
      );

      await web3.eth.sendTransaction({from: ownerHasAdmin, to: HasAdminInstance.address, value: 0, data: addAdminFunc, gas: 3000000});

      (await HasAdminInstance.isAdmin(candidateA)).should.equal(true);

      (await HasAdminInstance.isAdmin(candidateB)).should.equal(false);
    });
  });

  describe("removeAdmin()", function() {
    it("Should allow remove an admin if caller is owner", async function() {
      let removeAdminFunc = web3ABI.encodeFunctionCall(
        abiRemoveAdminFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: ownerHasAdmin,
        to: HasAdminInstance.address,
        value: 0,
        data: removeAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject remove an admin if caller is not owner", async function() {
      let removeAdminFunc = web3ABI.encodeFunctionCall(
        abiRemoveAdminFunction,
        [candidateA]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasAdminInstance.address,
        value: 0,
        data: removeAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });

    it("Should allow remove many admins if caller is owner", async function() {
      let removeAdminFunc = web3ABI.encodeFunctionCall(
        abiRemoveMultipleAdminFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: ownerHasAdmin,
        to: HasAdminInstance.address,
        value: 0,
        data: removeAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNull(error);
      });
    });

    it("Should reject remove many admins if caller is not owner", async function() {
      let removeAdminFunc = web3ABI.encodeFunctionCall(
        abiRemoveMultipleAdminFunction,
        [[candidateA, candidateB, candidateC, candidateD, candidateE, candidateF]]
      );

      web3.eth.sendTransaction({
        from: guess,
        to: HasAdminInstance.address,
        value: 0,
        data: removeAdminFunc,
        gas: 3000000}, function(error, result) {
          assert.isNotNull(error);
      });
    });
  });
});
