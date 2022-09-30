import React, { Component } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import usdcLogo from '../USDC.png'
import avaxLogo from '../AVAX.png'
import soulLogo from '../SOUL.png'
import joeLogo from '../JOE.png'
import { usdcAddress, wavaxAddress} from '../constants'

const renderExchangeRate = (exchangeRate, primary) => {
  return(
    <div className="mb-5">
      <span className={`float-left ${!primary ? `text-muted` : ``}`}>Exchange Rate</span>
      <span className={`float-right ${!primary ? `text-muted` : ``}`}>1 AVAX = {Math.round(10**6*exchangeRate)/(10**6)} USDC</span>
    </div>
  )
}

const renderExchangeLogo = (exchange, primary) => {
  const logo = exchange === 'SoulSwap' ? soulLogo : joeLogo
  const dex = exchange === 'SoulSwap' ? 'SOUL' : 'JOE'
  return(
    <div className="input-group-append">
      <div className={`input-group-text ${primary ? `border-primary` : `text-muted`}`}>
        <img src={logo} height='32' alt="" />
        &nbsp;&nbsp; {dex}
      </div>
    </div>
  )
}

 const renderOutputForms = (output, secondaryOutput, input, outputLoading, exchanges) => {
  let percentReturn = Math.round((((output/secondaryOutput) -1)*100)*10000)/10000
  console.log(output)
  console.log(input)
  let primaryExchangeRate = window.web3.utils.fromWei(output, "mwei")/ window.web3.utils.fromWei(input, "Ether")
  let secondaryExchangeRate = window.web3.utils.fromWei(secondaryOutput.toString(), "mwei")/ window.web3.utils.fromWei(input.toString(), "Ether")
  return (
    <>

      <div className="input-group mb-2" disabled>
        <input
          type="text"
          className="form-control form-control-lg border-primary"
          placeholder="0"
          value={
            outputLoading
              ? "Loading..."
              : window.web3.utils.fromWei(output.toString(), 'mwei')
          }
          disabled
        />
        {output !== "0" && !outputLoading ? renderExchangeLogo(exchanges[0], true): ''}
      </div>
        {output !== "0" && !outputLoading ? renderExchangeRate(primaryExchangeRate, true) : ''}
      <div className="input-group mb-2">
        <input
          type="text"
          className="form-control form-control-lg text-muted"
          placeholder="0"
          value={
            outputLoading
              ? "Loading..."
              : window.web3.utils.fromWei(secondaryOutput.toString(), 'mwei')
          }
          disabled
        />
        {output !== "0" && !outputLoading ? renderExchangeLogo(exchanges[1], false): ''}
      </div>
        {output !== "0"  && !outputLoading? renderExchangeRate(secondaryExchangeRate, false) : ''}
      <OverlayTrigger show={output !== '0' && !outputLoading}
        placement='bottom'
        overlay={
          <Tooltip >
            {`${percentReturn}% greater return offered by ${exchanges[0]}`}
          </Tooltip>}>
        <button type="submit" className="btn btn-primary btn-block btn-lg">Exchange</button>
      </OverlayTrigger>
    </>
  )
}


class BuyForm extends Component {


  constructor(props) {
    super(props)
      this.state = {
        etherAmount: '0'
      }
  }

  render() {
    const {
      outputsLoading,
      dexIndexWithBestPrice,
      soulOutput,
      joeOutput
    } = this.props.exchangeData
    let etherAmount
    console.log(this.props)
    return (
      <form className="mb-3" onSubmit={(event) => {
        event.preventDefault()
        etherAmount = this.input.value.toString()
        etherAmount = window.web3.utils.toWei(etherAmount, 'Ether')
        this.props.buyUsdc(etherAmount)
      }}>
        <div>
          <label className="float-left">
            <img src={avaxLogo} height='32' alt="" />
            &nbsp; AVAX
          </label>
          <span className="float-right text-muted">
            Balance: {Math.round(10**6*window.web3.utils.fromWei(this.props.ethBalance, 'Ether'))/10**6}
          </span>
        </div>
        <div className="input-group mb-4">
          <input
            type="number"
            onChange={(event) => {
              etherAmount = this.input.value.toString()
              if (etherAmount) {
                etherAmount = window.web3.utils.toWei(etherAmount, 'Ether')
                this.props.getOutputs(etherAmount, [wavaxAddress, usdcAddress])
                this.setState({etherAmount})
              } else {
                this.props.getOutputs('0', [wavaxAddress, usdcAddress])
                this.setState({etherAmount: '0'})
              }
            }}
            ref={(input) => { this.input = input }}
            className="form-control form-control-lg"
            placeholder="0"
            required />
        </div>
        <div className="d-flex justify-content-center">
          <i className="arrow down"></i>
        </div>
        <div>
          <label className="float-left">
            <img src={usdcLogo} height='32' alt="" />
            &nbsp; USDC
          </label>
          <span className="float-right text-muted">
            Balance: {window.web3.utils.fromWei(this.props.usdcBalance, 'mwei')}
          </span>
        </div>
        <div>
          { dexIndexWithBestPrice === "0"
            ? renderOutputForms(soulOutput, joeOutput, this.state.etherAmount, outputsLoading, ['SoulSwap', 'TraderJoe'])
            : renderOutputForms(joeOutput, soulOutput, this.state.etherAmount, outputsLoading, ['TraderJoe', 'SoulSwap'])
          }
        </div>

      </form>
    );
  }
}

export default BuyForm;
