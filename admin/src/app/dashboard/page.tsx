const modules = [
  {
    id: 'contenido',
    title: 'Contenido',
    text: 'Base lista para servicios, proyectos, posts, landings y globals.',
  },
  {
    id: 'seo',
    title: 'SEO',
    text: 'Espacio reservado para metadata, redirecciones y health editorial.',
  },
  {
    id: 'leads',
    title: 'Leads',
    text: 'Preparado para CRM, formularios y seguimiento comercial.',
  },
  {
    id: 'sistema',
    title: 'Sistema',
    text: 'Health check disponible sin depender de Payload ni base de datos.',
  },
]

export default async function DashboardPage() {
  return (
    <main className="px-6 py-8 lg:px-10">
      <section className="max-w-5xl">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
          Fase 3 autenticacion
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Dashboard protegido con sesiones propias.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          El acceso usa usuarios, Argon2id, cookies httpOnly y sesiones persistentes en la base
          PostgreSQL propia.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatusCard label="Framework" value="Next.js App Router" />
        <StatusCard label="Payload" value="No importado" />
        <StatusCard label="Auth" value="Sesion DB activa" />
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        {modules.map((module) => (
          <article
            key={module.id}
            id={module.id}
            className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
          >
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
              Modulo futuro
            </p>
            <h2 className="mt-3 text-xl font-semibold">{module.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{module.text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  )
}
