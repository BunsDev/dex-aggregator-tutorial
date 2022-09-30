import React, { Component } from 'react'
import Web3 from 'web3'
import IERC20 from '../abis/IERC20.json'
import Navbar from './Navbar'
import Main from './Main'
import './App.css'
import { aggregatorAddress, usdcAddress, wavaxAddress } from '../constants'
import { futureTime } from '../helpers'
import AGGREGATOR_ABI from '../abis/DexAggregator.json'

const exchangeDataReset = {        
  outputsLoading: false,
  dexIndexWithBestPrice: '0',
  soulOutput: '0',
  joeOutput: '0',
}
class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3

    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const ethBalance = await web3.eth.getBalance(this.state.account)
    this.setState({ ethBalance })

    // loads: USDC
    try {
      // Create new web3 usdc contract instance
      const usdc = new web3.eth.Contract(IERC20.abi, usdcAddress)
      this.setState({ usdc })
      let usdcBalance = await usdc.methods.balanceOf(this.state.account).call()
      this.setState({ usdcBalance: usdcBalance.toString() })
    } catch (error) {
      console.log('USDC contract not deployed to the current network. Please select another network with Metamask.')
    }

    // loads: Aggregator
    const networkId =  await web3.eth.net.getId()
    const dexAggregatorData = AGGREGATOR_ABI//= DexAggregator.networks[networkId]
    if(dexAggregatorData) {
      const dexAggregator = new web3.eth.Contract(AGGREGATOR_ABI, aggregatorAddress)
      this.setState({ dexAggregator })
      this.setState({ dexAggregatorAddress: dexAggregatorData.address})
    } else {
      window.alert('DexAggregator contract not deployed to detected network.')
    }

    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  buyUsdc = (etherAmount) => {
    this.setState({ loading: true })
    this.state.dexAggregator.methods.buyUSDCAtBestPrice(futureTime(15), [wavaxAddress, usdcAddress]).send({ value: etherAmount, from: this.state.account }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
      this.setState({exchangeData : exchangeDataReset})
    })
  }

  sellUsdc = async (usdcAmount) => {
    this.setState({ loading: true })
    await this.state.usdc.methods.approve(this.state.dexAggregatorAddress, usdcAmount).send({ from: this.state.account })
    await this.state.dexAggregator.methods.sellUSDCAtBestPrice(usdcAmount, futureTime(15), [usdcAddress, wavaxAddress]).send({ from: this.state.account })
    this.setState({ loading: false })
    this.setState({exchangeData : exchangeDataReset})
  }

  getOutputs = async (input, pairArray) => {
    let data = this.state.exchangeData
    if(input !== '0' ){
      this.setState({ exchangeData: {...data, outputsLoading: true }})
      const result = await this.state.dexAggregator.methods.getOutputAmounts(input, pairArray).call()
      const index = result[0].toString()
      const amounts = result[1]
      console.log(result)
      this.setState({ 
        exchangeData: {
          ...data,
          outputsLoading: false,
          dexIndexWithBestPrice: index,
          soulOutput: index === "0" ? amounts[0] : amounts[1],
          joeOutput: index === "0" ? amounts[1] : amounts[0]
        }
      })
    } else {
      this.setState({
        exchangeData: exchangeDataReset
      })
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      usdc: {},
      dexAggregator: {},
      ethBalance: '0',
      usdcBalance: '0',
      loading: true,
      dexAggregatorAddress: "",
      exchangeData: exchangeDataReset
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    } else {
      content = <Main
        ethBalance={this.state.ethBalance}
        usdcBalance={this.state.usdcBalance}
        exchangeData={this.state.exchangeData}
        buyUsdc={this.buyUsdc}
        sellUsdc={this.sellUsdc}
        getOutputs={this.getOutputs}
      />
    }

    return (
      <div>
        <Navbar account={this.state.account} />
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 ml-auto mr-auto" style={{ maxWidth: '600px' }}>
              <div className="content mr-auto ml-auto">
                <a
                  href="http://https://exchange.soulswap.finance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                </a>

                {content}

              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;

