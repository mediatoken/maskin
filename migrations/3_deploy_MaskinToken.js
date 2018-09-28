const Deputation = artifacts.require("./Deputation.sol");
const MaskinToken = artifacts.require("./MaskinToken.sol");


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
    await deployer.deploy(Deputation, {overwrite: overwrite}).then(function() {
      return deployer.deploy(MaskinToken, systemWallet, Deputation.address, {overwrite: overwrite});
    });
  }).then(() => {
    return MaskinToken.deployed();
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
};
