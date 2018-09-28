const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const SaveMath = artifacts.require("./zeppelin/contracts/math/SafeMath.sol");


module.exports = function(deployer, network) {
  let overwrite = true;

  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  deployer.then (async () => {
    await deployer.deploy(SaveMath);
    await deployer.link(SaveMath, BalanceSheet);
    return deployer.deploy(BalanceSheet, {overwrite: overwrite});
  }).then(() => {
      return BalanceSheet.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
