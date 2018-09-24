pragma solidity ^0.4.24;

import './MaskinToken.sol';

/*
 * This contract holds tokens which will be transferred to all holders in the future
 */
contract Deputation {
  MaskinToken private token;

  event SetToken(address indexed maskinToken);
  event FundsDistributed(address[] holders, uint256[] amounts);

  constructor() public {
    // Nothing to do now
  }

  /**
   * @dev Set MaskinToken point to.
   */
  function setToken(MaskinToken _token) public {
    token = _token;
    emit SetToken(_token);
  }

  /**
   * @dev Allows transfer token from a given address to any addresses
   * @param _holders List of addresses token transferred to
   * @param _amounts Amount of token which each address will be received respectively.
   */
  function distribute(address[] _holders, uint256[] _amounts) public {
    uint256 _totalReceiver = _holders.length;
    require(_totalReceiver == _amounts.length);
    for(uint256 _i = 0; _i < _totalReceiver; _i++) {
      if(_amounts[_i] > 0) {
        token.transfer(_holders[_i], _amounts[_i]);
      }
    }
    emit FundsDistributed(_holders, _amounts);
  }
}