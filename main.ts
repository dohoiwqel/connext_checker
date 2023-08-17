import { Login } from "./login.module";
import { ethers } from 'ethers'
import * as readline from 'readline'
import * as fs from 'fs'
import HttpsProxyAgent from "https-proxy-agent";

async function read(fileName: string): Promise<string[]> {
    const array: string[] = []
    const readInterface = readline.createInterface({
        input: fs.createReadStream(fileName),
        crlfDelay: Infinity,
    })
    for await (const line of readInterface) {
        array.push(line)
    }
    return array
}

function getProxie(proxie: string) {
    if(!proxie) return undefined;
    const [ip, port, username, password] = proxie.split(':')
    return new HttpsProxyAgent.HttpsProxyAgent(`http://${username}:${password}@${ip}:${port}`)
}

async function main() {
    fs.writeFileSync(`result.txt` , '')

    const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/eth")
    const privateKeys = await read('privateKeys.txt')
    const proxies = await read("proxies.txt")

    let promises: Array<Promise<void>> = []
    let total = 0

    for(let [i, privateKey] of privateKeys.entries()) {
        if(proxies.length === privateKey.length) {
            promises.push((async() => {
                const wallet = new ethers.Wallet(privateKey, provider)
                const login = new Login(wallet, getProxie(proxies[i]))
                const tokens = await login.getToken()
                total += tokens
                fs.appendFileSync('result.txt', `${wallet.address} ${tokens} CONNEXT\n`)
            })())
        } else {
            const wallet = new ethers.Wallet(privateKey, provider)
            const login = new Login(wallet, getProxie(proxies[i]))
            const tokens = await login.getToken()
            total += tokens
            fs.appendFileSync('result.txt', `${wallet.address} ${tokens} CONNEXT\n`)
        }
    }

    await Promise.all(promises)

    fs.appendFileSync('result.txt', `Total - ${total} CONNEXT`)
}

main()