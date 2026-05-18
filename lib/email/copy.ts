// All email copy in 5 locales (en/pt/es/de/fr). One source of truth so
// adding a new template means editing exactly this file + adding the
// React Email component that renders it.
//
// Conventions:
//   - subject lines stay under ~55 chars (Gmail truncates ~70 on mobile)
//   - preheader (the gray preview text after the subject in the inbox) is
//     a separate field — repeats one selling point, not the subject
//   - {firstName} is the only inline placeholder we resolve in TS code;
//     the rest of the copy refers to fields rendered by the template

import type { EmailLocale } from './types';

interface WelcomeCopy {
  subject: string;
  preheader: string;
  heading: string;             // greets {firstName}
  intro: string;
  confirmed: string;           // "Your {planLabel} subscription is active."
  perksTitle: string;
  perk1: string;
  perk2: string;
  perk3: string;
  cta: string;
  ps: string;                  // closing "if anything goes wrong, reply to this email"
  footerManage: string;
  footerLegal: string;
}

interface PaymentFailedCopy {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  detail: string;              // "We tried to charge {amount} {currency} but it didn't go through."
  reasons: string;
  cta: string;
  outro: string;
  footerManage: string;
  footerLegal: string;
}

interface CancellationCopy {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  detail: string;              // "Your access stays active until {accessUntil}."
  whyTitle: string;
  reactivateCta: string;
  outro: string;
  footerManage: string;
  footerLegal: string;
}

interface RenewalCopy {
  subject: string;
  preheader: string;
  heading: string;
  body: string;                // "{amount} {currency} renewed your subscription through {nextBillingDate}."
  perksTitle: string;
  perk1: string;
  perk2: string;
  cta: string;
  outro: string;
  footerManage: string;
  footerLegal: string;
}

interface AllCopy {
  welcome: WelcomeCopy;
  payment_failed: PaymentFailedCopy;
  cancellation: CancellationCopy;
  renewal: RenewalCopy;
}

const en: AllCopy = {
  welcome: {
    subject: 'Welcome to AllureTV — your romance shelf is open',
    preheader: 'Hundreds of love stories, audio and video. Start with the trending one.',
    heading: 'Welcome, {firstName}',
    intro: 'You just unlocked AllureTV — every romance we have, on every device, no ads.',
    confirmed: 'Your subscription is active.',
    perksTitle: 'What you can do right now:',
    perk1: 'Stream every romance, original and exclusive',
    perk2: 'Read the matching ebooks chapter by chapter',
    perk3: 'New stories drop every week — never an empty Friday night',
    cta: 'Start watching',
    ps: 'Anything weird? Just reply to this email — a human will read it.',
    footerManage: 'Manage subscription',
    footerLegal: 'AllureTV · alluretv.net',
  },
  payment_failed: {
    subject: 'We could not charge your card — quick fix needed',
    preheader: 'Your access pauses soon unless you update your payment method.',
    heading: 'Hi {firstName}, your last payment did not go through',
    intro: 'No drama, just a heads up.',
    detail: 'We tried to charge {amount} {currency} for your AllureTV subscription and the bank declined it.',
    reasons: 'This usually means the card expired, the address changed, or the bank flagged it as foreign. Stripe will try again automatically over the next few days.',
    cta: 'Update payment method',
    outro: 'Tap the button above to fix it in under a minute. Your stories will be waiting.',
    footerManage: 'Manage subscription',
    footerLegal: 'AllureTV · alluretv.net',
  },
  cancellation: {
    subject: 'Your AllureTV subscription has been canceled',
    preheader: 'You keep full access until your current period ends.',
    heading: 'Sorry to see you go, {firstName}',
    intro: 'Your subscription is canceled — no future charges, no surprises.',
    detail: 'You still have full access until {accessUntil}. After that, you can come back any time and pick up where you left off (your list and favorites stay saved).',
    whyTitle: 'Mind telling us why?',
    reactivateCta: 'Reactivate AllureTV',
    outro: 'If you canceled by accident or your bank refused the renewal, reactivation takes one click.',
    footerManage: 'Manage subscription',
    footerLegal: 'AllureTV · alluretv.net',
  },
  renewal: {
    subject: 'Your AllureTV plan renewed — keep watching',
    preheader: 'Receipt inside. Also a few new stories you might love.',
    heading: 'Renewed, {firstName}',
    body: 'We charged {amount} {currency} and your subscription is good through {nextBillingDate}.',
    perksTitle: 'While you are here:',
    perk1: 'New stories every week — check the Hot row',
    perk2: 'Your favorites and reading progress are saved across devices',
    cta: 'See what is new',
    outro: 'Stripe also sent the official receipt. This email is just from us, with a hug.',
    footerManage: 'Manage subscription',
    footerLegal: 'AllureTV · alluretv.net',
  },
};

const pt: AllCopy = {
  welcome: {
    subject: 'Bem-vinda ao AllureTV — sua estante de romances está aberta',
    preheader: 'Centenas de histórias de amor em áudio e vídeo. Comece pela mais quente.',
    heading: 'Bem-vinda, {firstName}',
    intro: 'Você acabou de destravar o AllureTV — todos os nossos romances, em qualquer dispositivo, sem anúncios.',
    confirmed: 'Sua assinatura está ativa.',
    perksTitle: 'O que você pode fazer agora:',
    perk1: 'Assistir a todos os romances, originais e exclusivos',
    perk2: 'Ler os ebooks completos capítulo por capítulo',
    perk3: 'Histórias novas toda semana — nunca mais uma sexta sem nada',
    cta: 'Começar a assistir',
    ps: 'Algo estranho? Responde esse email mesmo — uma pessoa de verdade vai ler.',
    footerManage: 'Gerenciar assinatura',
    footerLegal: 'AllureTV · alluretv.net',
  },
  payment_failed: {
    subject: 'Não conseguimos cobrar seu cartão — só 1 minuto pra resolver',
    preheader: 'Seu acesso pausa em breve se o pagamento não for atualizado.',
    heading: 'Oi {firstName}, sua última cobrança não passou',
    intro: 'Sem drama, é só um aviso.',
    detail: 'Tentamos cobrar {amount} {currency} da sua assinatura AllureTV e o banco recusou.',
    reasons: 'Normalmente é cartão vencido, endereço mudou ou o banco bloqueou por ser cobrança internacional. O Stripe vai tentar de novo automaticamente nos próximos dias.',
    cta: 'Atualizar forma de pagamento',
    outro: 'Toca no botão acima pra resolver em menos de um minuto. Suas histórias estão te esperando.',
    footerManage: 'Gerenciar assinatura',
    footerLegal: 'AllureTV · alluretv.net',
  },
  cancellation: {
    subject: 'Sua assinatura AllureTV foi cancelada',
    preheader: 'Você mantém acesso total até o fim do período já pago.',
    heading: 'Triste te ver indo, {firstName}',
    intro: 'Sua assinatura foi cancelada — sem cobranças futuras, sem surpresas.',
    detail: 'Você continua com acesso total até {accessUntil}. Depois disso, pode voltar quando quiser e retomar de onde parou (sua lista e favoritos ficam salvos).',
    whyTitle: 'Conta pra gente o porquê?',
    reactivateCta: 'Reativar AllureTV',
    outro: 'Se cancelou sem querer ou o banco recusou a renovação, reativar é um clique.',
    footerManage: 'Gerenciar assinatura',
    footerLegal: 'AllureTV · alluretv.net',
  },
  renewal: {
    subject: 'Sua assinatura AllureTV foi renovada',
    preheader: 'Recibo dentro. E algumas novidades que você pode amar.',
    heading: 'Renovada, {firstName}',
    body: 'Cobramos {amount} {currency} e sua assinatura está ativa até {nextBillingDate}.',
    perksTitle: 'Enquanto você está aqui:',
    perk1: 'Histórias novas toda semana — dá uma olhada na linha Hot',
    perk2: 'Seus favoritos e progresso ficam salvos em todos os dispositivos',
    cta: 'Ver o que tem de novo',
    outro: 'O Stripe também mandou o recibo oficial. Esse email é só nosso, com carinho.',
    footerManage: 'Gerenciar assinatura',
    footerLegal: 'AllureTV · alluretv.net',
  },
};

const es: AllCopy = {
  welcome: {
    subject: 'Bienvenida a AllureTV — tu estante de romance está abierto',
    preheader: 'Cientos de historias de amor en audio y video. Empieza por la más vista.',
    heading: 'Bienvenida, {firstName}',
    intro: 'Acabas de desbloquear AllureTV — todos los romances, en todos los dispositivos, sin anuncios.',
    confirmed: 'Tu suscripción está activa.',
    perksTitle: 'Lo que puedes hacer ahora mismo:',
    perk1: 'Ver todos los romances, originales y exclusivos',
    perk2: 'Leer los ebooks capítulo por capítulo',
    perk3: 'Historias nuevas cada semana — nunca un viernes vacío',
    cta: 'Empezar a ver',
    ps: '¿Algo raro? Responde este email — una persona real lo leerá.',
    footerManage: 'Gestionar suscripción',
    footerLegal: 'AllureTV · alluretv.net',
  },
  payment_failed: {
    subject: 'No pudimos cobrar tu tarjeta — solución rápida',
    preheader: 'Tu acceso se pausa pronto si no actualizas el pago.',
    heading: 'Hola {firstName}, tu último pago no se completó',
    intro: 'Sin drama, solo un aviso.',
    detail: 'Intentamos cobrar {amount} {currency} de tu suscripción AllureTV y el banco lo rechazó.',
    reasons: 'Normalmente es tarjeta vencida, dirección distinta o el banco lo marcó como compra internacional. Stripe lo intentará de nuevo automáticamente en los próximos días.',
    cta: 'Actualizar método de pago',
    outro: 'Toca el botón de arriba para resolverlo en menos de un minuto. Tus historias te esperan.',
    footerManage: 'Gestionar suscripción',
    footerLegal: 'AllureTV · alluretv.net',
  },
  cancellation: {
    subject: 'Tu suscripción a AllureTV fue cancelada',
    preheader: 'Mantienes acceso completo hasta el fin del período actual.',
    heading: 'Lástima verte ir, {firstName}',
    intro: 'Tu suscripción está cancelada — sin cargos futuros, sin sorpresas.',
    detail: 'Sigues con acceso completo hasta {accessUntil}. Después puedes volver cuando quieras y retomar donde lo dejaste (tu lista y favoritos se guardan).',
    whyTitle: '¿Nos cuentas por qué?',
    reactivateCta: 'Reactivar AllureTV',
    outro: 'Si cancelaste por error o el banco rechazó la renovación, reactivar es un clic.',
    footerManage: 'Gestionar suscripción',
    footerLegal: 'AllureTV · alluretv.net',
  },
  renewal: {
    subject: 'Tu plan AllureTV se renovó — sigue viendo',
    preheader: 'Recibo adentro. Y algunas historias nuevas que podrías amar.',
    heading: 'Renovado, {firstName}',
    body: 'Cobramos {amount} {currency} y tu suscripción está activa hasta {nextBillingDate}.',
    perksTitle: 'Mientras estás aquí:',
    perk1: 'Historias nuevas cada semana — mira la fila Hot',
    perk2: 'Tus favoritos y progreso se guardan en todos tus dispositivos',
    cta: 'Ver lo nuevo',
    outro: 'Stripe también envió el recibo oficial. Este email es solo nuestro, con cariño.',
    footerManage: 'Gestionar suscripción',
    footerLegal: 'AllureTV · alluretv.net',
  },
};

const de: AllCopy = {
  welcome: {
    subject: 'Willkommen bei AllureTV — dein Liebes-Regal ist offen',
    preheader: 'Hunderte Liebesgeschichten in Audio und Video. Starte mit der angesagtesten.',
    heading: 'Willkommen, {firstName}',
    intro: 'Du hast gerade AllureTV freigeschaltet — jede Romance, auf jedem Gerät, ohne Werbung.',
    confirmed: 'Dein Abo ist aktiv.',
    perksTitle: 'Was du jetzt machen kannst:',
    perk1: 'Jede Romance streamen — Originale und Exklusivinhalte',
    perk2: 'Die passenden Ebooks Kapitel für Kapitel lesen',
    perk3: 'Jede Woche neue Geschichten — nie wieder ein leerer Freitagabend',
    cta: 'Jetzt schauen',
    ps: 'Etwas Komisches? Antworte einfach auf diese Email — ein Mensch liest mit.',
    footerManage: 'Abo verwalten',
    footerLegal: 'AllureTV · alluretv.net',
  },
  payment_failed: {
    subject: 'Wir konnten deine Karte nicht belasten — kurze Aktion nötig',
    preheader: 'Dein Zugang pausiert bald, wenn du die Zahlungsmethode nicht aktualisierst.',
    heading: 'Hi {firstName}, deine letzte Zahlung ging nicht durch',
    intro: 'Kein Drama, nur ein Hinweis.',
    detail: 'Wir wollten {amount} {currency} für dein AllureTV-Abo einziehen und die Bank hat abgelehnt.',
    reasons: 'Meistens ist die Karte abgelaufen, die Adresse hat sich geändert, oder die Bank hat es als Auslandszahlung markiert. Stripe versucht es in den nächsten Tagen automatisch erneut.',
    cta: 'Zahlungsmethode aktualisieren',
    outro: 'Tipp auf den Button oben — das dauert keine Minute. Deine Geschichten warten.',
    footerManage: 'Abo verwalten',
    footerLegal: 'AllureTV · alluretv.net',
  },
  cancellation: {
    subject: 'Dein AllureTV-Abo wurde gekündigt',
    preheader: 'Voller Zugang bis zum Ende der aktuellen Periode.',
    heading: 'Schade, dass du gehst, {firstName}',
    intro: 'Dein Abo ist gekündigt — keine weiteren Abbuchungen, keine Überraschungen.',
    detail: 'Du hast vollen Zugang bis {accessUntil}. Danach kannst du jederzeit zurückkommen und genau da weitermachen, wo du aufgehört hast (Liste und Favoriten bleiben gespeichert).',
    whyTitle: 'Magst du uns sagen, warum?',
    reactivateCta: 'AllureTV reaktivieren',
    outro: 'Falls du aus Versehen gekündigt hast oder die Bank die Verlängerung abgelehnt hat — reaktivieren dauert einen Klick.',
    footerManage: 'Abo verwalten',
    footerLegal: 'AllureTV · alluretv.net',
  },
  renewal: {
    subject: 'Dein AllureTV-Abo wurde verlängert',
    preheader: 'Beleg inside. Und ein paar neue Geschichten, die du lieben könntest.',
    heading: 'Verlängert, {firstName}',
    body: 'Wir haben {amount} {currency} eingezogen — dein Abo läuft bis {nextBillingDate}.',
    perksTitle: 'Wenn du schon hier bist:',
    perk1: 'Neue Geschichten jede Woche — schau in die Hot-Reihe',
    perk2: 'Favoriten und Lesefortschritt sind auf allen Geräten synchron',
    cta: 'Was ist neu?',
    outro: 'Stripe schickt auch den offiziellen Beleg. Diese Email kommt nur von uns, mit Liebe.',
    footerManage: 'Abo verwalten',
    footerLegal: 'AllureTV · alluretv.net',
  },
};

const fr: AllCopy = {
  welcome: {
    subject: 'Bienvenue sur AllureTV — votre bibliothèque romance est ouverte',
    preheader: 'Des centaines d\'histoires d\'amour en audio et vidéo. Commencez par la plus regardée.',
    heading: 'Bienvenue, {firstName}',
    intro: 'Vous venez de débloquer AllureTV — toutes les romances, sur tous les appareils, sans pub.',
    confirmed: 'Votre abonnement est actif.',
    perksTitle: 'Ce que vous pouvez faire dès maintenant :',
    perk1: 'Regarder toutes les romances, originales et exclusives',
    perk2: 'Lire les ebooks chapitre par chapitre',
    perk3: 'Nouvelles histoires chaque semaine — plus jamais de vendredi vide',
    cta: 'Commencer à regarder',
    ps: 'Quelque chose d\'étrange ? Répondez à cet email — une personne le lira vraiment.',
    footerManage: 'Gérer l\'abonnement',
    footerLegal: 'AllureTV · alluretv.net',
  },
  payment_failed: {
    subject: 'Impossible de débiter votre carte — solution rapide',
    preheader: 'Votre accès s\'interrompt bientôt sans mise à jour du paiement.',
    heading: 'Bonjour {firstName}, votre dernier paiement a échoué',
    intro: 'Pas de panique, juste une info.',
    detail: 'Nous avons essayé de prélever {amount} {currency} pour votre abonnement AllureTV et la banque a refusé.',
    reasons: 'Souvent une carte expirée, une adresse modifiée, ou la banque qui marque un achat international. Stripe réessaiera automatiquement dans les prochains jours.',
    cta: 'Mettre à jour le moyen de paiement',
    outro: 'Cliquez sur le bouton ci-dessus pour régler ça en moins d\'une minute. Vos histoires vous attendent.',
    footerManage: 'Gérer l\'abonnement',
    footerLegal: 'AllureTV · alluretv.net',
  },
  cancellation: {
    subject: 'Votre abonnement AllureTV a été annulé',
    preheader: 'Vous gardez l\'accès complet jusqu\'à la fin de la période en cours.',
    heading: 'Triste de vous voir partir, {firstName}',
    intro: 'Votre abonnement est annulé — plus aucun prélèvement, aucune surprise.',
    detail: 'Vous gardez l\'accès complet jusqu\'au {accessUntil}. Ensuite vous pouvez revenir quand vous voulez et reprendre là où vous en étiez (votre liste et vos favoris restent enregistrés).',
    whyTitle: 'Vous nous dites pourquoi ?',
    reactivateCta: 'Réactiver AllureTV',
    outro: 'Si vous avez annulé par erreur ou si la banque a refusé le renouvellement, la réactivation prend un clic.',
    footerManage: 'Gérer l\'abonnement',
    footerLegal: 'AllureTV · alluretv.net',
  },
  renewal: {
    subject: 'Votre abonnement AllureTV a été renouvelé',
    preheader: 'Reçu à l\'intérieur. Et quelques nouveautés que vous pourriez adorer.',
    heading: 'Renouvelé, {firstName}',
    body: 'Nous avons prélevé {amount} {currency} et votre abonnement est valide jusqu\'au {nextBillingDate}.',
    perksTitle: 'Pendant que vous êtes là :',
    perk1: 'Nouvelles histoires chaque semaine — jetez un œil à la ligne Hot',
    perk2: 'Vos favoris et votre progression sont synchronisés partout',
    cta: 'Voir les nouveautés',
    outro: 'Stripe envoie aussi le reçu officiel. Cet email vient juste de nous, avec un câlin.',
    footerManage: 'Gérer l\'abonnement',
    footerLegal: 'AllureTV · alluretv.net',
  },
};

export const EMAIL_COPY: Record<EmailLocale, AllCopy> = { en, pt, es, de, fr };

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
