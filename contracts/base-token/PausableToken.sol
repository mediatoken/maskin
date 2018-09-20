pragma solidity ^0.4.24;

import "../zeppelin/contracts/lifecycle/Pausable.sol";
import "./StandardToken.sol";


/**
 * @title Pausable token
 * @dev StandardToken modified with pausable transfers.
 **/
contract PausableToken is StandardToken, Pausable {

  function _transfer(
    address _from,
    address _to,
    uint256 _value
  )
    internal
    whenNotPaused
  {
    super._transfer(_from, _to, _value);
  }

  function _transferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _spender
  )
    internal
    whenNotPaused
  {
    super._transferFrom(_from, _to, _value, _spender);
  }

  function _approve(
    address _spender,
    uint256 _value,
    address _tokenHolder
  )
    internal
    whenNotPaused
  {
    super._approve(_spender, _value, _tokenHolder);
  }

  function _increaseApproval(
    address _spender,
    uint256 _addedValue,
    address _tokenHolder
  )
    internal
    whenNotPaused
  {
    super._increaseApproval(_spender, _addedValue, _tokenHolder);
  }

  function _decreaseApproval(
    address _spender,
    uint256 _subtractedValue,
    address _tokenHolder
  )
    internal
    whenNotPaused
  {
    super._decreaseApproval(_spender, _subtractedValue, _tokenHolder);
  }

  function _burn(
    address _burner,
    uint256 _value
  )
    internal
    whenNotPaused
  {
    super._burn(_burner, _value);
  }
}
