import ether from './ether.js';

const BigNumber = web3.BigNumber;

let MAX_UINT = (new BigNumber(2)).pow(256).minus(1);
let OVER_UINT = (new BigNumber(2)).pow(256);

function tokens(amount) {
  return (new BigNumber(10**18)).times(amount);
}

function roundDown(x) {
  return x.round(0, BigNumber.ROUND_DOWN);
}

function roundHalfUp(x) {
  return x.round(0, BigNumber.ROUND_HALF_UP);
}

module.exports.MAX_UINT = MAX_UINT;
module.exports.OVER_UINT = OVER_UINT;

module.exports.tokens = tokens;
module.exports.roundDown = roundDown;
module.exports.roundHalfUp = roundHalfUp;
