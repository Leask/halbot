import { callosum, dbio, hal } from '../index.mjs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load font
let fontBuffer;

const getFont = async () => {
    if (!fontBuffer) {
        // Attempt to load a default system font or a bundled font.
        // Inter is best. We'll download it once if needed, or rely on a local copy.
        // For simplicity, we will fetch Inter from Google Fonts if not cached.
        try {
            // Because we need a buffer, reading from a local file is much safer.
            // Let's assume we can fetch it once or we place a font file in /assets/.
            // For now, let's fetch Inter-Regular directly if we don't have it.
            const url = 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-Ek-_EeA.woff';
            const res = await fetch(url);
            fontBuffer = await res.arrayBuffer();
        } catch (e) {
            console.error('Failed to load font:', e);
            throw new Error('Font loading failed');
        }
    }
    return fontBuffer;
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

    // Limit text length
    let previewText = userText.replace(/<[^>]+>/g, '').trim();
    if (previewText.length > 150) {
        previewText = previewText.substring(0, 150) + '...';
    }

    // 2. Build Satori VDOM
    const fontData = await getFont();

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
                    padding: '80px',
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
                                    type: 'div',
                                    props: {
                                        style: {
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            background: 'radial-gradient(circle at center, #ffeb3b 0%, #ff9800 20%, #f44336 60%, #b71c1c 100%)',
                                            border: '4px solid #333',
                                            marginRight: '20px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'white',
                                                        opacity: 0.6
                                                    }
                                                }
                                            }
                                        ]
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
                                display: 'flex',
                                fontSize: '42px',
                                color: '#eee',
                                lineHeight: '1.4',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '30px',
                                borderRadius: '16px',
                                borderLeft: '8px solid #00f0ff',
                                maxWidth: '1000px'
                            },
                            children: `"${previewText}"`
                        }
                    },
                    // Footer Username
                    {
                        type: 'div',
                        props: {
                            style: { marginTop: '40px', fontSize: '32px', color: '#aaa', display: 'flex', alignItems: 'center' },
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
                    data: fontData,
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
