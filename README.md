# 🤖️ halbot

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js Package](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml)

Just another `ChatGPT`/`Bing Chat` Telegram bob, which is simple design, easy to use, extendable and fun.

Features

- Telegram Bot (`Telegram Bot` token required)
- ChatGPT (`OpenAI` API key required)
- Bing Chat (`Bing Chat` user token required)
- Speech-to-text (`Google Cloud` API key required)
- Text-to-speech (`Google Cloud` API key required)

## How to use

Make the `halbot` json config file and put it in this path `~/.halbot.json`:

```json
{
    // REQUIRED, string.
    "telegramToken": "[[Telegram Bot API Token]]",
    // OPTIONAL, string.
    // One of the chatGptKey or bingToken is required.
    "chatGptKey": "[[ChatGPT API Key]]",
    // OPTIONAL, string.
    // One of the chatGptKey or bingToken is required.
    "bingToken": "[[Bing Usertoken from cookies]]",
    // OPTIONAL, string.
    // Set this field if you need TTS/STT features.
    "googleApiKey": "[[Google Cloud API Key]]",
    // OPTIONAL, undefined || array of string.
    // To open the bot to PUBLIC, DO NOT set this field;
    // To restrict the bot to PRIVATE, set chat/group/channel ids in this array.
    "private": ["[[CHAT_ID]]", "[[GROUP_ID]]", "[[CHANNEL_ID]]", ...],
    // OPTIONAL, string.
    // Use a HOME GROUP to authentication users.
    // Anyone in this group can access the bot.
    "homeGroup": "[[GROUP_ID]]",
    // OPTIONAL, array of enum string.
    // Enum: 'private', 'mention', 'group', 'channel'.
    // Defaule: ['private', 'mention'].
    // By default, it will only reply to `private` chats and group `mention`s.
    // Adding 'group' or 'channel' may cause too much disturbance.
    "chatType": ["mention", "private"]
}
```

Then, run the bot:

```bash
$ npx halbot
```

## Integrate to your project

```bash
$ npm i halbot
```

```js
const { halbot } = require('halbot');

```
