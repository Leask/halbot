# 🤖️ halbot

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js Package](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/Leask/halbot/actions/workflows/npm-publish.yml)

Just another `Gemini` / `ChatGPT` / `Claude` / `Ollama` Telegram bob, which is simple design, easy to use, extendable and fun.

Live demo, click to watch on YouTube:

<a href="http://www.youtube.com/watch?feature=player_embedded&v=MzBocSyYfcY" target="_blank"><img src="http://img.youtube.com/vi/MzBocSyYfcY/0.jpg"
alt="Halbot live demo" width="240" height="180" border="10" /></a>

<details>
  <summary>Screenshots: 👈 Click here to see screenshots</summary>
  <img width="768" alt="Screenshot 2023-11-10 at 8 37 31 AM" src="https://github.com/Leask/halbot/assets/233022/4d70aa04-49a4-4194-98f9-1a9a7c58b33c">
  <img width="768" alt="Screenshot 1" src="https://user-images.githubusercontent.com/233022/224584278-9c3e3374-6ac2-44ca-8d35-df7747b9c1be.png">
  <img width="768" alt="Screenshot 2" src="https://user-images.githubusercontent.com/233022/224584280-113c03af-54b8-4724-86c7-3aa975f53c9c.png">
  <img width="768" alt="Screenshot 3" src="https://user-images.githubusercontent.com/233022/224584281-526578f9-3f0f-4bf6-a89c-56b07f97beae.png">
  <img width="768" alt="Screenshot 4" src="https://user-images.githubusercontent.com/233022/224584282-d12dca78-1da3-4166-ba39-6d14b78ab3e2.png">
  <img width="768" alt="Screenshot 5" src="https://user-images.githubusercontent.com/233022/232613586-78de64ef-eb53-4a8b-afac-542c9e8975b9.jpg">
  <img width="768" alt="Screenshot 6" src="https://user-images.githubusercontent.com/233022/232613588-c0760c87-15fc-4da8-9e92-fecae8bc7bc4.jpg">
  <img width="768" alt="Screenshot 7" src="https://user-images.githubusercontent.com/233022/232613591-8b863245-ebfb-4f1d-8cb2-7e84be1a34e4.jpg">
  <img width="768" alt="Screenshot 8" src="https://user-images.githubusercontent.com/233022/232613594-86180676-c302-4d12-a79c-b01f61cf13d8.jpg">
</details>

## Features

- [Telegram](https://telegram.org/) Bot (`Telegram Bot` token required)
- [ChatGPT](https://openai.com/blog/chatgpt) (`OpenAI` API key required)
- [Gemini](https://ai.google.dev/gemini-api/docs) (Google `Gemini` API Key required)
- [Claude](https://www.anthropic.com/api) (`Anthropic` API Key required)
- [Ollama](https://github.com/jmorganca/ollama) (Install `Ollama` and serve your model)
- Speech-to-Text (`OpenAI` or `Google Cloud` API key required, or your own engine)
- Text-to-Speech (`OpenAI` or `Google Cloud` API key required, or your own engine)
- Text-to-Image by DALL·E (`OpenAI` API key required, or your own engine)
- OCR/OBJECT_DETECT (`OpenAI` or `Google Cloud` API key required, or your own engine)
- Feeding webpage and [YouTube](https://www.youtube.com/) to enhance your prompt
- Custom prompt at your fingertips
- Support `private` and `public` mode, with multiple authenticate methods.
- `Middleware` style workflow, easy to extend.
- Built-in support parsing webpages, `YouTube` videos, PDFs, images, Office documents, code files, text files...
- Realtime stream-style response, no more waiting.
- Multimodal support for all supported models.
- Automatically selects the optimal model for the task.
- Audio input and output support for supported models, not just TTS.
- Google `Search as a tool` support for [Gemini 2.0](https://ai.google.dev/gemini-api/docs/models/gemini-v2).
- Markdown rendering
- Reference rendering
- Code block rendering, developers friendly.
- Threaded conversation support.
- ESM from the ground up

## Basic usage

### Configuration

Make the `halbot` json config file and put it in this path `~/.halbot.json`.

Basic config demo:

```json
{
    "telegramToken": "[[Telegram Bot API Token]]",
    "openaiApiKey": "[[OpenAI API Key]]"
}
```

All supported configuration fields:

```js
{

    // REQUIRED, string.
    "telegramToken": "[[Telegram Bot API Token]]",

    // Set some of these fields if you need OpenAI's ChatGPT, Whisper, Embedding features.
    // OPTIONAL, string.
    "openaiApiKey": "[[OpenAI API Key]]",
    // OPTIONAL, string.
    "openaiEndpoint": "[[Custom OpenAI API endpoint]]",
    // OPTIONAL, string, default: "gpt-3.5-turbo".
    "chatGptModel": "[[Custom ChatGPT Model ID]]",
    // OPTIONAL, integer.
    "chatGptPriority": "[[Custom ChatGPT Priority]]",

    // Set some of these fields if you need Google's Gemini, TTS, STT, OCR, OBJECT_DETECT, Embedding features.
    // OPTIONAL, string.
    "googleApiKey": "[[Google Cloud / Gemini API Key]]",
    // OPTIONAL, string, default: "gemini-pro-vision".
    "geminiModel": "[[Custom Gemini Model ID]]",
    // OPTIONAL, integer
    "geminiPriority": "[[Custom Gemini Priority]]",

    // Set some of these fields if you need Anthropic's Claude features.
    // OPTIONAL, string.
    "claudeApiKey": "[[Anthropic API Key]]",
    // OPTIONAL, string.
    "credentials": "[[Vertex Anthropic Credentials]]",
    // OPTIONAL, string.
    "projectId": "[[Vertex Anthropic Credentials]]",
    // OPTIONAL, string, default: `latest claude model`.
    "claudeModel": "[[Custom Claude Model ID]]",
    // OPTIONAL, integer.
    "claudePriority": "[[Custom Claude Priority]]",

    // Set some of these fields if you need Azure's AI features.
    // OPTIONAL, string.
    "azureApiKey": "[[Azure API Key]]",
    // OPTIONAL, string.
    "azureEndpoint": "[[Azure API Endpoint]]",
    // OPTIONAL, string.
    "azureModel": "[[Custom Azure Model ID]]",
    // OPTIONAL, integer.
    "azurePriority": "[[Custom Azure Priority]]",

    // Set some of these fields if you need Ollama features.
    // OPTIONAL, boolean.
    "ollamaEnabled": "[[Enable Ollama API]]",
    // OPTIONAL, string.
    "ollamaEndpoint": "[[Custom Ollama API endpoint]]",
    // OPTIONAL, string, default: "DeepSeek-R1" (DeepSeek-R1 7B).
    "ollamaModel": "[[Custom Ollama Model ID]]",
    // OPTIONAL, integer.
    "ollamaPriority": "[[Custom Ollama Priority]]",

    // OPTIONAL, string.
    // Using this option along with `googleApiKey` to enable Google Search as a tool.
    "googleCx": "[[Google Search Engine ID]]",

    // OPTIONAL, undefined || array of string.
    // To open the bot to PUBLIC, DO NOT set this field;
    // To restrict the bot to PRIVATE, set chat/group/channel ids in this array.
    "private": ["[[CHAT_ID]]", "[[GROUP_ID]]", "[[CHANNEL_ID]]", ...],

    // OPTIONAL, string.
    // Set some of these fields if you want to use a `magic word` to authenticate the bot.
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
    // Sessions/conversations storage.
    // support PostgreSQL, MariaDB/MySQL and Redis for now.
    // If omitted, the bot will use memory storage and sync to this file.
    // Example: (Compatibility: https://node-postgres.com/apis/pool)
    // PostgreSQL is recommended for vector storage.
    "storage": {
        "provider": "POSTGRESQL",
        "host": "[[DATABASE HOST]]",
        "database": "[[DATABASE NAME]]",
        "user": "[[DATABASE USER]]",
        "password": "[[DATABASE PASSWORD]]",
        "vector": true, // REQUIRED
        ...[[OTHER DATABASE OPTIONS]],
    },
    // OR: (Compatibility: https://github.com/sidorares/node-mysql2)
    "storage": {
        "provider": "[["MARIADB" || "MYSQL"]]",
        "host": "[[DATABASE HOST]]",
        "database": "[[DATABASE NAME]]",
        "user": "[[DATABASE USER]]",
        "password": "[[DATABASE PASSWORD]]",
        "charset": "utf8mb4", // REQUIRED
        ...[[OTHER DATABASE OPTIONS]],
    },
    // OR: (Compatibility: https://github.com/luin/ioredis)
    "storage": {
        "provider": "REDIS",
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
        [[aiNameA]]: [[aiConfigA]],
        [[aiNameB]]: [[aiConfigB]],
        // ...
    },

    // OPTIONAL, object.
    // Your own speech-to-text and text-to-speech engine.
    speech: {
        stt: [[sttApi]],
        tts: [[ttsApi]],
    },

    // OPTIONAL, object.
    // Your own computer-vision engine.
    vision: {
        see: [[ocrAndObjectDetectApi]],
        read: [[documentAnnotateApi]],
    },

    // OPTIONAL, object.
    // Your own image-generator engine.
    image: {
        generate: [[textToImageApi]],
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
        provider: [[POSTGRESQL || MARIADB || MYSQL || REDIS]],
        get: async (key) => { /* Return session object by chatId. */ },
        set: async (key, session) => { /* Save session object by chatId. */ },
        client: { /* Customized database client / pool. */ },
            query: async (topic) => { /* Search history and session by topic. */ },
            upsert: async (event) => { /* Save event for history and session. */ },
        },
    },

    // OPTIONAL, function.
    // Using customized embedding engine for history and session search.
    embedding: async (text) => { /* Return vector embedding of the text. */ },

    // OPTIONAL, array of string.
    // Supported mime types of your vision-enabled AI models.
    // If omitted, bot will use standard OCR and Object Detect to handle images.
    supportedMimeTypes: [...[[mimeTypes]]],

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

## Foundations

- `halbot` uses my other project [🧰 utilitas](https://github.com/Leask/utilitas) as the basic framework to handle all the dirty work.
- `halbot` uses [🤖 utilitas.bot](https://github.com/Leask/utilitas/blob/master/lib/bot.mjs) as a Telegram bot engine.
- `halbot` uses [🤖 utilitas.alan](https://github.com/Leask/utilitas/blob/master/lib/alan.mjs) to communicate with the AI engines.

## Contact me

<img width="320" alt="IMG_2289" src="https://user-images.githubusercontent.com/233022/232649734-ff356d76-1bd6-41b2-ad78-27b62e6a9020.JPG">
