# 🤖️ halbot

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js Package](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml)

Just another `ChatGPT`/`Bing Chat` Telegram bob, which is simple design, easy to use, extendable and fun.

Live demo, click to watch on YouTube:

<a href="http://www.youtube.com/watch?feature=player_embedded&v=MzBocSyYfcY" target="_blank"><img src="http://img.youtube.com/vi/MzBocSyYfcY/0.jpg"
alt="Halbot live demo" width="240" height="180" border="10" /></a>

<details>
  <summary>Screenshots: 👈 Click here to see screenshots</summary>
  <img width="768" alt="Screenshot 2023-03-12 at 10 59 59 AM" src="https://user-images.githubusercontent.com/233022/224584278-9c3e3374-6ac2-44ca-8d35-df7747b9c1be.png">
  <img width="768" alt="Screenshot 2023-03-12 at 11 00 34 AM" src="https://user-images.githubusercontent.com/233022/224584280-113c03af-54b8-4724-86c7-3aa975f53c9c.png">
  <img width="768" alt="Screenshot 2023-03-12 at 11 00 17 AM" src="https://user-images.githubusercontent.com/233022/224584281-526578f9-3f0f-4bf6-a89c-56b07f97beae.png">
  <img width="768" alt="Screenshot 2023-03-12 at 10 58 11 AM" src="https://user-images.githubusercontent.com/233022/224584282-d12dca78-1da3-4166-ba39-6d14b78ab3e2.png">
  <img width="768" alt="Screenshot 2023-03-12 at 10 58 11 AM" src="https://user-images.githubusercontent.com/233022/232613586-78de64ef-eb53-4a8b-afac-542c9e8975b9.jpg">
  <img width="768" alt="Screenshot 2023-03-12 at 10 58 11 AM" src="https://user-images.githubusercontent.com/233022/232613588-c0760c87-15fc-4da8-9e92-fecae8bc7bc4.jpg">
  <img width="768" alt="Screenshot 2023-03-12 at 10 58 11 AM" src="https://user-images.githubusercontent.com/233022/232613591-8b863245-ebfb-4f1d-8cb2-7e84be1a34e4.jpg">
  <img width="768" alt="Screenshot 2023-03-12 at 10 58 11 AM" src="https://user-images.githubusercontent.com/233022/232613594-86180676-c302-4d12-a79c-b01f61cf13d8.jpg">
</details>

## Features

- [Telegram](https://telegram.org/) Bot (`Telegram Bot` token required)
- [ChatGPT](https://openai.com/blog/chatgpt) (`OpenAI` API key required)
- [Bing Chat](https://www.bing.com/) (`Bing Chat` user token required)
- Speech-to-text (`Google Cloud` API key required, or your own engine)
- Text-to-speech (`Google Cloud` API key required, or your own engine)
- OCR/OBJECT_DETECT (`Google Cloud` API key required, or your own engine)
- Feeding webpage and [YouTube](https://www.youtube.com/) to enhance your prompt
- Custom prompt and [🧠 Awesome ChatGPT Prompts](https://github.com/f/awesome-chatgpt-prompts) at your fingertips
- Support `private` and `public` mode, with multiple authenticate methods.
- `Middleware` style workflow, easy to extend.
- Built-in support parsing webpages, `YouTube` videos, PDFs, images, Office documents, code files, text files...
- Realtime stream-style response, no more waiting.
- Markdown rendering for GhatGPT
- Reference rendering for Bing Chat
- Code block rendering, developers friendly.
- ESM from the ground up

## ❤️ Become a sponsor to `halbot`

[For `$10/month`, you can access the official `halbot` service for a month](https://github.com/sponsors/Leask).

You don't need to pay `$20/month` for ChatGPT tokens separately.

`halbot` is stable. It has a better user experience than the official web app. You can access `halbot` from your favourite Telegram apps on your phone, tablet and computer.

Additionally, `halbot` has a lot of built-in input parsers to maximize the ChatGPT engine's power.

`halbot` can now parse webpages, YouTube videos, PDFs, images, Office documents, code files, and text files. And other parsers are coming soon.

`halbot` also supports Text-to-Speech and Speech-to-Text. You can `talk` to the AI engines to get help with your job.

And remember, you can always use the codes in this repo to build your own `halbot` instant. This project will keep open source forever.

## Basic usage

### Configuration

Make the `halbot` json config file and put it in this path `~/.halbot.json`.

Basic config demo:

```json
{
    "telegramToken": "[[Telegram Bot API Token]]",
    "chatGptKey": "[[ChatGPT API Key]]"
}
```

All supported configuration fields:

```js
{

    // REQUIRED, string.
    "telegramToken": "[[Telegram Bot API Token]]",

    // OPTIONAL, string.
    // One of the chatGptKey or bingToken is required.
    "chatGptKey": "[[ChatGPT API Key]]",

    // OPTIONAL, string.
    // How to get your bing user token: https://github.com/Leask/halbot/issues/13
    // One of the chatGptKey or bingToken is required.
    "bingToken": "[[Bing Usertoken from cookies]]",

    // OPTIONAL, string.
    // Set this field if you need TTS/STT/OCR/OBJECT_DETECT features.
    "googleApiKey": "[[Google Cloud API Key]]",

    // OPTIONAL, undefined || array of string.
    // To open the bot to PUBLIC, DO NOT set this field;
    // To restrict the bot to PRIVATE, set chat/group/channel ids in this array.
    "private": ["[[CHAT_ID]]", "[[GROUP_ID]]", "[[CHANNEL_ID]]", ...],

    // OPTIONAL, string.
    // Set this field if you want to use a `magic word` to authenticate the bot.
    "magicWord": "[[Your Magic Word here]]",

    // OPTIONAL, string.
    // Use a HOME GROUP to authentication users.
    // Anyone in this group can access the bot.
    "homeGroup": "[[GROUP_ID]]",

    // OPTIONAL, array of enum string.
    // Enum: 'private', 'mention', 'group', 'channel'.
    // Defaule: ['private', 'mention'].
    // By default, it will only reply to `private` chats and group `mention`s.
    // Adding 'group' or 'channel' may cause too much disturbance.
    "chatType": ["mention", "private"],

    // OPTIONAL, string.
    "hello": "[[initial prompt]]",

    // OPTIONAL, string.
    "info": "[[bot description]]",

    // OPTIONAL, string.
    "help": "[[help information]]",

    // OPTIONAL, object.
    // Sessions/conversations storage, support MariaDB/MySQL and Redis for now.
    // If omitted, the bot will use memory storage and sync to this file.
    // Example: (Compatibility: https://github.com/sidorares/node-mysql2)
    "storage": {
        "type": "[["MARIADB" || "MYSQL"]]",
        "host": "[[DATABASE HOST]]",
        "database": "[[DATABASE NAME]]",
        "user": "[[DATABASE USER]]",
        "password": "[[DATABASE PASSWORD]]",
        ...[[OTHER DATABASE OPTIONS]],
    },
    // OR: (Compatibility: https://github.com/luin/ioredis)
    "storage": {
        "type": "REDIS",
        "host": "[[REDIS HOST]]",
        "password": "[[REDIS PASSWORD]]",
        ...[[OTHER REDIS OPTIONS]],
    },

}
```

### Run it

In peace-of-mind:

```bash
$ npx halbot
```

`If you have multible AI engines configed, use '/chatgpt' or '/bing' to switch between them, or you can use '/*' to ask them all at the same time.`

## Integrate to your project

Install:

```bash
$ npm i halbot
```

Code:

```js
import halbot from 'halbot';

const config = {

    // ...[[ALL THE CONFIG FIELDS SUPPORTED ABOVE]]],

    // OPTIONAL, function.
    // Your own authentication logic.
    // return true if the user is authenticated.
    // return false if the user is not authenticated.
    auth: async (ctx) => {
        // ctx is the `telegraf` context object: https://telegraf.js.org/#context-class
        // It has been extended: https://github.com/Leask/utilitas/blob/master/lib/bot.mjs
        return true;
    },

    // OPTIONAL, object (key renderd as name) or array (name ignored).
    ai: {
        [[aiNameA]]: [[aiClientA]],
        [[aiNameB]]: [[aiClientB]],
    },

    // OPTIONAL, object.
    // Your own speech-to-text and text-to-speech engine.
    speech: {
        stt: [[sttApi]],
        tts: [[ttsApi]],
    },

    // OPTIONAL, object.
    // Your own computer-vision engine.
    vision {
        see: [[ocrAndObjectDetectApi]],
        read: [[documentAnnotateApi]],
    },

    // OPTIONAL, string.
    // Path to your own middlewares.
    // ./skills
    //  |- skill_a.mjs
    //    | const action = async (bot) => {
    //    |     bot.use(async (ctx, next) => {
    //    |         ctx.reply('42');
    //    |         await next();
    //    |     });
    //    | };
    //    |
    //    | export const { run, priority, func } = {
    //    |     run: true,
    //    |     priority: 100,
    //    |     func: action,
    //    | };
    skillPath: [[pathToYourMiddlewares]],

    // OPTIONAL, object.
    // Using customized storage engine.
    // `storage` should Should be compatible with the `Map` interface:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    storage: {
        get: async (key) => { /* return session object by chatId. */ },
        set: async (key, session) => { /* save session object by chatId. */ },
    },

    // OPTIONAL, object.
    // Adding extra commands.
    cmds: {
        [[commandA]]: [[descriptionA]],
        [[commandB]]: [[descriptionB]],
        ...[[OTHER COMMANDS]],
    },

    // OPTIONAL, object.
    // Adding extra configurations
    args: {
        [[argA]]: {
            type: 'string',
            short: [[shortCut]],
            default: [[defaultValue]],
            desc: [[description]],
        },
        [[argB]]: {
            type: 'binary',
            short: [[shortCut]],
            default: [[defaultValue]],
            desc: [[description]],
        },
        ...[[OTHER ARGS]],
    },

};

await halbot(config);
```
