import { soulAddress, joeAddress, wavaxAddress, usdcAddress } from '../constants'
const DexAggregator = artifacts.require("DexAggregator")
const IERC20 = artifacts.require("IERC20")
const futureTime = (seconds) => {
    return (+Math.floor(new Date().getTime()/1000.0) + +seconds)
} 
const toWei = (num) => web3.utils.toWei(num.toString(), "Ether")
const fromWei = (num) => web3.utils.fromWei(num.toString())
const toUSDC = (num) => web3.utils.toWei(num.toString(), "mwei")
const fromUSDC = (num) => web3.utils.fromWei(num.toString(), "mwei")


require('chai')
	.use(require('chai-as-promised'))
	.should()

contract('DexAggregator', ([deployer, user]) => {

	let dexAggregator, usdcRef
    let pairArray 
    let SETTINGS = {
        gasLimit: 6000000, // Override gas settings: https://github.com/ethers-io/ethers.js/issues/469
        gasPrice: web3.utils.toWei('50', 'Gwei'),
        from: deployer, 
        value: toWei(1) // Amount of Ether to Swap
    }

	beforeEach(async () => {
		dexAggregator = await DexAggregator.new()
        usdcRef = new web3.eth.Contract(IERC20.abi, usdcAddress)
	})

    describe('deployment', () => {
        let result
        it('tracks the correct soul router address', async () => {
            result = await dexAggregator.Dexes(0)
            result.toString().should.equal(soulAddress.toString())
        })
        it('tracks the correct joe router address', async () => {
            result = await dexAggregator.Dexes(1)
            result.toString().should.equal(joeAddress.toString())
        })
        it('tracks the correct usdc address', async () => {
            result = await dexAggregator.usdc()
            result.toString().should.equal(usdcAddress.toString())
        }) 
        it('tracks the correct wavax address', async () => {
            result = await dexAggregator.wavaxAddress()
            result.toString().should.equal(wavaxAddress.toString())
        })
    })
    describe("getOutputAmounts", () => {
		let result
		let usdcAmount = toUSDC(1000)
        let avaxAmount = toWei(1)
        let soulUSDCAmount, joeUSDCAmount, soulAVAXAmount, joeAVAXAmount
		it("gets index of exchange with best USDC price and output amounts from both exchanges for AVAX to USDC swap", async () => {
			result = await dexAggregator.getOutputAmounts(avaxAmount, [wavaxAddress, usdcAddress])
            const indexOfDexWithBestPrice = result[0]
            const amounts = result[1]
            expect(+(amounts[0].toString())).to.be.greaterThan(+(amounts[1].toString()))
            if(indexOfDexWithBestPrice == 0) {
                expect(indexOfDexWithBestPrice.toString()).to.equal('0')
                console.log(`SoulSwap offers the best AVAX to USDC rate`)
                soulUSDCAmount = amounts[0]
                joeUSDCAmount = amounts[1]
            } else {
                expect(indexOfDexWithBestPrice.toString()).to.equal('1')
                console.log(`SoulSwap offers the best AVAX to USDC rate`)
                soulUSDCAmount = amounts[1]
                joeUSDCAmount = amounts[0]
            }
			soulUSDCAmount.toString().length.should.be.at.least(1, 'did not fetch USDC output value for SoulSwap')
            console.log(`SoulSwap converts 1 AVAX to ${fromUSDC(soulUSDCAmount)} USDC`)
			joeUSDCAmount.toString().length.should.be.at.least(1, 'did not fetch USDC output value for JoeSwap')
			console.log(`JoeSwap converts 1 AVAX to ${fromUSDC(joeUSDCAmount)} USDC`)
		})
		it("gets index of exchange with best AVAX price and output amounts from both exchanges for USDC to AVAX swap", async () => {
			result = await dexAggregator.getOutputAmounts(usdcAmount, [usdcAddress, wavaxAddress])
            const indexOfDexWithBestPrice = result[0]
            const amounts = result[1]
            expect(+(amounts[0].toString())).to.be.greaterThan(+(amounts[1].toString()))
            if(indexOfDexWithBestPrice == 0) {
                expect(indexOfDexWithBestPrice.toString()).to.equal('0')
                console.log(`SoulSwap offers the best USDC to AVAX rate`)
                soulAVAXAmount = amounts[0]
                joeAVAXAmount = amounts[1]
            } else {
                expect(indexOfDexWithBestPrice.toString()).to.equal('1')
                console.log(`SoulSwap offers the best USDC to AVAX rate`)
                soulAVAXAmount = amounts[1]
                joeAVAXAmount = amounts[0]
            }
			soulAVAXAmount.toString().length.should.be.at.least(1, 'did not fetch AVAX output value for soulSwap')
            console.log(`SoulSwap converts 1000 USDC to ${fromWei(soulAVAXAmount)} AVAX`)
			joeAVAXAmount.toString().length.should.be.at.least(1, 'did not fetch AVAX output value for joeSwap')
			console.log(`JoeSwap converts 1000 USDC to ${fromWei(joeAVAXAmount)} AVAX`)
		})
	})
    describe('buyUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let highestUSDCOutput 
        let nextBestUsdcOutput
        let avaxAmountSold = toWei(1)
        beforeEach(async () => {
            // start: native and usdc pre-swap
            ethBalance = await web3.eth.getBalance(user) // BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()

            // gets: USDC amount for 1 AVAX from each exchange
            result = await dexAggregator.getOutputAmounts(avaxAmountSold, [wavaxAddress, usdcAddress])

            // Create an object with the exchange with the highest output and highest output value
            result[0].toString() == "0"
            ? highestUSDCOutput = {amount: result[1][0], dex: soulAddress}
            : highestUSDCOutput = {amount: result[1][0], dex: joeAddress}
            
            nextBestUsdcOutput = result[1][1]
            //swap 1 AVAX for USDC
            result = await dexAggregator.buyUSDCAtBestPrice(futureTime(15), [wavaxAddress, usdcAddress], {value: avaxAmountSold, from: user })
        }) 
        it('Routes AVAX to USDC swap to the exchange with highest output', async () => {
            console.log(`START AVAX BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should increase by the highestUSDCOutput
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcAdded = +usdcBalance.toString() + +highestUSDCOutput.amount.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcAdded)
            // Users new AVAX balance should decrease by approximatly avaxAmountSold
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW AVAX BALANCE: ${fromWei(newEthBalance)}`)
            const ethSubtracted = +ethBalance.toString() - +avaxAmountSold.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethSubtracted)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethSubtracted).toString()}`)
            // fail case: reverts when the user inputs the wrong traiding pair array
            await dexAggregator.buyUSDCAtBestPrice(futureTime(15), [usdcAddress, wavaxAddress], {value: 1, from: user }).should.be.rejected;
        }) 
        it('successfully refunds leftover AVAX from the swap', async () => {
            // Aggregator Avax balance should be zero
            const dexAggregatorAvaxBalance = await usdcRef.methods.balanceOf(dexAggregator.address).call()
            expect((dexAggregatorAvaxBalance).toString()).to.equal('0')
        })
        it('emits a "USDCBought" event', () => {
            const log = result.logs[0]
            log.event.should.eq('USDCBought')
            const event = log.args
            event.avaxAmountSold.toString().should.equal(avaxAmountSold.toString())
            // Amount of USDC bought should equal the highest ouput offered
            event.usdcAmountBought.toString().should.equal(highestUSDCOutput.amount.toString())
            // Router should equal the router exchange address that offered highest Ooutput
            event.dex.toString().should.equal(highestUSDCOutput.dex.toString())
            event.nextBestUsdcOutput.toString().should.equal(nextBestUsdcOutput.toString())
          }) 
    })

    describe('sellUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let highestAvaxOutput 
        let nextBestAvaxOutput
        let usdcAmountSold = toUSDC(1000)
        beforeEach(async () => {
            // start native and usdc balance (pre-swap).
            ethBalance = await web3.eth.getBalance(user) //BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()

            //get AVAX amount for 1000 USDC from each exchange.
            result = await dexAggregator.getOutputAmounts(usdcAmountSold, [usdcAddress, wavaxAddress])
            nextBestAvaxOutput = result[1][1]

            // Create an object with the exchange with the highest output and highest output value
            result[0].toString() == "0"
            ? highestAvaxOutput = {amount: result[1][0], dex: soulAddress}
            : highestAvaxOutput = {amount: result[1][0], dex: joeAddress}

            // user must approve dexAggragtor to spend users usdc before selling it
            await usdcRef.methods.approve(dexAggregator.address, usdcAmountSold).send({from: user})
            
            // swaps: 1000 USDC for AVAX 
            result = await dexAggregator.sellUSDCAtBestPrice(usdcAmountSold, futureTime(15), [usdcAddress, wavaxAddress], {from: user })

        }) 
        it('Routes USDC to AVAX swap to the exchange with highest return', async () => {
            console.log(`START AVAX BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should decrease by the usdcAmountSold
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcSubtracted = +usdcBalance.toString() - +usdcAmountSold.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcSubtracted)
            // Users new AVAX balance should increase by approximatly the highest AVAX output
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW AVAX BALANCE: ${fromWei(newEthBalance)}`)
            const ethAdded = +ethBalance.toString() + +highestAvaxOutput.amount.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethAdded)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethAdded).toString()}`)
            // fail case: users can't sell more usdc than they have
            await dexAggregator.sellUSDCAtBestPrice((newUsdcBalance + 1), futureTime(15), { from: user }).should.be.rejected;
            // fail case: reverts when the user inputs the wrong traiding pair array
            await usdcRef.methods.approve(dexAggregator.address, 1).send({from: user})
            await dexAggregator.buyUSDCAtBestPrice(1 ,futureTime(15), [wavaxAddress, usdcAddress], { from: user }).should.be.rejected;
        }) 
        it('emits a "USDCSold" event', () => {
            const log = result.logs[0]
            log.event.should.eq('USDCSold')
            const event = log.args
            event.usdcAmountSold.toString().should.equal(usdcAmountSold.toString())
            // Amount of AVAX bought should equal the highest output offered
            event.avaxAmountBought.toString().should.equal(highestAvaxOutput.amount.toString())
            // Router should equal the router exchange address that offered highest return
            event.dex.toString().should.equal(highestAvaxOutput.dex.toString())
            event.nextBestAvaxOutput.toString().should.equal(nextBestAvaxOutput.toString())
        }) 
    })
        
})