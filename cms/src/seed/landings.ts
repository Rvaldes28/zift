import type { Payload } from 'payload'

import { lexicalBlocks, type LexicalBlock } from './lexical'

// Landings de SEO local (FASE 8): las "Páginas SEO recomendadas" de
// docs/FASES.MD §FASE 8. Viven en la raíz del sitio (/desarrollo-web-panama)
// y cada una ataca una keyword; el copy es único por página a propósito —
// Google penaliza el contenido duplicado entre landings.
interface LandingSeed {
  title: string
  slug: string
  excerpt: string
  /** Slug del servicio relacionado (sembrado en FASE 2) */
  serviceSlug: string
  blocks: LexicalBlock[]
  metaTitle: string
  metaDescription: string
  order: number
}

export const landings: LandingSeed[] = [
  {
    title: 'Desarrollo web profesional',
    slug: 'desarrollo-web',
    excerpt:
      'Sitios web rápidos, medibles y hechos para vender, con un panel desde el que tu equipo edita todo sin tocar código.',
    serviceSlug: 'desarrollo-web',
    metaTitle: 'Desarrollo web profesional para empresas | ZiftLab',
    metaDescription:
      'Desarrollamos sitios web rápidos, seguros y optimizados para convertir. Arquitectura moderna, SEO técnico y contenido 100% editable. Pide tu cotización.',
    order: 1,
    blocks: [
      { heading: 'Un sitio web que trabaja como un vendedor más' },
      {
        paragraph:
          'Tu sitio web es el primer contacto comercial con la mayoría de tus clientes. Lo construimos para que cargue en milisegundos, se lea perfecto en cualquier pantalla y guíe a cada visitante hacia una acción concreta: pedir una cotización, escribir por WhatsApp o agendar una llamada.',
      },
      {
        paragraph:
          'Trabajamos con arquitectura moderna: frontend estático ultrarrápido y un CMS headless desde el que tu equipo edita textos, imágenes y páginas completas sin depender de un desarrollador.',
      },
      { heading: 'Qué incluye un proyecto de desarrollo web con ZiftLab' },
      {
        paragraph:
          'Diseño a medida alineado con tu marca, SEO técnico desde el primer día, analítica configurada, formularios que llegan a tu correo y capacitación para tu equipo. Entregamos el sitio funcionando, indexado y midiendo.',
      },
      {
        paragraph:
          'Si ya tienes un sitio que se quedó lento o no genera contactos, lo auditamos y te decimos exactamente qué conviene: optimizarlo o rehacerlo sobre una base mejor.',
      },
    ],
  },
  {
    title: 'Desarrollo web en Panamá',
    slug: 'desarrollo-web-panama',
    excerpt:
      'Creamos sitios web para empresas panameñas que quieren vender más: rápidos, seguros y listos para competir en Google.',
    serviceSlug: 'desarrollo-web',
    metaTitle: 'Desarrollo web en Panamá — sitios que venden | ZiftLab',
    metaDescription:
      'Agencia de desarrollo web en Panamá. Sitios corporativos y comerciales rápidos, con SEO técnico y panel editable. Atención local y entrega medible.',
    order: 2,
    blocks: [
      { heading: 'Sitios web para el mercado panameño' },
      {
        paragraph:
          'Conocemos cómo compra el cliente panameño: compara por Google, verifica por Instagram y cierra por WhatsApp. Cada sitio que desarrollamos integra ese recorrido completo — de la búsqueda al mensaje — sin fricción.',
      },
      {
        paragraph:
          'Trabajamos con comercios, servicios profesionales, clínicas, restaurantes e industria en Ciudad de Panamá y el interior. Reuniones presenciales o remotas, en tu horario.',
      },
      { heading: 'Tecnología moderna, soporte cercano' },
      {
        paragraph:
          'Usamos la misma arquitectura que las empresas tecnológicas líderes: sitios estáticos ultrarrápidos con CMS headless. El resultado: mejor posición en Google, menos costos de servidor y un panel donde tu equipo edita todo.',
      },
      {
        paragraph:
          'El proyecto incluye dominio, hosting, SEO técnico, analítica y capacitación. Después del lanzamiento seguimos ahí: mantenimiento, mejoras y soporte en español.',
      },
    ],
  },
  {
    title: 'Diseño de páginas web en Panamá',
    slug: 'diseno-de-paginas-web-panama',
    excerpt:
      'Páginas web con diseño propio — no plantillas — pensadas para posicionar tu marca y convertir visitas en clientes.',
    serviceSlug: 'desarrollo-web',
    metaTitle: 'Diseño de páginas web en Panamá | ZiftLab',
    metaDescription:
      'Diseñamos páginas web profesionales en Panamá: diseño a medida, responsive, optimizadas para Google y fáciles de editar. Cotiza tu página web.',
    order: 3,
    blocks: [
      { heading: 'Diseño a medida, no plantillas' },
      {
        paragraph:
          'Una plantilla te hace ver como cualquier otro. Diseñamos cada página desde cero a partir de tu marca, tus servicios y tu cliente ideal: tipografía, color, fotografía y textos trabajados para que tu empresa se vea tan profesional como es.',
      },
      {
        paragraph:
          'El diseño no es solo estética: cada sección tiene un trabajo — explicar, generar confianza o llevar al contacto. Por eso nuestras páginas no solo se ven bien: venden.',
      },
      { heading: 'Responsive, accesible y rápido' },
      {
        paragraph:
          'La mayoría de las visitas en Panamá llegan desde el celular. Diseñamos primero para móvil, cuidamos la accesibilidad y optimizamos cada imagen para que la página cargue al instante incluso con datos móviles.',
      },
      {
        paragraph:
          'Entregamos tu página lista para crecer: puedes empezar con una landing y escalar a un sitio completo con blog, portafolio y cotizador sin rehacer nada.',
      },
    ],
  },
  {
    title: 'Marketing digital en Panamá',
    slug: 'marketing-digital-panama',
    excerpt:
      'Estrategia, campañas y contenido con un solo objetivo: que tu inversión regrese convertida en ventas medibles.',
    serviceSlug: 'marketing-digital',
    metaTitle: 'Marketing digital en Panamá — orientado a ventas | ZiftLab',
    metaDescription:
      'Agencia de marketing digital en Panamá: estrategia, Google Ads, Meta Ads, SEO y contenido. Campañas medibles orientadas a ventas, no a likes.',
    order: 4,
    blocks: [
      { heading: 'Marketing que se mide en ventas, no en likes' },
      {
        paragraph:
          'Cada campaña arranca con una pregunta: cuánto cuesta conseguir un cliente y cuánto vale. A partir de ahí definimos canales, presupuesto y mensajes. Todo lo demás — alcance, seguidores, impresiones — es medio, no fin.',
      },
      {
        paragraph:
          'Configuramos la medición completa antes de invertir un dólar: analítica, eventos de conversión y paneles donde ves qué canal trae clientes y cuál solo gasta.',
      },
      { heading: 'Canales que funcionan en el mercado panameño' },
      {
        paragraph:
          'Combinamos Google Ads para captar demanda activa, Meta Ads para generar demanda nueva, SEO para construir tráfico propio y email y WhatsApp para convertir y fidelizar. La mezcla depende de tu negocio, no de una receta.',
      },
      {
        paragraph:
          'Trabajamos con presupuestos realistas para el mercado local y reportamos en español claro: qué se hizo, qué resultó y qué sigue.',
      },
    ],
  },
  {
    title: 'E-commerce en Panamá',
    slug: 'ecommerce-panama',
    excerpt:
      'Tiendas online completas: catálogo, pagos locales, envíos y marketing integrados para vender 24/7.',
    serviceSlug: 'e-commerce',
    metaTitle: 'E-commerce en Panamá — tiendas online que venden | ZiftLab',
    metaDescription:
      'Desarrollamos tiendas online en Panamá con pagos locales, envíos, inventario y marketing integrado. Vende 24/7 con una tienda rápida y segura.',
    order: 5,
    blocks: [
      { heading: 'Tu tienda abierta 24/7 en todo Panamá' },
      {
        paragraph:
          'Una tienda online bien construida vende mientras duermes: catálogo ordenado, fotos que muestran el producto, checkout sin fricción y confirmaciones automáticas. Nos encargamos del circuito completo, del clic al despacho.',
      },
      {
        paragraph:
          'Integramos pasarelas de pago que funcionan en Panamá, opciones de envío y retiro en tienda, e inventario sincronizado para que nunca vendas lo que no tienes.',
      },
      { heading: 'Más que una tienda: un canal de crecimiento' },
      {
        paragraph:
          'Incluimos lo que hace crecer un e-commerce: SEO para que tus productos aparezcan en Google, recuperación de carritos abandonados por email y analítica para saber qué productos empujar.',
      },
      {
        paragraph:
          '¿Ya vendes por Instagram o WhatsApp? Perfecto: la tienda no reemplaza ese canal, lo ordena — centraliza pedidos, pagos y stock para que puedas escalar sin caos.',
      },
    ],
  },
  {
    title: 'Apps móviles en Panamá',
    slug: 'apps-moviles-panama',
    excerpt:
      'Aplicaciones iOS y Android para operar mejor y vender más, del prototipo a las tiendas.',
    serviceSlug: 'apps-moviles',
    metaTitle: 'Desarrollo de apps móviles en Panamá | ZiftLab',
    metaDescription:
      'Desarrollamos aplicaciones móviles en Panamá para iOS y Android: apps comerciales, operativas y de fidelización. Del prototipo a la App Store.',
    order: 6,
    blocks: [
      { heading: 'Apps que resuelven un trabajo concreto' },
      {
        paragraph:
          'Las mejores apps hacen una cosa muy bien: agendar citas, tomar pedidos, fidelizar clientes, coordinar equipos en campo. Empezamos por definir ese trabajo y diseñamos la app más simple que lo resuelve.',
      },
      {
        paragraph:
          'Desarrollamos multiplataforma: una sola base de código para iOS y Android, lo que reduce costo y tiempo de salida sin sacrificar experiencia.',
      },
      { heading: 'Del prototipo a las tiendas, sin sorpresas' },
      {
        paragraph:
          'Antes de programar verás un prototipo navegable de tu app. Después: desarrollo por etapas, pruebas con usuarios reales y publicación en App Store y Google Play incluida.',
      },
      {
        paragraph:
          'Y como una app vive de sus actualizaciones, dejamos un plan de mantenimiento claro: mejoras, monitoreo y soporte continuo.',
      },
    ],
  },
  {
    title: 'Automatización de negocios',
    slug: 'automatizacion-de-negocios',
    excerpt:
      'Convertimos procesos manuales en flujos automáticos: menos horas repetitivas, menos errores, más margen.',
    serviceSlug: 'automatizacion',
    metaTitle: 'Automatización de negocios y procesos | ZiftLab',
    metaDescription:
      'Automatizamos procesos de negocio: cotizaciones, facturación, seguimiento de clientes y reportes. Menos trabajo manual, menos errores, más margen.',
    order: 7,
    blocks: [
      { heading: 'El costo oculto del trabajo manual' },
      {
        paragraph:
          'Copiar datos entre sistemas, enviar los mismos correos, armar reportes a mano: cada hora repetitiva cuesta salario y atención. Mapeamos tus procesos, encontramos los cuellos de botella y los convertimos en flujos automáticos.',
      },
      {
        paragraph:
          'Automatizamos primero lo que más duele: seguimiento de leads, cotizaciones, recordatorios de pago, onboarding de clientes y reportes que se arman solos.',
      },
      { heading: 'Integramos las herramientas que ya usas' },
      {
        paragraph:
          'No necesitas cambiar de sistemas: conectamos tu CRM, correo, WhatsApp, hojas de cálculo, facturación y e-commerce para que los datos fluyan sin intervención humana.',
      },
      {
        paragraph:
          'Cada automatización se entrega documentada y monitoreada: sabes qué corre, cuándo corrió y qué hacer cuando algo requiere tu decisión.',
      },
    ],
  },
  {
    title: 'Inteligencia artificial para empresas',
    slug: 'inteligencia-artificial-para-empresas',
    excerpt:
      'IA aplicada a resultados concretos: atención automática, documentos que se procesan solos y decisiones con datos.',
    serviceSlug: 'inteligencia-artificial',
    metaTitle: 'Inteligencia artificial para empresas | ZiftLab',
    metaDescription:
      'Implementamos IA en empresas: asistentes de atención, procesamiento de documentos, análisis de datos y automatización inteligente con ROI medible.',
    order: 8,
    blocks: [
      { heading: 'IA aplicada, no experimentos' },
      {
        paragraph:
          'La IA aporta cuando resuelve un problema con dueño y con métrica: responder consultas a cualquier hora, clasificar documentos, resumir historiales, predecir demanda. Empezamos por el caso de mayor retorno, no por la tecnología de moda.',
      },
      {
        paragraph:
          'Implementamos asistentes entrenados con la información de tu negocio, que responden como tu mejor empleado y escalan a un humano cuando toca.',
      },
      { heading: 'Seguridad y control desde el diseño' },
      {
        paragraph:
          'Tus datos son tuyos: definimos qué información ve cada sistema, dónde se procesa y qué queda registrado. Sin cajas negras.',
      },
      {
        paragraph:
          'Entregamos cada proyecto con métricas de calidad y un tablero de control: cuánto resuelve la IA sola, cuánto escala a humanos y cuánto tiempo y dinero está ahorrando.',
      },
    ],
  },
  {
    title: 'Software a medida',
    slug: 'software-a-medida',
    excerpt:
      'Sistemas construidos alrededor de tu operación real: la herramienta exacta que tu negocio necesita, sin pagar por lo que sobra.',
    serviceSlug: 'web-apps',
    metaTitle: 'Software a medida para empresas | ZiftLab',
    metaDescription:
      'Desarrollamos software a medida: sistemas internos, portales de clientes y herramientas operativas que se ajustan a tu negocio, no al revés.',
    order: 9,
    blocks: [
      { heading: 'Cuando el software genérico se queda corto' },
      {
        paragraph:
          'Llega un punto en que las hojas de cálculo y los sistemas enlatados frenan la operación: procesos que no encajan, dobles capturas, reportes imposibles. El software a medida invierte la ecuación: la herramienta se adapta a tu negocio, no al revés.',
      },
      {
        paragraph:
          'Construimos sistemas internos, portales de clientes, cotizadores, paneles de operación e integraciones entre sistemas que no se hablan entre sí.',
      },
      { heading: 'Desarrollo por etapas, valor desde el primer mes' },
      {
        paragraph:
          'No desaparecemos seis meses para volver con un sistema gigante. Entregamos por etapas: cada versión resuelve un proceso completo y se usa en producción mientras construimos la siguiente.',
      },
      {
        paragraph:
          'El código queda documentado y es tuyo. Sin dependencia forzada: cualquier equipo técnico puede continuarlo, aunque esperamos que nos prefieras.',
      },
    ],
  },
  {
    title: 'Google Ads en Panamá',
    slug: 'google-ads-panama',
    excerpt:
      'Campañas de Google Ads gestionadas para captar clientes que ya están buscando lo que vendes.',
    serviceSlug: 'google-ads',
    metaTitle: 'Google Ads en Panamá — gestión de campañas | ZiftLab',
    metaDescription:
      'Gestión profesional de Google Ads en Panamá: búsqueda, display, shopping y YouTube. Campañas optimizadas por conversión y reportes claros.',
    order: 10,
    blocks: [
      { heading: 'Aparece cuando el cliente busca' },
      {
        paragraph:
          'Cada día miles de personas en Panamá buscan en Google exactamente lo que tu empresa vende. Google Ads te pone frente a esa demanda activa desde el primer día, sin esperar meses de posicionamiento.',
      },
      {
        paragraph:
          'Estructuramos campañas por intención de búsqueda, escribimos anuncios que filtran curiosos y llevamos cada clic a una página diseñada para convertir.',
      },
      { heading: 'Optimización continua, presupuesto cuidado' },
      {
        paragraph:
          'Una campaña sin gestión quema presupuesto: pujas mal calibradas, búsquedas irrelevantes, anuncios fatigados. Revisamos y optimizamos cada semana: términos de búsqueda, pujas, audiencias y creatividades.',
      },
      {
        paragraph:
          'Reportamos lo que importa: cuánto costó cada contacto, qué campaña lo trajo y qué haremos el mes siguiente para bajar ese costo.',
      },
    ],
  },
  {
    title: 'SEO en Panamá',
    slug: 'seo-panama',
    excerpt:
      'Posicionamiento orgánico para que tu empresa aparezca en Google cuando tus clientes buscan — y siga apareciendo sin pagar por cada clic.',
    serviceSlug: 'seo',
    metaTitle: 'SEO en Panamá — posicionamiento en Google | ZiftLab',
    metaDescription:
      'Agencia SEO en Panamá: auditoría técnica, contenido y posicionamiento local. Construye tráfico propio que no depende de pauta publicitaria.',
    order: 11,
    blocks: [
      { heading: 'Tráfico propio que no depende de pauta' },
      {
        paragraph:
          'La pauta se apaga cuando dejas de pagar; el SEO se acumula. Trabajamos las tres capas del posicionamiento: base técnica impecable, contenido que responde lo que tu cliente busca y autoridad construida con el tiempo.',
      },
      {
        paragraph:
          'Empezamos siempre por una auditoría: qué te está frenando — velocidad, indexación, estructura — y qué oportunidades tienes a corto plazo.',
      },
      { heading: 'SEO local: aparecer en tu ciudad' },
      {
        paragraph:
          'Para negocios que atienden en Panamá, el SEO local es la vía más corta: perfil de Google optimizado, páginas por servicio y zona, y datos estructurados que le dicen a Google exactamente qué haces y dónde.',
      },
      {
        paragraph:
          'Reportamos posiciones, tráfico y — sobre todo — contactos generados. El SEO también se mide en ventas.',
      },
    ],
  },
]

// Redirecciones 301 hacia las landings: variantes cortas que la gente escribe
// o enlaza. El frontend las consume en astro.config (web) al momento del build.
const redirects: { from: string; to: string }[] = [
  { from: '/ecommerce', to: '/ecommerce-panama' },
  { from: '/seo', to: '/seo-panama' },
  { from: '/google-ads', to: '/google-ads-panama' },
  { from: '/apps-moviles', to: '/apps-moviles-panama' },
  { from: '/marketing-digital', to: '/marketing-digital-panama' },
  { from: '/automatizacion', to: '/automatizacion-de-negocios' },
  { from: '/inteligencia-artificial', to: '/inteligencia-artificial-para-empresas' },
]

export const seedLandings = async (payload: Payload): Promise<void> => {
  // Ids de servicios por slug para la relación (los siembra el paso anterior)
  const servicesResult = await payload.find({ collection: 'services', limit: 100 })
  const serviceIdBySlug = new Map(
    servicesResult.docs
      .filter((doc): doc is typeof doc & { slug: string } => Boolean(doc.slug))
      .map((doc) => [doc.slug, doc.id]),
  )

  let created = 0
  let skipped = 0
  for (const landing of landings) {
    const existing = await payload.find({
      collection: 'landings',
      where: { slug: { equals: landing.slug } },
      limit: 1,
    })
    if (existing.docs[0]) {
      skipped += 1
      continue
    }

    await payload.create({
      collection: 'landings',
      data: {
        title: landing.title,
        slug: landing.slug,
        excerpt: landing.excerpt,
        content: lexicalBlocks(landing.blocks),
        service: serviceIdBySlug.get(landing.serviceSlug),
        order: landing.order,
        meta: {
          title: landing.metaTitle,
          description: landing.metaDescription,
        },
        _status: 'published',
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de landings: ${created} creadas, ${skipped} ya existían`)

  let redirectsCreated = 0
  for (const redirect of redirects) {
    const existing = await payload.find({
      collection: 'redirects',
      where: { from: { equals: redirect.from } },
      limit: 1,
    })
    if (existing.docs[0]) continue
    await payload.create({
      collection: 'redirects',
      data: { from: redirect.from, to: redirect.to, permanent: true },
    })
    redirectsCreated += 1
  }
  payload.logger.info(`Seed de redirecciones: ${redirectsCreated} creadas`)
}
