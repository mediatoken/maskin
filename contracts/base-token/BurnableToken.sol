pragma solidity ^0.4.24;

import "./StandardToken.sol";


/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 **/
contract BurnableToken is StandardToken {
  event Burn(address indexed burner, uint256 value, string note);

  /**
   * @dev Burns a specific amount of tokens.
   * @param _value The amount of token to be burned.
   * @param _note a note that burner can attach.
   */
  function burn(uint256 _value, string _note) public returns (bool) {
    _burn(msg.sender, _value, _note);

    return true;
  }

  /**
   * @dev Burns a specific amount of tokens of an user.
   * @param _burner Who has tokens to be burned.
   * @param _value The amount of tokens to be burned.
   * @param _note a note that the manager can attach.
   */
  function _burn(
    address _burner,
    uint256 _value,
    string _note
  )
    internal
  {
    _burn(_burner, _value);

    emit Burn(_burner, _value, _note);
  }
}
