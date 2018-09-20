pragma solidity ^0.4.24;

import "../base-token/BurnableToken.sol";
import "./DelegateBurnable.sol";


// See DelegateBurnable.sol for more on the delegation system.
contract CanDelegateToken is BurnableToken {
  // If this contract needs to be upgraded, the new contract will be stored
  // in 'delegate' and any BurnableToken calls to this contract will be delegated to that one.
  DelegateBurnable public delegate;

  event DelegateToNewContract(address indexed newContract);

  // Can undelegate by passing in _newContract = address(0)
  function delegateToNewContract(
    DelegateBurnable _newContract
  )
    public
    onlyOwner
  {
    delegate = _newContract;
    emit DelegateToNewContract(delegate);
  }

  // If a delegate has been designated, all ERC20 calls are forwarded to it
  function _transfer(address _from, address _to, uint256 _value) internal {
    if (!_hasDelegate()) {
      super._transfer(_from, _to, _value);
    } else {
      require(delegate.delegateTransfer(_to, _value, _from));
    }
  }

  function _transferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _spender
  )
    internal
  {
    if (!_hasDelegate()) {
      super._transferFrom(_from, _to, _value, _spender);
    } else {
      require(delegate.delegateTransferFrom(_from, _to, _value, _spender));
    }
  }

  function totalSupply() public view returns (uint256) {
    if (!_hasDelegate()) {
      return super.totalSupply();
    } else {
      return delegate.delegateTotalSupply();
    }
  }

  function balanceOf(address _who) public view returns (uint256) {
    if (!_hasDelegate()) {
      return super.balanceOf(_who);
    } else {
      return delegate.delegateBalanceOf(_who);
    }
  }

  function _approve(
    address _spender,
    uint256 _value,
    address _tokenHolder
  )
    internal
  {
    if (!_hasDelegate()) {
      super._approve(_spender, _value, _tokenHolder);
    } else {
      require(delegate.delegateApprove(_spender, _value, _tokenHolder));
    }
  }

  function allowance(
    address _owner,
    address _spender
  )
    public
    view
    returns (uint256)
  {
    if (!_hasDelegate()) {
      return super.allowance(_owner, _spender);
    } else {
      return delegate.delegateAllowance(_owner, _spender);
    }
  }

  function _increaseApproval(
    address _spender,
    uint256 _addedValue,
    address _tokenHolder
  )
    internal
  {
    if (!_hasDelegate()) {
      super._increaseApproval(_spender, _addedValue, _tokenHolder);
    } else {
      require(
        delegate.delegateIncreaseApproval(_spender, _addedValue, _tokenHolder)
      );
    }
  }

  function _decreaseApproval(
    address _spender,
    uint256 _subtractedValue,
    address _tokenHolder
  )
    internal
  {
    if (!_hasDelegate()) {
      super._decreaseApproval(_spender, _subtractedValue, _tokenHolder);
    } else {
      require(
        delegate.delegateDecreaseApproval(
          _spender,
          _subtractedValue,
          _tokenHolder)
      );
    }
  }

  function _burn(address _burner, uint256 _value, string _note) internal {
    if (!_hasDelegate()) {
      super._burn(_burner, _value, _note);
    } else {
      delegate.delegateBurn(_burner, _value , _note);
    }
  }

  function _hasDelegate() internal view returns (bool) {
    return !(delegate == address(0));
  }
}
