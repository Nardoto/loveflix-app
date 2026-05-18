// Realistic, varied human-like comments per story.
//
// Replaces the old fixed pool of 10 reused comments (StoryComments.tsx) with:
//   - ~70 curated portrait avatars (randomuser.me — real-looking adult women)
//   - ~70 first-name + last-initial pairs (US/UK/EU/LatAm spread, target age 35-65)
//   - ~250+ comment body templates, tagged by genre / trope / locale
//   - A deterministic generator (seeded by storyId) so a given story always shows
//     the same mix, but every story gets a *unique* combination
//   - 70%+ of stories receive comments; the rest are intentionally empty
//     (looks more authentic than 100% reviewed)
//
// Real Sprint 1+ wires this to Supabase + posthog.capture('rating_submitted'),
// keeping this file as the seed for cold-start social proof.

import type { Story } from './stories';

export type StoryReply = {
  id: string;
  user: string;
  avatar: string;
  date: string;
  body: string;
  /** Resposta oficial da plataforma (admin). Renderiza como "AllureTV Team"
   * + badge dourado OFICIAL, ignorando user/avatar reais do admin. */
  isCreatorReply: boolean;
  userId?: string;
};

export type StoryComment = {
  id: string;
  user: string;
  avatar: string;
  stars?: number; // optional — coming-soon comments have no rating yet
  date: string;
  body: string;
  likes: number;
  // Set ONLY for real Supabase rows. Used by the client to decide whether to
  // show Edit/Delete buttons (`c.userId === currentUserId`). Mock comments
  // leave this undefined so they're never editable.
  userId?: string;
  /** Replies já persistidas no banco (server-side). O componente cliente
   * concatena com replies otimistas do usuário atual. */
  replies?: StoryReply[];
};

// ---------------------------------------------------------------------------
// AVATARS — randomuser.me portrait indexes curated for adult-women look.
// Each entry is a stable URL the CDN serves indefinitely.
// ---------------------------------------------------------------------------
const AVATAR_INDEXES = [
  0, 1, 3, 5, 6, 8, 9, 11, 12, 14, 15, 16, 18, 20, 21, 22, 23, 25, 27, 28,
  29, 30, 31, 32, 33, 35, 36, 37, 38, 40, 41, 42, 44, 45, 47, 48, 49, 51,
  52, 53, 54, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 68, 69, 70, 71,
  72, 74, 75, 76, 77, 78, 79, 80, 81, 83, 84, 85, 87, 88, 89, 90, 91, 93,
];
const avatarUrl = (i: number) =>
  `https://randomuser.me/api/portraits/women/${AVATAR_INDEXES[i % AVATAR_INDEXES.length]}.jpg`;

// ---------------------------------------------------------------------------
// NAMES — varied display formats so the comment list doesn't look botted.
// Skews 35-65 (target demographic). Mix of cultures matching the audio locales:
// US/UK, German, French, Spanish/LatAm, Italian.
//
// Display formats are intentionally inconsistent (like real review feeds):
//   - "Margaret R."          (first + last initial, classic)
//   - "Linda Patterson"      (full first + last)
//   - "Diane"                (first only)
//   - "Karen H."             (initial only)
//   - "Susan-Marie B."       (compound)
//   - "MariaElena_72"        (handle, rare)
//   - "Mrs. Beverly C."      (with title, rare)
// ---------------------------------------------------------------------------
const NAMES = [
  // -- US/UK, classic "first + last initial" (mainstream) --
  'Margaret R.', 'Sandra K.', 'Carolyn T.', 'Diane M.', 'Patricia W.',
  'Susan B.', 'Helen O.', 'Barbara J.', 'Karen H.', 'Beverly C.',
  'Pamela D.', 'Janet R.', 'Joan H.', 'Catherine A.', 'Theresa B.',
  'Gloria P.',

  // -- US/UK, full last name (changes the rhythm) --
  'Linda Patterson', 'Jennifer Albright', 'Nancy Whitfield', 'Donna Reilly',
  'Kathleen Sutton', 'Cynthia Greaves', 'Ruth Nakamura', 'Sharon Easton',
  'Lorraine Vasquez', 'Marilyn Trent', 'Deborah Kowalski', 'Rachel Monroe',
  'Vivian Larsen', 'Constance Albright', 'Audrey Kim', 'Bernadette Hayes',
  'Eleanor Chen', 'Vivienne Marsh', 'Genevieve Pomeroy', 'Florence Daniels',
  'Rosemary Jacobs',

  // -- US/UK, first name only (intimate / casual) --
  'Diane', 'Margaret', 'Linda', 'Carolyn', 'Helen', 'Pamela',
  'Eleanor', 'Audrey', 'Florence', 'Rosemary', 'Constance',

  // -- US/UK, last initial only --
  'Karen H.', 'Donna L.', 'Beverly C.', 'Patricia W.', 'Susan B.',

  // -- US/UK, compound / hyphenated (older generation marker) --
  'Susan-Marie B.', 'Mary-Anne Whitfield', 'Linda-Jo P.', 'Anna-Lee R.',
  'Sarah-Beth Carmichael',

  // -- US/UK, with title (rare, gives flavor) --
  'Mrs. Beverly Carter', 'Mrs. P. Whitford', 'Dr. Helen O.', 'Mrs. Sutton',

  // -- German --
  'Ingrid S.', 'Ursula H.', 'Heike Brandt', 'Gudrun', 'Brigitte K.',
  'Renate M.', 'Helga Fischer', 'Petra L.', 'Annette R.', 'Christel Becker',
  'Hannelore W.', 'Sabine Hoffmann', 'Karin Müller', 'Monika',

  // -- French --
  'Marianne D.', 'Gisèle B.', 'Sylvie Marchand', 'Catherine D.',
  'Brigitte Laurent', 'Monique R.', 'Françoise V.', 'Isabelle Garnier',
  'Nathalie P.', 'Véronique T.', 'Hélène', 'Chantal Bouchard',

  // -- Spanish / LatAm --
  'Pilar G.', 'Carmen Ruiz', 'Mercedes V.', 'Lourdes Morales',
  'Esperanza C.', 'Beatriz Salazar', 'Dolores P.', 'Inés F.',
  'María Elena Castillo', 'Soledad', 'Rosa V.', 'Adriana Vega',

  // -- Italian (small spread) --
  'Giovanna R.', 'Paola Conti', 'Lucia Romano', 'Franca',

  // -- Handles / online-style (rare, modern flavor) --
  'MariaElena_72', 'rosie.reads', 'helens.book.nights', 'sandra_late_reader',
  'audiobookmom58', 'NotMyFirstRomance', 'quietlyreading',
];

// ---------------------------------------------------------------------------
// COMMENT TEMPLATES — most lines are universal; some are tagged so the
// generator can over-weight them when the story matches.
// Placeholders:
//   {locale}  → "the German narration" / "la versión en español" / etc.
//   {genre}   → "mafia romance" / "billionaire story" / etc.
//   (rendered by render() below)
// ---------------------------------------------------------------------------
type Template = {
  body: string;
  weight?: number;
  genres?: Story['genre'][]; // boost when story matches
  tropes?: string[];         // boost when any trope matches (lowercase substring)
  locales?: string[];        // require the story to have one of these audio locales
};

const TEMPLATES: Template[] = [
  // ---------- universal afterglow ----------
  { body: "Listened the whole thing in one drive from Tampa to Miami. The narrator's voice is like honey. Couldn't stop." },
  { body: "I had to pull over twice. Not because I was tired — because I needed a minute. This one stays with you." },
  { body: "Started it at 9 p.m., 'just one chapter.' It's 2 a.m. and I'm lying here staring at the ceiling like a teenager." },
  { body: "I'm a grown woman with three kids and I just listened to this with the closet door closed and a cup of tea. No regrets." },
  { body: "The pacing is what gets me. They take their time. So many audiobooks rush the part that actually matters." },
  { body: "Finally something for women who already raised their families and want to feel something again. Thank you for this." },
  { body: "Used the sleep timer the first night. Came back to it the next morning before the kids woke up. Best 40 minutes of my week." },
  { body: "I caught myself smiling on the bus. The man across from me must have thought I was losing it. Worth it." },
  { body: "It's been three days and I'm still thinking about that one line near the end. You know the one." },
  { body: "Bought the e-book version too just to underline the parts that wrecked me. Both are gorgeous." },
  { body: "Listened with my husband sleeping next to me. He has no idea why I was holding my breath. I'll never tell him." },
  { body: "The chemistry felt real, not performative. So many of these stories try too hard. This one trusted itself." },
  { body: "Beautifully written. My only complaint is I want a sequel. Don't tease us like this." },
  { body: "I cried at the kitchen scene. Twice. Beautiful work — the kind of story that reminds you why we read romance." },
  { body: "Finally an audiobook for grown women. No silly tropes, just slow-burn done right. Sleep timer is heaven." },
  { body: "My husband caught me listening with headphones and a glass of wine. He asked what was making me smile. I lied. ❤" },
  { body: "Wish there were more stories like this. Strong female lead, slow tension, and zero cringe. More please." },
  { body: "Played it on the drive to my daughter's house. Almost missed the exit. That's how you know it's good." },
  { body: "I needed something for the long winter nights and this hit every spot. The build-up… I was holding my breath." },
  { body: "Listening to this in the bath after a 12-hour shift was the best decision I made all week." },

  // ---------- universal craft / writing praise ----------
  { body: "The dialogue. Oh my god, the dialogue. People actually talk like this when they finally stop pretending." },
  { body: "I'm a retired English teacher. The pacing of this is genuinely beautiful. Don't change a thing." },
  { body: "Whoever writes these knows what restraint feels like. That's rarer than people realize." },
  { body: "There's a kind of writing that respects the reader's intelligence. This is that. Thank you." },
  { body: "Not a single forced moment. The tension built itself, and then it stayed built. Masterful." },
  { body: "I'm 58 and I have read everything Nora Roberts ever published. This holds its own. I don't say that lightly." },
  { body: "The descriptions of the room — I could smell the lamp oil. I was THERE." },
  { body: "Subtlety is a lost art in modern romance and this team has it. Bless them." },

  // ---------- universal narrator praise ----------
  { body: "The narrator. Whoever picked her — give them a raise. Her voice belongs in the bedside-table drawer." },
  { body: "The way the narrator handled the male lead's voice without going cartoonish — that's craft." },
  { body: "I've listened to a hundred audiobooks. This narrator is in my top three. The pacing on the quiet moments… chef's kiss." },
  { body: "Her laugh in chapter four. Listened to it five times. It sounded so real." },
  { body: "The narration is so warm. It feels like a friend telling you a story over wine, not someone reading a script." },
  { body: "Voice acting is the right phrase. This isn't reading. She inhabited every character." },

  // ---------- universal “friend recommendation” ----------
  { body: "My book club is officially obsessed. We're all comparing notes on our favorite scenes." },
  { body: "My sister told me about this one. She's never lied to me about a book in 40 years." },
  { body: "Texted four friends after I finished. Two of them have already started." },
  { body: "I shared it with my mom. She's 71. She called me the next morning, no preamble — just 'oh my GOD.'" },
  { body: "This is going on the list I send my friends after divorces. You know the list." },

  // ---------- universal mild critique (keeps it real) ----------
  { body: "Loved it. Four stars only because I want it to be twice as long. Greedy of me, I know." },
  { body: "One scene felt a touch rushed near the middle but everything else made up for it." },
  { body: "Small thing — the chapter break after the storm scene was a little abrupt. Otherwise flawless." },
  { body: "Wanted a tiny bit more from his point of view. Still gorgeous." },

  // ---------- universal small daily-life context ----------
  { body: "Listened while folding laundry. Folded the same towel four times because I forgot what I was doing." },
  { body: "Tried to garden with this in my ears. Didn't garden. Sat on the patio and listened to the whole chapter." },
  { body: "I've been recovering from knee surgery and this got me through three afternoons in a row." },
  { body: "My commute is 45 minutes and I now wish it were longer. That's a sentence I never thought I'd write." },
  { body: "Played it during my morning walk. Walked an extra mile. Worth it." },
  { body: "I'm a night-shift nurse. This made the 4 a.m. dead-quiet hours feel almost cinematic." },
  { body: "I take care of my mother during the day and this is the only thing that's just for me. Don't underestimate that." },
  { body: "Listened on a long flight to see my grandkids. Landed teary-eyed and the man next to me pretended not to notice." },

  // ---------- multilingual / locale-aware ----------
  { body: "Loved the German narration too — switched between EN and DE just to compare. Both versions are equally moving.", locales: ['de'] },
  { body: "Als deutsche Hörerin: die Übersetzung ist liebevoll, nicht mechanisch. Man spürt jede Pause. ❤", locales: ['de'] },
  { body: "Ich habe es im Auto gehört, auf dem Weg zur Arbeit. Bin am Parkplatz sitzen geblieben, bis das Kapitel zu Ende war.", locales: ['de'] },
  { body: "Como mexicana, escuché la versión en español y me hizo recordar las novelas que mi madre escuchaba en la radio. Pero más íntimo. Gracias.", locales: ['es'] },
  { body: "La narración en español es preciosa. La voz tiene esa calidez que ya no se encuentra en la radio.", locales: ['es'] },
  { body: "Lo escuché mientras cocinaba para mi familia. Se me pasaron los frijoles y no me importó. Hermoso.", locales: ['es'] },
  { body: "J'ai écouté la version française au lit après une longue journée. Pure magie. La voix est un velours.", locales: ['fr'] },
  { body: "La narratrice française a une diction d'un autre temps. On dirait Anouk Aimée. Sublime.", locales: ['fr'] },
  { body: "Première fois que j'écoute une romance audio en français qui n'a pas l'air traduite. Bravo.", locales: ['fr'] },

  // ---------- mafia / dark / dangerous ----------
  { body: "He's terrifying and I would still hand him my purse. I'm not okay.", genres: ['mafia'] },
  { body: "The way he says her name in chapter two. I had to rewind it. Twice.", genres: ['mafia', 'forbidden'] },
  { body: "I'm too old to be this invested in a man who 'doesn't share.' And yet.", genres: ['mafia'] },
  { body: "Someone tell whoever wrote the warehouse scene I owe them a thank-you note and possibly therapy.", genres: ['mafia'] },
  { body: "I usually skip the dark stuff but this one earned every shadow it cast. The redemption arc is real.", genres: ['mafia'], tropes: ['dark'] },
  { body: "The moment he tells the other man to leave the room. Goosebumps. Pure goosebumps.", genres: ['mafia'] },
  { body: "Reader, I gasped. Out loud. In a quiet office. My coworker asked if I was okay. I was not.", genres: ['mafia'], tropes: ['possessive'] },
  { body: "There's something about a dangerous man who finally goes still around one woman. This nailed it.", genres: ['mafia'] },

  // ---------- billionaire / boss / power ----------
  { body: "Money in romance usually feels gross. Here it just felt like another wall he had to lower. Loved that.", genres: ['billionaire'] },
  { body: "I've read a hundred CEO romances. He's the first one who felt like an actual adult with a calendar.", genres: ['billionaire'] },
  { body: "The boardroom scene. I will be replaying that boardroom scene for weeks.", genres: ['billionaire'], tropes: ['boss', 'workplace'] },
  { body: "When he closes the laptop and says 'we're done for tonight' — give me a moment.", genres: ['billionaire'] },
  { body: "He's not arrogant for the sake of it. He's tired and lonely and the writing GETS that. Refreshing.", genres: ['billionaire'] },
  { body: "Billionaire who can also cook eggs. The bar was on the floor and they cleared it.", genres: ['billionaire'] },
  { body: "The private jet wasn't a flex, it was a trap, and I appreciated the writing for knowing the difference.", genres: ['billionaire'] },

  // ---------- forbidden / age gap / taboo ----------
  { body: "Forbidden done with care. Nobody is a villain, everyone's just human. That's harder than it looks.", genres: ['forbidden'] },
  { body: "The slow burn here is criminal. I had to keep pausing to breathe.", genres: ['forbidden'], tropes: ['slow burn'] },
  { body: "I'm a sucker for the older-man trope when it's written like this — patient, not predatory.", tropes: ['age gap'] },
  { body: "The way he says nothing for almost a full chapter and you can still feel exactly what he's thinking. THAT'S writing.", genres: ['forbidden'] },
  { body: "You can tell the writer respects the reader. Nothing felt cheap. Even the 'forbidden' beats earned themselves.", genres: ['forbidden'] },
  { body: "The hand on the small of her back during the kitchen scene. I will be unwell for the rest of the week.", genres: ['forbidden'] },

  // ---------- secret baby / hidden child ----------
  { body: "I sobbed at the moment he sees the boy for the first time and just KNOWS. Sobbed.", genres: ['secret_baby'] },
  { body: "The reveal was earned. No melodrama, no shouting — just a man putting down his coffee very slowly. Perfect.", genres: ['secret_baby'] },
  { body: "She kept that secret out of love, not malice. The book understands that, and most books don't.", genres: ['secret_baby'] },
  { body: "I called my own son after this. Told him I love him for no reason. He thought I was sick. I was just emotional.", genres: ['secret_baby'] },

  // ---------- second chance / coming back ----------
  { body: "Second-chance romances usually feel forced. This one felt inevitable. Different beast entirely.", genres: ['second_chance'] },
  { body: "The line where she asks if it ever stopped — and he doesn't answer. I had to put down the dishes.", genres: ['second_chance'] },
  { body: "Twenty years married and this still made me think about a boy I knew at sixteen. That's the power of good writing.", genres: ['second_chance'] },
  { body: "The way time is treated here. Like it's a character. Like it's the third person in every room. Beautiful.", genres: ['second_chance'] },

  // ---------- arranged marriage / contract ----------
  { body: "Arranged-marriage trope but written for adults. The slow surrender, not the cliche. Five stars easy.", genres: ['arranged'] },
  { body: "Two strangers signing a contract and then learning each other room by room. I am undone.", genres: ['arranged'], tropes: ['contract marriage'] },
  { body: "The first breakfast scene where neither of them knows what to call the other. Stunning detail.", genres: ['arranged'] },

  // ---------- royal ----------
  { body: "Old-fashioned in the best way. Like a Sunday-night BBC drama, but with teeth.", genres: ['royal'] },
  { body: "The throne-room scene gave me chills. Pure chills. They don't make them like this anymore.", genres: ['royal'] },

  // ---------- mood pieces (short audio) ----------
  { body: "It's a short one but it lingers. Played it three times in a row. No skips.", genres: ['mood'] },
  { body: "I have it queued for every Sunday morning now. Coffee, this story, no phone. That's church for me.", genres: ['mood'] },
  { body: "Tiny perfect thing. Sometimes you just want a feeling, not a whole novel.", genres: ['mood'] },
  { body: "I fall asleep to this. I fall asleep HAPPY. Don't underestimate what that's worth at my age.", genres: ['mood'] },

  // ---------- universal sensory / soft praise ----------
  { body: "There's a gentleness here that I didn't know I needed until I heard it. Thank you, sincerely." },
  { body: "Felt like being wrapped in a blanket and also pushed off a cliff. Wonderful." },
  { body: "I don't usually leave reviews. I'm leaving this one because somebody out there needs to know this is worth her evening." },
  { body: "Five stars. Will listen again. Will recommend. Will probably also re-listen to chapter five tonight, alone, with the door locked." },
  { body: "The kind of story you don't talk about at lunch. The kind you text your one good friend about, late." },
  { body: "I've been a quiet wife for a long time. This made me feel things a quiet wife isn't supposed to feel anymore." },
  { body: "Beautifully restrained. Beautifully built. Beautifully ended. I have no notes." },
  { body: "If you're on the fence — get off it. Listen tonight. With a glass of something. You'll thank me." },
  { body: "Reminded me what it felt like before everything got busy. That's a gift. Don't undervalue it." },
  { body: "The ending didn't tie everything up too neatly. I respected that. Real life doesn't either." },
  { body: "I keep coming back to the chapter where she finally tells him the truth. The silence after. Genius." },
  { body: "It's not just a romance. It's a portrait. I felt seen in a way I didn't expect at my age." },
  { body: "Took my time with this one. A chapter a night for a week. It was the best part of every day." },
  { body: "The audio quality is clean, the music is restrained, the pacing is right. Whoever produced this — well done." },
  { body: "I've recommended this to every woman in my Pilates class. Three of them have already finished it." },
  { body: "Listened in my car in the parking lot for fifteen minutes after I got home. Couldn't get out until the chapter ended." },
  { body: "This made my Tuesday. My TUESDAY. Do you have any idea how rare that is?" },
  { body: "I'm not a crier. I cried. Twice. Once in surprise, once in recognition." },
  { body: "It's the kind of audiobook you don't recommend on Facebook. You whisper it to one specific friend." },
  { body: "I love that they let her be wrong sometimes. Most romances are afraid to let the woman be flawed. This one isn't." },
  { body: "Honest review: I started it skeptical. Sandra K. from my book club kept telling me to. She was right. I was wrong." },
  { body: "Played it on the porch at sunset. The light, the voice, the words. One of those evenings you don't forget." },
  { body: "The first time he laughs in the story. I waited the whole book for it and it was worth every page." },
  { body: "I needed something that wasn't a true crime podcast for once. This was the perfect break." },
  { body: "Why isn't there more like this? Real, slow, adult. I keep looking and keep being disappointed. Then this." },
  { body: "Listened in installments while making dinner all week. The kitchen has never been more romantic." },
  { body: "It's the small choices that make this special. The way he closes the door instead of slamming it. Etc." },
  { body: "There's nothing trashy about this. It's grown-up romance the way our mothers used to read paperbacks. Modern but timeless." },
  { body: "Three stars off for nothing. Five stars on for everything. Going to listen to it again next month." },

  // ---------- universal "I told my friend" ----------
  { body: "I sent the link to my best friend with no message. She replied an hour later with just 'OH.' That's all I needed." },
  { body: "My hairdresser asked what I'd been listening to because I 'looked different.' I told her. She added it to her list." },
  { body: "Bought my mother a subscription specifically so she could listen to this. Her review was a one-word text: 'finally.'" },
  { body: "The first audiobook in years where I was sad it ended. Sat in the silence for a minute. Just sat there." },

  // ---------- universal short reactions ----------
  { body: "Wow. Just — wow." },
  { body: "Replayed the last fifteen minutes immediately. No notes." },
  { body: "Five stars. No further questions." },
  { body: "Goodbye, productivity." },
  { body: "I have to lie down." },
  { body: "Okay this one made me feel things." },
  { body: "Where do I send the wine?" },
  { body: "Heart, fully wrecked." },
  { body: "Nothing else this week is going to top this." },
  { body: "I'm telling everyone." },

  // ---------- universal quiet, almost-private ----------
  { body: "I haven't felt this kind of quiet wanting in a long, long time. Thank you for reminding me it still exists." },
  { body: "I won't tell anyone I listened to this. It feels like mine. That's the highest compliment I have." },
  { body: "Wore it like perfume. Carried it around for two days. The world was softer." },
  { body: "Whoever wrote this knows something private about women my age that most books pretend isn't there. Bless them." },
  { body: "I've read romance for forty years. This top-five for me. I don't say that often. I don't say it lightly." },
  { body: "Felt like slipping back into a memory I didn't know I was allowed to keep." },
  { body: "There's a generosity in this story. It doesn't punish anyone for wanting. I needed that." },
  { body: "Quietly devastating. Quietly hopeful. Loud in all the places that mattered." },
];

// ---------------------------------------------------------------------------
// EXPECTATION TEMPLATES — used ONLY for coming-soon stories.
// People who haven't watched yet talking about the cover, the title, the
// synopsis, or asking when it drops. NEVER about the kitchen scene, the
// narrator's voice, or a specific chapter — that would be a tell.
// ---------------------------------------------------------------------------
const EXPECTATION_TEMPLATES: { body: string; genres?: Story['genre'][] }[] = [
  // Generic anticipation
  { body: "Saw the cover and immediately added it to my list. When does this one drop?" },
  { body: "Okay this synopsis has me HOOKED. Tell me there's already a release date." },
  { body: "I have been refreshing this page every couple of days. Just take my subscription already." },
  { body: "The title alone got me. I don't even need the trailer." },
  { body: "Is there a release date yet? My book club is asking." },
  { body: "Cover art looks gorgeous. Whoever's doing the covers for this app — keep going." },
  { body: "If this delivers half of what the synopsis promises I'm going to be a wreck." },
  { body: "Saving this one for the first cold weekend. Already know it's going to be that kind of story." },
  { body: "Can someone tell me when this actually launches? The 'coming soon' is killing me." },
  { body: "Read the synopsis twice. The second time was just to enjoy it." },
  { body: "I haven't even pressed play and I'm already invested. That's a good sign." },
  { body: "Telling my sister to download the app NOW so we can listen to this one together when it's out." },
  { body: "Coming soon? I'll wait. I'm a patient woman. (I'm not.)" },
  { body: "The premise is so my thing it's almost suspicious. Did you write it for me specifically?" },
  { body: "I have a long flight next month. Please let this one be ready by then." },
  { body: "Don't make us wait too long, please. The cover keeps showing up in my dreams." },
  { body: "This is going to be the one. I can feel it." },
  { body: "Already cleared my Saturday. Bath, candle, this audiobook the moment it's available." },
  { body: "Pre-saving this. I do that with albums. Now I do it with audiobooks too apparently." },
  { body: "If the chemistry is half of what the cover suggests, I'm going to need a fan." },
  { body: "Please tell me the audio version is coming and not just the e-book. I do my listening at night." },
  { body: "Fingers crossed they record this in German too. I always prefer the original-feel narration." },
  { body: "I will be there the minute this drops. Setting a calendar reminder." },
  { body: "Why does every 'coming soon' have to look this good? I have things to do, you know." },
  { body: "Reading the synopsis like it's the first chapter. Already decided I love them." },

  // Genre-tinted anticipation (still vague — no plot details)
  { body: "Mafia romance with that cover? Yes. Yes thank you. Hurry.", genres: ['mafia'] },
  { body: "Need this dangerous-man story like I need my evening tea.", genres: ['mafia'] },
  { body: "Dark, slow, and dangerous from the looks of it. Can't wait.", genres: ['mafia', 'forbidden'] },
  { body: "Billionaire who doesn't smile in the cover photo. I'm already in.", genres: ['billionaire'] },
  { body: "If this is another well-written CEO romance I'm going to lose my mind in the best way.", genres: ['billionaire'] },
  { body: "The forbidden ones are always my favorite. Already cleared the schedule.", genres: ['forbidden'] },
  { body: "A secret-baby story done right is a rare thing. Hopes are HIGH.", genres: ['secret_baby'] },
  { body: "Second chance romance and I haven't even pressed play. I'm already emotional.", genres: ['second_chance'] },
  { body: "Arranged-marriage trope ON the App? Sign me up before it drops.", genres: ['arranged'] },
  { body: "Royal romance with this aesthetic. I'm going to need the day off.", genres: ['royal'] },
  { body: "Looks like one of those short mood pieces I save for Sunday mornings. Excited.", genres: ['mood'] },

  // Tagging the friends
  { body: "Sent the cover to my book group with no caption. Got three replies in five minutes." },
  { body: "Tagged my best friend in the description. She replied in all caps. Same energy here." },
  { body: "Already told four women about this one and it isn't even out. That has to count for something." },
];

// ---------------------------------------------------------------------------
// DATE LABELS — full pool (used for live stories) + recent-only subset
// (used for coming-soon, since those stories were just announced)
// ---------------------------------------------------------------------------
const DATES = [
  '2 hours ago', '5 hours ago', '8 hours ago', 'yesterday', '2 days ago',
  '3 days ago', '4 days ago', '5 days ago', '6 days ago', '1 week ago',
  '2 weeks ago', '2 weeks ago', '3 weeks ago', '3 weeks ago', '1 month ago',
  '1 month ago', '5 weeks ago', '6 weeks ago', '2 months ago', '3 months ago',
];

const RECENT_DATES = [
  'just now', '20 minutes ago', '1 hour ago', '2 hours ago', '4 hours ago',
  '6 hours ago', '8 hours ago', 'yesterday', 'yesterday', '2 days ago',
  '2 days ago', '3 days ago', '4 days ago', '5 days ago', '6 days ago',
  '1 week ago', '1 week ago', '2 weeks ago',
];

// ---------------------------------------------------------------------------
// DETERMINISTIC PRNG (mulberry32) — same storyId always yields the same mix
// ---------------------------------------------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export type CommentMeta = {
  comments: StoryComment[]; // can be empty (intentional, ~30% of stories)
  ratingAvg: number;
  ratingCount: number;
};

const HAS_COMMENTS_THRESHOLD = 0.3; // 30% of stories show no comments → 70% do

export function generateCommentsForStory(story: Story): CommentMeta {
  const seed = hashSeed(story.id + '|' + story.slug);
  const rand = mulberry32(seed);

  // ============================================================
  // Coming-soon stories: anticipation comments only, no rating.
  // Nobody has watched yet — so no stars, no "the kitchen scene"
  // talk. Just curiosity, hype, and "when does this drop".
  // ============================================================
  if (story.isComingSoon) {
    const count = 4 + Math.floor(rand() * 10); // 4 to 13 comments
    return {
      ratingAvg: 0,
      ratingCount: 0,
      comments: pickExpectationComments(story, rand, count),
    };
  }

  // ============================================================
  // Live stories: full reviews (existing behavior).
  // ============================================================

  // Aggregate rating (mirrors the old formula but with seeded jitter)
  const ratingAvg = +(4.1 + rand() * 0.9).toFixed(1); // 4.1 - 5.0
  const ratingCount = Math.floor(60 + rand() * 1200); // 60 - 1259

  // ~30% of stories: no comments at all (looks more authentic than 100% reviewed)
  if (rand() < HAS_COMMENTS_THRESHOLD) {
    return { comments: [], ratingAvg, ratingCount };
  }

  // Pick how many comments (3-9, biased toward 4-6)
  const count = 3 + Math.floor(rand() * 7);

  // Build a weighted candidate pool tagged by genre/trope/locale
  const availableLocales = Object.keys(story.audioByLocale ?? story.audioKeyByLocale ?? {});
  const tropesLower = (story.tropes ?? []).map((t) => t.toLowerCase());

  const scored = TEMPLATES.map((tpl, idx) => {
    let weight = tpl.weight ?? 1;

    if (tpl.locales) {
      const matches = tpl.locales.some((l) => availableLocales.includes(l));
      if (!matches) return { idx, weight: 0 };
      weight += 3;
    }
    if (tpl.genres?.includes(story.genre)) weight += 4;
    if (tpl.tropes && tropesLower.some((t) => tpl.tropes!.some((x) => t.includes(x)))) {
      weight += 2;
    }
    return { idx, weight };
  }).filter((s) => s.weight > 0);

  // Weighted-without-replacement pick
  const picked: number[] = [];
  const pool = [...scored];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = rand() * total;
    let chosenIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        chosenIdx = j;
        break;
      }
    }
    picked.push(pool[chosenIdx].idx);
    pool.splice(chosenIdx, 1);
  }

  // Assemble final comments — unique avatars and names per story
  const usedAvatars = new Set<number>();
  const usedNames = new Set<number>();

  const comments: StoryComment[] = picked.map((tplIdx, i) => {
    let avatarIdx = Math.floor(rand() * AVATAR_INDEXES.length);
    let guard = 0;
    while (usedAvatars.has(avatarIdx) && guard++ < 50) {
      avatarIdx = (avatarIdx + 1) % AVATAR_INDEXES.length;
    }
    usedAvatars.add(avatarIdx);

    let nameIdx = Math.floor(rand() * NAMES.length);
    guard = 0;
    while (usedNames.has(nameIdx) && guard++ < 50) {
      nameIdx = (nameIdx + 1) % NAMES.length;
    }
    usedNames.add(nameIdx);

    // Stars: bias 5★, occasional 4★, rare 3★
    const r = rand();
    const stars = r < 0.7 ? 5 : r < 0.95 ? 4 : 3;

    // Likes: skewed by date — older comments tend to have more likes
    const dateIdx = Math.floor(rand() * DATES.length);
    const dateAgeBoost = Math.floor(dateIdx * 1.5);
    const likes = Math.max(2, Math.floor(rand() * 90) + dateAgeBoost);

    return {
      id: `${story.id}-c${i}`,
      user: NAMES[nameIdx],
      avatar: avatarUrl(avatarIdx),
      stars,
      date: DATES[dateIdx],
      body: TEMPLATES[tplIdx].body,
      likes,
    };
  });

  // Sort newest first (DATES is roughly chronological from recent → old)
  comments.sort((a, b) => DATES.indexOf(a.date) - DATES.indexOf(b.date));

  return { comments, ratingAvg, ratingCount };
}

// ---------------------------------------------------------------------------
// Coming-soon picker — uses the EXPECTATION pool, no stars, recent dates only.
// ---------------------------------------------------------------------------
function pickExpectationComments(
  story: Story,
  rand: () => number,
  count: number,
): StoryComment[] {
  const scored = EXPECTATION_TEMPLATES.map((tpl, idx) => {
    let weight = 1;
    if (tpl.genres?.includes(story.genre)) weight += 4;
    return { idx, weight };
  });

  const picked: number[] = [];
  const pool = [...scored];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = rand() * total;
    let chosenIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        chosenIdx = j;
        break;
      }
    }
    picked.push(pool[chosenIdx].idx);
    pool.splice(chosenIdx, 1);
  }

  const usedAvatars = new Set<number>();
  const usedNames = new Set<number>();

  const comments: StoryComment[] = picked.map((tplIdx, i) => {
    let avatarIdx = Math.floor(rand() * AVATAR_INDEXES.length);
    let guard = 0;
    while (usedAvatars.has(avatarIdx) && guard++ < 50) {
      avatarIdx = (avatarIdx + 1) % AVATAR_INDEXES.length;
    }
    usedAvatars.add(avatarIdx);

    let nameIdx = Math.floor(rand() * NAMES.length);
    guard = 0;
    while (usedNames.has(nameIdx) && guard++ < 50) {
      nameIdx = (nameIdx + 1) % NAMES.length;
    }
    usedNames.add(nameIdx);

    const dateIdx = Math.floor(rand() * RECENT_DATES.length);
    // Likes are tiny on coming-soon — these are pre-launch hype, not reviews.
    const likes = Math.max(0, Math.floor(rand() * 14));

    return {
      id: `${story.id}-c${i}`,
      user: NAMES[nameIdx],
      avatar: avatarUrl(avatarIdx),
      // stars intentionally omitted — no one has rated something they haven't seen
      date: RECENT_DATES[dateIdx],
      body: EXPECTATION_TEMPLATES[tplIdx].body,
      likes,
    };
  });

  comments.sort(
    (a, b) => RECENT_DATES.indexOf(a.date) - RECENT_DATES.indexOf(b.date),
  );
  return comments;
}
