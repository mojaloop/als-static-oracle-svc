/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation

 * Vijay Kumar Guthi <vijaya.guthi@infitx.com>

 --------------
 ******/
import path from 'path'
import Convict from 'convict'

const ENV_PREFIX = 'ALS_STATIC_ORACLE_'

export interface RulesConfig {
  version?: string
  rules: Array<{
    ruleId?: string
    priority?: number
    description?: string
    match: {
      type: string
      id: {
        mode: 'EXACT' | 'PREFIX' | 'REGEX' | 'ANY'
        value?: string
      }
      subId?: {
        mode: 'EXACT' | 'PREFIX' | 'REGEX' | 'ANY'
        value?: string
      }
    }
    result: {
      dfspId: string
    }
    validity?: {
      from?: string
      to?: string
    }
  }>
}

export interface FileConfig {
  PORT: number
  HOST: string
  INSPECT: {
    DEPTH: number
    SHOW_HIDDEN: boolean
    COLOR: boolean
  }
  RULES: RulesConfig
}

const ConvictFileConfig = Convict<FileConfig>({
  PORT: {
    format: Number,
    default: 3000,
    env: ENV_PREFIX + 'PORT'
  },
  HOST: {
    format: String,
    default: '0.0.0.0',
    env: ENV_PREFIX + 'HOST'
  },
  INSPECT: {
    DEPTH: {
      format: Number,
      default: 4
    },
    SHOW_HIDDEN: {
      format: Boolean,
      default: false
    },
    COLOR: {
      format: Boolean,
      default: true
    }
  },
  RULES: {
    version: {
      format: String,
      default: '1.0'
    },
    rules: {
      format: Array,
      default: []
    }
  }
})

const ConfigFile = path.join(__dirname, 'default.json')
ConvictFileConfig.loadFile(ConfigFile)

ConvictFileConfig.validate({ allowed: 'strict' })

export default ConvictFileConfig
