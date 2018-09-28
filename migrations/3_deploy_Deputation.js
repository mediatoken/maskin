const Deputation = artifacts.require("./Deputation.sol");


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
    return deployer.deploy(Deputation, {overwrite: overwrite});
  }).then(() => {
      return Deputation.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
