pragma solidity ^0.4.24;

import './MaskinToken.sol';

/*
 * This contract holds tokens which will be transferred to all holders in the future
 */
contract Archive {
  MaskinToken private token;

  event SetMaskinToken(address indexed maskinToken);

  constructor() public {
    // Nothing to do now
  }

  /**
   * @dev Set MaskinToken point to.
   */
  function setMaskinToken(MaskinToken _token) public {
    token = _token;
    emit SetMaskinToken(_token);
  }

  /**
   * @dev Allows transfer token from a given address to any addresses
   * @param _holders List of addresses token transferred to
   * @param _amount Amount of token which each address will be received respectively.
   */
  function distribute(address[] _holders, uint256[] _amount) public {
    token._distribute(address(this), _holders, _amount);
  }
}
