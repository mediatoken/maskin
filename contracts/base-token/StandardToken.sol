pragma solidity ^0.4.24;

import "../zeppelin/contracts/math/SafeMath.sol";
import "../zeppelin/contracts/token/ERC20/ERC20.sol";
import "../ownership/ClaimableEx.sol";
import "../ownership/NoOwnerEx.sol";
import "./BalanceSheet.sol";


/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * A version of OpenZeppelin's StandardToken whose balances mapping has been replaced
 * with a separate BalanceSheet contract. Most useful in combination with e.g.
 * HasNoContracts because then it can relinquish its balance sheet to a new
 * version of the token, removing the need to copy over balances.
 **/
contract StandardToken is ClaimableEx, NoOwnerEx, ERC20 {
  using SafeMath for uint256;

  uint256 private _totalSupply;

  BalanceSheet private _balances;
  event BalanceSheetSet(address indexed sheet);

  mapping (address => mapping (address => uint256)) private _allowed;

  constructor() public {
    _totalSupply = 0;
  }

  /**
   * @dev Total number of tokens in existence
   */
  function totalSupply() public view returns (uint256) {
    return _totalSupply;
  }

  /**
   * @dev Gets the balance of the specified address.
   * @param _owner The address to query the the balance of.
   * @return An uint256 representing the amount owned by the passed address.
   */
  function balanceOf(address _owner) public view returns (uint256 balance) {
    return _balances.balanceOf(_owner);
  }

  /**
   * @dev Claim ownership of the BalanceSheet contract
   * @param _sheet The address of the BalanceSheet to claim.
   */
  function setBalanceSheet(address _sheet) public onlyOwner returns (bool) {
    _balances = BalanceSheet(_sheet);
    _balances.claimOwnership();
    emit BalanceSheetSet(_sheet);
    return true;
  }

  /**
   * @dev Transfer token for a specified address
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    _transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Transfer tokens from one address to another
   * @param _from The address which you want to send tokens from
   * @param _to The address which you want to transfer to
   * @param _value The amount of tokens to be transferred
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    _transferFrom(_from, _to, _value, msg.sender);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    _approve(_spender, _value, msg.sender);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(
    address _owner,
    address _spender
  )
    public
    view
    returns (uint256)
  {
    return _allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    _increaseApproval(_spender, _addedValue, msg.sender);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    _decreaseApproval(_spender, _subtractedValue, msg.sender);
    return true;
  }

  function _approve(
    address _spender,
    uint256 _value,
    address _tokenHolder
  )
    internal
  {
    _allowed[_tokenHolder][_spender] = _value;

    emit Approval(_tokenHolder, _spender, _value);
  }

  /**
   * @dev Internal function that burns an amount of the token of a given
   * account.
   * @param _burner The account whose tokens will be burnt.
   * @param _value The amount that will be burnt.
   */
  function _burn(address _burner, uint256 _value) internal {
    require(_burner != 0);
    require(_value <= balanceOf(_burner), "not enough balance to burn");

    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure
    _balances.subBalance(_burner, _value);
    _totalSupply = _totalSupply.sub(_value);

    emit Transfer(_burner, address(0), _value);
  }

  function _decreaseApproval(
    address _spender,
    uint256 _subtractedValue,
    address _tokenHolder
  )
    internal
  {
    uint256 _oldValue = _allowed[_tokenHolder][_spender];
    if (_subtractedValue >= _oldValue) {
      _allowed[_tokenHolder][_spender] = 0;
    } else {
      _allowed[_tokenHolder][_spender] = _oldValue.sub(_subtractedValue);
    }

    emit Approval(_tokenHolder, _spender, _allowed[_tokenHolder][_spender]);
  }

  function _increaseApproval(
    address _spender,
    uint256 _addedValue,
    address _tokenHolder
  )
    internal
  {
    _allowed[_tokenHolder][_spender] = (
      _allowed[_tokenHolder][_spender].add(_addedValue));

    emit Approval(_tokenHolder, _spender, _allowed[_tokenHolder][_spender]);
  }

  /**
   * @dev Internal function that mints an amount of the token and assigns it to
   * an account. This encapsulates the modification of balances such that the
   * proper events are emitted.
   * @param _account The account that will receive the created tokens.
   * @param _amount The amount that will be created.
   */
  function _mint(address _account, uint256 _amount) internal {
    require(_account != 0);

    _totalSupply = _totalSupply.add(_amount);
    _balances.addBalance(_account, _amount);

    emit Transfer(address(0), _account, _amount);
  }

  function _transfer(address _from, address _to, uint256 _value) internal {
    require(_to != address(0), "to address cannot be 0x0");
    require(_from != address(0),"from address cannot be 0x0");
    require(_value <= balanceOf(_from), "not enough balance to transfer");

    // SafeMath.sub will throw if there is not enough balance.
    _balances.subBalance(_from, _value);
    _balances.addBalance(_to, _value);

    emit Transfer(_from, _to, _value);
  }

  function _transferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _spender
  )
    internal
  {
    uint256 _allowance = _allowed[_from][_spender];
    require(_value <= _allowance, "not enough allowance to transfer");

    _allowed[_from][_spender] = _allowed[_from][_spender].sub(_value);
    _transfer(_from, _to, _value);
  }
}
