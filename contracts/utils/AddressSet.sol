pragma solidity ^0.4.24;

import "../zeppelin/contracts/ownership/Ownable.sol";


/**
 * @title Address Set.
 * @dev This contract allows to store addresses in a set and
 * owner can run a loop through all elements.
 **/
contract AddressSet is Ownable {
  mapping(address => bool) exist;
  address[] elements;

  /**
   * @dev Adds a new address to the set.
   * @param _addr Address to add.
   * @return True if succeed, otherwise false.
   */
  function add(address _addr) onlyOwner public returns (bool) {
    if (contains(_addr)) {
      return false;
    }

    exist[_addr] = true;
    elements.push(_addr);
    return true;
  }

  /**
   * @dev Checks whether the set contains a specified address or not.
   * @param _addr Address to check.
   * @return True if the address exists in the set, otherwise false.
   */
  function contains(address _addr) public view returns (bool) {
    return exist[_addr];
  }

  /**
   * @dev Gets an element at a specified index in the set.
   * @param _index Index.
   * @return A relevant address.
   */
  function elementAt(uint256 _index) onlyOwner public view returns (address) {
    require(_index < elements.length);

    return elements[_index];
  }

  /**
   * @dev Gets the number of elements in the set.
   * @return The number of elements.
   */
  function getTheNumberOfElements() onlyOwner public view returns (uint256) {
    return elements.length;
  }
}
