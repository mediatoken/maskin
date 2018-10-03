pragma solidity ^0.4.24;

import './access/HasAdmin.sol';
import './access/HasOperator.sol';
import './base-token/PausableToken.sol';
import './delegate/CanDelegateToken.sol';
import './delegate/DelegateToken.sol';
import './TraceableToken.sol';
import './WithdrawalToken.sol';
import './utils/MintPool.sol';


/**
 * @title Maskin token.
 * @dev Maskin is a ERC20 token that:
 *  - starts with 100 million tokens.
 *  - can pause and unpause token transfer (and authorization) actions.
 *  - mints new tokens when a new article is posted.
 *  - newly minted tokens will be distributed to:
 *    + article writer (e.g. 70%).
 *    + token holders (e.g. 20%).
 *    + system wallet (e.g. 10%).
 *  - can delegate to a new contract.
 *  - allows users to burn (redeem) tokens.
 *  - transferring tokens to 0x0 address is treated as burning.
 *  - can run a loop through its all holders.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - attempts to reject ether sent and allows any ether held to be transferred out.
 *  - allows the new owner to accept the ownership transfer, the owner can cancel the transfer if needed.
 **/
contract MaskinToken is HasAdmin, HasOperator, MintPool, CanDelegateToken, DelegateToken, TraceableToken, WithdrawalToken, PausableToken {
  string public name = "MaskinCoin";
  string public symbol = "MAS";

  uint8 public constant decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 100 * (10**6) * (10 ** uint256(decimals));

  address public wallet;  // system wallet
  event ChangeWallet(address indexed addr);
  event ChangeDeputation(address indexed addr);

  address public deputation;

  bool public initialMint;

  uint8 public holdersPaidRate;  // %
  uint8 public systemPaidRate;   // %
  uint8 public writerPaidRate;   // %
  event ChangePaidRates(uint8 systemPaidRate, uint8 writerPaidRate);

  event ConfirmMintRequest(uint256 mintRequestID);

  event Mint(address indexed to, uint256 value);

  constructor(address _wallet, address _deputation) public {
    wallet          = _wallet;
    deputation      = _deputation;

    systemPaidRate  = 10;
    writerPaidRate  = 70;
    holdersPaidRate = 20;

    initialMint     = false;
  }

  /**
   * @dev Throws if calling preMint is not in the first time.
   */
  modifier onlyOnInit() {
    require(initialMint == false);
    _;
  }

  /**
   * @dev Mints a initial amount of tokens for owner
   */
  function preMint() public onlyOwner onlyOnInit {
    _mint(msg.sender, INITIAL_SUPPLY);
    initialMint = true;
  }

  /**
   * @dev Mints a specified amount of tokens.
   * @param _writer Writer address.
   * @param _amount Amount of tokens.
   */
  function _mintExecute(
    address _writer,
    uint256 _amount
  )
    internal
  {
    uint256 _forWriter = _amount.mul(writerPaidRate).div(100);
    require(_forWriter > 0);
    _mint(_writer, _forWriter);

    uint256 _forHolders = _amount.mul(holdersPaidRate).div(100);
    if (_forHolders > 0) {
      _mint(deputation, _forHolders);
    }

    uint256 _forSystem = _amount.sub(_forWriter).sub(_forHolders);
    if (_forSystem > 0) {
      _mint(wallet, _forSystem);
    }

    emit Mint(_writer, _amount);
  }

  /**
   * @dev Allows an operator to submit a mint request whenever a writer posts a new article
   * @param _writer Writer address.
   * @param _amount Amount of tokens
   */
  function submitMintRequest(
    address _writer,
    uint256 _amount
  )
    public
    onlyOperator
  {
    _addMintRequest(_writer, _amount);
  }

  /**
   * @dev Allows Admin to execute a submitted mint request.
   * @param _mintRequestID mint request ID.
   */
  function confirmMintRequest(uint256 _mintRequestID)
    public
    onlyAdmin
  {
    require(_canMintRequest(_mintRequestID));
    address _writer;
    uint256 _amount;
    (_writer, _amount) = _getMintRequest(_mintRequestID);
    _mintExecute(_writer, _amount);
    _executedMintRequest(_mintRequestID);
    emit ConfirmMintRequest(_mintRequestID);
  }

  function changePaidRates(
    uint8 _systemPaidRate,
    uint8 _writerPaidRate
  )
    public
    onlyAdmin
  {
    require(_systemPaidRate < 100 && _writerPaidRate < 100);
    uint8 _tmp = _systemPaidRate + _writerPaidRate;
    require(_tmp <= 100);

    holdersPaidRate = 100 - _tmp;
    systemPaidRate  = _systemPaidRate;
    writerPaidRate  = _writerPaidRate;

    emit ChangePaidRates(_systemPaidRate, _writerPaidRate);
  }

  /**
   * @dev Change address of the system wallet.
   * @param _wallet The new wallet address.
   */
  function changeWallet(address _wallet) public onlyAdmin {
    require(_wallet != address(0), "new wallet cannot be 0x0");
    wallet = _wallet;

    emit ChangeWallet(_wallet);
  }

  /**
   * @dev Change address of the deputation.
   * @param _deputation The new deputation address.
   */
  function changeDeputation(address _deputation) public onlyAdmin {
    require(_deputation != address(0), "new deputation address cannot be 0x0");
    deputation = _deputation;

    emit ChangeDeputation(_deputation);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a new owner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) onlyOwner public {
    // do not allow self ownership
    require(_newOwner != address(this));
    super.transferOwnership(_newOwner);
  }
}
