import axios, { AxiosInstance } from 'axios'
import HttpsProxyAgent from 'https-proxy-agent'
import { ethers, version, Wallet } from 'ethers'
import * as eth_sign from '@metamask/eth-sig-util'
import { SiweMessage } from "siwe";
// import { getAccount, getWalletClient, walletclie } from 'wagmi/actions';


const headers = {
    'authority': 'api.tokensoft.io',
    'accept': '*/*',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'no-cache',
    'authorization': '',
    'content-type': 'application/json',
    'origin': 'https://airdrop.connext.network',
    'pragma': 'no-cache',
    'referer': 'https://airdrop.connext.network/',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

export class Login {

    private instance: AxiosInstance

    constructor(
        private wallet: Wallet,
        private proxyAgent?: HttpsProxyAgent.HttpsProxyAgent,
    ) {
        if(this.proxyAgent) {
            this.instance = axios.create(
                {
                    headers: headers,
                    proxy: false,
                    httpsAgent: this.proxyAgent,
                }
            )
        } else {
            this.instance = axios.create(
                {
                    headers: headers
                }
            )
        }
    }

    private async getNonce() {
        const res = await this.instance.post('https://api.tokensoft.io/auth/api/v1/wallets/nonce', 
            {
                'walletAddress': this.wallet.address
            }
        )
        return res.data.nonce
    }

    private async getSignature() {
        const nonce = await this.getNonce()
        const date = (new Date).toISOString()

        const message = {
            "domain": "airdrop.connext.network",
            "address": this.wallet.address,
            "statement": "This site is powered by Tokensoft. Sign this message to prove ownership of this wallet and accept our Terms of Service, Privacy Policy, and Cookie Policy: https://tokensoft.io/legal",
            "uri": "https://airdrop.connext.network",
            "version": "1",
            "chainId": 1,
            "nonce": nonce,
            "issuedAt": date
        }

        const stringMessage = (new SiweMessage({
            "domain": "airdrop.connext.network",
            "address": this.wallet.address,
            "statement": "This site is powered by Tokensoft. Sign this message to prove ownership of this wallet and accept our Terms of Service, Privacy Policy, and Cookie Policy: https://tokensoft.io/legal",
            "uri": "https://airdrop.connext.network",
            "version": "1",
            "chainId": 1,
            "nonce": nonce,
            "issuedAt": date
        })).prepareMessage()

        const signature = await this.wallet.signMessage(stringMessage)
        return {signature: signature, message: message}
    }

    private async getAuth() {
        const {signature, message} = await this.getSignature()
        const response = await this.instance.post(
            'https://api.tokensoft.io/auth/api/v1/wallets/connect',
            {
              'walletAddress': this.wallet.address,
              'signature': signature,
              'message': message,
              'nonce': message.nonce
            }
        )

        return `Bearer ${response.data.token}`
    }

    async getToken(): Promise<number> {
        const authToken = await this.getAuth()
        this.instance.defaults.headers['authorization'] = authToken
        const response = await this.instance.get('https://api.tokensoft.io/distributor/api/v1/distributors/52')
        console.log(this.wallet.address)
        try {
            return parseFloat(ethers.formatEther(response.data.distributor.authorization.data[1].value))
        } catch(e) {
            return 0
        }
    }
}