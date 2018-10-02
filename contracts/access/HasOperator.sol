pragma solidity ^0.4.24;

import "../zeppelin/contracts/ownership/Ownable.sol";
import "../zeppelin/contracts/access/rbac/RBAC.sol";


contract HasOperator is Ownable, RBAC {
  string public constant ROLE_OPERATOR = "Operator";

  /**
   * @dev Throws if called by any account that is not in operator list.
   */
  modifier onlyOperator() {
    checkRole(msg.sender, ROLE_OPERATOR);
    _;
  }

  /**
   * @dev Add an address to operator list.
   * @param _operator Address to add.
   */
  function addOperator(address _operator)
    public
    onlyOwner
  {
    addRole(_operator, ROLE_OPERATOR);
  }

  /**
   * @dev Add addresses to operator list.
   * @param _operators Addresses to add.
   */
  function addOperator(address[] _operators)
    public
    onlyOwner
  {
    for (uint256 _i = 0; _i < _operators.length; _i++) {
      addOperator(_operators[_i]);
    }
  }

  /**
   * @dev Getter to determine if address is in operator list.
   */
  function isOperator(address _operator)
    public
    view
    returns (bool)
  {
    return hasRole(_operator, ROLE_OPERATOR);
  }

  /**
   * @dev Remove an address from operator list.
   * @param _operator Address to remove.
   */
  function removeOperator(address _operator)
    public
    onlyOwner
  {
    removeRole(_operator, ROLE_OPERATOR);
  }

  /**
   * @dev Remove addresses from operator list.
   * @param _operators Addresses to remove.
   */
  function removeOperator(address[] _operators)
    public
    onlyOwner
  {
    for (uint256 _i = 0; _i < _operators.length; _i++) {
      removeOperator(_operators[_i]);
    }
  }
}
