const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'server.js');
if (!fs.existsSync(file)) process.exit(0);

let s = fs.readFileSync(file, 'utf8');

// Keep the AI Assistant only in the normal sidebar/menu UI.
const start = s.indexOf("// Add the AI Work Assistant UI to the existing app without replacing the user's current design.");
if (start !== -1) {
  const end = s.indexOf('app.use(express.static', start);
  if (end !== -1) {
    s = s.slice(0, start) + "app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));\n\n" + s.slice(end);
  }
}

// Teach the reply generator how to use the seller's reusable message playbook.
const marker = "    'Return only the final customer-facing message, with no analysis, labels, notes, or explanation.'\n";
if (!s.includes('NTEK REPLY PLAYBOOK:')) {
  const playbook = `    'NTEK REPLY PLAYBOOK: Use seller-provided templates as behavioural examples, not copy-paste text. Choose the relevant pattern from buyer intent and confirmed context, then write a fresh natural reply using only confirmed facts.',
    'OUT-OF-STOCK / OFFER COLOUR: Clearly name the ordered colour, confirmed available colours, and ask which available colour the buyer prefers. Only mention immediate dispatch when confirmed.',
    'OUT-OF-STOCK / OFFER SIZE: Clearly name the unavailable size and confirmed alternative size, then ask which option the buyer prefers. Never invent stock or sizes.',
    'OUT-OF-STOCK / LAST DAMAGED STOCK: If the last pieces were confirmed damaged during quality checking, explain that stock is unavailable and offer only confirmed options such as a full refund or another item of the same value. Do not promise an outcome before the buyer chooses.',
    'MANUAL / NOTE / NOTHING ORDER: If the selected option is a user manual, wholesale note, documentation option or other non-physical selection, explain it clearly and ask whether the selection was intentional. Include a listing link only when the seller supplied it.',
    'ORDER CONFIRMATION / DISPATCH: If colour, size and dispatch timing are confirmed, confirm them directly. Never repeat the same paragraph twice and never add unsupported details.',
    'GENERAL PRODUCT OUT OF STOCK: Apologise and offer only confirmed alternatives such as a refund or another item of the same value. Do not invent reasons for the stock issue.',
    'PACKAGE CONTENTS: For variation listings, explain that the buyer receives the option selected from the drop-down menu. Do not imply they receive all variations unless confirmed.',
    'EXPENSIVE POSTCODE / EXTRA POSTAGE: Mention an extra postage amount only when the seller explicitly supplied the amount and reason. Do not invent charges.',
    'REMINDER / MANUAL FOLLOW-UP: Briefly remind the buyer what was selected, explain the correct physical-product option, and include any supplied listing link exactly as provided.',
    'COUNTER OFFER: Thank the buyer, state the exact best price supplied by the seller, and keep the message friendly and concise. Never invent a price.',
    'TEMPLATE SIGNATURES: Old template names such as Jessica, Selena or Dooma are examples only. Never use them unless the current seller context explicitly provides that exact name. Prefer the configured NTEK signature.',
    'TEMPLATE STYLE: Avoid unnecessary subject lines, repeated thank-you paragraphs, excessive apologies and robotic wording. Make every reply specific to the buyer and ready to paste into eBay.',
`;
  if (s.includes(marker)) s = s.replace(marker, marker + playbook);
}

fs.writeFileSync(file, s, 'utf8');
console.log('NTEK deployment patch applied.');
