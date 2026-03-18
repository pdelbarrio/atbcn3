import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// URL de las salas soportadas
const SALAS = {
    deskomunal: 'https://ladeskomunal.coop/agenda/',
    vol: 'https://salavol.com/',
    upload: 'https://sala-upload.com/conciertos/'
};

export async function POST(request) {
    try {
        const { sala } = await request.json();

        if (!SALAS[sala]) {
            return NextResponse.json(
                { error: 'Sala no soportada. Usa: deskomunal, vol, o upload' },
                { status: 400 }
            );
        }

        const url = SALAS[sala];
        const eventos = await scrapeSegunSala(sala, url);

        async function procesarConPool(eventos, limite = 3) {
            const resultados = [];
            let indice = 0;

            async function worker() {
                while (indice < eventos.length) {
                    const i = indice++;
                    const evento = eventos[i];
                    const resultado = await formatearConIA(evento);
                    resultados[i] = resultado;
                }
            }

            const workers = Array.from({ length: limite }, worker);
            await Promise.all(workers);

            return resultados;
        }


        // Formatear cada evento con Claude API
        const eventosFormateados = await procesarConPool(eventos, 3);

        return NextResponse.json({
            sala,
            total: eventosFormateados.length,
            eventos: eventosFormateados
        });

    } catch (error) {
        console.error('Error en scraping:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

async function scrapeSegunSala(sala, url) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    if (sala === 'deskomunal') {
        return scrapeDeskomunal($);
    } else if (sala === 'vol') {
        return scrapeVol($);
    } else if (sala === 'upload') {
        return await scrapeUpload($); // <-- añadir await aquí
    }

    return [];
}

function scrapeDeskomunal($) {
    const eventos = [];
    const hoy = new Date();

    $('.type-tribe_events').each((i, elem) => {
        const titulo = $(elem).find('.tribe-events-list-event-title').text().trim();
        const descripcion = $(elem).find('.tribe-events-list-event-description').text().trim();
        const fecha = $(elem).find('.tribe-event-date-start').text().trim();
        const link = $(elem).find('a.tribe-event-url').attr('href');
        const imagen = $(elem).find('img').attr('src');

        // Solo eventos futuros
        const fechaEvento = parseFechaDeskomunal(fecha);
        if (fechaEvento && fechaEvento >= hoy) {
            eventos.push({
                titulo,
                descripcion,
                fecha,
                link,
                imagen,
                location: 'La Deskomunal'
            });
        }
    });

    return eventos;
}

function scrapeVol($) {
    const eventos = [];
    const hoy = new Date();

    // Extraer eventos de la lista principal
    $('a[href*="/agenda/"]').each((i, elem) => {
        const $link = $(elem);
        const textoCompleto = $link.text().trim();
        const href = $link.attr('href');

        // Solo procesar si tiene fecha válida
        const fechaMatch = textoCompleto.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);

        if (fechaMatch && href && !href.includes('#')) {
            const [, dia, mes, año, hora] = fechaMatch;
            const fechaEvento = new Date(año, parseInt(mes) - 1, parseInt(dia));

            // Solo eventos futuros
            if (fechaEvento >= hoy) {
                // Extraer precio (formatos: "12/15€", "10€", "A partir de 5€")
                const precioMatch = textoCompleto.match(/(\d+(?:\/\d+)?€|A partir de \d+€)/);
                const precio = precioMatch ? precioMatch[0] : '';

                // Extraer título: es la última línea del texto que NO es fecha ni precio
                const lineas = textoCompleto.split('\n').map(l => l.trim()).filter(l => l);
                let titulo = '';

                // El título suele ser la última línea que no contiene fecha ni precio ni día de la semana
                for (let i = lineas.length - 1; i >= 0; i--) {
                    const linea = lineas[i];
                    if (!linea.match(/\d{2}\/\d{2}\/\d{4}/) && // No es fecha
                        !linea.match(/\d+€/) && // No es precio
                        !linea.match(/^(Dilluns|Dimarts|Dimecres|Dijous|Divendres|Dissabte|Diumenge)/) && // No es día
                        linea.length > 3) { // Tiene contenido real
                        titulo = linea;
                        break;
                    }
                }

                if (!titulo) titulo = lineas[lineas.length - 1] || 'Evento sin título';

                eventos.push({
                    titulo: titulo,
                    descripcion: '', // No disponible en listado
                    fecha: `${dia}/${mes}/${año}`,
                    hora: hora,
                    precio: precio,
                    link: href.startsWith('http') ? href : `https://salavol.com${href}`,
                    imagen: '', // No disponible en listado
                    location: 'Sala VOL',
                    fechaEvento: fechaEvento
                });
            }
        }
    });

    return eventos.slice(0, 30); // Limitar a 30 eventos
}

async function scrapeUpload($) {
    const eventos = [];
    const hoy = new Date();

    console.log('=== UPLOAD DEBUG ===');

    // Encontrar divs de conciertos
    const eventDivs = $('div[class*="concierto"]');
    console.log(`Encontrados ${eventDivs.length} eventos en listado`);

    // Limitar a 15 eventos para no saturar (es más lento porque hace fetch individual)
    const eventosLimitados = eventDivs.slice(0, 50);

    for (let i = 0; i < eventosLimitados.length; i++) {
        const elem = eventosLimitados[i];
        const $elem = cheerio.load(elem);

        try {
            // Extraer link del evento
            const link = $elem('a').first().attr('href');
            if (!link) continue;

            const fullLink = link.startsWith('http') ? link : `https://sala-upload.com${link}`;

            console.log(`Scrapeando evento ${i + 1}/${eventosLimitados.length}: ${fullLink}`);

            // Hacer fetch a la página individual del evento
            const eventResponse = await fetch(fullLink);
            const eventHtml = await eventResponse.text();
            const $event = cheerio.load(eventHtml);

            // Extraer título
            let titulo = $event('h1.entry-title').text().trim();
            if (!titulo) {
                titulo = $event('title').text().split('|')[0].trim();
            }

            // Extraer descripción (primer párrafo del contenido)
            let descripcion = '';
            $event('.entry-content p').each((j, p) => {
                const texto = $event(p).text().trim();
                if (texto.length > 50 && !descripcion) {
                    descripcion = texto;
                }
            });

            // Extraer fecha y hora
            let fecha = '';
            let hora = '';
            const fechaCompleta = $event('.tribe-events-schedule h2, .event-date, time').first().text().trim();

            // Intentar parsear diferentes formatos
            // Formato: "31 de enero de 2026 @ 20:00"
            const fechaMatch = fechaCompleta.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})\s+@\s+(\d{2}:\d{2})/);
            if (fechaMatch) {
                const [, dia, mes, año, horaStr] = fechaMatch;
                fecha = `${dia}/${mes}/${año}`;
                hora = horaStr;
            } else {
                // Formato alternativo: buscar en meta tags
                fecha = $event('meta[property="event:start_date"]').attr('content') || '';
            }

            // Extraer precio
            let precio = '';
            const precioTexto = $event('.tribe-events-cost, .event-price, .price').text().trim();
            if (precioTexto) {
                precio = precioTexto.replace(/Precio:|Price:/gi, '').trim();
            }

            // Extraer imagen
            let imagen = $event('.tribe-events-event-image img, article img').first().attr('src') || '';
            if (!imagen) {
                // Fallback: imagen del listado
                imagen = $elem('img').attr('src') || '';
            }

            if (titulo) {
                eventos.push({
                    titulo: titulo,
                    descripcion: descripcion,
                    fecha: fecha && hora ? `${fecha} ${hora}` : fecha,
                    link: fullLink,
                    imagen: imagen,
                    location: 'Sala Upload',
                    precio: precio,
                    fechaEvento: new Date() // TODO: parsear fecha correctamente
                });
            }

            // Pequeño delay para no saturar el servidor
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error scrapeando evento individual:`, error);
        }
    }

    console.log(`Total eventos scrapeados: ${eventos.length}`);
    return eventos;
}

async function formatearConIA(evento) {
    try {
        // Si no hay descripción, usar el título para generar contexto
        const contexto = evento.descripcion ||
            `Concierto de ${evento.titulo} en ${evento.location}`;

        const prompt = `Eres un asistente experto en música y eventos culturales de Barcelona.

INFORMACIÓN DEL EVENTO:
Título original: "${evento.titulo}"
Contexto: ${contexto}
Fecha: ${evento.fecha}
Hora: ${evento.hora || ''}
Precio: ${evento.precio || 'No especificado'}
Ubicación: ${evento.location}

TAREAS:
1. Extrae un título limpio (solo nombres de artistas/bandas, sin fecha, sin hora, sin precio)
2. Genera una descripción atractiva de máximo 150 caracteres resumiendo el texto del contexto
3. Deduce 3 géneros/estilos musicales (sin hashtag #)

RESPONDE SOLO CON ESTE JSON (sin markdown, sin backticks):
{
  "name": "título limpio",
  "description": "descripción max 150 chars",
  "tags": ["genero1", "genero2", "genero3"],
  "location": "${evento.location}",
  "price": "${evento.precio}",
  "date": "${evento.fecha}${evento.hora ? ' ' + evento.hora : ''}",
  "link": "${evento.link}",
  "poster": ""
}

REGLAS:
- name: SOLO artistas/bandas. Ejemplo: "Elijah Fox" NO "Elijah Fox (entrades exhaurides)"
- description: Max 150 chars. Si no hay info, inventa algo corto y atractivo basado en el nombre
- tags: 3 géneros sin # (ejemplos: indie, rock, jazz, techno, punk, folk, experimental, pop, electronic)
- Si hay varios artistas separados por comas o +, incluirlos todos en name`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();

        // DEBUG - ver qué responde la API
        console.log('Respuesta Claude API:', JSON.stringify(data, null, 2));

        if (data.content?.[0]?.text) {
            const jsonText = data.content[0].text.trim().replace(/```json|```/g, '').trim();
            console.log('JSON extraído:', jsonText);

            const parsed = JSON.parse(jsonText);

            // Asegurar que tags no tienen # ni están vacíos
            if (parsed.tags) {
                parsed.tags = parsed.tags
                    .map(tag => tag.replace(/^#/, '').trim())
                    .filter(tag => tag.length > 0);
            }

            return parsed;
        }

        throw new Error('No se pudo formatear con IA');
    } catch (error) {
        console.error('Error formateando evento:', error);
        // Fallback mejorado
        return {
            name: evento.titulo,
            description: `Concert a ${evento.location}`,
            tags: ['musica', 'concert', 'barcelona'],
            location: evento.location,
            price: evento.precio || '',
            date: `${evento.fecha}${evento.hora ? ' ' + evento.hora : ''}`,
            link: evento.link,
            poster: ''
        };
    }
}

function parseFechaDeskomunal(fechaStr) {
    // Parsear fechas en formato catalán "21 gen." "23 - 24 gen."
    const meses = {
        'gen.': 0, 'febr.': 1, 'març': 2, 'abr.': 3, 'maig': 4, 'juny': 5,
        'jul.': 6, 'ag.': 7, 'set.': 8, 'oct.': 9, 'nov.': 10, 'des.': 11
    };

    const match = fechaStr.match(/(\d{1,2})\s+(\w+)/);
    if (match) {
        const dia = parseInt(match[1]);
        const mes = meses[match[2]];
        if (mes !== undefined) {
            return new Date(2026, mes, dia); // Asumir 2026 por ahora
        }
    }
    return null;
}