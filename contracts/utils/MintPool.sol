pragma solidity ^0.4.24;

contract MintPool {
  struct MintRequest {
    address writer;
    uint256 amount;
    bool canExecute;
  }

  mapping (uint256 => MintRequest) private pool;
  uint256 private mintRequestCount;

  event MintSubmission(
    uint256 indexed mintRequestID,
    address indexed sender,
    uint256 indexed amount
  );

  constructor() public {
    mintRequestCount = 0;
  }

  function _addMintRequest(
    address _writer,
    uint256 _amount
  )
    internal
  {
    require((_writer != 0) && (_amount > 0));
    uint256 mintRequestID = mintRequestCount;
    pool[mintRequestID] = MintRequest({
      writer: _writer,
      amount: _amount,
      canExecute: true
    });
    mintRequestCount += 1;
    emit MintSubmission(mintRequestID, _writer, _amount);
  }

  function _canMintRequest(
    uint256 mintRequestID
  )
    internal
    view
    returns(bool)
  {
    return ((mintRequestID < mintRequestCount) && (pool[mintRequestID].canExecute));
  }

  function _executedMintRequest(
    uint256 mintRequestID
  )
    internal
  {
    pool[mintRequestID].canExecute = false;
  }

  function _getMintRequest(
    uint256 mintRequestID
  )
    internal
    view
    returns(address, uint256)
  {
    return (pool[mintRequestID].writer, pool[mintRequestID].amount);
  }
}
