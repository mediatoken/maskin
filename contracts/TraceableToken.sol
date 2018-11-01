pragma solidity ^0.4.24;

import './access/HasAdmin.sol';
import './base-token/StandardToken.sol';
import './utils/AddressSet.sol';


/**
 * @title Traceable token.
 * @dev This contract allows a sub-class token contract to run a loop through its all holders.
 **/
contract TraceableToken is HasAdmin, StandardToken {
  AddressSet private _holderSet;

  constructor() public {
    _holderSet = new AddressSet();
  }

  /**
   * @dev Internal function that mints an amount of the token and assigns it to
   * an account. The target address should be added to the token holders list if needed.
   * @param _to Who got the tokens.
   * @param _amount Amount of tokens.
   */
  function _mint(
    address _to,
    uint256 _amount
  )
    internal
  {
    super._mint(_to, _amount);

    _checkTransferTarget(_to);
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    _checkTransferTarget(_to);

    super.transfer(_to, _value);
    return true;
  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    _checkTransferTarget(_to);

    super.transferFrom(_from, _to, _value);
    return true;
  }

  function getTheNumberOfHolders() public view returns (uint256) {
    return _holderSet.getTheNumberOfElements();
  }

  function getHolder(uint256 _index) public view returns (address) {
    return _holderSet.elementAt(_index);
  }

  function _checkTransferTarget(address _to) internal {
    if (!_holderSet.contains(_to)) {
      _holderSet.add(_to);
    }
  }
}
