/**
 * Email Validator Utility
 * - Validates email format (proper domain with real TLD)
 * - Blocks known disposable/temp email domains
 */

// Curated blocklist of popular disposable email services
const DISPOSABLE_DOMAINS = new Set([
  // Major temp mail services
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempail.com',
  'throwaway.email', 'throwaway.com', 'throwamail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'spam4.me',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  'dispostable.com', 'maildrop.cc', 'mailnesia.com',
  'fakeinbox.com', 'fakemail.net', 'fakemail.fr',
  'getnada.com', 'nada.email', 'anonbox.net',
  'mytemp.email', 'tempinbox.com', 'tempr.email',
  'discard.email', 'discardmail.com', 'discardmail.de',
  'mailcatch.com', 'mailexpire.com', 'mailforspam.com',
  'safetymail.info', 'filzmail.com', 'inboxalias.com',
  'jetable.org', 'mailnull.com', 'antispam.de',
  'trashymail.com', 'trashymail.net', 'despam.it',
  'spamfree24.org', 'spamgourmet.com', 'spamgourmet.net',
  'binkmail.com', 'bobmail.info', 'bugmenot.com',
  'devnullmail.com', 'dodgeit.com', 'dodgit.com',
  'emailigo.de', 'emailwarden.com', 'enterto.com',
  'ephemail.net', 'etranquil.com', 'etranquil.net',
  'gishpuppy.com', 'great-host.in', 'greensloth.com',
  'haltospam.com', 'harakirimail.com', 'hidemail.de',
  'incognitomail.org', 'instantemailaddress.com',
  'ipoo.org', 'irish2me.com', 'jetable.com',
  'kasmail.com', 'koszmail.pl', 'kurzepost.de',
  'letthemeatspam.com', 'lhsdv.com', 'lifebyfood.com',
  'lookugly.com', 'lr78.com', 'lroid.com',
  'maileater.com', 'mailexpire.com', 'mailin8r.com',
  'mailinator.net', 'mailinator2.com', 'mailincubator.com',
  'mailme.lv', 'mailnator.com', 'mailscrap.com',
  'mailshell.com', 'mailsiphon.com', 'mailzilla.com',
  'mbx.cc', 'mega.zik.dj', 'meltmail.com',
  'mintemail.com', 'mt2015.com', 'mypartyclip.de',
  'mytrashmail.com', 'nepwk.com', 'nobulk.com',
  'noclickemail.com', 'nogmailspam.info', 'nomail.xl.cx',
  'nospam.ze.tc', 'nospamfor.us', 'nowmymail.com',
  'objectmail.com', 'obobbo.com', 'odaymail.com',
  'onewaymail.com', 'oopi.org', 'ordinaryamerican.net',
  'owlpic.com', 'pjjkp.com', 'plexolan.de',
  'pookmail.com', 'privacy.net', 'proxymail.eu',
  'prtnx.com', 'putthisinyouremail.com', 'qq.com',
  'quickinbox.com', 'rcpt.at', 'reallymymail.com',
  'recode.me', 'regbypass.com', 'rhyta.com',
  'rklips.com', 'rmqkr.net', 'royal.net',
  'rppkn.com', 'rtrtr.com', 's0ny.net',
  'safe-mail.net', 'safersignup.de', 'safetypost.de',
  'sendspamhere.com', 'shiftmail.com', 'shotmail.ru',
  'skeefmail.com', 'slaskpost.se', 'slipry.net',
  'smellfear.com', 'snakemail.com', 'sneakemail.com',
  'sofort-mail.de', 'sogetthis.com', 'soodonims.com',
  'spam.la', 'spamavert.com', 'spambob.net',
  'spambob.org', 'spambog.com', 'spambog.de',
  'spambog.ru', 'spambox.us', 'spamcannon.com',
  'spamcannon.net', 'spamcero.com', 'spamcon.org',
  'spamcorptastic.com', 'spamcowboy.com', 'spamcowboy.net',
  'spamcowboy.org', 'spamday.com', 'spamex.com',
  'spamfighter.cf', 'spamfighter.ga', 'spamfighter.gq',
  'spamfighter.ml', 'spamfighter.tk', 'spamfree.eu',
  'spamhole.com', 'spaml.com', 'spaml.de',
  'spammotel.com', 'spamobox.com', 'spamoff.de',
  'spamslicer.com', 'spamspot.com', 'spamstack.net',
  'spamtrail.com', 'spamtrap.ro', 'speed.1s.fr',
  'superrito.com', 'suremail.info', 'svk.jp',
  'teleworm.us', 'tempalias.com', 'tempe4mail.com',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net',
  'tempinbox.co.uk', 'tempmail.eu', 'tempmaildemo.com',
  'tempmailer.com', 'tempmailer.de', 'tempomail.fr',
  'tmpmail.net', 'tmpmail.org', 'tradermail.info',
  'turual.com', 'twinmail.de', 'uggsrock.com',
  'upliftnow.com', 'uplipht.com', 'venompen.com',
  'veryrealemail.com', 'viditag.com', 'viewcastmedia.com',
  'vomoto.com', 'vpn.st', 'vsimcard.com',
  'vubby.com', 'wasteland.rfc822.org', 'wetrainbayarea.com',
  'wetrainbayarea.org', 'wh4f.org', 'whatiaas.com',
  'whatpaas.com', 'whyspam.me', 'wickmail.net',
  'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'winemaven.info', 'wronghead.com', 'wuzup.net',
  'wuzupmail.net', 'wwwnew.eu', 'xagloo.com',
  'xemaps.com', 'xents.com', 'xjoi.com',
  'xmaily.com', 'xoxox.cc', 'xyzfree.net',
  'yapped.net', 'yep.it', 'yogamaven.com',
  'zehnminutenmail.de', 'zippymail.info', 'zoaxe.com',
  'zoemail.org', '10minutemail.com', '20minutemail.com',
  'guerrillamail.de', 'guerrillamail.biz', 'mailinator.us',
  'cuvox.de', 'armyspy.com', 'dayrep.com', 'einrot.com',
  'fleckens.hu', 'gustr.com', 'jourrapide.com', 'superrito.com',
]);

// Valid TLDs — covers the major ones (not exhaustive but catches gibberish)
const VALID_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'io', 'co', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in',
  'ru', 'br', 'it', 'es', 'nl', 'se', 'no', 'fi', 'dk', 'pl', 'cz',
  'at', 'ch', 'be', 'pt', 'ie', 'nz', 'za', 'mx', 'ar', 'cl', 'co',
  'kr', 'tw', 'sg', 'hk', 'ph', 'th', 'my', 'id', 'vn', 'pk', 'bd',
  'lk', 'np', 'ae', 'sa', 'il', 'tr', 'eg', 'ng', 'ke', 'gh', 'tz',
  'info', 'biz', 'name', 'pro', 'mobi', 'tel', 'asia', 'cat',
  'aero', 'coop', 'museum', 'travel', 'jobs', 'post',
  'app', 'dev', 'page', 'blog', 'cloud', 'ai', 'me', 'tv', 'cc',
  'tech', 'online', 'site', 'store', 'shop', 'xyz', 'club', 'live',
  'space', 'fun', 'website', 'host', 'press', 'wiki', 'design',
  'email', 'solutions', 'agency', 'digital', 'media', 'studio',
  'global', 'world', 'zone', 'city', 'life', 'today', 'network',
  'social', 'company', 'team', 'work', 'tools', 'systems',
  'academy', 'center', 'community', 'foundation', 'institute',
  // Country code second-level domains
  'co.uk', 'co.in', 'co.za', 'co.nz', 'co.kr', 'co.jp',
  'com.au', 'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.sg',
  'com.ph', 'com.my', 'com.pk', 'com.ng', 'com.eg', 'com.sa',
  'org.uk', 'org.au', 'org.in', 'org.nz',
  'ac.in', 'ac.uk', 'ac.za', 'ac.jp',
  'edu.au', 'edu.in', 'edu.pk',
  'net.au', 'net.in', 'net.nz',
  'gov.in', 'gov.uk', 'gov.au',
]);

/**
 * Validates email format — must have a proper structure with a real TLD
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string }}
 */
function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Please enter a valid email address' };
  }

  // Extract domain parts
  const domain = trimmed.split('@')[1];
  const domainParts = domain.split('.');
  
  // Must have at least 2 parts (name.tld)
  if (domainParts.length < 2) {
    return { valid: false, reason: 'Please enter a valid email address' };
  }

  // Check TLD validity
  const tld = domainParts[domainParts.length - 1];
  const twoPartTld = domainParts.slice(-2).join('.');
  
  if (!VALID_TLDS.has(tld) && !VALID_TLDS.has(twoPartTld)) {
    return { valid: false, reason: 'Please use an email with a valid domain (e.g., gmail.com, outlook.com)' };
  }

  // Domain name part (before TLD) should be at least 2 chars
  const domainName = domainParts[0];
  if (domainName.length < 2) {
    return { valid: false, reason: 'Please enter a valid email address' };
  }

  return { valid: true };
}

/**
 * Checks if the email domain is a known disposable/temp mail service
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string }}
 */
function isDisposableEmail(email) {
  if (!email) return { valid: false, reason: 'Email is required' };
  
  const domain = email.trim().toLowerCase().split('@')[1];
  
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Temporary/disposable email addresses are not allowed. Please use a permanent email.' };
  }

  return { valid: true };
}

/**
 * Combined email validation — checks format + disposable domains
 * @param {string} email
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateEmail(email) {
  const formatCheck = isValidEmailFormat(email);
  if (!formatCheck.valid) return formatCheck;

  const disposableCheck = isDisposableEmail(email);
  if (!disposableCheck.valid) return disposableCheck;

  return { valid: true };
}

module.exports = { validateEmail, isValidEmailFormat, isDisposableEmail };
