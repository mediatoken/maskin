pragma solidity ^0.4.24;

import "./base-token/BurnableToken.sol";


// This allows a token to treat transfer(0x0, value) as burn(value). This
// is useful for users of standard wallet programs which have transfer
// functionality built in but not the ability to burn.
contract WithdrawalToken is BurnableToken {
  function _transfer(address _from, address _to, uint256 _value) internal {
    if (_to == address(0)) {
      burn(_value, '');
    } else {
      super._transfer(_from, _to, _value);
    }
  }

  // StandardToken's transferFrom doesn't have to check for
  // _to != 0x0, but we do because we redirect 0x0 transfers to burns, but
  // we do not redirect transferFrom
  function _transferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _spender
  ) internal {
    require(_to != address(0), "_to address is 0x0");
    super._transferFrom(_from, _to, _value, _spender);
  }
}
