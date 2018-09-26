export default function finney(n) {
  return new web3.BigNumber(web3.toWei(n, 'finney'))
}
