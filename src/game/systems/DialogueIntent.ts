import type { CampaignSave } from '../state/types';

export type DialogueSpeakerId =
  | 'sera'
  | 'rowan'
  | 'harbor-master'
  | 'tavern-keeper'
  | 'provisioner'
  | 'shipwright';

export interface IntentReply {
  reply: string;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function crewState(save: CampaignSave, id: 'sera' | 'rowan') {
  return save.crew.find((member) => member.id === id);
}

function destinationName(save: CampaignSave): string {
  const destination = save.world.flags.shipDestination;
  if (destination === 'harrow') return 'Harrow Island';
  if (destination === 'gullrock') return 'Gullrock Port';
  return 'wherever we decide next';
}

function trustLine(loyalty: number, name: 'Sera' | 'Rowan'): string {
  if (loyalty >= 0.8) {
    return name === 'Sera'
      ? 'You have given me enough reasons to trust your judgment. I still check the charts myself.'
      : 'I trust you. That does not mean I stop thinking for myself.';
  }
  if (loyalty >= 0.6) {
    return name === 'Sera'
      ? 'I trust you enough to keep sailing with you. The rest gets earned at sea.'
      : 'You have my attention and my blade. Trust gets stronger every time the crew survives a hard choice together.';
  }
  return name === 'Sera'
    ? 'I am still deciding what kind of captain you are. I watch what you do more than what you promise.'
    : 'I joined for freedom and strength. I am still learning whether following you gets me both.';
}

export function resolveDialogueIntent(
  speaker: DialogueSpeakerId,
  rawText: string,
  save: CampaignSave,
): IntentReply {
  const text = rawText.trim().toLowerCase();
  const isQuestion = rawText.includes('?') || /^(who|what|where|when|why|how|can|do|did|are|is|will|would|should)/i.test(rawText.trim());

  if (!text) return { reply: '...' };

  if (includesAny(text, ['haki']) && !save.player.knowledge.hakiKnown) {
    return {
      reply: speaker === 'sera'
        ? 'Sera tilts her head. “Haki? I do not know that word. If you heard it somewhere, tell me where.”'
        : speaker === 'rowan'
          ? 'Rowan shrugs. “Never heard the word. Sounds like something worth remembering if somebody dangerous uses it.”'
          : 'The word does not get a useful reaction.',
    };
  }

  if (speaker === 'sera') {
    const sera = crewState(save, 'sera');
    if (!sera) return { reply: 'Sera is not with the crew.' };

    if (includesAny(text, ['hurt', 'health', 'injury', 'injured', 'okay', 'alright', 'how are you'])) {
      return {
        reply: `“I am at ${Math.ceil(sera.hp)} out of ${sera.maxHp}. Morale is ${Math.round(sera.morale * 100)}%. If I say I can navigate, I mean it.”`,
      };
    }
    if (includesAny(text, ['where are we going', 'destination', 'course', 'route', 'where next', 'navigate'])) {
      return {
        reply: `“Our current course is ${destinationName(save)}. I will handle the helm unless you take it back or I am unable to navigate.”`,
      };
    }
    if (includesAny(text, ['helm', 'steer', 'drive', 'sail the ship', 'take over'])) {
      return {
        reply: sera.hp > 0
          ? '“Yes. Give me the course and I will keep the Gull moving. You do not need to stand at the wheel just because you are captain.”'
          : 'Sera cannot answer from the helm in her current condition.',
      };
    }
    if (includesAny(text, ['trust', 'think of me', 'opinion of me', 'captain am i', 'captain i am'])) {
      return { reply: `“${trustLine(sera.loyalty, 'Sera')}”` };
    }
    if (includesAny(text, ['goal', 'dream', 'want from', 'what do you want', 'future'])) {
      return {
        reply: '“I want to see seas that are not printed correctly on cheap maps, and I want to be good enough that a bad current never decides my life for me.”',
      };
    }
    if (includesAny(text, ['fruit', 'power', 'pull', 'ability'])) {
      return {
        reply: '“The pull is useful because it changes position. Do not think of it only as a weapon. A rope, a rifle, a loose crate, even your own body relative to something heavier can matter.”',
      };
    }
    if (includesAny(text, ['voss', 'iron nail'])) {
      return {
        reply: save.world.flags.gullrockVossRumorKnown
          ? '“People are asking about Voss here, but the rumor we heard was about him, not you. That distinction matters.”'
          : '“Voss can still create trouble for us even in chains. Anyone tied to that capture could remember your face.”',
      };
    }
    if (includesAny(text, ['marine', 'marines', 'patrol', 'wanted', 'bounty'])) {
      return {
        reply: save.world.flags.gullrockMarinePatrolKnown
          ? '“Gullrock does not have a permanent checkpoint inside the market. The outer quay gets more Marine attention around midday.”'
          : '“We should assume Marines care about papers, witnesses, and fresh orders more than magically recognizing every pirate they pass.”',
      };
    }
    if (includesAny(text, ['hello', 'hey', 'hi ', 'hi,']) || text === 'hi') {
      return { reply: 'Sera looks up from what she is doing. “Yeah, captain?”' };
    }

    return {
      reply: isQuestion
        ? 'Sera thinks before answering. “I do not have enough to give you a confident answer to that yet. If we learn more, I will tell you what I actually know.”'
        : 'Sera listens without interrupting. “I heard you. I will keep it in mind.”',
    };
  }

  if (speaker === 'rowan') {
    const rowan = crewState(save, 'rowan');
    if (!rowan) return { reply: 'Rowan is not with the crew.' };

    if (includesAny(text, ['hurt', 'health', 'injury', 'injured', 'okay', 'alright', 'how are you'])) {
      return {
        reply: `“Still standing. ${Math.ceil(rowan.hp)} out of ${rowan.maxHp}. If that changes, you will know.”`,
      };
    }
    if (includesAny(text, ['fight', 'fighting', 'train', 'training', 'strong', 'strength'])) {
      return {
        reply: '“I want opponents who make me change. If I can solve every fight the same way, I am not getting stronger.”',
      };
    }
    if (includesAny(text, ['goal', 'dream', 'want from', 'what do you want', 'future'])) {
      return {
        reply: '“Freedom. Strength. A name that reaches places I have never seen. I told you that before I joined, and I meant every word.”',
      };
    }
    if (includesAny(text, ['trust', 'think of me', 'opinion of me'])) {
      return { reply: `“${trustLine(rowan.loyalty, 'Rowan')}”` };
    }
    if (includesAny(text, ['where are we going', 'destination', 'course', 'route', 'where next'])) {
      return {
        reply: `“Sera says ${destinationName(save)}. I am more interested in what is waiting there than the line on the map.”`,
      };
    }
    if (includesAny(text, ['fruit', 'power', 'pull', 'ability'])) {
      return {
        reply: '“Your pull gets nastier when you stop treating it like a big invisible hand. Throw somebody off balance and I can do the rest.”',
      };
    }
    if (includesAny(text, ['voss', 'iron nail'])) {
      return {
        reply: '“We took Voss alive. That means enemies can hate us for beating him and other people can want what he knows. Fine by me.”',
      };
    }
    if (includesAny(text, ['hello', 'hey', 'hi ', 'hi,']) || text === 'hi') {
      return { reply: 'Rowan glances over. “What is it?”' };
    }

    return {
      reply: isQuestion
        ? 'Rowan thinks for a moment. “I do not know. I would rather tell you that than invent an answer.”'
        : 'Rowan gives a short nod. “Got it.”',
    };
  }

  if (speaker === 'harbor-master') {
    if (includesAny(text, ['your name', 'who are you', 'name?'])) {
      return { reply: '“Dren Pike. Harbor master. If it floats into Gullrock, eventually somebody puts it in my ledger.”' };
    }
    if (includesAny(text, ['fee', 'berth', 'dock', 'docking', 'pay'])) {
      const paidUntil = Number(save.world.flags.gullrockDockFeeUntilDay ?? 0);
      return {
        reply: paidUntil >= save.world.day
          ? `“Your berth is already paid through Day ${paidUntil}.”`
          : '“Two hundred berries for the berth. Pay it and I care a lot less about how long you stand on my pier.”',
      };
    }
    if (includesAny(text, ['marine', 'patrol', 'inspection'])) {
      return {
        reply: '“Outer quay gets inspected irregularly. Midday is the most common time. Inside the market, Marines mostly show up when they are looking for something specific.”',
      };
    }
    if (includesAny(text, ['gullrock', 'island', 'town', 'port'])) {
      return {
        reply: '“Repairs, coastal trade, cheap rooms, expensive mistakes. Gullrock survives because everybody passing through needs something.”',
      };
    }
    if (includesAny(text, ['shipwright', 'repair', 'fix ship'])) {
      return { reply: '“East side of the market. If your hull is worth saving, the shipwright will tell you.”' };
    }
    return { reply: isQuestion ? '“Ask me about the harbor, not the meaning of life.”' : 'The harbor master gives you a dry look and returns to the ledger.' };
  }

  if (speaker === 'tavern-keeper') {
    if (includesAny(text, ['your name', 'who are you', 'name?'])) {
      return { reply: '“Marta Vell. I own the Salt Cup, which means I hear more than I want to and repeat less than people think.”' };
    }
    if (includesAny(text, ['voss', 'iron nail', 'bounty hunter'])) {
      return {
        reply: '“A bounty-hunter crew asked about Derrick Voss. They had his face, not yours. That is all I know.”',
      };
    }
    if (includesAny(text, ['marine', 'patrol', 'inspection'])) {
      return {
        reply: '“Outer quay sees a patrol boat now and then, often near midday. They usually care about cargo papers unless they came hunting a name.”',
      };
    }
    if (includesAny(text, ['food', 'meal', 'eat', 'drink'])) {
      return { reply: '“One hundred fifty berries feeds the three of you. Hot food, clean water, no questions included.”' };
    }
    if (includesAny(text, ['rumor', 'news', 'heard anything'])) {
      return { reply: '“Thieves on the north road, bounty hunters asking about Voss, and sailors complaining about the wind east of here. Pick your poison.”' };
    }
    return { reply: isQuestion ? '“Maybe. Buy something or ask a question I can actually answer.”' : 'The tavern keeper keeps polishing the same cup while listening.' };
  }

  if (speaker === 'provisioner') {
    if (includesAny(text, ['your name', 'who are you', 'name?'])) {
      return { reply: '“Toma Reed. If your crew eats it, drinks it, burns it, ties it down, or patches something with it, I probably stock it.”' };
    }
    if (includesAny(text, ['supply', 'supplies', 'ration', 'water', 'food', 'buy', 'price'])) {
      return {
        reply: `“Voyage pack is nine hundred berries. The Gull is carrying about ${Math.floor(save.ship.supplies)} percent of her supply capacity right now.”`,
      };
    }
    if (includesAny(text, ['weather', 'wind', 'east', 'sea', 'current'])) {
      return {
        reply: '“After sunset the wind east of Gullrock strengthens from the north. Small ships that carry too much sail get pushed south.”',
      };
    }
    return { reply: isQuestion ? '“If it keeps a small ship fed, dry, or moving, I probably sell it.”' : 'The provisioner nods while checking a bundle of sealed rations.' };
  }

  if (speaker === 'shipwright') {
    if (includesAny(text, ['your name', 'who are you', 'name?'])) {
      return { reply: '“Brann Cale. I build ships, repair mistakes, and charge differently depending on which one you brought me.”' };
    }
    if (includesAny(text, ['repair', 'fix', 'hull', 'damage', 'ship', 'gull'])) {
      const missing = Math.max(0, Math.ceil(save.ship.maxHull - save.ship.hull));
      if (missing <= 0) return { reply: '“The Gull is sound right now. Do not pay me to replace wood that still works.”' };
      const cost = Math.max(300, missing * 65);
      return {
        reply: `“You are missing ${missing} hull integrity. Full repair comes to ${cost.toLocaleString()} berries. Say the word with the repair option and I will start.”`,
      };
    }
    if (includesAny(text, ['reef', 'sea', 'seaworthy', 'safe'])) {
      return {
        reply: save.ship.hull < save.ship.maxHull * 0.4
          ? '“You can float with damage like that. Floating and being seaworthy are not the same thing.”'
          : '“Treat reefs like stone walls that happen to be underwater. Speed turns a scrape into a funeral.”',
      };
    }
    return { reply: isQuestion ? '“Ask me something about ships and I will probably have an answer.”' : 'The shipwright grunts and goes back to checking a plank edge.' };
  }

  return { reply: 'No response.' };
}
