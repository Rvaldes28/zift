export type ServiceSeed = {
  title: string
  slug: string
  excerpt: string
  features: string[]
  benefits: { title: string; text: string }[]
  paragraphs: string[]
  order: number
}

// Método estándar ZiftLab — la misma secuencia aplica a todos los servicios
export const serviceProcess = [
  { title: 'Descubrimiento', text: 'Entendemos tu negocio, objetivos y punto de partida.' },
  { title: 'Propuesta', text: 'Alcance, plazos y precio claros antes de empezar.' },
  { title: 'Construcción', text: 'Ejecución por fases con entregas visibles cada semana.' },
  {
    title: 'Lanzamiento y mejora',
    text: 'Salida a producción, medición y optimización continua.',
  },
]

// Los 14 servicios mínimos de docs/FASES.MD §8 FASE 2, en su orden
export const services: ServiceSeed[] = [
  {
    title: 'Desarrollo web',
    slug: 'desarrollo-web',
    excerpt:
      'Sitios web rápidos, seguros y optimizados para convertir visitantes en clientes, construidos con tecnología moderna.',
    features: [
      'Arquitectura moderna con Astro y CMS headless',
      'Performance y Core Web Vitals como prioridad',
      'Diseño responsive y accesible',
      'Contenido 100% editable sin tocar código',
    ],
    benefits: [
      {
        title: 'Más velocidad, más ventas',
        text: 'Sitios que cargan en milisegundos y convierten mejor en Google y en móvil.',
      },
      {
        title: 'Autonomía total',
        text: 'Tu equipo edita el contenido desde un panel sin depender de un desarrollador.',
      },
      {
        title: 'Base técnica sólida',
        text: 'SEO técnico, analítica y seguridad incluidos desde el primer día.',
      },
    ],
    paragraphs: [
      'Construimos sitios web corporativos y comerciales pensados para vender: rápidos, seguros y fáciles de administrar. Usamos arquitecturas modernas con frontend estático y CMS headless, lo que se traduce en tiempos de carga mínimos y mejor posicionamiento en Google.',
      'Cada proyecto incluye diseño responsive, SEO técnico de base, analítica y un panel de administración desde el que tu equipo edita todo el contenido sin depender de un desarrollador.',
    ],
    order: 1,
  },
  {
    title: 'E-commerce',
    slug: 'e-commerce',
    excerpt:
      'Tiendas online completas que convierten: catálogo, pagos, envíos y automatización de marketing integrados.',
    features: [
      'Catálogo y checkout optimizados para conversión',
      'Integración de pasarelas de pago y envíos',
      'Automatización de carritos abandonados y email',
      'Métricas de venta y funnels claros',
    ],
    benefits: [
      {
        title: 'Checkout que convierte',
        text: 'Menos fricción en cada paso del embudo, más pedidos completados.',
      },
      {
        title: 'Operación integrada',
        text: 'Pagos, envíos y facturación conectados en un solo flujo.',
      },
      {
        title: 'Ventas en automático',
        text: 'Carritos abandonados y email marketing trabajando 24/7.',
      },
    ],
    paragraphs: [
      'Diseñamos y desarrollamos tiendas online enfocadas en una sola cosa: vender más. Desde el catálogo hasta el checkout, cada paso está optimizado para reducir fricción y aumentar la conversión.',
      'Integramos pasarelas de pago, logística de envíos, facturación y automatizaciones de marketing (carritos abandonados, cross-selling, email) para que tu operación escale sin trabajo manual.',
    ],
    order: 2,
  },
  {
    title: 'Web apps',
    slug: 'web-apps',
    excerpt:
      'Aplicaciones web a medida — paneles, portales y sistemas internos que digitalizan la operación de tu empresa.',
    features: [
      'Desarrollo a medida con TypeScript',
      'Paneles administrativos y portales de clientes',
      'Integración con tus sistemas y APIs existentes',
      'Escalables y listas para producción',
    ],
    benefits: [
      {
        title: 'Procesos digitalizados',
        text: 'Reemplaza hojas de cálculo y trabajo manual por software a medida.',
      },
      {
        title: 'Escala sin fricción',
        text: 'Arquitectura TypeScript lista para crecer con tu operación.',
      },
      {
        title: 'Integrado con lo tuyo',
        text: 'Se conecta con tus sistemas y APIs existentes.',
      },
    ],
    paragraphs: [
      'Desarrollamos aplicaciones web a medida: paneles administrativos, portales de clientes, sistemas de gestión interna y herramientas que reemplazan hojas de cálculo y procesos manuales.',
      'Trabajamos con TypeScript de punta a punta, APIs bien diseñadas y despliegues automatizados, para que el software crezca con tu negocio sin acumular deuda técnica.',
    ],
    order: 3,
  },
  {
    title: 'Apps móviles',
    slug: 'apps-moviles',
    excerpt:
      'Aplicaciones móviles para iOS y Android que conectan tu negocio con tus clientes en cualquier lugar.',
    features: [
      'Desarrollo multiplataforma iOS y Android',
      'Notificaciones push y engagement',
      'Integración con tu backend y CMS',
      'Publicación en App Store y Google Play',
    ],
    benefits: [
      {
        title: 'Presencia en el bolsillo',
        text: 'Tu negocio disponible para el cliente en iOS y Android.',
      },
      {
        title: 'Engagement real',
        text: 'Notificaciones push que traen usuarios de vuelta.',
      },
      {
        title: 'Un solo código',
        text: 'Desarrollo multiplataforma: menos costo, mismo alcance.',
      },
    ],
    paragraphs: [
      'Creamos aplicaciones móviles para iOS y Android con enfoque multiplataforma: una sola base de código, experiencia nativa y menor costo de mantenimiento.',
      'Nos encargamos del ciclo completo: diseño de producto, desarrollo, integración con tus sistemas, publicación en las tiendas y evolución continua con métricas de uso reales.',
    ],
    order: 4,
  },
  {
    title: 'Marketing digital',
    slug: 'marketing-digital',
    excerpt:
      'Estrategias de marketing medibles que combinan contenido, pauta y automatización para generar demanda constante.',
    features: [
      'Estrategia por canal basada en datos',
      'Contenido orientado a conversión',
      'Embudos de captación y nutrición de leads',
      'Reportes claros de retorno de inversión',
    ],
    benefits: [
      {
        title: 'Estrategia completa',
        text: 'Canales, mensajes y presupuesto alineados a objetivos de venta.',
      },
      {
        title: 'Decisiones con datos',
        text: 'Reportes claros de qué funciona y qué no.',
      },
      {
        title: 'Crecimiento sostenido',
        text: 'Optimización continua, no campañas sueltas.',
      },
    ],
    paragraphs: [
      'Diseñamos estrategias de marketing digital completas: definimos audiencias, canales, mensajes y embudos de conversión, y los ejecutamos con un plan medible mes a mes.',
      'Nada de métricas de vanidad: optimizamos hacia leads y ventas, con tableros de resultados que muestran exactamente qué canal genera retorno.',
    ],
    order: 5,
  },
  {
    title: 'Google Ads',
    slug: 'google-ads',
    excerpt:
      'Campañas de Google Ads gestionadas para capturar demanda activa: búsqueda, shopping, display y YouTube.',
    features: [
      'Investigación de palabras clave y competencia',
      'Campañas de búsqueda, shopping y YouTube',
      'Optimización continua de puja y calidad',
      'Seguimiento de conversiones bien implementado',
    ],
    benefits: [
      {
        title: 'Demanda que ya existe',
        text: 'Aparece exactamente cuando el cliente busca lo que vendes.',
      },
      {
        title: 'Presupuesto eficiente',
        text: 'Pujas y segmentación optimizadas para bajar el costo por lead.',
      },
      {
        title: 'Medible de punta a punta',
        text: 'Cada peso invertido rastreado hasta la conversión.',
      },
    ],
    paragraphs: [
      'Gestionamos campañas de Google Ads para capturar a las personas que ya están buscando lo que vendes. Estructuramos cuentas limpias, con palabras clave rentables y anuncios relevantes que bajan el costo por clic.',
      'Implementamos el seguimiento de conversiones correctamente (llamadas, formularios, ventas) y optimizamos cada semana hacia el costo por adquisición objetivo.',
    ],
    order: 6,
  },
  {
    title: 'Meta Ads',
    slug: 'meta-ads',
    excerpt:
      'Publicidad en Facebook e Instagram con creativos que detienen el scroll y embudos que convierten.',
    features: [
      'Estrategia de embudo frío, tibio y caliente',
      'Creativos y copies orientados a conversión',
      'Públicos personalizados y lookalikes',
      'Optimización de eventos con la API de conversiones',
    ],
    benefits: [
      {
        title: 'Alcance segmentado',
        text: 'Audiencias precisas en Facebook e Instagram.',
      },
      {
        title: 'Creativos que venden',
        text: 'Anuncios diseñados para detener el scroll.',
      },
      {
        title: 'Remarketing inteligente',
        text: 'Recupera a los visitantes que no compraron a la primera.',
      },
    ],
    paragraphs: [
      'Creamos y gestionamos campañas en Facebook e Instagram que generan demanda: creativos que detienen el scroll, públicos bien segmentados y embudos que llevan del primer impacto a la compra.',
      'Configuramos el píxel y la API de conversiones para medir con precisión, y escalamos lo que funciona con pruebas continuas de creativos y audiencias.',
    ],
    order: 7,
  },
  {
    title: 'SEO',
    slug: 'seo',
    excerpt:
      'Posicionamiento orgánico en Google: SEO técnico, contenido y autoridad para captar tráfico que compra.',
    features: [
      'Auditoría técnica y corrección de errores',
      'Investigación de palabras clave por intención',
      'Contenido optimizado que posiciona',
      'Estrategia de autoridad y enlaces',
    ],
    benefits: [
      {
        title: 'Tráfico sin pagar por clic',
        text: 'Posicionamiento orgánico que se acumula con el tiempo.',
      },
      {
        title: 'Base técnica impecable',
        text: 'Core Web Vitals, indexación y estructura optimizadas.',
      },
      {
        title: 'Contenido con intención',
        text: 'Páginas que responden exactamente lo que tu cliente busca.',
      },
    ],
    paragraphs: [
      'Posicionamos tu sitio en Google con una estrategia integral: SEO técnico (velocidad, indexación, datos estructurados), contenido orientado a la intención de búsqueda y construcción de autoridad.',
      'El resultado es tráfico orgánico constante y calificado que no depende de pagar pauta cada mes, con reportes de posiciones, tráfico y conversiones.',
    ],
    order: 8,
  },
  {
    title: 'Automatización',
    slug: 'automatizacion',
    excerpt:
      'Automatizamos procesos repetitivos de tu negocio: menos trabajo manual, menos errores, más velocidad.',
    features: [
      'Mapeo y rediseño de procesos',
      'Integración entre tus herramientas y APIs',
      'Flujos automáticos de ventas y operación',
      'Alertas y reportes sin intervención manual',
    ],
    benefits: [
      {
        title: 'Horas recuperadas',
        text: 'Tareas repetitivas que se ejecutan solas, sin errores.',
      },
      {
        title: 'Sistemas conectados',
        text: 'Tus herramientas hablan entre sí sin copiar y pegar.',
      },
      {
        title: 'Operación escalable',
        text: 'Crece el volumen de trabajo sin crecer la nómina.',
      },
    ],
    paragraphs: [
      'Identificamos los procesos repetitivos que consumen horas de tu equipo — captura de datos, seguimientos, reportes, facturación — y los automatizamos conectando tus herramientas.',
      'Diseñamos flujos confiables con validaciones y alertas, para que la operación corra sola y tu equipo se concentre en el trabajo que realmente genera valor.',
    ],
    order: 9,
  },
  {
    title: 'CRM',
    slug: 'crm',
    excerpt:
      'Implementamos y configuramos tu CRM para que ningún lead se pierda y cada venta tenga seguimiento.',
    features: [
      'Implementación y migración de CRM',
      'Pipelines de venta a la medida de tu proceso',
      'Automatización de seguimientos y email',
      'Capacitación del equipo comercial',
    ],
    benefits: [
      {
        title: 'Nada se pierde',
        text: 'Cada lead y cada conversación registrados en un solo lugar.',
      },
      {
        title: 'Seguimiento a tiempo',
        text: 'Recordatorios y pipelines que empujan la venta.',
      },
      {
        title: 'Embudo medible',
        text: 'Visibilidad total del pipeline comercial.',
      },
    ],
    paragraphs: [
      'Implementamos CRM a la medida de tu proceso comercial: pipelines claros, captura automática de leads desde tu web y campañas, y seguimientos que no dependen de la memoria de nadie.',
      'Migramos tus datos, integramos el CRM con tu sitio y tus canales, y capacitamos a tu equipo para que la herramienta se use de verdad.',
    ],
    order: 10,
  },
  {
    title: 'Inteligencia Artificial',
    slug: 'inteligencia-artificial',
    excerpt:
      'Soluciones con IA aplicadas a tu negocio: asistentes, análisis de datos y automatización inteligente.',
    features: [
      'Asistentes y chatbots entrenados con tu información',
      'Automatización inteligente de documentos y datos',
      'Integración de modelos de IA en tus sistemas',
      'Casos de uso con retorno medible',
    ],
    benefits: [
      {
        title: 'Casos de uso reales',
        text: 'IA aplicada a procesos concretos de tu negocio, no experimentos.',
      },
      {
        title: 'Atención 24/7',
        text: 'Asistentes y chatbots que responden al instante.',
      },
      {
        title: 'Ventaja competitiva',
        text: 'Automatiza análisis y decisiones antes que tu competencia.',
      },
    ],
    paragraphs: [
      'Aplicamos inteligencia artificial a problemas reales de negocio: asistentes que atienden clientes con tu información, clasificación y extracción de datos de documentos, y automatizaciones que antes requerían criterio humano.',
      'Empezamos por los casos de uso con retorno claro, integramos los modelos en tus sistemas actuales y medimos el impacto en horas ahorradas y ventas generadas.',
    ],
    order: 11,
  },
  {
    title: 'Diseño gráfico',
    slug: 'diseno-grafico',
    excerpt:
      'Diseño gráfico profesional para tu marca: piezas digitales e impresas consistentes y memorables.',
    features: [
      'Piezas para redes sociales y campañas',
      'Material corporativo e impreso',
      'Presentaciones y documentos comerciales',
      'Consistencia visual con tu identidad',
    ],
    benefits: [
      {
        title: 'Identidad consistente',
        text: 'Piezas alineadas a tu marca en todos los canales.',
      },
      {
        title: 'Diseño que comunica',
        text: 'Cada pieza con un objetivo claro, no solo decoración.',
      },
      {
        title: 'Entrega ágil',
        text: 'Un sistema de trabajo que mantiene calidad y velocidad.',
      },
    ],
    paragraphs: [
      'Diseñamos las piezas que tu marca necesita para comunicar con nivel profesional: publicaciones y anuncios para redes, material corporativo, presentaciones comerciales y piezas impresas.',
      'Todo bajo un sistema visual consistente, con entregables listos para usar en cada canal y tiempos de respuesta ágiles.',
    ],
    order: 12,
  },
  {
    title: 'Branding',
    slug: 'branding',
    excerpt:
      'Construimos marcas sólidas: identidad visual, tono de voz y sistema de marca que te diferencia.',
    features: [
      'Estrategia y posicionamiento de marca',
      'Identidad visual y logotipo',
      'Manual de marca y sistema de aplicación',
      'Tono de voz y mensajes clave',
    ],
    benefits: [
      {
        title: 'Marca memorable',
        text: 'Una identidad que se reconoce y se recuerda.',
      },
      {
        title: 'Coherencia total',
        text: 'Manual y sistema visual para aplicar la marca sin dudas.',
      },
      {
        title: 'Diferenciación real',
        text: 'Posicionamiento claro frente a tu competencia.',
      },
    ],
    paragraphs: [
      'Desarrollamos marcas desde la estrategia: definimos posicionamiento, personalidad y mensajes clave, y los traducimos en una identidad visual sólida que te diferencia de la competencia.',
      'Entregamos un sistema de marca completo — logotipo, paleta, tipografías, aplicaciones y manual — para que cada punto de contacto comunique lo mismo con la misma calidad.',
    ],
    order: 13,
  },
  {
    title: 'Consultoría tecnológica',
    slug: 'consultoria-tecnologica',
    excerpt:
      'Te ayudamos a tomar decisiones tecnológicas correctas: stack, arquitectura, proveedores y roadmap digital.',
    features: [
      'Auditoría de sistemas y procesos actuales',
      'Selección de stack y proveedores',
      'Roadmap de transformación digital',
      'Acompañamiento en implementación',
    ],
    benefits: [
      {
        title: 'Decisiones informadas',
        text: 'Roadmap tecnológico alineado al negocio, no a la moda.',
      },
      {
        title: 'Menos riesgo',
        text: 'Auditoría de sistemas y procesos antes de invertir.',
      },
      {
        title: 'Acompañamiento senior',
        text: 'Experiencia real en arquitectura y producto.',
      },
    ],
    paragraphs: [
      'Asesoramos a empresas que necesitan tomar decisiones tecnológicas importantes: qué sistema comprar o construir, cómo modernizar su operación, qué proveedores elegir y en qué orden invertir.',
      'Auditamos tu situación actual, diseñamos un roadmap realista con prioridades y presupuesto, y te acompañamos durante la implementación para que las decisiones se ejecuten bien.',
    ],
    order: 14,
  },
]
