const BigNumber = web3.BigNumber;
const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const bn = require('../helpers/bignumber.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var owner = accounts[0];
  const investor = accounts[1];
  const otherInvestor = accounts[2];
  const investorBalance = bn.tokens(10);
  const burnNote = "burn coins"

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;

    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;

    await token.mint(investor, investorBalance, {from : owner}).should.be.fulfilled;
  });

  describe("burn()", function () {
    it('Should reject if burning amount is greater than balance of investor', async function () {
      let _burningAmount = investorBalance + bn.tokens(9);
      await token.burn(_burningAmount, burnNote, {from : investor}).should.be.rejected;
    });

    it('Should allow if burning amount is less than balance of investor', async function () {
      let _burningAmount = investorBalance - bn.tokens(9);
      await token.burn(_burningAmount, burnNote, {from : investor}).should.be.fulfilled;
      let _restBalance = await token.balanceOf(investor);
      investorBalance.minus(_burningAmount).should.be.bignumber.equal(_restBalance);
    });

    it('Should allow if burning amount is equal 0', async function () {
      let _burningAmount = 0;
      await token.burn(_burningAmount, burnNote, {from : investor}).should.be.fulfilled;
      let _restBalance = await token.balanceOf(investor);
      investorBalance.should.be.bignumber.equal(_restBalance);
    });

    it('Should allow if burning amount is equal than balance of investor', async function () {
      let _burningAmount = await token.balanceOf(investor);
      await token.burn(_burningAmount, burnNote, {from : investor}).should.be.fulfilled;
      let _restBalance = await token.balanceOf(investor);

      _restBalance.should.be.bignumber.equal(0);
    });

    it('Should reject if burning amount is max uint', async function () {
      let _burningAmount = bn.MAX_UINT;
      await token.burn(_burningAmount, burnNote, {from : investor}).should.be.rejected;
    });

    it('Should log events', async function () {
      let _burningAmount = investorBalance - bn.tokens(9);
      let { logs } = await token.burn(_burningAmount, burnNote, {from : investor});
      // Transfer
      let _event = logs.find(e => e.event === 'Transfer');
        (_event.args.from).should.equal(investor);
        (_event.args.to).should.equal('0x0000000000000000000000000000000000000000');
        (_event.args.value).should.be.bignumber.equal(_burningAmount);
      // Burn
      _event = logs.find(e => e.event === 'Burn');
      (_event.args.burner).should.equal(investor);
      (_event.args.value).should.be.bignumber.equal(_burningAmount);
    });

  });

}


module.exports.check = check;
