pragma solidity ^0.4.24;

import "../zeppelin/contracts/ownership/NoOwner.sol";


/**
 * @title NoOwner Ex
 * @dev Extension for the NoOwner contract, to support a case where
 * this contract's owner can't own ether or tokens.
 * Note that we *do* inherit reclaimContract from NoOwner: This contract
 * does have to own contracts, but it also has to be able to relinquish them
 **/
contract NoOwnerEx is NoOwner {
  function reclaimEther(address _to) external onlyOwner {
    _to.transfer(address(this).balance);
  }

  function reclaimToken(ERC20Basic token, address _to) external onlyOwner {
    uint256 balance = token.balanceOf(this);
    token.safeTransfer(_to, balance);
  }
}
