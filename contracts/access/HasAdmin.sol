pragma solidity ^0.4.24;

import "../zeppelin/contracts/ownership/Ownable.sol";
import "../zeppelin/contracts/access/rbac/RBAC.sol";


contract HasAdmin is Ownable, RBAC {
  string public constant ROLE_ADMIN = "Admin";

  /**
   * @dev Throws if called by any account that is not in admin list.
   */
  modifier onlyAdmin() {
    checkRole(msg.sender, ROLE_ADMIN);
    _;
  }

  /**
   * @dev Add an address to admin list.
   * @param _operator Address to add.
   */
  function addAdmin(address _operator)
    public
    onlyOwner
  {
    addRole(_operator, ROLE_ADMIN);
  }

  /**
   * @dev Add addresses to admin list.
   * @param _operators Addresses to add.
   */
  function addAdmin(address[] _operators)
    public
    onlyOwner
  {
    for (uint256 _i = 0; _i < _operators.length; _i++) {
      addAdmin(_operators[_i]);
    }
  }

  /**
   * @dev Getter to determine if address is in admin list.
   */
  function isAdmin(address _operator)
    public
    view
    returns (bool)
  {
    return hasRole(_operator, ROLE_ADMIN);
  }

  /**
   * @dev Remove an address from admin list.
   * @param _operator Address to remove.
   */
  function removeAdmin(address _operator)
    public
    onlyOwner
  {
    removeRole(_operator, ROLE_ADMIN);
  }

  /**
   * @dev Remove addresses from admin list.
   * @param _operators Addresses to remove.
   */
  function removeAdmin(address[] _operators)
    public
    onlyOwner
  {
    for (uint256 _i = 0; _i < _operators.length; _i++) {
      removeAdmin(_operators[_i]);
    }
  }
}
