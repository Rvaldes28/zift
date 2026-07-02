import path from 'path'
import { fileURLToPath } from 'url'

import type { Payload } from 'payload'

import { lexicalBlocks, type LexicalBlock } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Las 8 categorías del blog (FASE 6) — coinciden con las líneas de servicio
// para que cada artículo empuje hacia su página comercial.
const categories = [
  {
    title: 'Desarrollo web',
    slug: 'desarrollo-web',
    description:
      'Sitios y sistemas web: costos, tecnologías, rendimiento y decisiones técnicas explicadas para dueños de negocio.',
  },
  {
    title: 'Marketing digital',
    slug: 'marketing-digital',
    description:
      'Campañas, embudos y medición: cómo invertir en marketing con retorno rastreable, no por intuición.',
  },
  {
    title: 'SEO',
    slug: 'seo',
    description:
      'Posicionamiento en Google: SEO local, técnico y de contenidos para captar clientes que ya te están buscando.',
  },
  {
    title: 'E-commerce',
    slug: 'e-commerce',
    description:
      'Tiendas online que venden: plataformas, checkout, logística y automatización del canal digital.',
  },
  {
    title: 'Automatización',
    slug: 'automatizacion',
    description:
      'Procesos que se hacen solos: integraciones y flujos que ahorran horas de trabajo manual cada semana.',
  },
  {
    title: 'Inteligencia Artificial',
    slug: 'inteligencia-artificial',
    description:
      'IA aplicada a negocios reales: casos con retorno medible, sin humo y sin promesas imposibles.',
  },
  {
    title: 'Apps móviles',
    slug: 'apps-moviles',
    description:
      'Aplicaciones iOS y Android: cuándo conviene una app, qué tecnología usar y cuánto cuesta mantenerla.',
  },
  {
    title: 'Negocios digitales',
    slug: 'negocios-digitales',
    description:
      'Operación y crecimiento con tecnología: señales de que toca digitalizar y por dónde empezar.',
  },
]

interface PostSeed {
  title: string
  slug: string
  excerpt: string
  categorySlugs: string[]
  authorName: string
  cover: string
  publishedAt: string
  blocks: LexicalBlock[]
}

// 8 artículos de arranque, uno por categoría. Contenido real y útil
// (es el canal de captación orgánica), editable después en /admin.
const posts: PostSeed[] = [
  {
    title: 'Cuánto cuesta una página web profesional en 2026',
    slug: 'cuanto-cuesta-una-pagina-web-profesional',
    excerpt:
      'Rangos de precio reales, qué incluye cada nivel y las preguntas que debes hacer antes de firmar una cotización.',
    categorySlugs: ['desarrollo-web', 'negocios-digitales'],
    authorName: 'Ramiro Valdés',
    cover: 'post-precio-web.svg',
    publishedAt: '2026-06-24',
    blocks: [
      {
        paragraph:
          'Es la pregunta que más recibimos en la primera llamada: «¿cuánto me va a costar la página?». Y la respuesta honesta es la que nadie quiere dar: depende de qué tiene que lograr. Un sitio que solo presenta a tu empresa y uno que capta leads todos los días son proyectos distintos, aunque por fuera se parezcan.',
      },
      { heading: 'Los tres niveles de inversión' },
      {
        paragraph:
          'Un sitio informativo de 4 a 6 páginas con diseño a medida se mueve en el rango bajo: presenta la empresa, carga rápido y se ve bien en móvil. Un sitio comercial con CMS, blog, formularios medidos e integraciones con tu CRM es el rango medio — es donde está la mayoría de las pymes que quieren crecer. Y una plataforma con lógica de negocio (portales de clientes, e-commerce, sistemas internos) es un proyecto de software, con presupuesto y plazos de software.',
      },
      { heading: 'Qué encarece un proyecto (y qué no)' },
      {
        paragraph:
          'Lo que más mueve el precio no es el diseño: son las integraciones, los contenidos y las revisiones sin límite. Un alcance claro por escrito abarata más que cualquier descuento. Desconfía de cotizaciones sin desglose: si no sabes qué incluye, no puedes comparar.',
      },
      { heading: 'Las preguntas que debes hacer antes de firmar' },
      {
        paragraph:
          '¿El sitio queda a mi nombre, con mi dominio y mis accesos? ¿Puedo editar contenido sin pagar por cada cambio? ¿Qué pasa después del lanzamiento: soporte, respaldos, seguridad? Un proveedor serio responde las tres sin titubear. Si la respuesta es vaga, el precio barato termina saliendo caro.',
      },
    ],
  },
  {
    title: 'Embudos de venta: qué son y cómo montar el tuyo',
    slug: 'embudo-de-ventas-como-montarlo',
    excerpt:
      'Del clic al cliente: las etapas de un embudo que sí convierte y los errores que desangran presupuesto sin que lo notes.',
    categorySlugs: ['marketing-digital'],
    authorName: 'Sofía Herrera',
    cover: 'post-embudo.svg',
    publishedAt: '2026-06-10',
    blocks: [
      {
        paragraph:
          'Invertir en anuncios sin un embudo es pagar por visitas que no van a ningún lado. Un embudo de ventas es simplemente el camino que recorre una persona desde que te descubre hasta que te compra — y diseñarlo bien importa más que el monto que inviertas en tráfico.',
      },
      { heading: 'Las cuatro etapas que no puedes saltarte' },
      {
        paragraph:
          'Atracción: la persona te encuentra por un anuncio, una búsqueda o una recomendación. Interés: aterriza en una página que habla de su problema, no de tu empresa. Decisión: encuentra prueba de que cumples — casos, testimonios, garantías. Acción: el formulario o el botón de compra no le ponen fricción. La mayoría de los embudos rotos fallan en la segunda etapa: campañas que llevan todo el tráfico a la página de inicio.',
      },
      { heading: 'Mide cada eslabón, no solo el final' },
      {
        paragraph:
          'Si solo mides ventas, no sabes dónde se rompe la cadena. Instrumenta cada paso: clics, visitas que llegan a la landing, formularios iniciados, formularios enviados, leads que contestan. Con esos números, mejorar el embudo deja de ser opinión y se vuelve aritmética: encuentra la etapa con la peor conversión y trabaja ahí primero.',
      },
      {
        paragraph:
          'En ZiftLab montamos embudos completos — landing, campañas, CRM y medición — y la lección se repite en cada proyecto: el presupuesto rinde el doble cuando dejas de adivinar.',
      },
    ],
  },
  {
    title: 'SEO local: cómo aparecer en Google Maps antes que tu competencia',
    slug: 'seo-local-aparecer-en-google-maps',
    excerpt:
      'La mayoría de tus clientes te busca con el celular a unas cuadras de ti. Esto es lo que decide quién aparece primero.',
    categorySlugs: ['seo', 'marketing-digital'],
    authorName: 'Marco Juárez',
    cover: 'post-seo-local.svg',
    publishedAt: '2026-05-27',
    blocks: [
      {
        paragraph:
          'Cuando alguien busca «dentista cerca de mí» o «taller mecánico abierto», Google no muestra el sitio más bonito: muestra tres fichas de Maps antes que cualquier página web. Aparecer en ese bloque — el «local pack» — vale más que la primera posición orgánica para un negocio con clientes de zona.',
      },
      { heading: 'Tu ficha de Google Business es tu segunda portada' },
      {
        paragraph:
          'Complétala como si fuera tu sitio: categoría correcta, horarios reales, fotos recientes, servicios con descripción. Google premia las fichas activas — publica novedades y responde cada reseña, incluidas las malas. Una ficha abandonada le dice al algoritmo que el negocio también podría estarlo.',
      },
      { heading: 'Las reseñas son el nuevo boca a boca (y un factor de ranking)' },
      {
        paragraph:
          'Cantidad, frecuencia y respuesta: las tres cuentan. Monta un flujo simple — un mensaje post-venta con el enlace directo a reseñar — y las reseñas llegan solas. Nunca las compres: Google las detecta y el castigo cuesta más que el atajo.',
      },
      { heading: 'Tu sitio también juega' },
      {
        paragraph:
          'La ficha gana relevancia cuando apunta a un sitio con señales locales claras: dirección y teléfono visibles, una página por zona o servicio, y datos estructurados de negocio local. Es trabajo de una vez que sigue rindiendo cada mes.',
      },
    ],
  },
  {
    title: 'Shopify, WooCommerce o headless: qué tienda le conviene a tu negocio',
    slug: 'shopify-woocommerce-o-headless',
    excerpt:
      'No hay plataforma ganadora: hay etapas de negocio. Guía honesta para elegir sin pagar de más ni quedarte corto.',
    categorySlugs: ['e-commerce', 'desarrollo-web'],
    authorName: 'Ramiro Valdés',
    cover: 'post-tienda.svg',
    publishedAt: '2026-05-13',
    blocks: [
      {
        paragraph:
          'La pregunta correcta no es «¿cuál es la mejor plataforma de e-commerce?» sino «¿cuál es la mejor para mi catálogo, mi operación y mi equipo, hoy?». Las tres opciones dominantes resuelven problemas distintos.',
      },
      { heading: 'Shopify: velocidad para validar y vender' },
      {
        paragraph:
          'Si estás empezando o migras de vender por redes, Shopify te pone a vender en semanas: hosting, pagos y checkout resueltos. El costo es la renta mensual, las comisiones y un techo de personalización — aceptable hasta que tu operación pide cosas que la plataforma no contempla.',
      },
      { heading: 'WooCommerce: control con mantenimiento' },
      {
        paragraph:
          'Sobre WordPress, WooCommerce da control total del sitio y del checkout sin comisión por venta. A cambio, el mantenimiento es tuyo: hosting, actualizaciones, seguridad y rendimiento. Funciona bien en catálogos medianos con un equipo (o agencia) que lo cuide.',
      },
      { heading: 'Headless: para cuando la tienda es el negocio' },
      {
        paragraph:
          'Separar el frontend del motor de comercio — lo que hicimos para Faro Retail con 12.000 SKUs — da velocidad, checkout a medida e integraciones sin límite. Es la opción cara y la única que escala sin fricción cuando el canal digital es tu operación principal, no un anexo.',
      },
      {
        paragraph:
          'Regla práctica: valida en Shopify, crece en WooCommerce o Shopify Plus, y pasa a headless cuando la plataforma sea el cuello de botella — no antes.',
      },
    ],
  },
  {
    title: '5 procesos que tu empresa debería automatizar este año',
    slug: '5-procesos-para-automatizar',
    excerpt:
      'Si tu equipo copia datos entre sistemas o responde lo mismo veinte veces al día, estás pagando salario por trabajo de robot.',
    categorySlugs: ['automatizacion', 'negocios-digitales'],
    authorName: 'Marco Juárez',
    cover: 'post-automatizacion.svg',
    publishedAt: '2026-04-29',
    blocks: [
      {
        paragraph:
          'La automatización rentable no empieza por la tecnología: empieza por encontrar el trabajo repetido. Estos cinco procesos aparecen en casi todas las empresas con las que trabajamos, y los cinco se pagan solos en meses.',
      },
      { heading: '1. La captura de leads' },
      {
        paragraph:
          'Cada formulario, llamada o mensaje debería caer solo en tu CRM, con origen registrado y asignación automática. Si alguien pasa leads a mano a una hoja de cálculo, ahí está tu primera automatización.',
      },
      { heading: '2. El seguimiento comercial' },
      {
        paragraph:
          'El 80% de las ventas requiere varios contactos, y el seguimiento manual muere en el segundo. Secuencias de correo y recordatorios automáticos mantienen viva la conversación sin depender de la memoria de nadie.',
      },
      { heading: '3. La facturación y la cobranza' },
      {
        paragraph:
          'Factura al cerrar la venta, recordatorio antes del vencimiento, aviso al vencer. Es el flujo con retorno más directo: cobra más rápido sin conversaciones incómodas.',
      },
      { heading: '4. El alta de clientes' },
      {
        paragraph:
          'Bienvenida, recolección de documentos, accesos y primer agendamiento pueden dispararse solos al confirmar el pago. Para Nimbo, digitalizar el alta la redujo de cinco días a una hora.',
      },
      { heading: '5. Los reportes' },
      {
        paragraph:
          'Si cada lunes alguien arma el mismo reporte copiando números de tres sistemas, conecta los sistemas y que el reporte llegue solo. Decisión con datos frescos, cero horas invertidas.',
      },
    ],
  },
  {
    title: 'IA para pymes: los casos que sí dan retorno',
    slug: 'ia-para-pymes-casos-reales',
    excerpt:
      'Lejos del humo, la IA ya resuelve tareas concretas en empresas medianas. Estos son los usos que vemos funcionar — y los que no.',
    categorySlugs: ['inteligencia-artificial', 'automatizacion'],
    authorName: 'Ramiro Valdés',
    cover: 'post-ia-pymes.svg',
    publishedAt: '2026-04-15',
    blocks: [
      {
        paragraph:
          'A las pymes les vendieron dos extremos: que la IA les va a resolver todo, o que es cosa de corporativos con presupuestos infinitos. Ninguno es cierto. La IA rinde cuando ataca una tarea concreta, repetitiva y con datos disponibles — no cuando llega como proyecto de innovación sin problema que resolver.',
      },
      { heading: 'Donde vemos retorno real' },
      {
        paragraph:
          'Atención de primera línea: un asistente entrenado con tus políticas y catálogo que responde lo repetido y escala lo delicado a una persona. Clasificación de leads: puntuar y rutear cada contacto según su probabilidad de compra. Procesamiento de documentos: extraer datos de facturas, pedidos o contratos que hoy alguien teclea a mano. Y borradores de contenido: descripciones de producto, respuestas de soporte y reportes que una persona revisa y aprueba.',
      },
      { heading: 'Donde todavía se pierde dinero' },
      {
        paragraph:
          'Proyectos «de IA» sin métrica de éxito definida, chatbots sin acceso a datos reales del negocio que solo frustran clientes, y cualquier flujo donde el error de la IA cueste más que el tiempo que ahorra — cotizaciones, temas legales, promesas de entrega — sin revisión humana.',
      },
      { heading: 'Cómo empezar sin quemarte' },
      {
        paragraph:
          'Elige un solo proceso doloroso y medible. Define el número que debe mejorar. Pilotea un mes con revisión humana y compara. Si funciona, amplía; si no, aprendiste barato. La IA es una herramienta de operación, no una apuesta de fe.',
      },
    ],
  },
  {
    title: '¿Tu negocio necesita una app o te basta una web app?',
    slug: 'app-nativa-o-web-app',
    excerpt:
      'Una app en las tiendas cuesta el doble de lo que crees y la mitad de tus usuarios no la va a descargar. Cuándo sí vale la pena.',
    categorySlugs: ['apps-moviles', 'desarrollo-web'],
    authorName: 'Sofía Herrera',
    cover: 'post-app.svg',
    publishedAt: '2026-04-01',
    blocks: [
      {
        paragraph:
          '«Queremos una app» suele significar «queremos que nuestros clientes nos tengan en el celular». Son cosas distintas: una web app instalable puede lograr lo segundo por una fracción del costo, y hay casos donde solo una app nativa cumple. La diferencia está en tres preguntas.',
      },
      { heading: '¿Con qué frecuencia la va a abrir el usuario?' },
      {
        paragraph:
          'Uso diario o semanal — banca, pedidos recurrentes, operación interna — justifica el espacio en el teléfono. Uso ocasional no: nadie descarga una app para algo que hace dos veces al año. Para eso existe la web.',
      },
      { heading: '¿Necesitas hardware o notificaciones de verdad?' },
      {
        paragraph:
          'Cámara para escanear, GPS en segundo plano, funcionamiento sin conexión, notificaciones críticas: territorio nativo. Consultar información, llenar formularios, dar seguimiento a pedidos: una web app lo resuelve, sin pasar por la revisión de las tiendas ni pagar dos desarrollos.',
      },
      { heading: 'El costo oculto: mantener dos plataformas' },
      {
        paragraph:
          'Una app no se termina: se mantiene. Cada versión de iOS y Android, cada cambio de políticas de las tiendas, cada dispositivo nuevo. Nuestra recomendación habitual es empezar con una web app instalable, validar el uso real, y construir nativo cuando los datos — no la intuición — lo pidan.',
      },
    ],
  },
  {
    title: 'De Excel a sistema: 6 señales de que tu operación ya no escala',
    slug: 'de-excel-a-sistema-senales',
    excerpt:
      'Excel es la mejor herramienta del mundo hasta que se convierte en tu sistema central. Cómo saber cuándo cruzaste la línea.',
    categorySlugs: ['negocios-digitales', 'automatizacion'],
    authorName: 'Marco Juárez',
    cover: 'post-excel.svg',
    publishedAt: '2026-03-18',
    blocks: [
      {
        paragraph:
          'Toda empresa cruza el mismo punto: la hoja de cálculo que empezó como apoyo se volvió el sistema donde vive la operación. No hay nada malo en Excel — el problema es usarlo como base de datos multiusuario, que es exactamente lo que no es.',
      },
      { heading: 'Las señales' },
      {
        paragraph:
          'Uno: existe «la versión buena» del archivo y solo una persona sabe cuál es. Dos: hay celdas que nadie puede tocar porque se rompen las fórmulas. Tres: dos personas capturan el mismo dato en lugares distintos. Cuatro: los reportes del lunes tardan horas en armarse. Cinco: un error de captura llegó a un cliente. Seis: alguien dice «cuando fulano no está, eso no se puede hacer».',
      },
      { heading: 'Qué significa «pasar a sistema»' },
      {
        paragraph:
          'No es comprar un software gigante: es darle a cada dato un solo lugar donde vivir, con permisos, historial y validación. A veces la respuesta es un CRM configurado a tu proceso; a veces, un sistema interno a medida con los flujos exactos de tu operación. Casi nunca es el ERP que te quieren vender completo.',
      },
      { heading: 'El camino sin traumas' },
      {
        paragraph:
          'Migra por proceso, no de golpe: primero el que más duele (ventas, inventario, cobranza), con los datos históricos limpios y el equipo entrenado en ese flujo. En dos o tres iteraciones la operación completa vive en sistema — y Excel vuelve a ser lo que siempre debió ser: una herramienta de análisis, no tu base de datos.',
      },
    ],
  },
]

export const seedPosts = async (payload: Payload): Promise<void> => {
  // Categorías primero: los posts las relacionan
  let categoriesCreated = 0
  for (const category of categories) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
    })
    if (existing.docs[0]) continue
    await payload.create({ collection: 'categories', data: category })
    categoriesCreated += 1
  }
  payload.logger.info(
    `Seed de categorías: ${categoriesCreated} creadas, ${categories.length - categoriesCreated} ya al día`,
  )

  let created = 0
  let skipped = 0
  for (const post of posts) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
    })
    if (existing.docs[0]) {
      skipped += 1
      continue
    }

    const [postCategories, author, cover] = await Promise.all([
      payload.find({
        collection: 'categories',
        where: { slug: { in: post.categorySlugs } },
        limit: post.categorySlugs.length,
      }),
      payload.find({
        collection: 'team-members',
        where: { name: { equals: post.authorName } },
        limit: 1,
      }),
      payload.create({
        collection: 'media',
        data: { alt: `Portada del artículo ${post.title}` },
        filePath: path.resolve(dirname, 'assets', post.cover),
      }),
    ])

    // El find con `in` no respeta el orden pedido — se reordena según el seed
    // (la primera categoría es la primaria: se muestra en cards y destacados)
    const categoryIdBySlug = new Map(postCategories.docs.map((doc) => [doc.slug, doc.id]))

    await payload.create({
      collection: 'posts',
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: cover.id,
        author: author.docs[0]?.id ?? null,
        categories: post.categorySlugs
          .map((slug) => categoryIdBySlug.get(slug))
          .filter((id): id is number => id !== undefined),
        content: lexicalBlocks(post.blocks),
        publishedAt: new Date(`${post.publishedAt}T09:00:00.000Z`).toISOString(),
        meta: {
          title: `${post.title} | ZiftLab`,
          description: post.excerpt,
        },
        _status: 'published',
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de posts: ${created} creados, ${skipped} ya al día`)
}
