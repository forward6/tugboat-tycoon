// Names on the public scoreboard. Every player starts with a settler's name (the game picks one); anyone can change it,
// but not to anything rude, and the owner can put any name back to a settler's from the admin page.
export const FIRST = ['Ada', 'Agnes', 'Albert', 'Alice', 'Angus', 'Annie', 'Archie', 'Bella', 'Clara', 'Duncan', 'Edith', 'Elsie', 'Ewan', 'Flora', 'George', 'Grace', 'Hamish', 'Harriet', 'Hugh', 'Isabel', 'Jean', 'Kate', 'Lachlan', 'Lottie', 'Malcolm', 'Neil'];
export const LAST = ['Barr', 'Boyd', 'Cameron', 'Campbell', 'Douglas', 'Fraser', 'Gordon', 'Grant', 'Hamilton', 'Kerr', 'MacKay', 'McLean', 'Morrison', 'Munro', 'Murray', 'Paterson', 'Reid', 'Ross', 'Shaw', 'Sinclair', 'Stewart', 'Wallace'];
export const settlerName = () => { const r = crypto.getRandomValues(new Uint16Array(2)); return `${FIRST[r[0] % FIRST.length]} ${LAST[r[1] % LAST.length]}`; };

// Words that may not appear in a name. Long ones are caught anywhere inside a word, or in letters spaced out one by one,
// or spelt with numbers; short ones only as a whole word, so Ewan Kerr, Cassidy, Hancock and Dick Dickson are fine.
const ANYWHERE = ['fuck', 'shit', 'cunt', 'bitch', 'bastard', 'asshole', 'arsehole', 'wanker', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard', 'rapist', 'molest', 'pedophile', 'paedophile',
  'fvck', 'phuck', 'penis', 'vagina', 'boobs', 'dildo', 'porn', 'nazi', 'hitler', 'kike', 'spastic', 'tranny', 'bollocks', 'pussy', 'douche', 'twat', 'jizz', 'semen', 'blowjob', 'handjob', 'masturbat', 'orgasm', 'horny', 'cocksucker', 'motherfuck'];
const WHOLE = ['ass', 'arse', 'cock', 'fag', 'gay', 'jew', 'kkk', 'nob', 'piss', 'poo', 'rape', 'sex', 'tit', 'tits', 'wtf', 'stfu', 'cum', 'fck', 'fuk', 'sht', 'crap', 'damn', 'hell', 'kill', 'die', 'isis', 'spic', 'chink', 'wop', 'paki', 'coon'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't' };
const squash = s => s.toLowerCase().replace(/[0-9@$!|+]/g, c => LEET[c] || c);
const ALLOW = ['scunthorpe', 'penistone', 'cockburn', 'hancock', 'babcock', 'peacock', 'hitchcock', 'shitake', 'matsushita'];
const single = w => w.replace(/(.)\1+/g, '$1'); // doubled letters made single
export function nameOK(name) {
  const s = squash(String(name || ''));
  const words = s.split(/[^a-z]+/).filter(Boolean);
  // letters spaced out one at a time (f u c k, s.h.i.t) count as one word
  const parts = [...words.filter(w => w.length > 1), ...s.split(/[a-z]{2,}/).map(r => r.replace(/[^a-z]/g, '')).filter(r => r.length > 2)];
  if (parts.some(w => !ALLOW.includes(w) && ANYWHERE.some(b => single(w).includes(single(b))))) return false;
  if (words.some(w => WHOLE.includes(w) || WHOLE.includes(single(w)))) return false;
  return /\p{L}/u.test(name) && String(name).trim().length >= 2;
}
