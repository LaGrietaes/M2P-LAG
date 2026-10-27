import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { LaGrietaFooter } from "../components/LaGrietaFooter";
import { AmbientBackground } from "../components/AmbientBackground";
import { useTranslation } from "../lib/i18n/I18nContext";
import { LanguageSelector } from "../components/LanguageSelector";

export type LegalDocType = "aviso-legal" | "privacidad" | "terminos" | "cookies";

export default function Legal() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const resolveDoc = (param?: string): LegalDocType => {
    if (param === "privacidad") return "privacidad";
    if (param === "terminos") return "terminos";
    if (param === "cookies") return "cookies";
    return "aviso-legal";
  };

  const [activeTab, setActiveTab] = useState<LegalDocType>(resolveDoc(slug));

  useEffect(() => {
    setActiveTab(resolveDoc(slug));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  const handleTabChange = (tab: LegalDocType) => {
    setActiveTab(tab);
    navigate(`/legal/${tab}`, { replace: true });
  };

  const triggerCookieSettings = () => {
    // Triggers the federated cookie banner
    document.cookie = "lagrieta_consent=; Path=/; Domain=.lagrieta.es; Max-Age=0";
    document.cookie = "lagrieta_consent=; Path=/; Max-Age=0";
    localStorage.removeItem("lagrieta_consent");
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen bg-[#040508] text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background ambient CRT */}
      <AmbientBackground stage="input" />

      {/* Top Tactical Navigation Bar */}
      <header className="relative z-20 border-b border-border-subtle bg-[#040508]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="w-7 h-7" />
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-xl tracking-tight text-white">
                M2P
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase bg-accent/20 border border-accent/40 text-accent-bright">
                OPEN BETA
              </span>
            </div>
          </Link>
          <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.15em] text-text-secondary uppercase border-l border-border-subtle pl-3">
            {t('legal.compliance_tag')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link
            to="/"
            className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-white px-3 py-1.5 border border-border-subtle hover:border-accent transition-colors flex items-center gap-1.5"
          >
            <span>{t('legal.back_to_m2p')}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Dossier Header */}
        <div className="border-b border-white/10 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-accent-bright animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest uppercase text-accent-bright font-bold">
                CUMPLIMIENTO LEGAL // M2P.LAGRIETA.ES
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              Información Legal y Regulatoria
            </h1>
            <p className="font-mono text-xs text-text-secondary mt-0.5">
              Subdominio Oficial: <strong className="text-white">m2p.lagrieta.es</strong> · Host Canónico: <strong className="text-accent-bright">lagrieta.es</strong>
            </p>
          </div>

          <div className="self-start sm:self-auto px-3 py-1 bg-white/5 border border-white/10 font-mono text-[10px] text-emerald-400 font-bold tracking-wider">
            ✓ AUDITADO LSSI-CE / RGPD
          </div>
        </div>

        {/* Tactical Document Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("aviso-legal")}
            className={`py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer border ${
              activeTab === "aviso-legal"
                ? "bg-accent text-white border-accent-bright shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                : "bg-surface/80 text-text-secondary border-border-subtle hover:text-white hover:border-white/20"
            }`}
          >
            Aviso Legal
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("privacidad")}
            className={`py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer border ${
              activeTab === "privacidad"
                ? "bg-accent text-white border-accent-bright shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                : "bg-surface/80 text-text-secondary border-border-subtle hover:text-white hover:border-white/20"
            }`}
          >
            Privacidad
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("terminos")}
            className={`py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer border ${
              activeTab === "terminos"
                ? "bg-accent text-white border-accent-bright shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                : "bg-surface/80 text-text-secondary border-border-subtle hover:text-white hover:border-white/20"
            }`}
          >
            Términos
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("cookies")}
            className={`py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer border ${
              activeTab === "cookies"
                ? "bg-accent text-white border-accent-bright shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                : "bg-surface/80 text-text-secondary border-border-subtle hover:text-white hover:border-white/20"
            }`}
          >
            Cookies
          </button>
        </div>

        {/* Document Body */}
        <div className="bg-[#080b11]/95 border border-border-subtle p-6 sm:p-8 backdrop-blur-xl shadow-2xl font-mono text-xs leading-relaxed space-y-6">
          {/* ────────────────── 1. AVISO LEGAL ────────────────── */}
          {activeTab === "aviso-legal" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-white/10 pb-3">
                <span className="text-[10px] text-accent-bright uppercase tracking-widest font-bold">
                  DOC-01 // LSSI-CE
                </span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-1">
                  Aviso Legal y Condiciones de Identificación
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Cumplimiento con el Artículo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  01 // Identificación del Titular del Ecosistema
                </h3>
                <p className="text-text-secondary">
                  En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE), se informa de los datos identificativos del titular responsable de la plataforma tecnológica:
                </p>
                <div className="p-3 bg-black/60 border border-white/10 space-y-1 text-text-secondary">
                  <p><strong className="text-white">Denominación:</strong> LA GRIETA DIGITAL MEDIA & SYSTEMS</p>
                  <p><strong className="text-white">NIF / CIF:</strong> B-88492017</p>
                  <p><strong className="text-white">Domicilio de Notificaciones:</strong> Calle Gran Vía 28, Planta 4, 28013 Madrid, España</p>
                  <p><strong className="text-white">Contacto General:</strong> contacto@lagrieta.es</p>
                  <p><strong className="text-white">Asuntos Legales y Cumplimiento:</strong> legal@lagrieta.es</p>
                  <p><strong className="text-white">Dominio Matriz:</strong> https://lagrieta.es</p>
                  <p><strong className="text-white">Subdominio de Servicio Activo:</strong> https://m2p.lagrieta.es</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  02 // Objeto y Ámbito del Servicio M2P
                </h3>
                <p className="text-text-secondary">
                  M2P (Media Server 2 Peer) es una utilidad web táctica orientada al análisis, fragmentación y entrega de transmisiones multimedia a petición del usuario. Las presentes condiciones regulan el acceso y utilización del subdominio <strong className="text-white">m2p.lagrieta.es</strong>, atribuyendo la condición de USUARIO a cualquier persona que interactúe con la herramienta.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  03 // Condiciones de Uso y Responsabilidad del Usuario
                </h3>
                <p className="text-text-secondary">
                  El usuario se compromete a hacer un uso legítimo y conforme a la ley de la plataforma. Queda expresamente prohibido:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text-secondary pl-1">
                  <li>Incurrir en actividades ilícitas o lesivas de derechos de terceros.</li>
                  <li>Procesar material que vulnere derechos de propiedad intelectual sin autorización expresa de sus legítimos titulares.</li>
                  <li>Introducir código malicioso, scripts automatizados no autorizados o provocar sobrecargas deliberadas en la infraestructura de servidores.</li>
                  <li>Manipular las credenciales de sesión o intentar alterar los balances de energía comunitaria (B1T$).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  04 // Propiedad Intelectual e Industrial
                </h3>
                <p className="text-text-secondary">
                  El diseño visual de la interfaz HUD, las marcas distintivas M2P y La Grieta, los logotipos y el software de integración son propiedad exclusiva de LA GRIETA DIGITAL MEDIA & SYSTEMS o cuentan con licencias de código abierto compatibles.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  05 // Exclusión de Garantías y Legislación
                </h3>
                <p className="text-text-secondary">
                  La plataforma se proporciona en régimen de Open Beta "tal cual" (as-is). La relación entre el usuario y la plataforma se rige por la legislación española vigente, sometiéndose las partes a los Juzgados y Tribunales de la ciudad de Madrid (España).
                </p>
              </section>
            </div>
          )}

          {/* ────────────────── 2. PRIVACIDAD ────────────────── */}
          {activeTab === "privacidad" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-white/10 pb-3">
                <span className="text-[10px] text-accent-bright uppercase tracking-widest font-bold">
                  DOC-02 // RGPD & LOPDGDD
                </span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-1">
                  Política de Privacidad y Tratamiento de Datos
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Conforme al Reglamento General de Protección de Datos (RGPD UE 2016/679) y Ley Orgánica 3/2018 (LOPDGDD)
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  01 // Responsable del Tratamiento
                </h3>
                <p className="text-text-secondary">
                  <strong className="text-white">LA GRIETA DIGITAL MEDIA & SYSTEMS</strong> (NIF: B-88492017), con domicilio en Calle Gran Vía 28, Planta 4, 28013 Madrid. Correo de contacto del Delegado de Protección de Datos: <a href="mailto:derechos@lagrieta.es" className="text-accent-bright hover:underline">derechos@lagrieta.es</a> / <a href="mailto:legal@lagrieta.es" className="text-accent-bright hover:underline">legal@lagrieta.es</a>.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  02 // Principio de Minimización y Ciclo Efímero
                </h3>
                <p className="text-text-secondary">
                  M2P aplica estrictos principios de <strong className="text-white">Privacidad desde el Diseño</strong>:
                </p>
                <div className="p-3 bg-black/60 border border-white/10 space-y-1.5 text-text-secondary">
                  <p>• <strong className="text-white">Sin Recogida para Invitados (Guest):</strong> Para usuarios no autenticados, no se recopila información personal identificable. Las cuotas de prueba se gestionan mediante tokens locales y hashes anónimos de petición.</p>
                  <p>• <strong className="text-white">Operadores La Grieta (SSO):</strong> Únicamente se tratan el alias/nombre, correo de registro y el saldo de B1T$ para validar el acceso sin restricciones de clip.</p>
                  <p>• <strong className="text-white">Almacenamiento Temporal y Purga:</strong> Los archivos resultantes de las extracciones se almacenan de manera transitoria en volúmenes protegidos y se eliminan automáticamente tras su entrega o al expirar su tiempo límite de vida (TTL).</p>
                  <p>• <strong className="text-white">Analítica Respetuosa:</strong> La medición de audiencia se ejecuta mediante Plausible Analytics autoalojado en la Unión Europea, sin cookies de seguimiento publicitario ni registro de direcciones IP permanentes.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  03 // Bases Jurídicas del Tratamiento
                </h3>
                <p className="text-text-secondary">
                  El tratamiento de datos se fundamenta en la <strong className="text-white">ejecución del servicio solicitado</strong> (Art. 6.1.b RGPD) para el procesamiento de clips, el <strong className="text-white">interés legítimo</strong> en la seguridad de la infraestructura (Art. 6.1.f RGPD) y el <strong className="text-white">consentimiento explícito</strong> (Art. 6.1.a RGPD) en caso de configuración de cookies analíticas federadas.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  04 // Derechos del Interesado (ARSULIPO)
                </h3>
                <p className="text-text-secondary">
                  Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición enviando un mensaje con la referencia `[DERECHOS RGPD]` a <a href="mailto:derechos@lagrieta.es" className="text-accent-bright hover:underline">derechos@lagrieta.es</a>. Asimismo, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">AEPD</a>).
                </p>
              </section>
            </div>
          )}

          {/* ────────────────── 3. TÉRMINOS Y CONDICIONES ────────────────── */}
          {activeTab === "terminos" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-white/10 pb-3">
                <span className="text-[10px] text-accent-bright uppercase tracking-widest font-bold">
                  DOC-03 // CONDICIONES DE SERVICIO
                </span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-1">
                  Términos y Condiciones de Uso del Servicio M2P
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Normas de uso operativo, cuotas de extracción y régimen de los créditos comunitarios B1T$
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  01 // Aceptación y Alcance
                </h3>
                <p className="text-text-secondary">
                  El uso de M2P implica la aceptación plena de estos términos, así como de la política de privacidad y aviso legal federado de La Grieta. Si no estás de acuerdo con alguna de estas condiciones, debes cesar el uso de la herramienta.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  02 // Régimen de Cuotas: Modo Invitado vs. Operador Registrado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-black/60 border border-white/10">
                    <p className="text-accent font-bold uppercase tracking-wider text-[11px] mb-1">
                      MODO VISITANTE (GUEST)
                    </p>
                    <ul className="text-text-secondary space-y-1 text-[11px]">
                      <li>• Límite estricto de duración: 20 segundos por clip.</li>
                      <li>• 1 descarga de fuente completa de cortesía.</li>
                      <li>• Sin almacenamiento de historial en la nube.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/60 border border-accent/40">
                    <p className="text-accent-bright font-bold uppercase tracking-wider text-[11px] mb-1">
                      OPERADOR REGISTRADO (LAGRIETA.ES)
                    </p>
                    <ul className="text-text-secondary space-y-1 text-[11px]">
                      <li>• Sin límite de duración en recortes de vídeo/audio.</li>
                      <li>• Extracciones completas continuas.</li>
                      <li>• Historial táctico local de descargas.</li>
                      <li>• Consumo medido por créditos comunitarios B1T$.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  03 // Régimen Jurídico de los Créditos B1T$
                </h3>
                <div className="p-3 bg-black/60 border border-accent/30 space-y-2 text-text-secondary">
                  <p>
                    <strong className="text-white">1. Naturaleza No Financiera:</strong> Los tokens o unidades <strong className="text-accent-bright">B1T$</strong> son elementos de fidelidad y energía computacional interna del ecosistema La Grieta.
                  </p>
                  <p>
                    <strong className="text-white">2. Exclusión de Instrumentos Regulados:</strong> Los B1T$ no constituyen dinero de curso legal, dinero electrónico, valores negociables ni criptoactivos financieros conforme a MiCA o MiFID II. No devengan intereses ni tienen valor de rescate garantizado en divisas fiduciarias (EUR/USD).
                  </p>
                  <p>
                    <strong className="text-white">3. Obtención Exclusivamente Orgánica:</strong> Los B1T$ se adquieren mediante la participación comunitaria en <a href="https://lagrieta.es" target="_blank" rel="noopener noreferrer" className="text-accent-bright hover:underline">lagrieta.es</a> (lectura de publicaciones, retos, aportaciones y actividades de la red). <strong className="text-white">En M2P los B1T$ no se compran con dinero real</strong>.
                  </p>
                  <p>
                    <strong className="text-white">4. Tasas de Operación en M2P:</strong> Cada minuto de clip procesado consume 1 B1T$. Las descargas de fuentes completas consumen aproximadamente 1 B1T$ por cada 50 MB de volumen procesado.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  04 // Uso Legítimo del Contenido Procesado
                </h3>
                <p className="text-text-secondary">
                  M2P actúa como un agente técnico neutral para la extracción y remezcla técnica de contenidos. El usuario es el único responsable de contar con los derechos legítimos, licencias de cita, excepciones legales aplicables o autorización previa de los titulares de las fuentes extraídas.
                </p>
              </section>
            </div>
          )}

          {/* ────────────────── 4. COOKIES ────────────────── */}
          {activeTab === "cookies" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-white/10 pb-3">
                <span className="text-[10px] text-accent-bright uppercase tracking-widest font-bold">
                  DOC-04 // CONSENTIMIENTO FEDERADO
                </span>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-1">
                  Política de Cookies y Almacenamiento Local
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Conforme al Artículo 22.2 de la LSSI-CE y directrices del Comité Europeo de Protección de Datos (CEPD)
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  01 // ¿Qué Tecnologías Emplea M2P?
                </h3>
                <p className="text-text-secondary">
                  M2P aplica una política estricta de minimización técnica. No empleamos cookies de rastreo entre sitios para publicidad de terceros ni comercializamos perfiles de navegación.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  02 // Consentimiento Federado en *.lagrieta.es
                </h3>
                <p className="text-text-secondary">
                  Para evitar solicitar consentimiento de manera repetitiva en cada herramienta del ecosistema, el estado de tus preferencias se almacena en una cookie federada compartida para todo el dominio <strong className="text-white">.lagrieta.es</strong>:
                </p>
                <div className="p-3 bg-black/60 border border-white/10 text-text-secondary space-y-1">
                  <p><strong className="text-white">Nombre de Cookie:</strong> lagrieta_consent</p>
                  <p><strong className="text-white">Dominio Federado:</strong> .lagrieta.es</p>
                  <p><strong className="text-white">Caducidad:</strong> 1 año (365 días)</p>
                  <p><strong className="text-white">Contenido:</strong> Preferencias de analítica y funcionalidad elegidas por el usuario.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                  03 // Tabla Completa de Cookies y Almacenamiento
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-white/10 text-[11px]">
                    <thead className="bg-white/5 text-white font-bold border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Clave / Cookie</th>
                        <th className="p-2.5">Mecanismo</th>
                        <th className="p-2.5">Duración</th>
                        <th className="p-2.5">Finalidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-text-secondary">
                      <tr>
                        <td className="p-2.5 font-bold text-accent-bright">lagrieta_consent</td>
                        <td className="p-2.5">Cookie (.lagrieta.es)</td>
                        <td className="p-2.5">1 año</td>
                        <td className="p-2.5">Guarda el estado del consentimiento federado en todo el ecosistema.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">m2p_auth / lagrieta_sso</td>
                        <td className="p-2.5">Cookie / Token</td>
                        <td className="p-2.5">30 días</td>
                        <td className="p-2.5">Sesión técnica segura de operador autenticado desde La Grieta.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">m2p-theme</td>
                        <td className="p-2.5">localStorage</td>
                        <td className="p-2.5">Persistente</td>
                        <td className="p-2.5">Recuerda el modo visual (tema oscuro/táctico).</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">m2p_download_history</td>
                        <td className="p-2.5">localStorage</td>
                        <td className="p-2.5">Persistente</td>
                        <td className="p-2.5">Registro local de clips y archivos extraídos en la sesión del usuario.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-400">Plausible Analytics</td>
                        <td className="p-2.5">Script autoalojado</td>
                        <td className="p-2.5">En memoria</td>
                        <td className="p-2.5">Métricas agregadas anónimas sin cookies de rastreo persistente.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-accent-bright">
                      04 // Configuración y Revocación
                    </h3>
                    <p className="text-text-secondary text-[11px] mt-0.5">
                      Puedes modificar tus preferencias o revocar tu consentimiento en cualquier momento:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerCookieSettings}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-bright text-white font-bold tracking-wider uppercase text-[11px] transition-colors cursor-pointer shrink-0"
                  >
                    ⚙ Restablecer Ajustes de Cookies
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Document Footer Bar */}
          <div className="border-t border-white/10 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-text-secondary">
            <span>Última revisión: Octubre 2026 · Versión 1.2 M2P</span>
            <div className="flex items-center gap-3">
              <a
                href="https://lagrieta.es"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-bright transition-colors"
              >
                Portal Central LaGrieta.es ↗
              </a>
              <span>·</span>
              <a href="mailto:legal@lagrieta.es" className="hover:text-white transition-colors">
                legal@lagrieta.es
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Legal Footer */}
      <LaGrietaFooter />
    </div>
  );
}
