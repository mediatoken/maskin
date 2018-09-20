pragma solidity ^0.4.24;

import "../base-token/BurnableToken.sol";
import "./DelegateBurnable.sol";


// Treats all delegate functions exactly like the corresponding normal functions,
// e.g. delegateTransfer is just like transfer. See DelegateBurnable.sol for more on
// the delegation system.
contract DelegateToken is DelegateBurnable, BurnableToken {
  address public delegatedFrom;

  event DelegatedFromSet(address addr);

  // Only calls from appointed address will be processed
  modifier onlyMandator() {
    require(msg.sender == delegatedFrom);
    _;
  }

  function setDelegatedFrom(address _addr) public onlyOwner {
    delegatedFrom = _addr;
    emit DelegatedFromSet(_addr);
  }

  // each function delegateX is simply forwarded to function X
  function delegateTotalSupply(
  )
    public
    onlyMandator
    view
    returns (uint256)
  {
    return totalSupply();
  }

  function delegateBalanceOf(
    address _who
  )
    public
    onlyMandator
    view
    returns (uint256)
  {
    return balanceOf(_who);
  }

  function delegateTransfer(
    address _to,
    uint256 _value,
    address _origSender
  )
    public
    onlyMandator
    returns (bool)
  {
    _transfer(_origSender, _to, _value);
    return true;
  }

  function delegateAllowance(
    address _owner,
    address _spender
  )
    public
    onlyMandator
    view
    returns (uint256)
  {
    return allowance(_owner, _spender);
  }

  function delegateTransferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _origSender
  )
    public
    onlyMandator
    returns (bool)
  {
    _transferFrom(_from, _to, _value, _origSender);
    return true;
  }

  function delegateApprove(
    address _spender,
    uint256 _value,
    address _origSender
  )
    public
    onlyMandator
    returns (bool)
  {
    _approve(_spender, _value, _origSender);
    return true;
  }

  function delegateIncreaseApproval(
    address _spender,
    uint256 _addedValue,
    address _origSender
  )
    public
    onlyMandator
    returns (bool)
  {
    _increaseApproval(_spender, _addedValue, _origSender);
    return true;
  }

  function delegateDecreaseApproval(
    address _spender,
    uint256 _subtractedValue,
    address _origSender
  )
    public
    onlyMandator
    returns (bool)
  {
    _decreaseApproval(_spender, _subtractedValue, _origSender);
    return true;
  }

  function delegateBurn(
    address _origSender,
    uint256 _value,
    string _note
  )
    public
    onlyMandator
  {
    _burn(_origSender, _value , _note);
  }
}
