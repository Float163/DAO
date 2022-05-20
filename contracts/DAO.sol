//SPDX-License-Identifier: MIT

pragma solidity <0.9.0;

import "../contracts/m63.sol";

contract DAO {

    address public owner;
    address public chairMan;
    address public token;
    uint public daysVote;
    uint public quorum;
    mapping (address => uint256) private _balances;
    mapping (address => uint256) private _endVotes;    

    uint private numProposals = 0;

    mapping (uint => Proposal) proposals;

    struct Proposal {
        address contr;
        string func;
        string description;
        uint totalVotes;
        uint positiveVotes;
        uint endTime;
        bool isFinished;
        mapping (address => bool) voters;
    }

    constructor(address _chairMan, uint _days, uint _quorum, address _token) {
        owner = msg.sender;
        chairMan = _chairMan;
        daysVote = _days;
        quorum = _quorum;
        token = _token;
    }    

    function deposit (uint256 _amount) public {
        m63(token).transferFrom(msg.sender, address(this), _amount);
        _balances[msg.sender] += _amount;
    }

    function withdraw() public {
        require(_balances[msg.sender] > 0, "Not enough token");
        require(block.timestamp > _endVotes[msg.sender], "Active proposal");       
        m63(token).transfer(msg.sender, _balances[msg.sender]);                         
        _balances[msg.sender] = 0;        
    }


    function addProposal (address _contr, string memory _func, string memory _desc) public returns (uint) {
        require(chairMan == msg.sender, "Chairman only can create a proposal");
        uint proposalID = numProposals++; 
        Proposal storage p = proposals[proposalID];
        p.endTime = block.timestamp + 60 * 60 * 24 * daysVote;
        p.contr = _contr;
        p.func = _func;
        p.description = _desc;
        return proposalID;
    }

    function vote (uint _proposal, bool _vote) public {
        require(_balances[msg.sender] > 0, "Not enough token");        
        require(_proposal < numProposals, "Proposal not found");
        require(!proposals[_proposal].isFinished, "Proposal is already finished");
        require(!proposals[_proposal].voters[msg.sender], "Already voted");
        proposals[_proposal].totalVotes += _balances[msg.sender];
        if (_vote) {
            proposals[_proposal].positiveVotes += _balances[msg.sender];            
        }
        proposals[_proposal].voters[msg.sender] = true;
        if (_endVotes[msg.sender] < proposals[_proposal].endTime) {
            _endVotes[msg.sender] = proposals[_proposal].endTime;
        }
    }

    function finishProposal (uint256 _proposal, address _addr, uint _amount) public returns (bool) {
        require(_proposal < numProposals, "Proposal not found"); 
        bool result = true;       
        require(block.timestamp > proposals[_proposal].endTime  , "Time has not expired");
        require(!proposals[_proposal].isFinished, "Proposal is already finished");        
        if ((proposals[_proposal].totalVotes > (m63(token).totalSupply() * quorum / 100)) && (proposals[_proposal].positiveVotes > (proposals[_proposal].totalVotes - proposals[_proposal].positiveVotes))) {
            (result,) = proposals[_proposal].contr.call(abi.encodeWithSignature(proposals[_proposal].func, _addr, _amount));
        } 
        proposals[_proposal].isFinished = true;
        return result;
    }

}