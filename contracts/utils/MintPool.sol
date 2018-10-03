pragma solidity ^0.4.24;

contract MintPool {
  struct MintRequest {
    address writer;
    uint256 amount;
    bool isExecuted;
  }

  mapping (uint256 => MintRequest) private _pool;
  uint256 public mintRequestCount;

  event MintSubmission(
    uint256 indexed mintRequestID,
    address indexed sender,
    uint256 indexed amount
  );

  constructor() public {
    mintRequestCount = 0;
  }

  /**
   * @dev Add a mint request to pool
   * @param _writer Writer address
   * @param _amount Amount of tokens
   */
  function _addMintRequest(
    address _writer,
    uint256 _amount
  )
    internal
  {
    require((_writer != 0) && (_amount > 0));

    uint256 mintRequestID = mintRequestCount;
    _pool[mintRequestID] = MintRequest({
      writer: _writer,
      amount: _amount,
      isExecuted: false
    });
    mintRequestCount += 1;

    emit MintSubmission(mintRequestID, _writer, _amount);
  }

  /**
   * @dev Check mint request ID is valid before executing mint function
   * @param _mintRequestID mint request ID
   */
  function _canExecuteMinting(
    uint256 _mintRequestID
  )
    internal
    view
    returns(bool)
  {
    return ((_mintRequestID < mintRequestCount) && (_pool[_mintRequestID].isExecuted == false));
  }

  /**
   * @dev Specify a mint request ID is already executed
   * @param _mintRequestID mint request ID
   */
  function _mintExecuted(
    uint256 _mintRequestID
  )
    internal
  {
    _pool[_mintRequestID].isExecuted = true;
  }

  /**
   * @dev Allows get information of a mint request ID
   * @param _mintRequestID mint request ID
   */
  function getMintRequest(
    uint256 _mintRequestID
  )
    public
    view
    returns(address, uint256, bool)
  {
    require(_mintRequestID < mintRequestCount);

    return (_pool[_mintRequestID].writer, _pool[_mintRequestID].amount, _pool[_mintRequestID].isExecuted);
  }
}
