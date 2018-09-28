const MaskinToken = artifacts.require("./MaskinToken.sol");
const SaveMath = artifacts.require("./zeppelin/contracts/math/SafeMath.sol");

module.exports = function(deployer, network, accounts) {
  let overwrite = true;
  let systemWallet = accounts[5];
  let deputation = accounts[6];

  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  deployer.then (async () => {
      await deployer.link(SaveMath, MaskinToken);
      return deployer.deploy(MaskinToken, systemWallet, deputation, {overwrite: overwrite});
  }).then(() => {
      return MaskinToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
