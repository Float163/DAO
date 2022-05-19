import * as conf from "../config";
import { task } from "hardhat/config";
//string memory _symbol, uint256 _id, uint256 _amount, address _recipient, uint256 _nonce, uint8 v, bytes32 r, bytes32 s
task("finish", "Finish proposal")
    .addParam("proposal", "The proposal ID")
    .addParam("address", "The recipient address")                
    .addParam("amount", "The token amount")                            
    .setAction(async (taskArgs, { ethers }) => {
    let hardhatToken = await ethers.getContractAt(conf.CONTRACT_NAME, conf.CONTRACT_ADDR);
    const result = await hardhatToken.finishProposal(taskArgs.proposal, taskArgs.address, taskArgs.amount);
    console.log(result);
  });

  
export default {
  solidity: "0.8.4"
};
