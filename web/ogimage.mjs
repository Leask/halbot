import { dbio, hal } from '../index.mjs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Pre-load font
let interFontBuffer;
let notoFontBuffer;

const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return await res.arrayBuffer();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
        }
    }
};

const getFonts = async () => {
    if (!interFontBuffer) {
        try {
            // Fetching Inter from Google Fonts per user preference
            const url = 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeA.woff';
            interFontBuffer = await fetchWithRetry(url);
        } catch (e) {
            console.error('Failed to load Inter font:', e);
            throw new Error('Inter Font loading failed');
        }
    }
    if (!notoFontBuffer) {
        try {
            // Fetching a complete Noto Sans TC OTF from JSDelivr to ensure all CJK glyphs load in Satori
            const url = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf';
            notoFontBuffer = await fetchWithRetry(url);
        } catch (e) {
            console.error('Failed to load Noto font:', e);
            throw new Error('Noto Font loading failed');
        }
    }
    return { inter: interFontBuffer, noto: notoFontBuffer };
};

const process = async (ctx, next) => {
    const token = ctx.params.token;

    // 1. Fetch Chat Data
    const result = await dbio.queryOne(
        `SELECT * FROM ${hal.table} WHERE token = $1`,
        [token]
    );

    if (!result) {
        ctx.status = 404;
        ctx.body = 'Not Found';
        return;
    }

    result.received = JSON.parse(result.received);
    const msg = result.received.message;
    const userText = result.received_text || '';
    const username = msg.from.username || msg.from.first_name || 'User';
    const chatId = result.chat_id || 'Unknown';

    // Allow CSS to handle text clamping, but give a safe upper limit to prevent memory overloads
    let previewText = userText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (previewText.length > 500) {
        previewText = previewText.substring(0, 500) + '...';
    }

    // 2. Build Satori VDOM
    const fonts = await getFonts();

    const svg = await satori(
        {
            type: 'div',
            props: {
                style: {
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    backgroundColor: '#0a0a0c', // HAL9000 Dark bg
                    backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)',
                    backgroundSize: '100px 100px',
                    padding: '35px 60px 95px 60px',
                    fontFamily: '"Inter"',
                    color: '#ffffff',
                },
                children: [
                    // Brand / Logo area
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '40px',
                            },
                            children: [
                                {
                                    type: 'img',
                                    props: {
                                        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='lens-glow' cx='50%25' cy='50%25' r='50%25' fx='50%25' fy='50%25'%3E%3Cstop offset='0%25' style='stop-color:%23ffeb3b;stop-opacity:1' /%3E%3Cstop offset='20%25' style='stop-color:%23ff9800;stop-opacity:1' /%3E%3Cstop offset='60%25' style='stop-color:%23f44336;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23b71c1c;stop-opacity:1' /%3E%3C/radialGradient%3E%3ClinearGradient id='metal-rim' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23e0e0e0;stop-opacity:1' /%3E%3Cstop offset='50%25' style='stop-color:%239e9e9e;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23616161;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='48' style='fill:url(%23metal-rim);stroke:%23333;stroke-width:2' /%3E%3Ccircle cx='50' cy='50' r='42' style='fill:%23111' /%3E%3Ccircle cx='50' cy='50' r='28' style='fill:url(%23lens-glow);stroke:%23800000;stroke-width:1' /%3E%3Ccircle cx='35' cy='35' r='5' style='fill:%23fff;opacity:0.6;' /%3E%3C/svg%3E",
                                        style: {
                                            width: '64px',
                                            height: '64px',
                                            marginRight: '20px'
                                        }
                                    }
                                },
                                {
                                    type: 'div',
                                    props: {
                                        style: { fontSize: '48px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '2px' },
                                        children: 'HAL9000'
                                    }
                                }
                            ]
                        }
                    },
                    // Chat ID Info
                    {
                        type: 'div',
                        props: {
                            style: { fontSize: '36px', color: '#888', marginBottom: '20px' },
                            children: `Chat ID: ${chatId}`
                        }
                    },
                    // Preview text
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                fontSize: '38px',
                                color: '#eee',
                                lineHeight: '1.5',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '30px',
                                borderLeft: '8px solid #00f0ff',
                                maxWidth: '1080px',
                                wordBreak: 'break-all',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            },
                            children: previewText
                        }
                    },
                    // Footer Username
                    {
                        type: 'div',
                        props: {
                            style: { marginTop: 'auto', fontSize: '28px', color: '#aaa', display: 'flex', alignItems: 'center' },
                            children: [
                                {
                                    type: 'span',
                                    props: { style: { color: '#00f0ff', marginRight: '10px' }, children: '●' }
                                },
                                `Prompt by @${username}`
                            ]
                        }
                    }
                ]
            }
        },
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Inter',
                    data: fonts.inter,
                    weight: 400,
                    style: 'normal',
                },
                {
                    name: 'Noto Sans TC',
                    data: fonts.noto,
                    weight: 400,
                    style: 'normal',
                },
            ],
        }
    );

    // 3. Render SVG to PNG using Resvg
    const resvg = new Resvg(svg, {
        background: '#0a0a0c',
        fitTo: { mode: 'width', value: 1200 },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // 4. Send response
    ctx.set('Content-Type', 'image/png');
    ctx.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    ctx.body = pngBuffer;
};

export const { actions } = {
    actions: [
        {
            path: 'og-image/:token',
            method: 'GET',
            process,
        }
    ]
};

export { process };
