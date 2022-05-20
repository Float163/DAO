import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import * as conf from "../config";

let owner : SignerWithAddress;
let addr1 : SignerWithAddress;

async function main() {
  [owner, addr1] = await ethers.getSigners();

  const M63 = await ethers.getContractFactory("m63");
  const m63 = await M63.deploy('platinum', 'PL', 18, ethers.utils.parseEther('10'));
  await m63.deployed();
  console.log("Token deployed:", m63.address);  

  const mDAO = await ethers.getContractFactory("DAO");
  const DAO = await mDAO.deploy(owner.address, 3, 20, m63.address);
  console.log(owner.address);
  await DAO.deployed();

  console.log("DAO deployed to:", DAO.address);

  console.log(owner.address + ' : ' + m63.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
