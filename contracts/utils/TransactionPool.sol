pragma solidity ^0.4.24;

contract TransactionPool {
  struct Transaction {
    address writer;
    uint256 amount;
    bool canExecute;
  }

  mapping (uint256 => Transaction) internal pool;
  uint256 internal transactionCount;

  event Submission(
    uint256 indexed transactionId,
    address indexed sender,
    uint256 indexed amount
  );

  constructor() public {
    transactionCount = 0;
  }

  function addTransactionToPool(
    address _writer,
    uint256 _amount
  )
    internal
  {
    uint256 transactionId = transactionCount;
    pool[transactionId] = Transaction({
      writer: _writer,
      amount: _amount,
      canExecute: true
    });
    transactionCount += 1;
    emit Submission(transactionId, _writer, _amount);
  }

  function isTransactionValid(
    uint256 transactionId
  )
    internal
    view
    returns(bool)
  {
    return (transactionId < transactionCount);
  }
}
