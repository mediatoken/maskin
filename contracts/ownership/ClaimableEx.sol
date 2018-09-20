pragma solidity ^0.4.24;

import "../zeppelin/contracts/ownership/Claimable.sol";


/**
 * @title Claimable Ex
 * @dev Extension for the Claimable contract, where the ownership transfer can be canceled.
 */
contract ClaimableEx is Claimable {
  /*
   * @dev Cancels the ownership transfer.
   */
  function cancelOwnershipTransfer() onlyOwner public {
    pendingOwner = owner;
  }
}
