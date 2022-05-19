// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Bridge ontract", function () {
  // Mocha has four functions that let you hook into the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Mp : ContractFactory;
  let TokenERC20 : ContractFactory;
 
  let dao : Contract;
  let token: Contract;
  let owner : SignerWithAddress;
  let chair : SignerWithAddress;
  let addr1 : SignerWithAddress;  
  let addr2 : SignerWithAddress;
  let addr3 : SignerWithAddress;

  beforeEach(async function () {
    [owner, chair, addr1, addr2, addr3 ] = await ethers.getSigners();    
    TokenERC20 = await ethers.getContractFactory("m63");    
    token = await TokenERC20.deploy('platinum', 'PL', 18, ethers.utils.parseEther('0'));    
    Mp = await ethers.getContractFactory("DAO");
    dao = await Mp.deploy(chair.address, 3, 20, token.address);    
    await token.mint(addr1.address, ethers.utils.parseEther('100'));
    await token.mint(addr2.address, ethers.utils.parseEther('100'));    
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dao.owner()).to.equal(owner.address);
    });
  });

  describe("Transactions", function () { 
    
    it("Should add proposal", async function () {
        await dao.connect(chair).addProposal(token.address, "mint", "test proposal");
      });

    it("Should fail add proposal if not chair", async function () {
        await expect(dao.addProposal(token.address, "mint", "test proposal")).revertedWith("Chairman only can create a proposal");
    });

    it("Should deposit token", async function () {
        await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
        await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("60"));      
        expect(await token.balanceOf(dao.address)).to.equal(ethers.utils.parseEther("40"));              
    });

    it("Should vote", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");      
      await dao.connect(addr1).vote(0, true);
    });

    it("Should fail vote if not deposit", async function () {
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");      
      await expect(dao.connect(addr1).vote(0, true)).to.be.revertedWith("Not enough token");
    });

    it("Should fail vote proposal not found", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await expect(dao.connect(addr1).vote(1, true)).to.be.revertedWith("Proposal not found");
    });

    it("Should fail vote if already voted", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");      
      await dao.connect(addr1).vote(0, true);
      await expect(dao.connect(addr1).vote(0, false)).to.be.revertedWith("Already voted");
    });


    it("Should withdraw", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(addr1).withdraw();      
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100"));      
      expect(await token.balanceOf(dao.address)).to.equal(ethers.utils.parseEther("0"));              
    });

    it("Should fail withdraw if not enough token", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(addr1).withdraw();      
      await expect(dao.connect(addr1).withdraw()).to.be.revertedWith("Not enough token");            
    });


    it("Should fail withdraw if active proposal", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");      
      await dao.connect(addr1).vote(0, true);
      await expect(dao.connect(addr1).withdraw()).to.be.revertedWith("Active proposal");            
    });

    it("Should finish proposal", async function () {
      await dao.connect(chair).addProposal(token.address, "mint(address _to, uint256 _amount)", "test proposal");   
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100"));            
    });

    it("Should finish proposal with execute function", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('100'));
      await token.connect(addr2).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr2).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint(address,uint256)", "test proposal");   
      await dao.connect(addr1).vote(0, true);
      await dao.connect(addr2).vote(0, false); 
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("50"));            
    });

    it("Should finish proposal without execute function", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('100'));
      await token.connect(addr2).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr2).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint(address,uint256)", "test proposal");   
      await dao.connect(addr1).vote(0, false);
      await dao.connect(addr2).vote(0, true);            
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("0"));            
    });

    it("Should finish proposal without execute function - no quorum", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('5'));
      await token.connect(addr2).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr2).deposit(ethers.utils.parseEther('5'));
      await dao.connect(chair).addProposal(token.address, "mint(address,uint256)", "test proposal");   
      await dao.connect(addr1).vote(0, false);
      await dao.connect(addr2).vote(0, true);            
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("95"));            
    });

    it("Should withdraw after finish proposal", async function () {
      await token.connect(addr1).approve(dao.address, ethers.utils.parseEther('100'));
      await dao.connect(addr1).deposit(ethers.utils.parseEther('40'));
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");      
      await dao.connect(addr1).vote(0, true);
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).withdraw();      
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100"));      
      expect(await token.balanceOf(dao.address)).to.equal(ethers.utils.parseEther("0"));              
    });

    it("Should fail finish proposal by time", async function () {
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");  
      await expect(dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"))).to.be.revertedWith("Time has not expired");            
    });

    it("Should fail finish proposal if already finished", async function () {
      await dao.connect(chair).addProposal(token.address, "mint", "test proposal");   
      await ethers.provider.send('evm_increaseTime', [(3 * 60 * 60 * 24 + 10)]);
      await ethers.provider.send('evm_mine', []);
      await dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"));
      await expect(dao.connect(addr1).finishProposal(0, addr1.address, ethers.utils.parseEther("50"))).to.be.revertedWith("Proposal is already finished");            
    });

  });

});