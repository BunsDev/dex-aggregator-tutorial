import { usdcAddress } from '../constants'
const IERC20 = artifacts.require("IERC20");

const toUSDC = (num) => web3.utils.toWei(num.toString(), "mwei")
const fromUSDC = (num) => web3.utils.fromWei(num.toString(), "mwei")

module.exports = async function (callback) {
	try {
		const deployer = "0xFd63Bf84471Bc55DD9A83fdFA293CCBD27e1F4C8"
		// Accounts given to us by ganache
		const accounts = await web3.eth.getAccounts()
		const usdc = new web3.eth.Contract(IERC20.abi, usdcAddress)
		// Fetch unlocked account and first development account usdc balances
		const balanceUnlocked = await usdc.methods.balanceOf(deployer).call()
		const balanceDev = await usdc.methods.balanceOf(accounts[0]).call()
		console.log(`Unlocked account usdc balance before transfer ${fromUSDC(balanceUnlocked)}`)
		console.log(`First dev account usdc balance before transfer ${fromUSDC(balanceDev)}`)
		// Transfer unlocked accounts usdc balance to the first development account
		await usdc.methods.transfer(accounts[0], balanceUnlocked).send({from: deployer})
		// Fetch new development usdc balance 
		const newBalanceDev = await usdc.methods.balanceOf(accounts[0]).call()
		const newBalanceUnlocked = await usdc.methods.balanceOf(deployer).call()
		console.log(`Unlocked account usdc balance after transfer ${fromUSDC(newBalanceUnlocked)}`)
		console.log(`First dev account usdc balance after transfer ${fromUSDC(newBalanceDev)}`)
	}
	catch (error) {
		console.log(error)
	}
	callback()
}