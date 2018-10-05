pragma solidity ^0.4.24;

import "../zeppelin/contracts/math/SafeMath.sol";
import "../ownership/ClaimableEx.sol";


// A wrapper around the balances mapping.
contract BalanceSheet is ClaimableEx {
  using SafeMath for uint256;

  mapping (address => uint256) private _balances;

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return _balances[_owner];
  }

  function addBalance(address _addr, uint256 _value) public onlyOwner {
    _balances[_addr] = _balances[_addr].add(_value);
  }

  function subBalance(address _addr, uint256 _value) public onlyOwner {
    _balances[_addr] = _balances[_addr].sub(_value);
  }

  function setBalance(address _addr, uint256 _value) public onlyOwner {
    _balances[_addr] = _value;
  }

  function setBalanceBatch(address[] _addr, uint256[] _value) public onlyOwner {
    uint256 _count = _addr.length;
    require(_count == _value.length);
    for(uint256 _i = 0; _i < _count; _i++) {
      _balances[_addr[_i]] = _value[_i];
    }
  }
}
