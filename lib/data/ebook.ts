// E-book pages for the flagship "He Had Never Touched Me" story.
// 53 pages — cover + 51 narrative + final.
// Ported from apresentacao-app/midia/ebook-pages.js.

export type EbookPage =
  | { type: 'cover'; storySlug: string }
  | {
      type: 'content';
      chapter: string;
      title: string;
      img: string;
      body: string;
    }
  | { type: 'final'; title: string; message: string };

const img = (n: number) => `/ebook/pag-${String(n).padStart(3, '0')}.jpg`;

export const ebookPages: EbookPage[] = [
  { type: 'cover', storySlug: 'he-had-never-touched-me' },

  // ===== PROLOGUE =====
  {
    type: 'content',
    chapter: 'Prologue',
    title: 'That Day in the Kitchen',
    img: img(1),
    body: `<p>From the very first moment she stepped onto that Texas ranch, he looked at her like a man already lost. He loved her — quietly, fiercely, painfully. He wanted her in ways that kept him awake every single night.</p>
    <p>But he wouldn't touch her. Not once. Because he was rough, calloused, made of hard work and harder edges, and he was terrified of breaking something so delicate.</p>
    <p>Every night she lay inches from a man burning alive beside her, fighting his own hands. Until one quiet kitchen, one flickering lamp, one whispered word… and the fire he had been holding back for so long finally broke loose.</p>
    <p><em>What happened next changed them both forever.</em></p>`,
  },

  // ===== CHAPTER 1 — PROMISED LAND (5 pages) =====
  { type: 'content', chapter: 'Chapter 1', title: 'Promised Land', img: img(1), body: `<p>The dirt road seemed to stretch on forever, winding through golden grass that bent low under the heavy Texas wind.</p>
    <p>Inside the old pickup truck, Alyssa held the small bouquet of white wildflowers tight against her lap, her knuckles pale around the stems. The bumps of the road jolted her shoulders, but she barely felt them. Her chest was too full, too loud, too crowded with the rhythm of a heart that simply would not quiet down.</p>
    <p>She had said yes to this. She had to remind herself of that.</p>` },
  { type: 'content', chapter: 'Chapter 1', title: 'Promised Land', img: img(2), body: `<p>She had said yes when her uncle sat her down at the kitchen table, his hands folded, his voice flat, and told her about a man named Dante Sullivan who owned a piece of land out west and needed a wife.</p>
    <p>She had said yes because there was nothing left for her in the small town she came from. No family who wanted her. No future that wasn't already crumbling. So she had packed a single suitcase, kissed her old life goodbye, and climbed into a truck heading toward a stranger.</p>
    <p>When the truck finally rolled to a stop in front of the weathered wooden house, Alyssa drew in a slow, trembling breath. <em>That was when she saw him.</em></p>` },
  { type: 'content', chapter: 'Chapter 1', title: 'Promised Land', img: img(3), body: `<p>Dante stepped out from the stable, and for a moment her whole world seemed to pause.</p>
    <p>His flannel shirt was rolled up to the elbows, revealing forearms marked with veins and the kind of strength that came from years of real work. A wide-brimmed hat sat low over his face, casting a shadow over eyes she couldn't yet see. Dust clung to his boots. A line of sweat traced down the bronzed column of his neck and disappeared beneath the collar of his shirt.</p>
    <p>He moved with the slow, deliberate weight of a man who had nothing to prove to anyone. He was made of silence and strength.</p>` },
  { type: 'content', chapter: 'Chapter 1', title: 'Promised Land', img: img(2), body: `<p>He walked toward her without a word. Opened the truck door. And when she finally swung her legs out, the hem of her dress catching against the metal step, he reached up.</p>
    <p>His hand was rough — calloused, warm, enormous against the curve of her waist. Even through the thin fabric of her dress, she felt every ridge of his palm. Every controlled breath. The heat of him was startling. Real. <em>And just like that, her body forgot how to function.</em></p>
    <p>His gaze lifted slowly, climbing from her shoes, to her dress, to her trembling hands, until at last his eyes met hers. Dark green. Deep as a forest after rain.</p>` },
  { type: 'content', chapter: 'Chapter 1', title: 'Promised Land', img: img(3), body: `<p>For one second too long, he held her close. Close enough that she felt the rise and fall of his chest against her own. Close enough that she could smell the faint warmth of his skin — sun and earth and clean cotton.</p>
    <p>Then, just as suddenly, he stepped back. Quick. Almost rough. As if her body had burned him.</p>
    <p>"Welcome home, Mrs. Sullivan."</p>
    <p>Her new home rose tall and silent in front of her. <em>And Alyssa, gripping her wildflowers a little tighter, took her first slow step forward… not yet knowing that the man who had just touched her for one breath of a moment had already decided, in his own quiet heart, that he would never touch her again.</em></p>` },

  // ===== CHAPTER 2 — THE DISTANCE THAT BURNS (4 pages) =====
  { type: 'content', chapter: 'Chapter 2', title: 'The Distance That Burns', img: img(4), body: `<p>The days on the ranch had a rhythm of their own.</p>
    <p>Dante woke before the sun, when the sky was still bruised purple at the edges and the rooster hadn't yet remembered its job. Alyssa would hear the soft creak of the wooden floor as he passed by the bedroom door, the careful way he tried not to wake her — though she was almost always already awake, listening.</p>
    <p>By the time she made it to the kitchen, he was already gone. But there was always coffee. Always fresh, always still warm, sitting on the table in a tin mug as if it were an apology written in steam.</p>` },
  { type: 'content', chapter: 'Chapter 2', title: 'The Distance That Burns', img: img(5), body: `<p>Sometimes there was a small jar beside it, filled with wildflowers he had picked from the field — bluebonnets, Indian paintbrush, tiny white blossoms she didn't know the names of. He never said he had picked them. And when she asked, he only shrugged and looked away.</p>
    <p>"Must've been the wind, Mrs. Sullivan."</p>
    <p>The wind. Of course.</p>
    <p>He was attentive in ways no man had ever been attentive to her before. The squeaky hinge — fixed before she even mentioned it. The loose step — replaced overnight. He took care of her like a man taking care of something sacred. <em>But he wouldn't touch her.</em></p>` },
  { type: 'content', chapter: 'Chapter 2', title: 'The Distance That Burns', img: img(6), body: `<p>At night, it was worse. The bed they shared was narrow — too narrow for two grown bodies pretending not to feel each other.</p>
    <p>Dante lay on his back, rigid as a drawn bowstring, his arms folded tight across his chest. He kept to the very edge of the mattress, as if one wrong shift might send him over a cliff. Alyssa could feel the heat of him radiating across the small space between them. She could hear the shape of his breathing — heavy, uneven, betraying him in the dark.</p>
    <p>One night, she couldn't take it anymore. She turned slowly, careful, until she was facing him. She reached out — just barely — and let her fingertips touch the warm skin of his back through the thin cotton of his shirt.</p>` },
  { type: 'content', chapter: 'Chapter 2', title: 'The Distance That Burns', img: img(5), body: `<p>His whole body went stone-still. He didn't turn. He didn't pull away. He just stayed there, frozen, as if her touch had stopped time itself. She heard him exhale — a long, broken sound that came from somewhere deep in his chest.</p>
    <p>"Sleep, Alyssa," he whispered. His voice was rough. Cracked at the edges. "Please."</p>
    <p>In the morning, the coffee was on the table. The wildflowers, too. A new jar this time. Yellow ones.</p>
    <p>She wasn't angry anymore. She wasn't even confused. <em>She was beginning to want him — fully, completely, in a way that scared her.</em></p>` },

  // ===== CHAPTER 3 — LOOKS THAT TOUCH (4 pages) =====
  { type: 'content', chapter: 'Chapter 3', title: 'Looks That Touch', img: img(7), body: `<p>The barn was bathed in golden light.</p>
    <p>It was that hour of the late afternoon when the sun hung low over the Texas plains, pouring its honey-colored glow through every wooden slat. Tiny particles of dust danced and drifted in the air like slow-falling stars. The smell of fresh hay was everywhere — sweet, warm, alive.</p>
    <p>Alyssa was tying the bales with rough twine, her hands red and a little sore. <em>She didn't have to turn around to know he was there. She felt him.</em></p>` },
  { type: 'content', chapter: 'Chapter 3', title: 'Looks That Touch', img: img(8), body: `<p>She felt his presence the way one feels a storm gathering on the horizon — that low pressure in the air, that quiet knowing. His footsteps had stopped at the wide barn entrance. His silence had folded itself around the whole space.</p>
    <p>And his eyes — God, his eyes — she felt those, too.</p>
    <p>They moved over her like a hand that wasn't allowed to touch. Down the curve of her neck. Across the slope of her shoulders. Lingering on the small of her back where her shirt had pulled loose.</p>` },
  { type: 'content', chapter: 'Chapter 3', title: 'Looks That Touch', img: img(7), body: `<p>His boots crossed the wooden floor of the barn in quiet, measured steps, and then he was behind her. Close. <em>Too close.</em></p>
    <p>She could feel the heat of his chest hovering just behind her back. She could feel the slow, controlled rhythm of his breathing — the kind of breathing a man does when he is fighting his entire body for control.</p>
    <p>His fingers came so close to her waist. So close she could feel the warmth of his palms before they ever touched her skin. <em>Almost. Almost.</em> They hovered a breath away, trembling slightly, as if held back by invisible chains.</p>` },
  { type: 'content', chapter: 'Chapter 3', title: 'Looks That Touch', img: img(8), body: `<p>But Dante's hands curled into fists. She heard the sharp inhale through his nose, the soft creak of his boots as he forced himself to take one step back. Then another.</p>
    <p>"There's…" His voice came out rough. "There's more rope in the storage shed, if you need it."</p>
    <p>He was already turning. Already walking away. <em>He wasn't pulling away because he didn't want her. He was pulling away because he wanted her too much.</em></p>
    <p>And somewhere, inside that quiet, calloused man, something was coming undone. Slowly. Dangerously.</p>` },

  // ===== CHAPTER 4 — THE FIRST PROVOCATION (5 pages) =====
  { type: 'content', chapter: 'Chapter 4', title: 'The First Provocation', img: img(9), body: `<p>If he wouldn't come to her, then she would go to him.</p>
    <p>The thought arrived quietly, the way most dangerous thoughts do — over morning coffee, with the wind moving the curtains. Alyssa turned the warm mug in her hands and stared out at the pasture where Dante's tall figure rode along the fence line.</p>
    <p>She was tired of waiting. Tired of measuring her steps. Tired of pretending she didn't feel his eyes on her every time she walked past him. <em>If he was going to keep holding back, then she was going to give him something he couldn't ignore.</em></p>` },
  { type: 'content', chapter: 'Chapter 4', title: 'The First Provocation', img: img(10), body: `<p>That afternoon, she chose carefully.</p>
    <p>The white dress. The light one. The cotton was thin and worn from many washes, soft as a whisper against her skin. Tiny buttons ran down the front. She left her hair loose — those long waves that usually stayed pinned up while she worked. She didn't put on shoes.</p>
    <p>She picked up the watering can from the porch and walked outside, pretending the world had not just tilted on its side.</p>` },
  { type: 'content', chapter: 'Chapter 4', title: 'The First Provocation', img: img(9), body: `<p>She heard him before she saw him.</p>
    <p>The sound of hooves slowed. Then stopped. Dante had pulled his horse to a halt right in the middle of the dusty yard. He sat there for a long, suspended moment — not moving, not speaking. Then she heard the slow creak of leather as he swung down from the saddle.</p>
    <p>She stretched up onto her toes to reach a higher basket, deliberately, letting the hem of her dress lift just slightly. She heard a sharp breath behind her. <em>Quick. Sucked in like a man who had just been struck in the chest.</em></p>` },
  { type: 'content', chapter: 'Chapter 4', title: 'The First Provocation', img: img(10), body: `<p>"Alyssa." His voice was lower than she had ever heard it.</p>
    <p>She finally turned. He was covered in the dust of a long ride. His shirt clung to him in damp lines down the center of his chest. His eyes were dark now. Hungry. The pupils blown wide, swallowing the color whole. <em>He was looking at her like a man who had been starving.</em></p>
    <p>His fingers came up toward her face — slow, trembling slightly — and hovered just shy of her cheek.</p>
    <p>"You're killing me, woman."</p>` },
  { type: 'content', chapter: 'Chapter 4', title: 'The First Provocation', img: img(11), body: `<p>His voice cracked on the words. Low. Rough. Almost broken. It wasn't a flirtation. It wasn't a tease. <em>It was a man surrendering pieces of himself out loud.</em></p>
    <p>But before she could speak, before she could move — Dante stepped back. His hand dropped to his side and curled into a fist so tight his knuckles turned white.</p>
    <p>"Excuse me," he muttered. And then he was gone.</p>
    <p>Alyssa stood there on the porch, the watering can still in her hand, water dripping onto her bare feet. He had almost touched her. Almost. <em>The next time he came that close… she wasn't going to let him walk away.</em></p>` },

  // ===== CHAPTER 5 — QUESTIONS WITHOUT ANSWERS (5 pages) =====
  { type: 'content', chapter: 'Chapter 5', title: 'Questions Without Answers', img: img(12), body: `<p>The kitchen smelled of fresh bread.</p>
    <p>Alyssa had spent most of the afternoon kneading the dough, folding it, letting it rise on the counter near the window where the sun could warm it. The smell of baking bread filled the small wooden house now, soft and golden, wrapping itself around every corner.</p>
    <p>But Alyssa wasn't thinking about bread anymore. She had her back to the door, both hands flat against the warm wooden counter. Her knuckles were white where she pressed them against the wood.</p>` },
  { type: 'content', chapter: 'Chapter 5', title: 'Questions Without Answers', img: img(13), body: `<p>She heard his boots on the porch. Then the creak of the screen door. Then the quiet sound of his hat being set down on the table behind her.</p>
    <p>She didn't turn around. <em>She was done turning around for him.</em></p>
    <p>"Why don't you touch me, Dante?"</p>
    <p>The words came out steadier than she expected. Her voice didn't shake — though her hands certainly did. Her heart pounded in her ears like a drum.</p>` },
  { type: 'content', chapter: 'Chapter 5', title: 'Questions Without Answers', img: img(12), body: `<p>Slowly, finally, she turned around. Dante stood there with his head bowed. His broad shoulders were hunched forward, his palms pressed hard against the table as if he needed it to stay upright.</p>
    <p>"You think I don't want to?"</p>
    <p>His voice came out shredded. Raw. Like the words had been clawing at the inside of his throat for weeks.</p>
    <p>"You think I don't count every breath you take in that bed at night? You think I don't hear you? Smell your hair on the pillow? You think I don't go half out of my mind every time you walk past me in that damn dress?"</p>` },
  { type: 'content', chapter: 'Chapter 5', title: 'Questions Without Answers', img: img(13), body: `<p>She saw the truth then. <em>She saw a man who was terrified.</em> Not of her. Of himself.</p>
    <p>"I'd ruin you, Alyssa."</p>
    <p>The words came out so quietly she almost didn't catch them. He held up his hands. His own hands. Big, calloused, scarred across the knuckles.</p>
    <p>"I'd hurt you," he said. "Not on purpose. But I would. And I can't — I can't be the one who does that to you."</p>` },
  { type: 'content', chapter: 'Chapter 5', title: 'Questions Without Answers', img: img(14), body: `<p>"Dante…" she whispered. "You don't get to decide that for me."</p>
    <p>But he was already turning away. The screen door slammed behind him with a sound that felt like a wound.</p>
    <p>And for the first time, she understood. <em>He wasn't pulling away because he didn't want her. He was pulling away because he loved her — and he was scared to death of being the man who broke something so beautiful with his own hands.</em></p>
    <p>If he wouldn't come to her out of want, she would have to make him come to her out of need.</p>` },

  // ===== CHAPTER 6 — ALMOST LOSING CONTROL (5 pages) =====
  { type: 'content', chapter: 'Chapter 6', title: 'Almost Losing Control', img: img(15), body: `<p>The storm came without warning.</p>
    <p>One moment the sky was a soft, dusky lavender at the edges, and the next, the wind had turned mean. Thunder cracked low and rolled long. The lights flickered once, twice — and then the whole sky split open with a roar of rain.</p>
    <p>Alyssa was barefoot in the hallway when she heard the first window slam. She rushed toward the front of the house, her long nightgown clinging to her legs. She turned too fast. Her foot caught. She gasped — falling.</p>` },
  { type: 'content', chapter: 'Chapter 6', title: 'Almost Losing Control', img: img(16), body: `<p>But she never hit the ground.</p>
    <p>Two strong arms caught her around the waist before her body even had time to understand what was happening. She slammed into something solid, warm, breathing — and a low, sharp grunt sounded just above her ear as Dante took the full weight of her against his chest.</p>
    <p><em>Time stopped.</em></p>
    <p>His arms were around her. Both of them. Wrapped tight around her waist, pressing her flush against the long, hard line of his body. She could feel every breath he took. Every wild beat of his heart slamming against her own.</p>` },
  { type: 'content', chapter: 'Chapter 6', title: 'Almost Losing Control', img: img(15), body: `<p>He didn't let her go. For one long, suspended moment — <em>he didn't let her go.</em></p>
    <p>Slowly — so slowly — Dante's hand moved. It slid up the curve of her back. Up between her shoulder blades. Up to the soft skin at the back of her neck. His fingers tangled into her hair.</p>
    <p>He bent his head. His forehead came to rest against hers. She could feel the warmth of his breath ghosting across her lips.</p>
    <p>"Alyssa…" His voice broke in half.</p>` },
  { type: 'content', chapter: 'Chapter 6', title: 'Almost Losing Control', img: img(16), body: `<p>"If I start…" His forehead pressed harder against hers. His thumb stroked, just once, against the base of her skull, sending a shiver down the entire length of her spine. "If I start, I don't know if I can stop."</p>
    <p>She just tilted her chin up — the smallest, most desperate movement — closing the last fraction of an inch between them. Her lips were a breath away from his now.</p>
    <p>A flash of lightning lit the hallway. Then the thunder hit. <em>And in that single moment, Dante jerked as if he had been pulled out of a dream.</em></p>` },
  { type: 'content', chapter: 'Chapter 6', title: 'Almost Losing Control', img: img(17), body: `<p>He let her go. Slowly. Carefully. Like a man setting down something fragile he hadn't realized he was carrying.</p>
    <p>"I'm sorry," he whispered. Two words. Quiet. Hollow.</p>
    <p>He turned and walked away, out into the rain. Alyssa stood alone in the hallway. She pressed her fingers gently against her mouth. He had almost kissed her. Almost.</p>
    <p>But this time was different. <em>This time, she had felt the thread inside him stretching, fraying, fighting to hold. She had felt it about to snap.</em></p>` },

  // ===== CHAPTER 7 — FIRE BENEATH THE SKIN (5 pages) =====
  { type: 'content', chapter: 'Chapter 7', title: 'Fire Beneath the Skin', img: img(18), body: `<p>Alyssa decided, quietly, that this would be the last night of waiting.</p>
    <p>She had been patient. She had been gentle. She had let him pull away, again and again, while she stood at the edge of him with her hands open. But something inside her had shifted after the storm. Something had hardened. <em>Something had grown brave.</em></p>
    <p>Tonight, she would not look away. Tonight, she would not let him.</p>` },
  { type: 'content', chapter: 'Chapter 7', title: 'Fire Beneath the Skin', img: img(19), body: `<p>She made supper slowly. Carefully. She wore a soft blue dress that buttoned down the front. Her hair was loose. Her feet were bare. The whole house was warm with the smell of stew simmering on the stove.</p>
    <p>When Dante walked in from the fields, he stopped in the doorway. He looked at her. He didn't say a word. He just looked — and Alyssa saw him swallow.</p>
    <p>When she leaned forward to pour him a fresh cup of coffee, she let her fingers drift over his. Slow. Deliberate. <em>Not an accident.</em></p>` },
  { type: 'content', chapter: 'Chapter 7', title: 'Fire Beneath the Skin', img: img(18), body: `<p>Later, in the narrow hallway, when they met in the middle, she let her shoulder graze the hard line of his chest as she passed. She heard him stop dead behind her. She heard the breath catch in his throat.</p>
    <p>Half an hour later, she stood in the small pantry off the kitchen, stretching up onto her toes to slide a glass jar onto the highest shelf.</p>
    <p>She didn't hear him come in. <em>But she felt the air change. She felt him behind her.</em></p>` },
  { type: 'content', chapter: 'Chapter 7', title: 'Fire Beneath the Skin', img: img(20), body: `<p>His hands landed on her waist. <em>Both of them.</em></p>
    <p>Warm. Heavy. Trembling. They closed around her with a grip that wasn't gentle at all — it was the grip of a man who had been holding back for too long and could no longer remember how.</p>
    <p>Slowly, finally, his hands turned her around. He pressed her gently — but firmly — against the wooden wall behind her. His hand came up to her face. His thumb traced the line of her lower lip.</p>
    <p>"You have no idea," he whispered, "what you do to me."</p>` },
  { type: 'content', chapter: 'Chapter 7', title: 'Fire Beneath the Skin', img: img(19), body: `<p>His mouth came so close. <em>So close.</em></p>
    <p>Then he made a sound — something like a groan, something like a curse — and pressed his forehead hard into the curve of her shoulder. His arms wrapped around her, almost crushing her, his face buried against her neck.</p>
    <p>But he didn't kiss her. Not yet. He held her there for one long, trembling moment.</p>
    <p>"Goodnight, Alyssa." His voice was barely a whisper. <em>The thread inside him was stretched to its limit. One more touch. One more night. And it would snap.</em></p>` },

  // ===== CHAPTER 8 — THE NIGHT IN THE KITCHEN (6 pages — CLIMAX) =====
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(20), body: `<p>It was deep into the night.</p>
    <p>The whole house was sleeping — except for the two people who couldn't. Outside, the wind moved gently through the cottonwood trees, rustling them like a slow, distant lullaby. The cicadas had gone quiet. The moon hung low, half-full, throwing a silver wash across the porch.</p>
    <p>Alyssa lay in their narrow bed, staring at the ceiling, listening to the soft creak of the floorboards somewhere down the hall. <em>He wasn't there beside her. He hadn't come to bed at all.</em></p>` },
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(21), body: `<p>She slipped out from under the quilt, her bare feet finding the cool wood of the floor. She wore only her simple white cotton nightgown — the modest one. Nothing about it was meant to provoke. <em>And maybe that was exactly why it would.</em></p>
    <p>When she stepped into the doorway, she saw him. Dante was sitting at the kitchen table. The room was lit only by the soft amber glow of the kerosene lamp. A half-empty glass of whiskey sat in front of him. His shirt was unbuttoned at the top, the collar open.</p>
    <p>He had been waiting. Or trying not to wait.</p>` },
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(20), body: `<p>"Alyssa." His voice was low. Hoarse. "Go back to bed."</p>
    <p>She didn't. She walked toward him. Bare feet on the wooden floor. Slow steps. She stopped right in front of him. Then she stepped between his knees.</p>
    <p>He drew in a sharp breath. His hands came up — instinctively, helplessly — and rested on the sides of her thighs through the cotton of her nightgown.</p>
    <p>"Alyssa…" His voice was a broken thing. "I swear to God, if you don't walk out of this kitchen right now…"</p>` },
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(22), body: `<p>She lowered herself slowly, until her forehead came to rest against his.</p>
    <p>"I'm not walking away, Dante."</p>
    <p>His eyes closed tight. She felt him fight. One last fight. One last attempt to be the man he thought he was supposed to be — the careful one, the controlled one.</p>
    <p>When he opened his eyes again, the fight was gone. <em>What was left was fire.</em></p>
    <p>"Are you sure?" he whispered. "Because once I touch you for real, sweetheart… I can't take it back."</p>` },
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(21), body: `<p>She didn't answer with words.</p>
    <p>She lowered her face the last inch — and pressed her lips to his. Soft. Trembling. Whole.</p>
    <p>For one suspended second, he didn't move. Then a low, broken sound rose from somewhere deep in his chest — a sound that was half a groan, half a surrender — and his hand slid up her back, into her hair, cradling the back of her head with a tenderness that contradicted every hard line of him.</p>
    <p><em>And he kissed her back. God, he kissed her back.</em></p>` },
  { type: 'content', chapter: 'Chapter 8', title: 'The Night in the Kitchen', img: img(22), body: `<p>It was deep. It was slow. It was years of held breath finally let out. His mouth moved against hers like a man who had been starving — but starving with patience, with reverence.</p>
    <p>He stood up slowly, lifting her with him as if she weighed nothing at all. He didn't let go of her. Not even to take a breath.</p>
    <p>"Alyssa," he whispered. Just her name. Like a prayer.</p>
    <p>And for the first time… he didn't pull away. <em>He stayed. He held her.</em></p>` },

  // ===== CHAPTER 9 — AFRAID OF HURTING HER (5 pages) =====
  { type: 'content', chapter: 'Chapter 9', title: 'Afraid of Hurting Her', img: img(23), body: `<p>When Alyssa woke, the bed beside her was cold.</p>
    <p><em>But her body remembered everything.</em></p>
    <p>Her skin still hummed with the ghost of his hands. Her lips were swollen, pink, tender from hours of being kissed like a man starving. There was a faint mark low on her collarbone, where his mouth had lingered too long.</p>
    <p>She remembered his hand splayed wide across the small of her back, pulling her flush against the long, hard line of his body, holding her there like he was afraid she'd vanish if he let go.</p>` },
  { type: 'content', chapter: 'Chapter 9', title: 'Afraid of Hurting Her', img: img(24), body: `<p>She wrapped a thin shawl around her bare shoulders and walked barefoot down the hallway. She found him on the porch. Already dressed. Boots laced. Shirt buttoned to the collar — buttoned high, like a man trying to cover up the evidence of what his hands had been doing only hours before.</p>
    <p>"You ran from me." Her voice came out softer than she meant it to.</p>
    <p>"I had things to do at first light."</p>
    <p>"Dante. Don't lie to me. Not after last night."</p>` },
  { type: 'content', chapter: 'Chapter 9', title: 'Afraid of Hurting Her', img: img(23), body: `<p>"I was too rough with you." The words came out low and pained.</p>
    <p>"You weren't."</p>
    <p>His eyes finally cut to her — and the heat in them hit her like a wave. They dragged slowly down her body. Lingered on the soft pink mark at her collarbone.</p>
    <p>"Like a woman who's been had," he said roughly. "And it's killin' me, sweetheart."</p>
    <p>"Maybe I wanted to be."</p>` },
  { type: 'content', chapter: 'Chapter 9', title: 'Afraid of Hurting Her', img: img(25), body: `<p>"Dante." She caught his face in her hands. "Stop. You didn't hurt me."</p>
    <p>"You don't know that yet."</p>
    <p>"I do." She stepped closer. "Look at me. Really look at me. <em>Do I look like a woman who regrets a single second of last night?</em>"</p>
    <p>His eyes searched her face — slow, careful, almost afraid. His thumb came up. He pressed it gently against the small bruise.</p>
    <p>"I made that." "Yes." "I shouldn't have—" "I'm glad you did."</p>` },
  { type: 'content', chapter: 'Chapter 9', title: 'Afraid of Hurting Her', img: img(24), body: `<p>"I want every mark you put on me, Dante Sullivan."</p>
    <p>His mouth crashed down on hers. His hand fisted in her hair. His other arm hooked around her waist and yanked her flush against the long, hard line of his body.</p>
    <p>"I love you."</p>
    <p>He froze. He pulled back just enough to look at her. The green of his eyes had gone soft and devastated.</p>
    <p>"Say that again." "I love you, Dante."</p>
    <p>"I love you too, sweetheart. <em>I have loved you since the second you stepped out of that truck with those wildflowers in your lap.</em>"</p>` },

  // ===== CHAPTER 10 — UNAFRAID TO LOVE (6 pages) =====
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(25), body: `<p>The days that followed felt like a different life.</p>
    <p>Dante didn't sleep on the edge of the bed anymore. He slept curled around her, one big arm wrapped possessively across her waist, his face buried in her hair, his slow breathing warm against the back of her neck.</p>
    <p>Sometimes she would wake in the middle of the night to find his hand splayed wide across her stomach, holding her against him in the dark — <em>like a man who couldn't even sleep without making sure she was still there.</em></p>` },
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(24), body: `<p>He kissed her now.</p>
    <p>He kissed her in the morning, soft and slow, before she had even fully opened her eyes. He kissed her in the kitchen when she handed him his coffee. He kissed her in the hallway when she passed him, catching her wrist and pulling her against the wall, his lips at her throat.</p>
    <p>He touched her constantly now. As if to make up for the weeks he had refused himself. His hand at the small of her back. His fingers tangled in hers under the kitchen table. His arm around her shoulders on the porch in the evenings.</p>` },
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(23), body: `<p>It was a Saturday evening when he saddled the horses.</p>
    <p>"Come ride with me." "Now?" "Now. I want to show you somethin'."</p>
    <p>They rode side by side across the open land. The whole sky was on fire — orange bleeding into red, red bleeding into deep violet. The wind moved gently through the long grass. The smell of warm earth and wildflowers rose up around them.</p>
    <p>Dante led her up the long, gentle slope toward the highest hill on the property.</p>` },
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(25), body: `<p>"What did you want to show me?" she whispered.</p>
    <p>He shook his head a little. "This." "The land?" "You. Standing on it."</p>
    <p>"I used to think this place was mine," he murmured. "But the truth is, I'd been keepin' it warm for you the whole time without knowing it. Every fence I mended. Every board I nailed back into that old porch. <em>Every wildflower I picked and pretended the wind brought into the kitchen…</em>"</p>
    <p>She huffed a soft laugh against his chest. "So it was you." "Course it was me."</p>` },
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(22), body: `<p>"I love you, Alyssa Sullivan." His voice was steady this time. There was no shaking. No fear. No running.</p>
    <p>"I'm gonna spend every day of my life lovin' you. Every morning. Every night. I'm gonna be the man who picks your flowers, who builds your fires, who warms your side of the bed before you even climb in. I'm gonna kiss you 'til you forget your own name."</p>
    <p>She lifted her head. She looked up at him through wet lashes. "I love you, Dante. <em>I always have.</em>"</p>` },
  { type: 'content', chapter: 'Chapter 10', title: 'Unafraid to Love', img: img(24), body: `<p>He kissed her. It wasn't urgent this time. It wasn't desperate. <em>It was the slow, full kiss of a man who had stopped running, holding the woman who had been right all along.</em></p>
    <p>"Dante?" she whispered against his chest. "Mm?" "I'm not afraid of your hands, you know."</p>
    <p>He pressed his lips to the top of her head. "I know that now, sweetheart."</p>
    <p>The sun slipped below the horizon. The first stars trembled into being above the wide Texas sky. <em>And there, beneath that wide darkening sky… they stopped being two careful hearts kept apart by fear, and became one, at last.</em></p>` },

  // ===== FINAL =====
  {
    type: 'final',
    title: 'The End',
    message: `Some men love loud. Others love silent — out of fear of breaking something delicate.<br/><br/>But love, real love, is a hand finally daring to reach. It's the moment a calloused palm meets soft skin, and neither one shatters.<br/><br/><em>Love is not the absence of intensity. Love is trust inside it.</em>`,
  },
];
