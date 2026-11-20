/**
 * The 100 teaching ideas. One idea = one video.
 *
 *   t  type: word | origin | quote | fact | phrase
 *   h  headline, shown large in the accent colour
 *   s  connecting words, shown small in white
 *   e  landing words, shown large in the accent colour (optional)
 *   b  the short lesson. For words this is a full definition (meaning, feel, how it is used), not the word's history.
 *       This paragraph is the one that turns hard to read and is then restyled.
 *   k  kicker override (optional)
 *   m  motif: a background made for this idea, used in place of the dealt one (optional)
 *   v  quotes only: true once someone has checked the wording against the primary text
 *
 * Lessons stay under about 32 words so they fit in every reading font.
 * Quotes are public domain. Each is marked v:false until checked against a full primary text.
 */
export const IDEAS = [
  // ---- words (1-20)
  { t: 'word', m: 'rain', h: 'petrichor', s: 'the smell of', e: 'rain on dry earth', b: 'The pleasant, earthy scent that rises when rain lands on ground that has been dry for a while. Plant oils and soil bacteria make it, and falling raindrops lift it into the air.' },
  { t: 'word', h: 'serendipity', s: 'a happy', e: 'accident', b: 'Finding something good that you were not looking for. It is more than luck: it takes the wit to notice the lucky thing and see its worth. Penicillin was found this way.' },
  { t: 'word', h: 'mellifluous', s: 'a sound that', e: 'flows like honey', b: 'Describes a sound that is sweet, smooth and pleasant to hear, flowing without a rough edge. It is used mostly for voices, music and speech, and often as praise for a singer.' },
  { t: 'word', h: 'ephemeral', s: 'lasting only', e: 'a very short time', b: 'Lasting for a very short time, and often more precious because of it. A mayfly, a rainbow, cherry blossom and a message that vanishes after reading are all ephemeral. The opposite is permanent.' },
  { t: 'word', h: 'defenestrate', s: 'to throw someone', e: 'out of a window', b: 'To throw someone or something out of a window. It is mostly said with a wink now, and also means removing someone from power suddenly, as when a party defenestrates its leader.' },
  { t: 'word', h: 'apricity', s: 'the warmth of', e: 'the sun in winter', b: 'The warmth of the sun on a cold winter day, felt on your skin while the air stays sharp. It names a small pleasure, which is why people who learn it keep it.' },
  { t: 'word', h: 'susurrus', s: 'a soft', e: 'whispering sound', b: 'A soft, continuous whispering, murmuring or rustling sound. Think of wind moving through dry leaves, a quiet tide on sand, or low voices in the next room. The word itself sounds like what it describes.' },
  { t: 'word', h: 'halcyon', s: 'calm, happy', e: 'and peaceful', b: 'Calm, happy and untroubled, always said of a time in the past. Halcyon days are a golden stretch you remember fondly, such as a long childhood summer, often with a sense that it cannot return.' },
  { t: 'word', h: 'ineffable', s: 'too great', e: 'for words', b: 'Too great, too intense or too sacred to be put into words. People reach for it when describing awe, grief, love or beauty, at the exact moment when ordinary language stops being enough.' },
  { t: 'word', h: 'overmorrow', s: 'the day', e: 'after tomorrow', b: 'The day after tomorrow, in one word. If today is Monday, overmorrow is Wednesday. It is old and rare now, but it does a job that modern English needs four words for.' },
  { t: 'word', h: 'tsundoku', s: 'buying books and', e: 'letting them pile up', b: 'The habit of buying books and letting them pile up unread. It is Japanese, and it carries no shame: the pile is a promise to your future self, not a failure of your present one.' },
  { t: 'word', h: 'komorebi', s: 'sunlight through', e: 'the leaves of trees', b: 'Sunlight filtering through the leaves of trees, and the shifting pattern of light and shadow it makes on the ground. It is a Japanese word for a sight English needs a whole sentence to describe.' },
  { t: 'word', h: 'saudade', s: 'a deep longing for', e: 'something absent', b: 'A deep, bittersweet longing for someone or something that is gone and may never come back. It is sadness and gratitude at once: missing a person, a place or a time because it mattered.' },
  { t: 'word', h: 'hygge', s: 'cosy and', e: 'content together', b: 'A feeling of cosy contentment and ease, usually shared. Candles, warm socks, a slow meal with friends and no reason to hurry all count. It is Danish, and it is said roughly as hoo-gah.' },
  { t: 'word', h: 'sonorous', s: 'deep, full', e: 'and rich in sound', b: 'Having a deep, full and resonant sound that seems to fill the space around it. A church bell, a cello and a rich speaking voice are sonorous. It can also describe grand, impressive language.' },
  { t: 'word', h: 'lethologica', s: 'when you cannot', e: 'find the word', b: 'The temporary inability to remember a word that you know perfectly well. You can often recall its first letter, its length or its rhythm, but the word itself stays on the tip of your tongue.' },
  { t: 'word', h: 'quixotic', s: 'noble, hopeful', e: 'and wildly unrealistic', b: 'Pursuing lofty, romantic ideals with no regard for how practical they are. A quixotic plan is noble and doomed at once. It can be an insult or a compliment, depending on who is speaking.' },
  { t: 'word', h: 'sesquipedalian', s: 'a lover of', e: 'very long words', b: 'Describes a very long word, or a person who is fond of using them. It often carries a gentle tease, aimed at writing that picks the grand word where a plain one would do.' },
  { t: 'word', h: 'eloquent', s: 'speaking', e: 'clearly and well', b: 'Able to express ideas clearly, fluently and persuasively. It is less about long words than about the right ones. A look, a silence or a gesture can be eloquent too, when it says enough.' },
  { t: 'word', h: 'luminous', s: 'full of', e: 'light', b: 'Giving off light, or seeming to glow from within. A watch dial and a jellyfish are luminous. So is clear, radiant writing, a painting full of light, or a face lit up by good news.' },

  // ---- where words come from (21-40)
  { t: 'origin', h: 'muscle', s: 'comes from the Latin for', e: 'little mouse', b: 'The Romans thought a flexing muscle looked like a small mouse moving under the skin. The Latin word musculus means exactly that.' },
  { t: 'origin', h: 'disaster', s: 'means', e: 'bad star', b: 'From the Italian disastro: dis, bad, and astro, star. People once blamed calamities on the unlucky position of a planet or a star.' },
  { t: 'origin', h: 'goodbye', s: 'is short for', e: 'God be with ye', b: 'Over the 1500s the phrase was squeezed into godbwye. The first part then shifted to good, copying good day and good night.' },
  { t: 'origin', h: 'clue', s: 'once meant', e: 'a ball of thread', b: 'A clew was a ball of yarn. In Greek myth Theseus used one to find his way out of the Labyrinth, so a clew came to mean anything that guides you to an answer.' },
  { t: 'origin', h: 'window', s: 'means', e: 'wind eye', b: 'From the Old Norse vindauga: vindr, wind, and auga, eye. Early windows were plain openings in a wall or roof that let smoke out and wind in.' },
  { t: 'origin', h: 'daisy', s: 'means', e: 'day’s eye', b: 'The Old English name was the day’s eye, because the flower opens its petals at dawn and closes them again at dusk.' },
  { t: 'origin', h: 'companion', s: 'means someone you', e: 'share bread with', b: 'From the Latin com, with, and panis, bread. A companion was the person you broke bread with. Company comes from the same root.' },
  { t: 'origin', h: 'robot', s: 'comes from the Czech for', e: 'forced labour', b: 'It first appeared in a Czech play of 1920 about factory-made workers. The writer’s brother suggested the word, from robota.' },
  { t: 'origin', h: 'quarantine', s: 'means', e: 'forty days', b: 'From the Venetian quaranta giorni. During the plague, ships arriving in Venice had to wait at anchor for forty days before anyone could come ashore.' },
  { t: 'origin', h: 'nice', s: 'once meant', e: 'foolish', b: 'From the Latin nescius, not knowing. Over seven centuries the word drifted from silly to fussy to precise, and only then to pleasant.' },
  { t: 'origin', h: 'silly', s: 'once meant', e: 'blessed', b: 'In Old English it meant happy or blessed. It slid to innocent, then to pitiable, then to weak, and at last to foolish.' },
  { t: 'origin', h: 'nightmare', s: 'has nothing to do with', e: 'horses', b: 'A mare was an evil spirit in old folklore, said to sit on the chests of sleepers and bring bad dreams.' },
  { t: 'origin', h: 'whisky', s: 'means', e: 'water of life', b: 'From the Gaelic uisge beatha. English speakers wore the phrase down over time until only whisky was left.' },
  { t: 'origin', h: 'checkmate', s: 'comes from the Persian for', e: 'the king is helpless', b: 'Shah mat travelled with the game of chess through Arabic and French into English. Shah, king, also gives us the word check.' },
  { t: 'origin', h: 'algebra', s: 'comes from the Arabic for', e: 'mending broken parts', b: 'Al-jabr comes from the title of a book written in Baghdad around the year 820 by al-Khwarizmi, whose own name gave us the word algorithm.' },
  { t: 'origin', h: 'sarcasm', s: 'comes from the Greek for', e: 'tearing flesh', b: 'The Greek sarkazein meant to strip off flesh like a dog, then to bite the lip in rage, then to sneer. Sharp words have always had teeth.' },
  { t: 'origin', h: 'tragedy', s: 'probably means', e: 'goat song', b: 'From the Greek tragos, goat, and oide, song. Nobody is sure why. A goat may have been the prize in early Athenian drama contests.' },
  { t: 'origin', h: 'candidate', s: 'means', e: 'dressed in white', b: 'In ancient Rome, men standing for office wore a toga rubbed bright white with chalk. The Latin candidus, shining white, also gives us candid.' },
  { t: 'origin', h: 'shampoo', s: 'comes from the Hindi for', e: 'press and knead', b: 'Champo first meant a massage. The word reached Britain in the 1700s and only came to mean washing hair about a century later.' },
  { t: 'origin', h: 'emoji', s: 'has nothing to do with', e: 'emotion', b: 'It is Japanese: e, picture, and moji, character. The likeness to the English word emoticon is a happy accident.' },

  // ---- quotes (41-60)
  { t: 'quote', v: false, h: 'Brevity is the soul of wit.', s: 'William Shakespeare, Hamlet', b: 'The joke is on the speaker. Polonius says this in the middle of a long, rambling speech, and Shakespeare lets the audience notice.' },
  { t: 'quote', v: false, h: 'Words, words, words.', s: 'William Shakespeare, Hamlet', b: 'Polonius asks Hamlet what he is reading, and this is the whole reply. Three words that say he is tired of being watched and tired of empty talk.' },
  { t: 'quote', v: false, h: 'The pen is mightier than the sword.', s: 'Edward Bulwer-Lytton, Richelieu, 1839', b: 'The idea is far older, but this is the wording that stuck. Almost everybody knows the line and almost nobody remembers who wrote it.' },
  { t: 'quote', v: false, h: 'Language is the dress of thought.', s: 'Samuel Johnson', b: 'Johnson wrote one of the first great English dictionaries, published in 1755. He believed that how you say a thing shapes how it is heard.' },
  { t: 'quote', v: false, h: 'The limits of my language mean the limits of my world.', s: 'Ludwig Wittgenstein, Tractatus, 1922 translation', b: 'A philosopher’s way of saying that every new word you learn makes your world a little bigger.' },
  { t: 'quote', v: false, h: 'Curiouser and curiouser!', s: 'Lewis Carroll, Alice’s Adventures in Wonderland', b: 'Alice is so surprised that, as the book puts it, she quite forgot how to speak good English. Carroll loved bending words until they squeaked.' },
  { t: 'quote', v: false, h: 'A word is dead when it is said, some say. I say it just begins to live that day.', s: 'Emily Dickinson', b: 'Dickinson wrote nearly 1,800 poems and published only a handful in her lifetime. Most were found in her room after she died.' },
  { t: 'quote', v: false, h: 'There is no frigate like a book to take us lands away.', s: 'Emily Dickinson', b: 'A frigate is a fast sailing ship. Dickinson rarely left her home town, and travelled a long way by reading.' },
  { t: 'quote', v: false, h: 'Hope is the thing with feathers that perches in the soul.', s: 'Emily Dickinson', b: 'She turns a feeling into a small bird that keeps singing through the storm and never asks for a crumb in return.' },
  { t: 'quote', v: false, h: 'Some books are to be tasted, others to be swallowed, and some few to be chewed and digested.', s: 'Francis Bacon, Of Studies', b: 'His advice still holds. You do not owe every book the same attention. Skim some, read some, and live with a few.' },
  { t: 'quote', v: false, h: 'Reading maketh a full man, conference a ready man, and writing an exact man.', s: 'Francis Bacon, Of Studies', b: 'Conference here means conversation. Read to fill your mind, talk to sharpen it, and write to find out what you really think.' },
  { t: 'quote', v: false, h: 'A little learning is a dangerous thing.', s: 'Alexander Pope, An Essay on Criticism', b: 'Often misquoted as a little knowledge. His point was that a small taste makes us overconfident, and deeper study makes us humble again.' },
  { t: 'quote', v: false, h: 'To err is human; to forgive, divine.', s: 'Alexander Pope, An Essay on Criticism', b: 'Pope published this at twenty-three, in a poem about how to judge other people’s writing fairly and kindly.' },
  { t: 'quote', v: false, h: 'It was the best of times, it was the worst of times.', s: 'Charles Dickens, A Tale of Two Cities', b: 'This is only the start of the opening sentence, which runs on for well over a hundred words before it reaches a full stop.' },
  { t: 'quote', v: false, h: 'Call me Ishmael.', s: 'Herman Melville, Moby-Dick', b: 'Three words, and one of the most famous openings in English. Notice he does not say it is his name, only what to call him.' },
  { t: 'quote', v: false, h: 'All the world’s a stage, and all the men and women merely players.', s: 'William Shakespeare, As You Like It', b: 'The speech goes on to split a life into seven ages, from the infant to the very old. Player was the word for an actor.' },
  { t: 'quote', v: false, h: 'We are such stuff as dreams are made on.', s: 'William Shakespeare, The Tempest', b: 'Often misquoted as made of. Prospero says it as his magic show melts away, in one of the last plays Shakespeare wrote.' },
  { t: 'quote', v: false, h: 'The best words in the best order.', s: 'Samuel Taylor Coleridge, on poetry', b: 'His full definition was a pair. Prose is words in their best order. Poetry is the best words in the best order.' },
  { t: 'quote', v: false, h: 'Words are, of course, the most powerful drug used by mankind.', s: 'Rudyard Kipling, 1923', b: 'Kipling said this in a speech to surgeons in London. He told them that words do not only carry meaning, they change how people feel.' },
  { t: 'quote', v: false, h: 'Tell all the truth but tell it slant.', s: 'Emily Dickinson', b: 'Her advice is to come at hard truths from the side, gently. The truth, she writes, must dazzle gradually.' },

  // ---- word facts (61-80)
  { t: 'fact', h: 'typewriter', s: 'can be typed using only', e: 'the top row of keys', b: 'On a standard QWERTY keyboard all ten letters sit on the top row. So do the letters of proprietor, perpetuity and repertoire.' },
  { t: 'fact', h: 'rhythm', s: 'has no', e: 'a, e, i, o or u', b: 'The letter y does the work of a vowel here. Other words that manage without the usual five include myth, lynx, crypt and gym.' },
  { t: 'fact', h: 'uncopyrightable', s: 'uses fifteen letters and', e: 'repeats none', b: 'A word with no repeated letters is called an isogram. Dermatoglyphics, the study of fingerprints, is another with fifteen.' },
  { t: 'fact', h: 'almost', s: 'has its letters in', e: 'alphabetical order', b: 'So do begin, chimp, ghost and biopsy. Words like this are rare, and the longer the word, the rarer it gets.' },
  { t: 'fact', h: 'bookkeeper', s: 'has three double letters', e: 'in a row', b: 'Double o, double k, double e. Bookkeeper and bookkeeping are the only common English words with three pairs of double letters back to back.' },
  { t: 'fact', h: 'queue', s: 'sounds the same with', e: 'four letters removed', b: 'Take away the last four letters and you still say it the same way. The word is French for tail, which is what a line of people looks like.' },
  { t: 'fact', h: 'the tittle', s: 'is the name for', e: 'the dot over i and j', b: 'It comes from the Latin for a small mark. Some people think the phrase to a T began as to a tittle, meaning down to the smallest detail.' },
  { t: 'fact', h: '&', s: 'was once taught as the', e: '27th letter', b: 'Children ended the alphabet with: and, per se, and. Said quickly, that slurred into the word ampersand.' },
  { t: 'fact', h: 'E', s: 'is the most used', e: 'letter in English', b: 'It turns up in roughly one of every eight letters you read. In 1939 Ernest Vincent Wright published Gadsby, a 50,000 word novel without a single e.' },
  { t: 'fact', h: 'the', s: 'is the most used', e: 'word in English', b: 'It makes up roughly one word in every twenty on a typical page. The top ten also includes be, to, of, and, a and in.' },
  { t: 'fact', h: 'run', s: 'has more meanings than', e: 'any other English verb', b: 'Editors of the Oxford English Dictionary counted 645 senses for the verb run, taking the record from set.' },
  { t: 'fact', h: 'ye olde', s: 'was always said', e: 'the olde', b: 'The y stood in for an old letter called thorn, which made the th sound. Printers without a thorn used y, and readers later forgot.' },
  { t: 'fact', h: 'OK', s: 'began as', e: 'a spelling joke', b: 'In 1839 a Boston newspaper used it as a jokey short form of oll korrect, a deliberate misspelling of all correct. It is now understood almost everywhere.' },
  { t: 'fact', h: 'dreamt', s: 'ends in', e: 'mt', b: 'It is the only common English word that does, along with its relatives undreamt and daydreamt.' },
  { t: 'fact', h: 'strengths', s: 'has nine letters and', e: 'just one vowel', b: 'It is among the longest English words with a single vowel, and one of the longest you can say in a single syllable.' },
  { t: 'fact', h: 'pangram', s: 'a sentence using', e: 'every letter', b: 'The quick brown fox jumps over the lazy dog is the famous one. Sphinx of black quartz, judge my vow does it in twenty-nine letters.' },
  { t: 'fact', h: 'palindrome', s: 'reads the same', e: 'backwards', b: 'Level, kayak and racecar all work. So does a whole sentence: A man, a plan, a canal, Panama.' },
  { t: 'fact', h: 'your eyes', s: 'do not glide when', e: 'you read', b: 'They jump. Each hop is called a saccade, and you only take in words during the short pauses in between, a few letters at a time.' },
  { t: 'fact', h: 'one in ten', s: 'people are thought to be', e: 'dyslexic', b: 'Dyslexia mainly affects reading and spelling. It has nothing to do with intelligence, and many dyslexic people are strong visual and creative thinkers.' },
  { t: 'fact', h: 'octothorpe', s: 'is another name for', e: 'the hash sign', b: 'Engineers at Bell Labs are said to have coined it in the 1960s for the telephone keypad. Octo is for its eight points.' },

  // ---- phrases, groups, mix-ups and twisters (81-100)
  { t: 'phrase', k: 'ONE WORD FOR MANY', h: 'a murmuration', s: 'is the word for a flock of', e: 'starlings', b: 'Thousands of starlings turn together in the evening sky like one shape. The name copies the murmur of all those wings.' },
  { t: 'phrase', k: 'ONE WORD FOR MANY', h: 'an exaltation', s: 'is the word for a flock of', e: 'larks', b: 'It comes from a hunting book printed in 1486, the Book of Saint Albans, which also lists a murder of crows and a pride of lions.' },
  { t: 'phrase', k: 'ONE WORD FOR MANY', h: 'a flamboyance', s: 'is the word for a group of', e: 'flamingos', b: 'Flamingo and flamboyant both go back to words for flame. The birds get their pink from the shrimp and algae they eat.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'break the ice', s: 'first meant', e: 'clearing a path for ships', b: 'Small boats broke river ice so that trade could start again. By the 1600s it also meant easing the first awkward moments between strangers.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'once in a blue moon', s: 'means', e: 'very rarely', b: 'Today a blue moon usually means a second full moon in one calendar month. That happens about once every two or three years.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'spill the beans', s: 'means', e: 'give away a secret', b: 'It appeared in American slang in the early 1900s. The story about ancient Greeks voting with beans is a nice one, but there is no proof.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'under the weather', s: 'means', e: 'feeling unwell', b: 'It is probably a sailor’s phrase. A seasick sailor was sent below deck, out of the weather, to recover.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'bite the bullet', s: 'means', e: 'face something hard', b: 'The story goes that soldiers bit on a bullet during surgery without anaesthetic. Kipling used the phrase in a novel in 1891.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'affect or effect?', s: 'affect is usually the verb', e: 'effect is the noun', b: 'Rain affects your mood. Rain has an effect on your mood. If you can put the or an in front of it, you want effect.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'stationary or stationery?', s: 'the one with an e is for', e: 'envelopes', b: 'Stationery with an e is paper, pens and envelopes. Stationary with an a means standing still, like a parked car.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'their, there, they’re', s: 'three words with', e: 'one sound', b: 'Their shows belonging. There points to a place. They’re is short for they are. Say they are out loud, and if it fits, use the apostrophe.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'lose or loose?', s: 'lose has', e: 'lost an o', b: 'You lose your keys. A loose tooth wobbles. Lose rhymes with choose, and loose rhymes with goose.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'desert or dessert?', s: 'dessert has two s because', e: 'you want seconds', b: 'A desert is dry sand. Dessert is pudding. To desert someone, with the stress on the end, is to abandon them.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'complement or compliment?', s: 'a complement', e: 'completes', b: 'Complement shares its first six letters with complete. A compliment with an i is the kind thing that I say to you.' },
  { t: 'phrase', k: 'SAY IT OUT LOUD', h: 'she sells seashells', s: 'now say it', e: 'three times fast', b: 'Tongue twisters work by packing nearly identical sounds together, here s and sh, so your tongue has to keep switching between them.' },
  { t: 'phrase', k: 'SAY IT OUT LOUD', h: 'red lorry, yellow lorry', s: 'now say it', e: 'five times fast', b: 'The sounds r and l are made with the tongue in almost the same place, so swapping quickly between them trips nearly everybody up.' },
  { t: 'phrase', k: 'SAY IT OUT LOUD', h: 'Peter Piper', s: 'picked a peck of', e: 'pickled peppers', b: 'The rhyme was printed in London in 1813 in a book of tongue twisters, one for each letter of the alphabet. A peck is about nine litres.' },
  { t: 'phrase', k: 'WHAT IT REALLY MEANS', h: 'the whole nine yards', s: 'means', e: 'everything', b: 'Nobody knows where it comes from. Guesses include cloth, concrete and machine-gun belts, and none of them has been proved.' },
  { t: 'phrase', k: 'WHICH ONE IS IT?', h: 'principal or principle?', s: 'the principal', e: 'is your pal', b: 'A principal is the head of a school, or the main thing. A principle is a rule or a belief that you stick to.' },
  { t: 'phrase', k: 'SAY IT OUT LOUD', h: 'onomatopoeia', s: 'a word that', e: 'sounds like what it means', b: 'Buzz, hiss, splash, cuckoo, murmur. The name is Greek for making a name, and it is much harder to spell than any of its examples.' },
];
