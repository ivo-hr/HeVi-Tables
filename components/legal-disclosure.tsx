"use client";

import {
  Cookie,
  Copyright,
  ExternalLink,
  FileText,
  Scale,
  ShieldCheck
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import {
  LEGAL_ADDRESS,
  LEGAL_CONTACT,
  LEGAL_CREATOR,
  LEGAL_REGISTRATION,
  LEGAL_REPOSITORY,
  LEGAL_UPDATED_AT,
  legalContactHref
} from "@/lib/legal";

const AEPD_RIGHTS = "https://www.aepd.es/derechos-y-deberes/ejerce-tus-derechos";
const AEPD_CLAIMS = "https://sedeagpd.gob.es/sede-electronica-web/";
const GDPR = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";

export function LegalDisclosure() {
  const { locale, t, date } = useLanguage();
  const updated = date(LEGAL_UPDATED_AT, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });

  return (
    <footer className="legal-card">
      <div className="legal-heading">
        <span className="settings-block-icon">
          <Scale size={19} />
        </span>
        <div>
          <span className="eyebrow">{t("Información legal", "Legal information")}</span>
          <h2>{t("La letra pequeña, sin esconderla", "The small print, without hiding it")}</h2>
          <p>
            {t(
              "Resumen claro del responsable, el servicio y el uso de tus datos.",
              "A clear summary of who runs the service and how your data is used."
            )}
          </p>
        </div>
      </div>

      <div className="legal-summary">
        <Copyright size={18} />
        <p>
          <strong>© 2026 {LEGAL_CREATOR}</strong>
          <span>
            {t(
              "HeVi y sus recursos visuales originales. Creado por",
              "HeVi and its original visual assets. Created by"
            )}{" "}
            {LEGAL_CREATOR}.
          </span>
        </p>
      </div>

      <div className="legal-sections">
        <details>
          <summary>
            <FileText size={17} />
            <span>{t("Aviso legal y autoría", "Legal notice and authorship")}</span>
          </summary>
          <div className="legal-copy">
            <h3>{t("Responsable del servicio", "Service operator")}</h3>
            <p>
              {t("HeVi ha sido creado y es mantenido por", "HeVi was created and is maintained by")} {LEGAL_CREATOR}.
              {" "}{t("Canal de contacto:", "Contact channel:")}{" "}
              <a href={legalContactHref()} target="_blank" rel="noreferrer">
                {LEGAL_CONTACT} <ExternalLink size={13} />
              </a>
            </p>
            {LEGAL_ADDRESS ? <p>{t("Dirección del responsable:", "Operator address:")} {LEGAL_ADDRESS}</p> : null}
            {LEGAL_REGISTRATION ? <p>{t("Datos registrales o fiscales aplicables:", "Applicable registration or tax details:")} {LEGAL_REGISTRATION}</p> : null}
            <h3>{t("Propiedad intelectual", "Intellectual property")}</h3>
            <p>
              {t(
                "El código fuente se publica con la licencia no comercial incluida en el repositorio. La marca, el logotipo y los recursos visuales originales pertenecen a su creador salvo que se indique otra cosa. No se concede permiso para presentar una copia o modificación como producto oficial de HeVi.",
                "The source code is published under the non-commercial licence included in the repository. The brand, logo and original visual assets belong to their creator unless stated otherwise. No permission is granted to present a copy or modification as an official HeVi product."
              )}
            </p>
            <a href={`${LEGAL_REPOSITORY}/blob/main/LICENSE.md`} target="_blank" rel="noreferrer">
              {t("Consultar la licencia", "Read the licence")} <ExternalLink size={13} />
            </a>
          </div>
        </details>

        <details>
          <summary>
            <ShieldCheck size={17} />
            <span>{t("Política de privacidad", "Privacy policy")}</span>
          </summary>
          <div className="legal-copy">
            <h3>{t("Responsable y contacto", "Controller and contact")}</h3>
            <p>
              {LEGAL_CREATOR} {t("es responsable del tratamiento asociado a HeVi. Puedes plantear consultas o ejercer tus derechos mediante", "is the controller for processing associated with HeVi. You can ask questions or exercise your rights through")} {" "}
              <a href={legalContactHref()} target="_blank" rel="noreferrer">{LEGAL_CONTACT}</a>.
            </p>
            <p>
              {t(
                "Si el canal configurado es público, no publiques datos personales: solicita primero una vía privada para identificarte con seguridad.",
                "If the configured channel is public, do not post personal data: first request a private channel so you can identify yourself safely."
              )}
            </p>

            <h3>{t("Datos tratados", "Data processed")}</h3>
            <ul>
              <li>{t("Cuenta: email, identificador de autenticación, nombre visible y avatar.", "Account: email, authentication identifier, display name and avatar.")}</li>
              <li>{t("Actividad privada: grupos, membresías, códigos de invitación, tablas, registros, puntuaciones y fechas.", "Private activity: groups, memberships, invite codes, tables, entries, scores and dates.")}</li>
              <li>{t("Contenido aportado: descripciones, dibujos, fotos de tabla y evidencias que decidas subir.", "User content: descriptions, drawings, table photos and evidence you choose to upload.")}</li>
              <li>{t("Avisos: suscripción Push, identificadores técnicos del navegador y estado de lectura.", "Notifications: Push subscription, technical browser identifiers and read status.")}</li>
              <li>{t("Datos técnicos estrictamente necesarios para sesión, seguridad, idioma, diagnóstico y prevención de abuso.", "Technical data strictly required for sessions, security, language, diagnostics and abuse prevention.")}</li>
            </ul>

            <h3>{t("Finalidades y bases jurídicas", "Purposes and legal bases")}</h3>
            <ul>
              <li>{t("Prestar la cuenta, los grupos, las tablas y el ranking: ejecución del servicio solicitado.", "Provide accounts, groups, tables and rankings: performance of the requested service.")}</li>
              <li>{t("Enviar notificaciones al dispositivo: tu consentimiento, que puedes retirar desde estos ajustes.", "Send notifications to your device: your consent, which you can withdraw in these settings.")}</li>
              <li>{t("Proteger cuentas, investigar fallos y evitar abuso: interés legítimo en mantener un servicio seguro.", "Protect accounts, investigate faults and prevent abuse: legitimate interest in maintaining a secure service.")}</li>
              <li>{t("Cumplir obligaciones o responder a autoridades cuando la ley lo exija: obligación legal.", "Meet obligations or respond to authorities where legally required: legal obligation.")}</li>
            </ul>

            <h3>{t("Visibilidad, destinatarios y alojamiento", "Visibility, recipients and hosting")}</h3>
            <p>
              {t(
                "Los miembros de un grupo pueden ver el perfil, las tablas y los registros de ese grupo. Las evidencias se sirven mediante enlaces temporales a miembros autorizados. Supabase procesa autenticación, base de datos y archivos; el despliegue previsto usa Vercel. No se venden datos, no hay publicidad y este repositorio no incorpora analítica de comportamiento. Los proveedores pueden tratar datos en otros países bajo sus condiciones y garantías aplicables.",
                "Group members can see the profiles, tables and entries in that group. Evidence is served to authorised members using temporary links. Supabase processes authentication, database and files; the intended deployment uses Vercel. Data is not sold, there is no advertising and this repository includes no behavioural analytics. Providers may process data in other countries under their applicable terms and safeguards."
              )}
            </p>

            <h3>{t("Conservación", "Retention")}</h3>
            <p>
              {t(
                "La información se conserva mientras la cuenta o el grupo la necesiten para prestar el servicio y mantener su histórico. Las suscripciones Push se conservan hasta que las desactives o expiren. Las solicitudes, copias de seguridad y registros de seguridad pueden mantenerse durante los plazos técnicos o legales necesarios. Puedes pedir la eliminación de tu cuenta y datos mediante el canal de contacto; algunos datos podrán conservarse si existe una obligación legal o una reclamación pendiente.",
                "Information is retained while the account or group needs it to provide the service and preserve its history. Push subscriptions are retained until you disable them or they expire. Requests, backups and security logs may be kept for necessary technical or legal periods. You can request deletion of your account and data through the contact channel; some data may be retained where a legal obligation or pending claim applies."
              )}
            </p>

            <h3>{t("Tus derechos", "Your rights")}</h3>
            <p>
              {t(
                "Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, además de retirar consentimientos. El ranking aplica reglas matemáticas visibles y no adopta decisiones con efectos jurídicos. Si no quedas conforme tras contactar con el responsable, puedes reclamar ante la Agencia Española de Protección de Datos.",
                "You may request access, rectification, erasure, objection, restriction and portability, and withdraw consent. Rankings apply visible mathematical rules and do not make decisions with legal effects. If you are not satisfied after contacting the controller, you may complain to the Spanish Data Protection Agency."
              )}
            </p>
            <div className="legal-links">
              <a href={AEPD_RIGHTS} target="_blank" rel="noreferrer">AEPD · {t("Derechos", "Rights")} <ExternalLink size={13} /></a>
              <a href={AEPD_CLAIMS} target="_blank" rel="noreferrer">AEPD · {t("Reclamaciones", "Complaints")} <ExternalLink size={13} /></a>
              <a href={GDPR} target="_blank" rel="noreferrer">RGPD / GDPR <ExternalLink size={13} /></a>
            </div>
          </div>
        </details>

        <details>
          <summary>
            <Cookie size={17} />
            <span>{t("Cookies y almacenamiento local", "Cookies and local storage")}</span>
          </summary>
          <div className="legal-copy">
            <p>
              {t(
                "HeVi usa únicamente almacenamiento técnico necesario: cookies de sesión de Supabase para mantener el acceso, una preferencia de idioma, almacenamiento local para el estado de avisos y caché para el funcionamiento offline. No se usan cookies publicitarias ni de analítica en este repositorio. Por eso no se muestra un banner de consentimiento. Si en producción se añaden tecnologías no esenciales, el operador deberá informar y solicitar el consentimiento antes de activarlas.",
                "HeVi uses only necessary technical storage: Supabase session cookies to keep you signed in, a language preference, local storage for notification status and a cache for offline operation. This repository uses no advertising or analytics cookies, so no consent banner is shown. If non-essential technologies are added in production, the operator must disclose them and request consent before enabling them."
              )}
            </p>
          </div>
        </details>

        <details>
          <summary>
            <Scale size={17} />
            <span>{t("Condiciones de uso y exención de responsabilidad", "Terms of use and disclaimer")}</span>
          </summary>
          <div className="legal-copy">
            <ul>
              <li>{t("HeVi es una herramienta social y de entretenimiento. No organiza apuestas con dinero ni valida resultados del mundo real.", "HeVi is a social and entertainment tool. It does not organise gambling for money or validate real-world results.")}</li>
              <li>{t("Debes tener capacidad legal para usar el servicio; los menores necesitan autorización cuando la normativa aplicable lo exija.", "You must have legal capacity to use the service; minors require authorisation where applicable law requires it.")}</li>
              <li>{t("Eres responsable del contenido que subes y debes contar con permiso sobre imágenes, nombres y evidencias. No subas datos sensibles, contenido ilícito, abusivo o que vulnere derechos ajenos.", "You are responsible for uploaded content and must have permission for images, names and evidence. Do not upload sensitive, unlawful or abusive content, or material that infringes anyone else's rights.")}</li>
              <li>{t("Protege tu cuenta y comparte códigos de grupo solo con quien deba entrar. El creador del grupo puede renovar el código.", "Protect your account and share group codes only with intended members. The group creator can rotate the code.")}</li>
              <li>{t("El servicio se ofrece tal cual, sin garantía de disponibilidad continua ni de que una puntuación resuelva una discusión con dignidad. Las reglas mostradas y el cierre de tabla determinan el resultado dentro de la app.", "The service is provided as is, without a guarantee of continuous availability or that a score will settle an argument gracefully. The displayed rules and table closure determine the result inside the app.")}</li>
              <li>{t("El acceso puede limitarse para proteger el servicio, cumplir la ley o responder a usos abusivos. Las condiciones podrán actualizarse indicando una nueva fecha de revisión.", "Access may be restricted to protect the service, comply with the law or respond to abuse. These terms may be updated with a new revision date.")}</li>
            </ul>
            <p>{t("Se aplica la legislación española sin perjuicio de los derechos imperativos que correspondan a consumidores en su lugar de residencia.", "Spanish law applies without prejudice to mandatory consumer rights in the user's place of residence.")}</p>
          </div>
        </details>
      </div>

      <small className="legal-updated">
        {t("Última actualización", "Last updated")}: {updated} · {locale === "en" ? "English" : "Español"}
      </small>
    </footer>
  );
}
