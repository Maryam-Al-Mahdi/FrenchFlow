// French verb conjugation database and analyzer
const FrenchVerbs = (() => {

  // Tense descriptions in English
  const tenseInfo = {
    'présent': {
      name: 'Présent (Present)',
      description: 'Describes actions happening now, habitual actions, or general truths.',
      usage: 'Je parle français. (I speak French / I am speaking French)',
      formation: 'Remove the infinitive ending (-er, -ir, -re) and add the present tense endings.'
    },
    'passé composé': {
      name: 'Passé Composé (Present Perfect)',
      description: 'Describes completed actions in the past. Most common past tense in spoken French.',
      usage: "J'ai mangé. (I ate / I have eaten)",
      formation: 'Auxiliary verb (avoir/être) in present + past participle.'
    },
    'imparfait': {
      name: 'Imparfait (Imperfect)',
      description: 'Describes ongoing or habitual past actions, descriptions, and background information.',
      usage: 'Je parlais souvent. (I used to speak often / I was speaking often)',
      formation: 'Take the nous form of present tense, remove -ons, add imparfait endings: -ais, -ais, -ait, -ions, -iez, -aient.'
    },
    'futur simple': {
      name: 'Futur Simple (Simple Future)',
      description: 'Describes actions that will happen in the future.',
      usage: 'Je parlerai demain. (I will speak tomorrow)',
      formation: 'Infinitive + endings: -ai, -as, -a, -ons, -ez, -ont (for -re verbs, drop the final e).'
    },
    'conditionnel': {
      name: 'Conditionnel Présent (Conditional)',
      description: 'Expresses hypothetical actions, polite requests, or wishes.',
      usage: 'Je voudrais un café. (I would like a coffee)',
      formation: 'Future stem + imparfait endings: -ais, -ais, -ait, -ions, -iez, -aient.'
    },
    'subjonctif': {
      name: 'Subjonctif Présent (Subjunctive)',
      description: 'Used after expressions of doubt, emotion, desire, or necessity.',
      usage: 'Il faut que je parle. (It is necessary that I speak)',
      formation: 'Take the ils/elles form of present, remove -ent, add: -e, -es, -e, -ions, -iez, -ent.'
    },
    'impératif': {
      name: 'Impératif (Imperative)',
      description: 'Used for commands, requests, or advice.',
      usage: 'Parlez plus fort! (Speak louder!)',
      formation: 'Use tu, nous, or vous forms of present tense (for -er verbs, drop the -s from tu form).'
    },
    'passé simple': {
      name: 'Passé Simple (Simple Past)',
      description: 'Literary past tense used in formal writing and literature. Rarely used in speech.',
      usage: 'Il parla longuement. (He spoke at length)',
      formation: 'Special endings added to the verb stem. Mostly found in books and formal texts.'
    },
    'plus-que-parfait': {
      name: 'Plus-que-parfait (Pluperfect)',
      description: 'Describes an action that had happened before another past action.',
      usage: "J'avais déjà mangé. (I had already eaten)",
      formation: 'Auxiliary (avoir/être) in imparfait + past participle.'
    },
    'futur antérieur': {
      name: 'Futur Antérieur (Future Perfect)',
      description: 'Describes an action that will have been completed before a future point.',
      usage: "J'aurai fini demain. (I will have finished tomorrow)",
      formation: 'Auxiliary (avoir/être) in future + past participle.'
    },
    'participe présent': {
      name: 'Participe Présent (Present Participle)',
      description: 'Used as an adjective or in the construction "en + participe présent" (while doing).',
      usage: 'En parlant... (While speaking...)',
      formation: 'Take the nous present form, remove -ons, add -ant.'
    },
    'participe passé': {
      name: 'Participe Passé (Past Participle)',
      description: 'Used with auxiliary verbs to form compound tenses, or as an adjective.',
      usage: 'parlé (spoken), fini (finished), vendu (sold)',
      formation: '-er → -é, -ir → -i, -re → -u (with many irregular forms).'
    },
    'infinitif': {
      name: 'Infinitif (Infinitive)',
      description: 'The base form of the verb, used after prepositions or other verbs.',
      usage: 'Je veux parler. (I want to speak)',
      formation: 'The dictionary form of the verb.'
    },
    'futur proche': {
      name: 'Futur Proche (Near Future)',
      description: 'Describes actions about to happen or planned for the near future. Very common in spoken French.',
      usage: 'Je vais manger. (I am going to eat)',
      formation: 'Conjugated form of "aller" (to go) + infinitive of the main verb.'
    },
    'passé récent': {
      name: 'Passé Récent (Recent Past)',
      description: 'Describes actions that just happened. Translates to "just did something".',
      usage: 'Je viens de manger. (I just ate)',
      formation: 'Conjugated form of "venir" + "de" + infinitive of the main verb.'
    },
    'en train de': {
      name: 'Présent Progressif (Present Progressive)',
      description: 'Emphasizes an action in progress right now. Equivalent to English "-ing" form.',
      usage: 'Je suis en train de manger. (I am eating right now)',
      formation: 'Conjugated "être" + "en train de" + infinitive.'
    },
    'conditionnel passé': {
      name: 'Conditionnel Passé (Past Conditional)',
      description: 'Expresses an action that would have happened under certain conditions. Used for regrets or hypothetical past events.',
      usage: "J'aurais mangé si j'avais eu faim. (I would have eaten if I had been hungry)",
      formation: 'Auxiliary (avoir/être) in conditional + past participle.'
    },
    'futur antérieur': {
      name: 'Futur Antérieur (Future Perfect)',
      description: 'Describes an action that will have been completed before a future point.',
      usage: "J'aurai fini demain. (I will have finished tomorrow)",
      formation: 'Auxiliary (avoir/être) in future + past participle.'
    },
    'subjonctif passé': {
      name: 'Subjonctif Passé (Past Subjunctive)',
      description: 'Used after expressions of doubt, emotion, or necessity to describe a completed action.',
      usage: "Je doute qu'il ait fini. (I doubt that he has finished)",
      formation: 'Auxiliary (avoir/être) in subjunctive + past participle.'
    },
    'passé antérieur': {
      name: 'Passé Antérieur (Past Anterior)',
      description: 'Literary tense describing an action completed just before another past action. Found in formal writing.',
      usage: 'Quand il eut fini, il partit. (When he had finished, he left)',
      formation: 'Auxiliary (avoir/être) in passé simple + past participle.'
    },
    'modal + infinitif': {
      name: 'Modal + Infinitif (Modal Verb Construction)',
      description: 'A modal verb (devoir, pouvoir, vouloir, savoir) followed by an infinitive to express obligation, ability, desire, or knowledge.',
      usage: 'Je dois partir. (I must leave) / Je peux nager. (I can swim)',
      formation: 'Conjugated modal verb + infinitive of the main verb.'
    },
    'faire + infinitif': {
      name: 'Faire + Infinitif (Causative Construction)',
      description: 'The verb "faire" followed by an infinitive means "to make/have someone do something".',
      usage: 'Je fais réparer la voiture. (I am having the car repaired)',
      formation: 'Conjugated "faire" + infinitive.'
    },
    'laisser + infinitif': {
      name: 'Laisser + Infinitif (Permissive Construction)',
      description: 'The verb "laisser" followed by an infinitive means "to let someone do something".',
      usage: 'Laisse-moi partir. (Let me leave)',
      formation: 'Conjugated "laisser" + infinitive.'
    },
    'voix passive': {
      name: 'Voix Passive (Passive Voice)',
      description: 'The subject receives the action instead of performing it.',
      usage: 'La lettre est écrite par Marie. (The letter is written by Marie)',
      formation: 'Conjugated "être" + past participle (agrees with subject in gender/number).'
    }
  };

  // Common irregular verbs with conjugations
  // Format: infinitive -> { tense -> { pronoun -> form } }
  const irregularVerbs = {
    'être': {
      meaning: 'to be',
      auxiliary: 'avoir',
      pastParticiple: 'été',
      presentParticiple: 'étant',
      présent: { je: 'suis', tu: 'es', il: 'est', nous: 'sommes', vous: 'êtes', ils: 'sont' },
      imparfait: { je: 'étais', tu: 'étais', il: 'était', nous: 'étions', vous: 'étiez', ils: 'étaient' },
      'futur simple': { je: 'serai', tu: 'seras', il: 'sera', nous: 'serons', vous: 'serez', ils: 'seront' },
      conditionnel: { je: 'serais', tu: 'serais', il: 'serait', nous: 'serions', vous: 'seriez', ils: 'seraient' },
      subjonctif: { je: 'sois', tu: 'sois', il: 'soit', nous: 'soyons', vous: 'soyez', ils: 'soient' },
      'passé simple': { je: 'fus', tu: 'fus', il: 'fut', nous: 'fûmes', vous: 'fûtes', ils: 'furent' },
      impératif: { tu: 'sois', nous: 'soyons', vous: 'soyez' }
    },
    'avoir': {
      meaning: 'to have',
      auxiliary: 'avoir',
      pastParticiple: 'eu',
      presentParticiple: 'ayant',
      présent: { je: 'ai', tu: 'as', il: 'a', nous: 'avons', vous: 'avez', ils: 'ont' },
      imparfait: { je: 'avais', tu: 'avais', il: 'avait', nous: 'avions', vous: 'aviez', ils: 'avaient' },
      'futur simple': { je: 'aurai', tu: 'auras', il: 'aura', nous: 'aurons', vous: 'aurez', ils: 'auront' },
      conditionnel: { je: 'aurais', tu: 'aurais', il: 'aurait', nous: 'aurions', vous: 'auriez', ils: 'auraient' },
      subjonctif: { je: 'aie', tu: 'aies', il: 'ait', nous: 'ayons', vous: 'ayez', ils: 'aient' },
      'passé simple': { je: 'eus', tu: 'eus', il: 'eut', nous: 'eûmes', vous: 'eûtes', ils: 'eurent' },
      impératif: { tu: 'aie', nous: 'ayons', vous: 'ayez' }
    },
    'aller': {
      meaning: 'to go',
      auxiliary: 'être',
      pastParticiple: 'allé',
      presentParticiple: 'allant',
      présent: { je: 'vais', tu: 'vas', il: 'va', nous: 'allons', vous: 'allez', ils: 'vont' },
      imparfait: { je: 'allais', tu: 'allais', il: 'allait', nous: 'allions', vous: 'alliez', ils: 'allaient' },
      'futur simple': { je: 'irai', tu: 'iras', il: 'ira', nous: 'irons', vous: 'irez', ils: 'iront' },
      conditionnel: { je: 'irais', tu: 'irais', il: 'irait', nous: 'irions', vous: 'iriez', ils: 'iraient' },
      subjonctif: { je: 'aille', tu: 'ailles', il: 'aille', nous: 'allions', vous: 'alliez', ils: 'aillent' },
      'passé simple': { je: 'allai', tu: 'allas', il: 'alla', nous: 'allâmes', vous: 'allâtes', ils: 'allèrent' },
      impératif: { tu: 'va', nous: 'allons', vous: 'allez' }
    },
    'faire': {
      meaning: 'to do / to make',
      auxiliary: 'avoir',
      pastParticiple: 'fait',
      presentParticiple: 'faisant',
      présent: { je: 'fais', tu: 'fais', il: 'fait', nous: 'faisons', vous: 'faites', ils: 'font' },
      imparfait: { je: 'faisais', tu: 'faisais', il: 'faisait', nous: 'faisions', vous: 'faisiez', ils: 'faisaient' },
      'futur simple': { je: 'ferai', tu: 'feras', il: 'fera', nous: 'ferons', vous: 'ferez', ils: 'feront' },
      conditionnel: { je: 'ferais', tu: 'ferais', il: 'ferait', nous: 'ferions', vous: 'feriez', ils: 'feraient' },
      subjonctif: { je: 'fasse', tu: 'fasses', il: 'fasse', nous: 'fassions', vous: 'fassiez', ils: 'fassent' },
      'passé simple': { je: 'fis', tu: 'fis', il: 'fit', nous: 'fîmes', vous: 'fîtes', ils: 'firent' },
      impératif: { tu: 'fais', nous: 'faisons', vous: 'faites' }
    },
    'dire': {
      meaning: 'to say / to tell',
      auxiliary: 'avoir',
      pastParticiple: 'dit',
      presentParticiple: 'disant',
      présent: { je: 'dis', tu: 'dis', il: 'dit', nous: 'disons', vous: 'dites', ils: 'disent' },
      imparfait: { je: 'disais', tu: 'disais', il: 'disait', nous: 'disions', vous: 'disiez', ils: 'disaient' },
      'futur simple': { je: 'dirai', tu: 'diras', il: 'dira', nous: 'dirons', vous: 'direz', ils: 'diront' },
      conditionnel: { je: 'dirais', tu: 'dirais', il: 'dirait', nous: 'dirions', vous: 'diriez', ils: 'diraient' },
      subjonctif: { je: 'dise', tu: 'dises', il: 'dise', nous: 'disions', vous: 'disiez', ils: 'disent' },
      'passé simple': { je: 'dis', tu: 'dis', il: 'dit', nous: 'dîmes', vous: 'dîtes', ils: 'dirent' }
    },
    'pouvoir': {
      meaning: 'to be able to / can',
      auxiliary: 'avoir',
      pastParticiple: 'pu',
      presentParticiple: 'pouvant',
      présent: { je: 'peux', tu: 'peux', il: 'peut', nous: 'pouvons', vous: 'pouvez', ils: 'peuvent' },
      imparfait: { je: 'pouvais', tu: 'pouvais', il: 'pouvait', nous: 'pouvions', vous: 'pouviez', ils: 'pouvaient' },
      'futur simple': { je: 'pourrai', tu: 'pourras', il: 'pourra', nous: 'pourrons', vous: 'pourrez', ils: 'pourront' },
      conditionnel: { je: 'pourrais', tu: 'pourrais', il: 'pourrait', nous: 'pourrions', vous: 'pourriez', ils: 'pourraient' },
      subjonctif: { je: 'puisse', tu: 'puisses', il: 'puisse', nous: 'puissions', vous: 'puissiez', ils: 'puissent' },
      'passé simple': { je: 'pus', tu: 'pus', il: 'put', nous: 'pûmes', vous: 'pûtes', ils: 'purent' }
    },
    'vouloir': {
      meaning: 'to want',
      auxiliary: 'avoir',
      pastParticiple: 'voulu',
      presentParticiple: 'voulant',
      présent: { je: 'veux', tu: 'veux', il: 'veut', nous: 'voulons', vous: 'voulez', ils: 'veulent' },
      imparfait: { je: 'voulais', tu: 'voulais', il: 'voulait', nous: 'voulions', vous: 'vouliez', ils: 'voulaient' },
      'futur simple': { je: 'voudrai', tu: 'voudras', il: 'voudra', nous: 'voudrons', vous: 'voudrez', ils: 'voudront' },
      conditionnel: { je: 'voudrais', tu: 'voudrais', il: 'voudrait', nous: 'voudrions', vous: 'voudriez', ils: 'voudraient' },
      subjonctif: { je: 'veuille', tu: 'veuilles', il: 'veuille', nous: 'voulions', vous: 'vouliez', ils: 'veuillent' },
      'passé simple': { je: 'voulus', tu: 'voulus', il: 'voulut', nous: 'voulûmes', vous: 'voulûtes', ils: 'voulurent' }
    },
    'savoir': {
      meaning: 'to know (a fact)',
      auxiliary: 'avoir',
      pastParticiple: 'su',
      presentParticiple: 'sachant',
      présent: { je: 'sais', tu: 'sais', il: 'sait', nous: 'savons', vous: 'savez', ils: 'savent' },
      imparfait: { je: 'savais', tu: 'savais', il: 'savait', nous: 'savions', vous: 'saviez', ils: 'savaient' },
      'futur simple': { je: 'saurai', tu: 'sauras', il: 'saura', nous: 'saurons', vous: 'saurez', ils: 'sauront' },
      conditionnel: { je: 'saurais', tu: 'saurais', il: 'saurait', nous: 'saurions', vous: 'sauriez', ils: 'sauraient' },
      subjonctif: { je: 'sache', tu: 'saches', il: 'sache', nous: 'sachions', vous: 'sachiez', ils: 'sachent' },
      'passé simple': { je: 'sus', tu: 'sus', il: 'sut', nous: 'sûmes', vous: 'sûtes', ils: 'surent' }
    },
    'venir': {
      meaning: 'to come',
      auxiliary: 'être',
      pastParticiple: 'venu',
      presentParticiple: 'venant',
      présent: { je: 'viens', tu: 'viens', il: 'vient', nous: 'venons', vous: 'venez', ils: 'viennent' },
      imparfait: { je: 'venais', tu: 'venais', il: 'venait', nous: 'venions', vous: 'veniez', ils: 'venaient' },
      'futur simple': { je: 'viendrai', tu: 'viendras', il: 'viendra', nous: 'viendrons', vous: 'viendrez', ils: 'viendront' },
      conditionnel: { je: 'viendrais', tu: 'viendrais', il: 'viendrait', nous: 'viendrions', vous: 'viendriez', ils: 'viendraient' },
      subjonctif: { je: 'vienne', tu: 'viennes', il: 'vienne', nous: 'venions', vous: 'veniez', ils: 'viennent' },
      'passé simple': { je: 'vins', tu: 'vins', il: 'vint', nous: 'vînmes', vous: 'vîntes', ils: 'vinrent' }
    },
    'prendre': {
      meaning: 'to take',
      auxiliary: 'avoir',
      pastParticiple: 'pris',
      presentParticiple: 'prenant',
      présent: { je: 'prends', tu: 'prends', il: 'prend', nous: 'prenons', vous: 'prenez', ils: 'prennent' },
      imparfait: { je: 'prenais', tu: 'prenais', il: 'prenait', nous: 'prenions', vous: 'preniez', ils: 'prenaient' },
      'futur simple': { je: 'prendrai', tu: 'prendras', il: 'prendra', nous: 'prendrons', vous: 'prendrez', ils: 'prendront' },
      conditionnel: { je: 'prendrais', tu: 'prendrais', il: 'prendrait', nous: 'prendrions', vous: 'prendriez', ils: 'prendraient' },
      subjonctif: { je: 'prenne', tu: 'prennes', il: 'prenne', nous: 'prenions', vous: 'preniez', ils: 'prennent' },
      'passé simple': { je: 'pris', tu: 'pris', il: 'prit', nous: 'prîmes', vous: 'prîtes', ils: 'prirent' }
    },
    'voir': {
      meaning: 'to see',
      auxiliary: 'avoir',
      pastParticiple: 'vu',
      presentParticiple: 'voyant',
      présent: { je: 'vois', tu: 'vois', il: 'voit', nous: 'voyons', vous: 'voyez', ils: 'voient' },
      imparfait: { je: 'voyais', tu: 'voyais', il: 'voyait', nous: 'voyions', vous: 'voyiez', ils: 'voyaient' },
      'futur simple': { je: 'verrai', tu: 'verras', il: 'verra', nous: 'verrons', vous: 'verrez', ils: 'verront' },
      conditionnel: { je: 'verrais', tu: 'verrais', il: 'verrait', nous: 'verrions', vous: 'verriez', ils: 'verraient' },
      subjonctif: { je: 'voie', tu: 'voies', il: 'voie', nous: 'voyions', vous: 'voyiez', ils: 'voient' },
      'passé simple': { je: 'vis', tu: 'vis', il: 'vit', nous: 'vîmes', vous: 'vîtes', ils: 'virent' }
    },
    'devoir': {
      meaning: 'to have to / must',
      auxiliary: 'avoir',
      pastParticiple: 'dû',
      presentParticiple: 'devant',
      présent: { je: 'dois', tu: 'dois', il: 'doit', nous: 'devons', vous: 'devez', ils: 'doivent' },
      imparfait: { je: 'devais', tu: 'devais', il: 'devait', nous: 'devions', vous: 'deviez', ils: 'devaient' },
      'futur simple': { je: 'devrai', tu: 'devras', il: 'devra', nous: 'devrons', vous: 'devrez', ils: 'devront' },
      conditionnel: { je: 'devrais', tu: 'devrais', il: 'devrait', nous: 'devrions', vous: 'devriez', ils: 'devraient' },
      subjonctif: { je: 'doive', tu: 'doives', il: 'doive', nous: 'devions', vous: 'deviez', ils: 'doivent' },
      'passé simple': { je: 'dus', tu: 'dus', il: 'dut', nous: 'dûmes', vous: 'dûtes', ils: 'durent' }
    },
    'mettre': {
      meaning: 'to put / to place',
      auxiliary: 'avoir',
      pastParticiple: 'mis',
      presentParticiple: 'mettant',
      présent: { je: 'mets', tu: 'mets', il: 'met', nous: 'mettons', vous: 'mettez', ils: 'mettent' },
      imparfait: { je: 'mettais', tu: 'mettais', il: 'mettait', nous: 'mettions', vous: 'mettiez', ils: 'mettaient' },
      'futur simple': { je: 'mettrai', tu: 'mettras', il: 'mettra', nous: 'mettrons', vous: 'mettrez', ils: 'mettront' },
      conditionnel: { je: 'mettrais', tu: 'mettrais', il: 'mettrait', nous: 'mettrions', vous: 'mettriez', ils: 'mettraient' },
      subjonctif: { je: 'mette', tu: 'mettes', il: 'mette', nous: 'mettions', vous: 'mettiez', ils: 'mettent' },
      'passé simple': { je: 'mis', tu: 'mis', il: 'mit', nous: 'mîmes', vous: 'mîtes', ils: 'mirent' }
    },
    'connaître': {
      meaning: 'to know (a person/place)',
      auxiliary: 'avoir',
      pastParticiple: 'connu',
      presentParticiple: 'connaissant',
      présent: { je: 'connais', tu: 'connais', il: 'connaît', nous: 'connaissons', vous: 'connaissez', ils: 'connaissent' },
      imparfait: { je: 'connaissais', tu: 'connaissais', il: 'connaissait', nous: 'connaissions', vous: 'connaissiez', ils: 'connaissaient' },
      'futur simple': { je: 'connaîtrai', tu: 'connaîtras', il: 'connaîtra', nous: 'connaîtrons', vous: 'connaîtrez', ils: 'connaîtront' },
      conditionnel: { je: 'connaîtrais', tu: 'connaîtrais', il: 'connaîtrait', nous: 'connaîtrions', vous: 'connaîtriez', ils: 'connaîtraient' },
      subjonctif: { je: 'connaisse', tu: 'connaisses', il: 'connaisse', nous: 'connaissions', vous: 'connaissiez', ils: 'connaissent' },
      'passé simple': { je: 'connus', tu: 'connus', il: 'connut', nous: 'connûmes', vous: 'connûtes', ils: 'connurent' }
    },
    'croire': {
      meaning: 'to believe',
      auxiliary: 'avoir',
      pastParticiple: 'cru',
      presentParticiple: 'croyant',
      présent: { je: 'crois', tu: 'crois', il: 'croit', nous: 'croyons', vous: 'croyez', ils: 'croient' },
      imparfait: { je: 'croyais', tu: 'croyais', il: 'croyait', nous: 'croyions', vous: 'croyiez', ils: 'croyaient' },
      'futur simple': { je: 'croirai', tu: 'croiras', il: 'croira', nous: 'croirons', vous: 'croirez', ils: 'croiront' },
      conditionnel: { je: 'croirais', tu: 'croirais', il: 'croirait', nous: 'croirions', vous: 'croiriez', ils: 'croiraient' },
      subjonctif: { je: 'croie', tu: 'croies', il: 'croie', nous: 'croyions', vous: 'croyiez', ils: 'croient' },
      'passé simple': { je: 'crus', tu: 'crus', il: 'crut', nous: 'crûmes', vous: 'crûtes', ils: 'crurent' }
    },
    'écrire': {
      meaning: 'to write',
      auxiliary: 'avoir',
      pastParticiple: 'écrit',
      presentParticiple: 'écrivant',
      présent: { je: 'écris', tu: 'écris', il: 'écrit', nous: 'écrivons', vous: 'écrivez', ils: 'écrivent' },
      imparfait: { je: 'écrivais', tu: 'écrivais', il: 'écrivait', nous: 'écrivions', vous: 'écriviez', ils: 'écrivaient' },
      'futur simple': { je: 'écrirai', tu: 'écriras', il: 'écrira', nous: 'écrirons', vous: 'écrirez', ils: 'écriront' },
      conditionnel: { je: 'écrirais', tu: 'écrirais', il: 'écrirait', nous: 'écririons', vous: 'écririez', ils: 'écriraient' },
      subjonctif: { je: 'écrive', tu: 'écrives', il: 'écrive', nous: 'écrivions', vous: 'écriviez', ils: 'écrivent' },
      'passé simple': { je: 'écrivis', tu: 'écrivis', il: 'écrivit', nous: 'écrivîmes', vous: 'écrivîtes', ils: 'écrivirent' }
    },
    'lire': {
      meaning: 'to read',
      auxiliary: 'avoir',
      pastParticiple: 'lu',
      presentParticiple: 'lisant',
      présent: { je: 'lis', tu: 'lis', il: 'lit', nous: 'lisons', vous: 'lisez', ils: 'lisent' },
      imparfait: { je: 'lisais', tu: 'lisais', il: 'lisait', nous: 'lisions', vous: 'lisiez', ils: 'lisaient' },
      'futur simple': { je: 'lirai', tu: 'liras', il: 'lira', nous: 'lirons', vous: 'lirez', ils: 'liront' },
      conditionnel: { je: 'lirais', tu: 'lirais', il: 'lirait', nous: 'lirions', vous: 'liriez', ils: 'liraient' },
      subjonctif: { je: 'lise', tu: 'lises', il: 'lise', nous: 'lisions', vous: 'lisiez', ils: 'lisent' },
      'passé simple': { je: 'lus', tu: 'lus', il: 'lut', nous: 'lûmes', vous: 'lûtes', ils: 'lurent' }
    },
    'partir': {
      meaning: 'to leave',
      auxiliary: 'être',
      pastParticiple: 'parti',
      presentParticiple: 'partant',
      présent: { je: 'pars', tu: 'pars', il: 'part', nous: 'partons', vous: 'partez', ils: 'partent' },
      imparfait: { je: 'partais', tu: 'partais', il: 'partait', nous: 'partions', vous: 'partiez', ils: 'partaient' },
      'futur simple': { je: 'partirai', tu: 'partiras', il: 'partira', nous: 'partirons', vous: 'partirez', ils: 'partiront' },
      conditionnel: { je: 'partirais', tu: 'partirais', il: 'partirait', nous: 'partirions', vous: 'partiriez', ils: 'partiraient' },
      subjonctif: { je: 'parte', tu: 'partes', il: 'parte', nous: 'partions', vous: 'partiez', ils: 'partent' },
      'passé simple': { je: 'partis', tu: 'partis', il: 'partit', nous: 'partîmes', vous: 'partîtes', ils: 'partirent' }
    },
    'sortir': {
      meaning: 'to go out',
      auxiliary: 'être',
      pastParticiple: 'sorti',
      presentParticiple: 'sortant',
      présent: { je: 'sors', tu: 'sors', il: 'sort', nous: 'sortons', vous: 'sortez', ils: 'sortent' },
      imparfait: { je: 'sortais', tu: 'sortais', il: 'sortait', nous: 'sortions', vous: 'sortiez', ils: 'sortaient' },
      'futur simple': { je: 'sortirai', tu: 'sortiras', il: 'sortira', nous: 'sortirons', vous: 'sortirez', ils: 'sortiront' },
      conditionnel: { je: 'sortirais', tu: 'sortirais', il: 'sortirait', nous: 'sortirions', vous: 'sortiriez', ils: 'sortiraient' }
    },
    'vivre': {
      meaning: 'to live',
      auxiliary: 'avoir',
      pastParticiple: 'vécu',
      presentParticiple: 'vivant',
      présent: { je: 'vis', tu: 'vis', il: 'vit', nous: 'vivons', vous: 'vivez', ils: 'vivent' },
      imparfait: { je: 'vivais', tu: 'vivais', il: 'vivait', nous: 'vivions', vous: 'viviez', ils: 'vivaient' },
      'futur simple': { je: 'vivrai', tu: 'vivras', il: 'vivra', nous: 'vivrons', vous: 'vivrez', ils: 'vivront' },
      conditionnel: { je: 'vivrais', tu: 'vivrais', il: 'vivrait', nous: 'vivrions', vous: 'vivriez', ils: 'vivraient' }
    },
    'donner': {
      meaning: 'to give',
      auxiliary: 'avoir',
      pastParticiple: 'donné',
      presentParticiple: 'donnant',
      présent: { je: 'donne', tu: 'donnes', il: 'donne', nous: 'donnons', vous: 'donnez', ils: 'donnent' },
      imparfait: { je: 'donnais', tu: 'donnais', il: 'donnait', nous: 'donnions', vous: 'donniez', ils: 'donnaient' },
      'futur simple': { je: 'donnerai', tu: 'donneras', il: 'donnera', nous: 'donnerons', vous: 'donnerez', ils: 'donneront' },
      conditionnel: { je: 'donnerais', tu: 'donnerais', il: 'donnerait', nous: 'donnerions', vous: 'donneriez', ils: 'donneraient' }
    },
    'penser': {
      meaning: 'to think',
      auxiliary: 'avoir',
      pastParticiple: 'pensé',
      presentParticiple: 'pensant',
      présent: { je: 'pense', tu: 'penses', il: 'pense', nous: 'pensons', vous: 'pensez', ils: 'pensent' },
      imparfait: { je: 'pensais', tu: 'pensais', il: 'pensait', nous: 'pensions', vous: 'pensiez', ils: 'pensaient' },
      'futur simple': { je: 'penserai', tu: 'penseras', il: 'pensera', nous: 'penserons', vous: 'penserez', ils: 'penseront' },
      conditionnel: { je: 'penserais', tu: 'penserais', il: 'penserait', nous: 'penserions', vous: 'penseriez', ils: 'penseraient' }
    },
    'parler': {
      meaning: 'to speak',
      auxiliary: 'avoir',
      pastParticiple: 'parlé',
      presentParticiple: 'parlant',
      présent: { je: 'parle', tu: 'parles', il: 'parle', nous: 'parlons', vous: 'parlez', ils: 'parlent' },
      imparfait: { je: 'parlais', tu: 'parlais', il: 'parlait', nous: 'parlions', vous: 'parliez', ils: 'parlaient' },
      'futur simple': { je: 'parlerai', tu: 'parleras', il: 'parlera', nous: 'parlerons', vous: 'parlerez', ils: 'parleront' },
      conditionnel: { je: 'parlerais', tu: 'parlerais', il: 'parlerait', nous: 'parlerions', vous: 'parleriez', ils: 'parleraient' }
    },
    'aimer': {
      meaning: 'to love / to like',
      auxiliary: 'avoir',
      pastParticiple: 'aimé',
      presentParticiple: 'aimant',
      présent: { je: 'aime', tu: 'aimes', il: 'aime', nous: 'aimons', vous: 'aimez', ils: 'aiment' },
      imparfait: { je: 'aimais', tu: 'aimais', il: 'aimait', nous: 'aimions', vous: 'aimiez', ils: 'aimaient' },
      'futur simple': { je: 'aimerai', tu: 'aimeras', il: 'aimera', nous: 'aimerons', vous: 'aimerez', ils: 'aimeront' },
      conditionnel: { je: 'aimerais', tu: 'aimerais', il: 'aimerait', nous: 'aimerions', vous: 'aimeriez', ils: 'aimeraient' }
    },
    'manger': {
      meaning: 'to eat',
      auxiliary: 'avoir',
      pastParticiple: 'mangé',
      presentParticiple: 'mangeant',
      présent: { je: 'mange', tu: 'manges', il: 'mange', nous: 'mangeons', vous: 'mangez', ils: 'mangent' },
      imparfait: { je: 'mangeais', tu: 'mangeais', il: 'mangeait', nous: 'mangions', vous: 'mangiez', ils: 'mangeaient' },
      'futur simple': { je: 'mangerai', tu: 'mangeras', il: 'mangera', nous: 'mangerons', vous: 'mangerez', ils: 'mangeront' },
      conditionnel: { je: 'mangerais', tu: 'mangerais', il: 'mangerait', nous: 'mangerions', vous: 'mangeriez', ils: 'mangeraient' }
    },
    'boire': {
      meaning: 'to drink',
      auxiliary: 'avoir',
      pastParticiple: 'bu',
      presentParticiple: 'buvant',
      présent: { je: 'bois', tu: 'bois', il: 'boit', nous: 'buvons', vous: 'buvez', ils: 'boivent' },
      imparfait: { je: 'buvais', tu: 'buvais', il: 'buvait', nous: 'buvions', vous: 'buviez', ils: 'buvaient' },
      'futur simple': { je: 'boirai', tu: 'boiras', il: 'boira', nous: 'boirons', vous: 'boirez', ils: 'boiront' },
      conditionnel: { je: 'boirais', tu: 'boirais', il: 'boirait', nous: 'boirions', vous: 'boiriez', ils: 'boiraient' },
      subjonctif: { je: 'boive', tu: 'boives', il: 'boive', nous: 'buvions', vous: 'buviez', ils: 'boivent' }
    },
    'dormir': {
      meaning: 'to sleep',
      auxiliary: 'avoir',
      pastParticiple: 'dormi',
      presentParticiple: 'dormant',
      présent: { je: 'dors', tu: 'dors', il: 'dort', nous: 'dormons', vous: 'dormez', ils: 'dorment' },
      imparfait: { je: 'dormais', tu: 'dormais', il: 'dormait', nous: 'dormions', vous: 'dormiez', ils: 'dormaient' },
      'futur simple': { je: 'dormirai', tu: 'dormiras', il: 'dormira', nous: 'dormirons', vous: 'dormirez', ils: 'dormiront' },
      conditionnel: { je: 'dormirais', tu: 'dormirais', il: 'dormirait', nous: 'dormirions', vous: 'dormiriez', ils: 'dormiraient' }
    },
    'attendre': {
      meaning: 'to wait',
      auxiliary: 'avoir',
      pastParticiple: 'attendu',
      presentParticiple: 'attendant',
      présent: { je: 'attends', tu: 'attends', il: 'attend', nous: 'attendons', vous: 'attendez', ils: 'attendent' },
      imparfait: { je: 'attendais', tu: 'attendais', il: 'attendait', nous: 'attendions', vous: 'attendiez', ils: 'attendaient' },
      'futur simple': { je: 'attendrai', tu: 'attendras', il: 'attendra', nous: 'attendrons', vous: 'attendrez', ils: 'attendront' },
      conditionnel: { je: 'attendrais', tu: 'attendrais', il: 'attendrait', nous: 'attendrions', vous: 'attendriez', ils: 'attendraient' }
    },
    'comprendre': {
      meaning: 'to understand',
      auxiliary: 'avoir',
      pastParticiple: 'compris',
      presentParticiple: 'comprenant',
      présent: { je: 'comprends', tu: 'comprends', il: 'comprend', nous: 'comprenons', vous: 'comprenez', ils: 'comprennent' },
      imparfait: { je: 'comprenais', tu: 'comprenais', il: 'comprenait', nous: 'comprenions', vous: 'compreniez', ils: 'comprenaient' },
      'futur simple': { je: 'comprendrai', tu: 'comprendras', il: 'comprendra', nous: 'comprendrons', vous: 'comprendrez', ils: 'comprendront' },
      conditionnel: { je: 'comprendrais', tu: 'comprendrais', il: 'comprendrait', nous: 'comprendrions', vous: 'comprendriez', ils: 'comprendraient' }
    },
    'répondre': {
      meaning: 'to answer',
      auxiliary: 'avoir',
      pastParticiple: 'répondu',
      presentParticiple: 'répondant',
      présent: { je: 'réponds', tu: 'réponds', il: 'répond', nous: 'répondons', vous: 'répondez', ils: 'répondent' },
      imparfait: { je: 'répondais', tu: 'répondais', il: 'répondait', nous: 'répondions', vous: 'répondiez', ils: 'répondaient' },
      'futur simple': { je: 'répondrai', tu: 'répondras', il: 'répondra', nous: 'répondrons', vous: 'répondrez', ils: 'répondront' },
      conditionnel: { je: 'répondrais', tu: 'répondrais', il: 'répondrait', nous: 'répondrions', vous: 'répondriez', ils: 'répondraient' }
    },
    'tenir': {
      meaning: 'to hold',
      auxiliary: 'avoir',
      pastParticiple: 'tenu',
      presentParticiple: 'tenant',
      présent: { je: 'tiens', tu: 'tiens', il: 'tient', nous: 'tenons', vous: 'tenez', ils: 'tiennent' },
      imparfait: { je: 'tenais', tu: 'tenais', il: 'tenait', nous: 'tenions', vous: 'teniez', ils: 'tenaient' },
      'futur simple': { je: 'tiendrai', tu: 'tiendras', il: 'tiendra', nous: 'tiendrons', vous: 'tiendrez', ils: 'tiendront' },
      conditionnel: { je: 'tiendrais', tu: 'tiendrais', il: 'tiendrait', nous: 'tiendrions', vous: 'tiendriez', ils: 'tiendraient' }
    },
    'trouver': {
      meaning: 'to find',
      auxiliary: 'avoir',
      pastParticiple: 'trouvé',
      presentParticiple: 'trouvant',
      présent: { je: 'trouve', tu: 'trouves', il: 'trouve', nous: 'trouvons', vous: 'trouvez', ils: 'trouvent' },
      imparfait: { je: 'trouvais', tu: 'trouvais', il: 'trouvait', nous: 'trouvions', vous: 'trouviez', ils: 'trouvaient' },
      'futur simple': { je: 'trouverai', tu: 'trouveras', il: 'trouvera', nous: 'trouverons', vous: 'trouverez', ils: 'trouveront' },
      conditionnel: { je: 'trouverais', tu: 'trouverais', il: 'trouverait', nous: 'trouverions', vous: 'trouveriez', ils: 'trouveraient' }
    },
    'entendre': {
      meaning: 'to hear',
      auxiliary: 'avoir',
      pastParticiple: 'entendu',
      presentParticiple: 'entendant',
      présent: { je: 'entends', tu: 'entends', il: 'entend', nous: 'entendons', vous: 'entendez', ils: 'entendent' },
      imparfait: { je: 'entendais', tu: 'entendais', il: 'entendait', nous: 'entendions', vous: 'entendiez', ils: 'entendaient' },
      'futur simple': { je: 'entendrai', tu: 'entendras', il: 'entendra', nous: 'entendrons', vous: 'entendrez', ils: 'entendront' }
    },
    'rester': {
      meaning: 'to stay / to remain',
      auxiliary: 'être',
      pastParticiple: 'resté',
      presentParticiple: 'restant',
      présent: { je: 'reste', tu: 'restes', il: 'reste', nous: 'restons', vous: 'restez', ils: 'restent' },
      imparfait: { je: 'restais', tu: 'restais', il: 'restait', nous: 'restions', vous: 'restiez', ils: 'restaient' },
      'futur simple': { je: 'resterai', tu: 'resteras', il: 'restera', nous: 'resterons', vous: 'resterez', ils: 'resteront' }
    },
    'tomber': {
      meaning: 'to fall',
      auxiliary: 'être',
      pastParticiple: 'tombé',
      presentParticiple: 'tombant',
      présent: { je: 'tombe', tu: 'tombes', il: 'tombe', nous: 'tombons', vous: 'tombez', ils: 'tombent' },
      imparfait: { je: 'tombais', tu: 'tombais', il: 'tombait', nous: 'tombions', vous: 'tombiez', ils: 'tombaient' },
      'futur simple': { je: 'tomberai', tu: 'tomberas', il: 'tombera', nous: 'tomberons', vous: 'tomberez', ils: 'tomberont' }
    }
  };

  // Auxiliary verbs used with être in passé composé (DR MRS VANDERTRAMP)
  const etreVerbs = new Set([
    'aller', 'venir', 'arriver', 'partir', 'entrer', 'sortir', 'monter',
    'descendre', 'naître', 'mourir', 'tomber', 'rester', 'retourner',
    'devenir', 'revenir', 'passer', 'rentrer'
  ]);

  // Regular verb ending patterns for tense detection
  const regularPatterns = {
    er: {
      présent: { je: 'e', tu: 'es', il: 'e', nous: 'ons', vous: 'ez', ils: 'ent' },
      imparfait: { je: 'ais', tu: 'ais', il: 'ait', nous: 'ions', vous: 'iez', ils: 'aient' },
      'futur simple': { je: 'erai', tu: 'eras', il: 'era', nous: 'erons', vous: 'erez', ils: 'eront' },
      conditionnel: { je: 'erais', tu: 'erais', il: 'erait', nous: 'erions', vous: 'eriez', ils: 'eraient' },
      subjonctif: { je: 'e', tu: 'es', il: 'e', nous: 'ions', vous: 'iez', ils: 'ent' },
      'passé simple': { je: 'ai', tu: 'as', il: 'a', nous: 'âmes', vous: 'âtes', ils: 'èrent' },
      pastParticiple: 'é',
      presentParticiple: 'ant'
    },
    ir: {
      présent: { je: 'is', tu: 'is', il: 'it', nous: 'issons', vous: 'issez', ils: 'issent' },
      imparfait: { je: 'issais', tu: 'issais', il: 'issait', nous: 'issions', vous: 'issiez', ils: 'issaient' },
      'futur simple': { je: 'irai', tu: 'iras', il: 'ira', nous: 'irons', vous: 'irez', ils: 'iront' },
      conditionnel: { je: 'irais', tu: 'irais', il: 'irait', nous: 'irions', vous: 'iriez', ils: 'iraient' },
      subjonctif: { je: 'isse', tu: 'isses', il: 'isse', nous: 'issions', vous: 'issiez', ils: 'issent' },
      'passé simple': { je: 'is', tu: 'is', il: 'it', nous: 'îmes', vous: 'îtes', ils: 'irent' },
      pastParticiple: 'i',
      presentParticiple: 'issant'
    },
    re: {
      présent: { je: 's', tu: 's', il: '', nous: 'ons', vous: 'ez', ils: 'ent' },
      imparfait: { je: 'ais', tu: 'ais', il: 'ait', nous: 'ions', vous: 'iez', ils: 'aient' },
      'futur simple': { je: 'rai', tu: 'ras', il: 'ra', nous: 'rons', vous: 'rez', ils: 'ront' },
      conditionnel: { je: 'rais', tu: 'rais', il: 'rait', nous: 'rions', vous: 'riez', ils: 'raient' },
      subjonctif: { je: 'e', tu: 'es', il: 'e', nous: 'ions', vous: 'iez', ils: 'ent' },
      'passé simple': { je: 'is', tu: 'is', il: 'it', nous: 'îmes', vous: 'îtes', ils: 'irent' },
      pastParticiple: 'u',
      presentParticiple: 'ant'
    }
  };

  // Common past participles for compound tense detection
  const pastParticiples = {};
  for (const [inf, data] of Object.entries(irregularVerbs)) {
    if (data.pastParticiple) {
      pastParticiples[data.pastParticiple] = { infinitive: inf, meaning: data.meaning };
    }
  }

  // Build a reverse lookup: conjugated form -> { infinitive, tense, pronoun }
  const conjugationLookup = {};
  for (const [infinitive, verb] of Object.entries(irregularVerbs)) {
    for (const [tense, forms] of Object.entries(verb)) {
      if (typeof forms !== 'object' || tense === 'meaning' || !forms) continue;
      if (tense === 'auxiliary' || tense === 'pastParticiple' || tense === 'presentParticiple') continue;
      for (const [pronoun, form] of Object.entries(forms)) {
        const key = form.toLowerCase();
        if (!conjugationLookup[key]) conjugationLookup[key] = [];
        conjugationLookup[key].push({ infinitive, tense, pronoun, meaning: verb.meaning });
      }
    }
    // Add past participle and present participle
    if (verb.pastParticiple) {
      const key = verb.pastParticiple.toLowerCase();
      if (!conjugationLookup[key]) conjugationLookup[key] = [];
      conjugationLookup[key].push({ infinitive, tense: 'participe passé', pronoun: '-', meaning: verb.meaning });
    }
    if (verb.presentParticiple) {
      const key = verb.presentParticiple.toLowerCase();
      if (!conjugationLookup[key]) conjugationLookup[key] = [];
      conjugationLookup[key].push({ infinitive, tense: 'participe présent', pronoun: '-', meaning: verb.meaning });
    }
  }

  // Use the 7,679-verb dictionary (loaded from french-verb-list.js) to validate
  const knownVerbs = (typeof FRENCH_VERB_LIST !== 'undefined') ? FRENCH_VERB_LIST : new Set();

  // Words that look like verb forms via stem alternation but are never verbs
  // (e.g. celle matches celer via ll→l, but celle is a demonstrative pronoun)
  const neverVerb = new Set([
    'celle', 'celles', 'celui', 'ceux', // demonstrative pronouns
    'elle', 'elles',                     // personal pronouns
    'cette', 'ce', 'ces',               // demonstrative adjectives
    'belle', 'belles',                   // adjective (not from beler)
    'folle', 'folles',                   // adjective
    'molle', 'molles',                   // adjective
    'nulle', 'nulles',                   // adjective
    'or', 'car', 'par', 'pour',         // conjunctions/prepositions
  ]);

  // Analyze a word to check if it's a verb and determine its tense
  function analyze(word) {
    const lower = word.toLowerCase().replace(/['']/g, "'");

    // Handle informal contractions common in spoken French / YouTube transcripts
    // t'as → as (tu as), t'es → es (tu es), y'a → a (il y a)
    const contractionMap = {
      "t'as": { form: 'as', pronoun: 'tu' },
      "t'es": { form: 'es', pronoun: 'tu' },
      "t'avais": { form: 'avais', pronoun: 'tu' },
      "t'étais": { form: 'étais', pronoun: 'tu' },
      "t'auras": { form: 'auras', pronoun: 'tu' },
    };
    if (contractionMap[lower]) {
      const c = contractionMap[lower];
      const results = analyze(c.form);
      if (results) {
        return results.map(r => ({ ...r, pronoun: c.pronoun, contraction: lower }));
      }
    }

    // Strip elision prefixes: j', l', qu', lorsqu', etc.
    const cleanWord = lower
      .replace(/['']$/, '')  // trailing apostrophe from tokenizer
      .replace(/^(j|l|n|s|m|t|d|c|qu|lorsqu|puisqu|quoiqu|jusqu|presqu|quelqu)['']/, '');

    // Nothing left after stripping? It was just a prefix like qu'
    if (!cleanWord || cleanWord.length < 2) return null;

    // Skip known non-verb words
    if (neverVerb.has(cleanWord)) return null;

    // 0. Handle imperative with hyphenated pronouns: donne-le, vas-y, dites-moi, etc.
    const hyphenMatch = cleanWord.match(/^(.+?)-(moi|toi|le|la|les|lui|leur|nous|vous|en|y)$/);
    if (hyphenMatch) {
      const verbPart = hyphenMatch[1];
      // vas-y → va (special case: "vas" only before "y")
      const verbNormalized = (verbPart === 'vas') ? 'va' : verbPart;
      const subResult = analyze(verbNormalized);
      if (subResult) {
        return subResult.map(r => ({
          ...r,
          word: cleanWord,
          tense: 'impératif',
          tenseInfo: tenseInfo['impératif'],
          pronoun: r.pronoun || '-'
        }));
      }
    }

    // 1. Direct lookup in irregular verb conjugation table
    const irregularResults = conjugationLookup[cleanWord];
    if (irregularResults && irregularResults.length > 0) {
      return irregularResults.map(r => ({
        isVerb: true,
        word: cleanWord,
        infinitive: r.infinitive,
        meaning: r.meaning,
        tense: r.tense,
        pronoun: r.pronoun,
        tenseInfo: tenseInfo[r.tense] || null,
        irregular: true
      }));
    }

    // 2. Check if word itself is a known infinitive
    if (knownVerbs.has(cleanWord)) {
      const verbData = irregularVerbs[cleanWord];
      return [{
        isVerb: true,
        word: cleanWord,
        infinitive: cleanWord,
        meaning: verbData ? verbData.meaning : null,
        tense: 'infinitif',
        pronoun: '-',
        tenseInfo: tenseInfo['infinitif'],
        irregular: !!verbData
      }];
    }

    // 3. Try regular verb pattern matching — validated against known verb dictionary
    const regularResult = analyzeRegular(cleanWord);
    if (regularResult) return [regularResult];

    return null;
  }

  // French stem-vowel alternations: conjugated stem may differ from infinitive
  // e.g. lève→lever (è→e), appelle→appeler (ll→l), achète→acheter (è→e)
  const stemAlternations = [
    [/è/g, 'e'],    // lève → lever, mène → mener
    [/é/g, 'e'],    // répète → repeter... actually répéter→répète, but infinitive has é too
    [/ê/g, 'e'],    //
    [/ë/g, 'e'],    //
    [/ll/g, 'l'],   // appelle → appeler
    [/tt/g, 't'],   // jette → jeter
    [/î/g, 'i'],    //
    [/û/g, 'u'],    //
    [/oi/g, 'oy'],  // envoie → envoyer
    [/ui/g, 'uy'],  // essuie → essuyer
    [/ai/g, 'ay'],  // paie → payer
    [/è/g, 'é'],    // some verbs: considère → considérer
    [/ç/g, 'c'],    // commençons → commencer, plaçais → placer
    [/ge(?=[ao])/g, 'g'], // mangeons → manger, nageons → nager (ge before a/o → g)
  ];

  function findKnownInfinitive(infinitive) {
    if (knownVerbs.has(infinitive)) return infinitive;
    // Try each stem alternation
    for (const [pattern, replacement] of stemAlternations) {
      const alt = infinitive.replace(pattern, replacement);
      if (alt !== infinitive && knownVerbs.has(alt)) return alt;
    }
    return null;
  }

  function analyzeRegular(word) {
    // Collect all possible matches, pick the best one (longest ending = most specific)
    let bestMatch = null;
    let bestEndingLen = 0;

    for (const [type, patterns] of Object.entries(regularPatterns)) {
      for (const [tense, endings] of Object.entries(patterns)) {
        if (typeof endings !== 'object') continue;
        for (const [pronoun, ending] of Object.entries(endings)) {
          if (!ending || !word.endsWith(ending)) continue;
          const stem = word.slice(0, word.length - ending.length);
          if (stem.length < 2) continue;
          const infinitive = stem + type;

          // KEY: only accept if the reconstructed infinitive is a KNOWN French verb
          // Also try stem-vowel alternations (è→e, é→e, ë→e, ê→e, î→i, û→u, etc.)
          const candidate = findKnownInfinitive(infinitive);
          if (candidate && ending.length > bestEndingLen) {
            bestMatch = { isVerb: true, word, infinitive: candidate, meaning: null, tense, pronoun, tenseInfo: tenseInfo[tense] || null, irregular: false };
            bestEndingLen = ending.length;
          }
        }
      }
    }

    if (bestMatch) return bestMatch;

    // Past participle: -é → -er (including agreement forms: -ée, -és, -ées)
    for (const ppEnding of ['ées', 'és', 'ée', 'é']) {
      if (word.endsWith(ppEnding) && word.length >= ppEnding.length + 2) {
        const infinitive = word.slice(0, -ppEnding.length) + 'er';
        if (knownVerbs.has(infinitive)) {
          return { isVerb: true, word, infinitive, meaning: null, tense: 'participe passé', pronoun: '-', tenseInfo: tenseInfo['participe passé'], irregular: false };
        }
      }
    }
    // Past participle: -i → -ir (including agreement: -ie, -is, -ies)
    for (const ppEnding of ['ies', 'is', 'ie', 'i']) {
      if (word.endsWith(ppEnding) && word.length >= ppEnding.length + 2) {
        const stem = word.slice(0, -ppEnding.length);
        const infinitive = stem + 'ir';
        if (knownVerbs.has(infinitive)) {
          return { isVerb: true, word, infinitive, meaning: null, tense: 'participe passé', pronoun: '-', tenseInfo: tenseInfo['participe passé'], irregular: false };
        }
      }
    }
    // Past participle: -u → -re (e.g. vendu → vendre; agreement: -ue, -us, -ues)
    for (const ppEnding of ['ues', 'us', 'ue', 'u']) {
      if (word.endsWith(ppEnding) && word.length >= ppEnding.length + 2) {
        const stem = word.slice(0, -ppEnding.length);
        const infinitive = stem + 're';
        if (knownVerbs.has(infinitive)) {
          return { isVerb: true, word, infinitive, meaning: null, tense: 'participe passé', pronoun: '-', tenseInfo: tenseInfo['participe passé'], irregular: false };
        }
      }
    }
    // Present participle: -issant → -ir (e.g. finissant → finir)
    if (word.endsWith('issant') && word.length >= 7) {
      const infinitive = word.slice(0, -6) + 'ir';
      if (knownVerbs.has(infinitive)) {
        return { isVerb: true, word, infinitive, meaning: null, tense: 'participe présent', pronoun: '-', tenseInfo: tenseInfo['participe présent'], irregular: false };
      }
    }
    // Present participle: -ant → -er/-ir/-re
    if (word.endsWith('ant') && word.length >= 5) {
      const stem = word.slice(0, -3);
      for (const suffix of ['er', 'ir', 're']) {
        if (knownVerbs.has(stem + suffix)) {
          return { isVerb: true, word, infinitive: stem + suffix, meaning: null, tense: 'participe présent', pronoun: '-', tenseInfo: tenseInfo['participe présent'], irregular: false };
        }
      }
    }

    return null;
  }

  // Conjugated forms of "aller" for futur proche detection
  const allerForms = new Set(['vais', 'vas', 'va', 'allons', 'allez', 'vont']);
  // Conjugated forms of "venir" for passé récent detection
  const venirForms = new Set(['viens', 'vient', 'venons', 'venez', 'viennent']);
  // Conjugated forms of "être" — présent
  const etreForms = new Set(['suis', 'es', 'est', 'sommes', 'êtes', 'sont']);
  // Conjugated forms of "avoir" — présent
  const avoirForms = new Set(['ai', 'as', 'a', 'avons', 'avez', 'ont']);
  // Imparfait forms of avoir/être for plus-que-parfait
  const avoirImpForms = new Set(['avais', 'avait', 'avions', 'aviez', 'avaient']);
  const etreImpForms = new Set(['étais', 'était', 'étions', 'étiez', 'étaient']);
  // Futur simple forms of avoir/être for futur antérieur
  const avoirFutForms = new Set(['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront']);
  const etreFutForms = new Set(['serai', 'seras', 'sera', 'serons', 'serez', 'seront']);
  // Conditionnel forms of avoir/être for conditionnel passé
  const avoirCondForms = new Set(['aurais', 'aurait', 'aurions', 'auriez', 'auraient']);
  const etreCondForms = new Set(['serais', 'serait', 'serions', 'seriez', 'seraient']);
  // Subjonctif forms of avoir/être for subjonctif passé
  const avoirSubjForms = new Set(['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient']);
  const etreSubjForms = new Set(['sois', 'soit', 'soyons', 'soyez', 'soient']);
  // Passé simple forms of avoir/être for passé antérieur
  const avoirPSForms = new Set(['eus', 'eut', 'eûmes', 'eûtes', 'eurent']);
  const etrePSForms = new Set(['fus', 'fut', 'fûmes', 'fûtes', 'furent']);

  // All auxiliary forms (for any compound tense) — used for quick membership test
  const allAvoirAux = new Set([...avoirForms, ...avoirImpForms, ...avoirFutForms, ...avoirCondForms, ...avoirSubjForms, ...avoirPSForms]);
  const allEtreAux = new Set([...etreForms, ...etreImpForms, ...etreFutForms, ...etreCondForms, ...etreSubjForms, ...etrePSForms]);

  // Map auxiliary form → compound tense name
  function compoundTenseForAux(form) {
    if (avoirForms.has(form) || etreForms.has(form)) return 'passé composé';
    if (avoirImpForms.has(form) || etreImpForms.has(form)) return 'plus-que-parfait';
    if (avoirFutForms.has(form) || etreFutForms.has(form)) return 'futur antérieur';
    if (avoirCondForms.has(form) || etreCondForms.has(form)) return 'conditionnel passé';
    if (avoirSubjForms.has(form) || etreSubjForms.has(form)) return 'subjonctif passé';
    if (avoirPSForms.has(form) || etrePSForms.has(form)) return 'passé antérieur';
    return null;
  }

  // Modal verbs that take a following infinitive
  const modalInfinitives = new Set(['devoir', 'pouvoir', 'vouloir', 'savoir']);
  // Build a set of all conjugated modal forms for quick lookup
  const modalForms = {};  // conjugated form → { infinitive (modal), pronoun }
  for (const modal of modalInfinitives) {
    const data = irregularVerbs[modal];
    if (!data) continue;
    for (const [tense, forms] of Object.entries(data)) {
      if (typeof forms !== 'object' || !forms || ['meaning', 'auxiliary', 'pastParticiple', 'presentParticiple'].includes(tense)) continue;
      for (const [pronoun, form] of Object.entries(forms)) {
        modalForms[form.toLowerCase()] = { infinitive: modal, pronoun, meaning: data.meaning };
      }
    }
  }

  const pronounForForm = {
    'vais': 'je', 'vas': 'tu', 'va': 'il/elle', 'allons': 'nous', 'allez': 'vous', 'vont': 'ils/elles',
    'viens': 'je/tu', 'vient': 'il/elle', 'venons': 'nous', 'venez': 'vous', 'viennent': 'ils/elles',
    'suis': 'je', 'es': 'tu', 'est': 'il/elle', 'sommes': 'nous', 'êtes': 'vous', 'sont': 'ils/elles',
    'ai': 'je', 'as': 'tu', 'a': 'il/elle', 'avons': 'nous', 'avez': 'vous', 'ont': 'ils/elles',
    'avais': 'je/tu', 'avait': 'il/elle', 'avions': 'nous', 'aviez': 'vous', 'avaient': 'ils/elles',
    'étais': 'je/tu', 'était': 'il/elle', 'étions': 'nous', 'étiez': 'vous', 'étaient': 'ils/elles',
    'aurai': 'je', 'auras': 'tu', 'aura': 'il/elle', 'aurons': 'nous', 'aurez': 'vous', 'auront': 'ils/elles',
    'serai': 'je', 'seras': 'tu', 'sera': 'il/elle', 'serons': 'nous', 'serez': 'vous', 'seront': 'ils/elles',
    'aurais': 'je/tu', 'aurait': 'il/elle', 'aurions': 'nous', 'auriez': 'vous', 'auraient': 'ils/elles',
    'serais': 'je/tu', 'serait': 'il/elle', 'serions': 'nous', 'seriez': 'vous', 'seraient': 'ils/elles',
    'aie': 'je', 'aies': 'tu', 'ait': 'il/elle', 'ayons': 'nous', 'ayez': 'vous', 'aient': 'ils/elles',
    'sois': 'je/tu', 'soit': 'il/elle', 'soyons': 'nous', 'soyez': 'vous', 'soient': 'ils/elles',
    'eus': 'je/tu', 'eut': 'il/elle', 'eûmes': 'nous', 'eûtes': 'vous', 'eurent': 'ils/elles',
    'fus': 'je/tu', 'fut': 'il/elle', 'fûmes': 'nous', 'fûtes': 'vous', 'furent': 'ils/elles'
  };

  // Negation particles that can sit between auxiliary and main verb
  const negationWords = new Set(['ne', 'n', 'pas', 'plus', 'jamais', 'rien', 'guère', 'point']);

  // Object pronouns that can sit between auxiliary/modal and verb
  // e.g. "je l'ai vu", "il me les a donnés", "je vais y aller", "il ne lui en a pas parlé"
  const objectPronouns = new Set(['le', 'la', 'les', 'lui', 'leur', 'y', 'en', 'me', 'te', 'se', 'nous', 'vous']);

  // Combined skip set: words that can appear between auxiliary and main verb
  const compoundSkipWords = new Set([...negationWords, ...objectPronouns]);

  // Reflexive pronouns (unambiguous ones — nous/vous are ambiguous as they're also subject pronouns)
  const reflexivePronouns = new Set(['me', 'te', 'se', 'nous', 'vous']);
  // Words to skip when scanning for reflexive pronoun (negation + ne)
  const reflexiveSkip = new Set(['ne', 'pas', 'plus', 'jamais', 'rien', 'guère', 'point']);

  /**
   * Detect compound tenses by checking surrounding words.
   * Handles negation: ne vais PAS prendre, n'ai PAS mangé, etc.
   * @param {string} word - the clicked word
   * @param {string[]} words - all words in the sentence (raw from tokenizer)
   * @param {number} index - position of the clicked word
   * @returns {object|null} compound tense info
   */
  function analyzeCompound(word, words, index) {
    // Helper: clean a word (strip elision prefix, lowercase)
    const clean = (w) => w ? w.toLowerCase().replace(/['']/g, "'").replace(/['']$/, '').replace(/^(j|l|n|s|m|t|d|c|qu|lorsqu|puisqu|quoiqu|jusqu|presqu|quelqu)['']/, '') : '';

    const lower = clean(word);

    // Helper: scan forward from index, skipping negation words and object pronouns
    function scanForward(fromIdx, maxSkip) {
      for (let i = fromIdx + 1; i <= Math.min(fromIdx + maxSkip, words.length - 1); i++) {
        const cw = clean(words[i]);
        if (compoundSkipWords.has(cw)) continue;
        return { raw: words[i], clean: cw, idx: i };
      }
      return null;
    }

    // Helper: scan backward from index, skipping negation words and object pronouns
    function scanBackward(fromIdx, maxSkip) {
      for (let i = fromIdx - 1; i >= Math.max(fromIdx - maxSkip, 0); i--) {
        const cw = clean(words[i]);
        if (compoundSkipWords.has(cw)) continue;
        return { raw: words[i], clean: cw, idx: i };
      }
      return null;
    }

    // Helper: build the full display form between two indices
    function fullForm(startIdx, endIdx) {
      return words.slice(startIdx, endIdx + 1).join(' ');
    }

    // Helper: clean a word but preserve reflexive pronouns (don't strip s', m', t')
    const cleanKeepReflexive = (w) => {
      if (!w) return '';
      const normalized = w.toLowerCase().replace(/['\u2019\u2018]/g, "'");
      // Check if it's an elided reflexive: s', m', t'
      if (/^[smt]'$/.test(normalized)) return normalized.charAt(0) + 'e'; // s' → se, m' → me, t' → te
      // Check if it's an elided ne: n'
      if (/^n'$/.test(normalized)) return 'ne';
      return clean(w);
    };

    // Helper: check if a reflexive pronoun exists before a given index
    // Scans backward skipping negation, returns the pronoun if found
    function findReflexiveBefore(idx) {
      for (let i = idx - 1; i >= Math.max(idx - 4, 0); i--) {
        const cw = cleanKeepReflexive(words[i]);
        if (reflexiveSkip.has(cw)) continue;
        if (reflexivePronouns.has(cw)) return { pronoun: cw, idx: i };
        return null; // hit a non-skip, non-reflexive word — stop
      }
      return null;
    }

    // Helper: annotate a result with reflexive info
    function withReflexive(result, checkBeforeIdx) {
      const refl = findReflexiveBefore(checkBeforeIdx);
      if (refl) {
        result.reflexive = true;
        result.infinitive = 'se ' + result.infinitive;
        // Extend fullForm to include the reflexive pronoun
        const startIdx = Math.min(refl.idx, checkBeforeIdx);
        const endIdx = parseInt(result._endIdx || index);
        result.fullForm = fullForm(startIdx, endIdx);
      }
      delete result._endIdx;
      return result;
    }

    // ── Futur Proche: [se] aller [ne...pas] + infinitive ──
    if (allerForms.has(lower)) {
      const fwd = scanForward(index, 3);
      if (fwd && knownVerbs.has(fwd.clean)) {
        const verbData = irregularVerbs[fwd.clean];
        return withReflexive({
          compound: 'futur proche',
          fullForm: fullForm(index, fwd.idx),
          infinitive: fwd.clean,
          meaning: verbData ? verbData.meaning : null,
          pronoun: pronounForForm[lower] || '-',
          tenseInfo: tenseInfo['futur proche'],
          negative: fwd.idx > index + 1,
          _endIdx: fwd.idx
        }, index);
      }
    }
    if (knownVerbs.has(lower)) {
      const back = scanBackward(index, 3);
      if (back && allerForms.has(back.clean)) {
        const verbData = irregularVerbs[lower];
        return withReflexive({
          compound: 'futur proche',
          fullForm: fullForm(back.idx, index),
          infinitive: lower,
          meaning: verbData ? verbData.meaning : null,
          pronoun: pronounForForm[back.clean] || '-',
          tenseInfo: tenseInfo['futur proche'],
          negative: back.idx < index - 1,
          _endIdx: index
        }, back.idx);
      }
    }

    // ── Passé Récent: [se] venir [ne...pas] + de + infinitive ──
    if (venirForms.has(lower)) {
      const fwd = scanForward(index, 3);
      if (fwd && fwd.clean === 'de') {
        const fwd2 = scanForward(fwd.idx, 2);
        if (fwd2 && knownVerbs.has(fwd2.clean)) {
          const verbData = irregularVerbs[fwd2.clean];
          return withReflexive({
            compound: 'passé récent',
            fullForm: fullForm(index, fwd2.idx),
            infinitive: fwd2.clean,
            meaning: verbData ? verbData.meaning : null,
            pronoun: pronounForForm[lower] || '-',
            tenseInfo: tenseInfo['passé récent'],
            negative: fwd.idx > index + 1,
            _endIdx: fwd2.idx
          }, index);
        }
      }
    }
    if (knownVerbs.has(lower)) {
      const back = scanBackward(index, 2);
      if (back && back.clean === 'de') {
        const back2 = scanBackward(back.idx, 3);
        if (back2 && venirForms.has(back2.clean)) {
          const verbData = irregularVerbs[lower];
          return withReflexive({
            compound: 'passé récent',
            fullForm: fullForm(back2.idx, index),
            infinitive: lower,
            meaning: verbData ? verbData.meaning : null,
            pronoun: pronounForForm[back2.clean] || '-',
            tenseInfo: tenseInfo['passé récent'],
            negative: back2.idx < back.idx - 1,
            _endIdx: index
          }, back2.idx);
        }
      }
    }

    // ── All compound tenses: aux + past participle ──
    // Covers: passé composé, plus-que-parfait, futur antérieur, conditionnel passé,
    //         subjonctif passé, passé antérieur
    // Also handles past participle agreement: mangé/mangée/mangés/mangées all → manger

    // Helper: try to analyze as past participle, including agreement forms (-e, -s, -es)
    function analyzePP(w) {
      // Check if any result from analyze is a past participle
      function findPP(results) {
        if (!results) return null;
        return results.find(r => r.tense === 'participe passé') || null;
      }
      const pp = findPP(analyze(w));
      if (pp) return pp;
      // Try stripping agreement suffixes: -ées → -é, -és → -é, -ée → -é, -es → -, -e → -, -s → -
      for (const suffix of ['ées', 'és', 'ée', 'es', 'e', 's']) {
        if (w.length > suffix.length + 1 && w.endsWith(suffix)) {
          const stripped = w.slice(0, -suffix.length);
          // For -ées/-és/-ée, the base should end in é
          if (suffix.startsWith('é')) {
            const base = stripped + 'é';
            const r = findPP(analyze(base));
            if (r) return r;
          } else {
            const r = findPP(analyze(stripped));
            if (r) return r;
          }
        }
      }
      return null;
    }

    // Helper: determine if être+PP is passive voice or compound tense
    // être-verbs (DR MRS VANDERTRAMP) and reflexives use être as auxiliary → compound tense
    // All other verbs with être+PP → passive voice
    function resolveEtrePP(auxForm, pp, startIdx, endIdx) {
      const isEtreAux = allEtreAux.has(auxForm);
      const baseTense = compoundTenseForAux(auxForm);
      if (!baseTense) return null;

      if (isEtreAux && !etreVerbs.has(pp.infinitive) && pp.infinitive !== 'être') {
        // Check if there's a reflexive pronoun — if so, it's a compound tense, not passive
        const reflCheck = findReflexiveBefore(Math.min(startIdx, endIdx));
        if (!reflCheck) {
          return {
            compound: 'voix passive',
            tenseInfo: tenseInfo['voix passive']
          };
        }
      }
      return {
        compound: baseTense,
        tenseInfo: tenseInfo[baseTense]
      };
    }

    const wordAnalysis = analyzePP(lower);
    if (wordAnalysis) {
      const back = scanBackward(index, 4);
      if (back) {
        const bc = back.clean;
        const resolved = (allAvoirAux.has(bc))
          ? { compound: compoundTenseForAux(bc), tenseInfo: tenseInfo[compoundTenseForAux(bc)] }
          : resolveEtrePP(bc, wordAnalysis, back.idx, index);
        if (resolved && resolved.compound) {
          return withReflexive({
            compound: resolved.compound,
            fullForm: fullForm(back.idx, index),
            infinitive: wordAnalysis.infinitive,
            meaning: wordAnalysis.meaning,
            pronoun: pronounForForm[bc] || '-',
            tenseInfo: resolved.tenseInfo,
            negative: back.idx < index - 1,
            _endIdx: index
          }, back.idx);
        }
      }
    }
    if (allAvoirAux.has(lower) || allEtreAux.has(lower)) {
      const fwd = scanForward(index, 4);
      if (fwd) {
        const nextPP = analyzePP(fwd.clean);
        if (nextPP) {
          const resolved = (allAvoirAux.has(lower))
            ? { compound: compoundTenseForAux(lower), tenseInfo: tenseInfo[compoundTenseForAux(lower)] }
            : resolveEtrePP(lower, nextPP, index, fwd.idx);
          if (resolved && resolved.compound) {
            return withReflexive({
              compound: resolved.compound,
              fullForm: fullForm(index, fwd.idx),
              infinitive: nextPP.infinitive,
              meaning: nextPP.meaning,
              pronoun: pronounForForm[lower] || '-',
              tenseInfo: resolved.tenseInfo,
              negative: fwd.idx > index + 1,
              _endIdx: fwd.idx
            }, index);
          }
        }
      }
    }

    // ── Présent progressif: être + en train de + infinitive ──
    if (etreForms.has(lower) || etreImpForms.has(lower)) {
      // Look for "en" then "train" then "de" then infinitive
      const i1 = index + 1 < words.length ? clean(words[index + 1]) : '';
      const i2 = index + 2 < words.length ? clean(words[index + 2]) : '';
      const i3 = index + 3 < words.length ? clean(words[index + 3]) : '';
      if (i1 === 'en' && i2 === 'train' && i3 === 'de') {
        const fwd = scanForward(index + 3, 2);
        if (fwd && knownVerbs.has(fwd.clean)) {
          const verbData = irregularVerbs[fwd.clean];
          return withReflexive({
            compound: 'en train de',
            fullForm: fullForm(index, fwd.idx),
            infinitive: fwd.clean,
            meaning: verbData ? verbData.meaning : null,
            pronoun: pronounForForm[lower] || '-',
            tenseInfo: tenseInfo['en train de'],
            negative: false,
            _endIdx: fwd.idx
          }, index);
        }
      }
    }

    // ── Modal verb chains: devoir/pouvoir/vouloir/savoir + [ne...pas] + infinitive ──
    if (modalForms[lower]) {
      const modal = modalForms[lower];
      const fwd = scanForward(index, 4);
      if (fwd && knownVerbs.has(fwd.clean)) {
        const verbData = irregularVerbs[fwd.clean];
        return withReflexive({
          compound: 'modal + infinitif',
          fullForm: fullForm(index, fwd.idx),
          infinitive: fwd.clean,
          meaning: verbData ? verbData.meaning : null,
          pronoun: modal.pronoun || '-',
          tenseInfo: tenseInfo['modal + infinitif'],
          modalVerb: modal.infinitive,
          modalMeaning: modal.meaning,
          negative: fwd.idx > index + 1,
          _endIdx: fwd.idx
        }, index);
      }
    }
    // Clicked on infinitive after modal
    if (knownVerbs.has(lower)) {
      const back = scanBackward(index, 4);
      if (back && modalForms[back.clean]) {
        const modal = modalForms[back.clean];
        const verbData = irregularVerbs[lower];
        return withReflexive({
          compound: 'modal + infinitif',
          fullForm: fullForm(back.idx, index),
          infinitive: lower,
          meaning: verbData ? verbData.meaning : null,
          pronoun: modal.pronoun || '-',
          tenseInfo: tenseInfo['modal + infinitif'],
          modalVerb: modal.infinitive,
          modalMeaning: modal.meaning,
          negative: back.idx < index - 1,
          _endIdx: index
        }, back.idx);
      }
    }

    // ── Faire/Laisser + infinitive (causative/permissive) ──
    // Use analyze() to detect any conjugated form of faire/laisser (works for irregular and regular)
    {
      const wordResult = analyze(lower);
      if (wordResult) {
        const inf = wordResult[0]?.infinitive;
        if (inf === 'faire' || inf === 'laisser') {
          const fwd = scanForward(index, 4);
          if (fwd && knownVerbs.has(fwd.clean)) {
            const verbData = irregularVerbs[fwd.clean];
            const tenseName = inf === 'faire' ? 'faire + infinitif' : 'laisser + infinitif';
            return {
              compound: tenseName,
              fullForm: fullForm(index, fwd.idx),
              infinitive: fwd.clean,
              meaning: verbData ? verbData.meaning : null,
              pronoun: wordResult[0].pronoun || '-',
              tenseInfo: tenseInfo[tenseName],
              negative: fwd.idx > index + 1
            };
          }
        }
      }
    }

    // ── Reflexive simple verb: [ne] se/me/te/s'/m'/t' [ne...pas] + verb ──
    // e.g. "se lève", "me lave", "s'appelle", "ne se lève pas"
    const lowerRefl = cleanKeepReflexive(word);
    if (reflexivePronouns.has(lowerRefl)) {
      // Clicked on the reflexive pronoun — look forward for the verb
      const fwd = scanForward(index, 3);
      if (fwd) {
        const verbResult = analyze(fwd.clean);
        if (verbResult && verbResult[0]) {
          const v = verbResult[0];
          return {
            compound: v.tense,
            fullForm: fullForm(index, fwd.idx),
            infinitive: 'se ' + v.infinitive,
            meaning: v.meaning,
            pronoun: v.pronoun,
            tenseInfo: v.tenseInfo,
            reflexive: true,
            negative: fwd.idx > index + 1
          };
        }
      }
    }
    // Clicked on the verb — check if preceded by reflexive pronoun
    {
      const singleResult = analyze(lower);
      if (singleResult && singleResult[0]) {
        // Scan back but use cleanKeepReflexive to detect s', m', t'
        for (let i = index - 1; i >= Math.max(index - 4, 0); i--) {
          const cw = cleanKeepReflexive(words[i]);
          if (reflexiveSkip.has(cw)) continue;
          if (reflexivePronouns.has(cw)) {
            const v = singleResult[0];
            return {
              compound: v.tense,
              fullForm: fullForm(i, index),
              infinitive: 'se ' + v.infinitive,
              meaning: v.meaning,
              pronoun: v.pronoun,
              tenseInfo: v.tenseInfo,
              reflexive: true,
              negative: i < index - 1
            };
          }
          break;
        }
      }
    }

    return null;
  }

  function getTenseInfo(tenseName) {
    return tenseInfo[tenseName] || null;
  }

  function getVerbData(infinitive) {
    return irregularVerbs[infinitive] || null;
  }

  function isEtreVerb(infinitive) {
    return etreVerbs.has(infinitive);
  }

  // ── Noun/Verb disambiguation ──────────────────────────────────────────────
  // French has many homographs: ferme (farm/close), porte (door/carry),
  // livre (book/deliver), place (square/place), etc.
  // Use surrounding words to determine if a word is used as a noun vs verb.

  // Determiners: articles, possessives, demonstratives — signal a following noun
  const determiners = new Set([
    'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'au', 'aux',
    'ce', 'cet', 'cette', 'ces',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
    'quel', 'quelle', 'quels', 'quelles',
    'chaque', 'tout', 'toute', 'tous', 'toutes',
    'aucun', 'aucune', 'certain', 'certaine', 'certains', 'certaines',
    'plusieurs', 'quelque', 'quelques',
  ]);

  // Common adjectives that appear between determiner and noun
  // (French prenominal adjectives — BANGS: Beauty, Age, Number, Goodness, Size)
  const prenominalAdjectives = new Set([
    'petit', 'petite', 'petits', 'petites',
    'grand', 'grande', 'grands', 'grandes',
    'gros', 'grosse',
    'beau', 'bel', 'belle', 'beaux', 'belles',
    'bon', 'bonne', 'bons', 'bonnes',
    'mauvais', 'mauvaise',
    'nouveau', 'nouvel', 'nouvelle', 'nouveaux', 'nouvelles',
    'vieux', 'vieil', 'vieille', 'vieux', 'vieilles',
    'jeune', 'jeunes',
    'joli', 'jolie', 'jolis', 'jolies',
    'long', 'longue', 'longs', 'longues',
    'autre', 'autres',
    'même', 'mêmes',
    'premier', 'première', 'dernier', 'dernière',
    'seul', 'seule', 'seuls', 'seules',
    'propre', 'propres',
    'ancien', 'ancienne', 'anciens', 'anciennes',
    'double', 'triple',
    'demi', 'demie',
    'deuxième', 'troisième', 'quatrième', 'cinquième',
  ]);

  // Subject pronouns — signal a following verb
  const subjectPronouns = new Set([
    'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'qui', // relative pronoun as subject
  ]);

  // Prepositions that can precede "determiner + noun" patterns
  const prepositions = new Set([
    'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'sous',
    'avec', 'pour', 'par', 'sans', 'vers', 'chez', 'entre',
  ]);

  /**
   * Check if a word in context is likely a noun rather than a verb.
   * Uses surrounding words for disambiguation.
   * @param {string} word - the word to check (raw)
   * @param {string[]} words - all words in the sentence
   * @param {number} index - position of the word
   * @returns {boolean} true if likely a noun
   */
  function isLikelyNoun(word, words, index) {
    const lower = word.toLowerCase().replace(/['']/g, "'").replace(/['']$/, '');

    // Look backward for context clues
    for (let i = index - 1; i >= Math.max(index - 3, 0); i--) {
      const prev = words[i].toLowerCase().replace(/['']/g, "'").replace(/['']$/, '')
        .replace(/^(l|d|qu|n|s|j|m|t|c)['']/, '');
      const prevFull = words[i].toLowerCase().replace(/['']/g, "'").replace(/['']$/, '');

      if (i === index - 1) {
        // Immediately preceded by a determiner → likely noun
        // e.g. "la ferme", "une porte", "des livres"
        if (determiners.has(prev) || determiners.has(prevFull)) return true;

        // Immediately preceded by a prenominal adjective → check if determiner before that
        if (prenominalAdjectives.has(prev)) {
          // Check one more word back for a determiner
          if (i > 0) {
            const prevPrev = words[i - 1].toLowerCase().replace(/['']/g, "'").replace(/['']$/, '');
            if (determiners.has(prevPrev)) return true; // "la petite ferme"
          }
        }

        // Immediately preceded by a subject pronoun → likely verb
        if (subjectPronouns.has(prev) || subjectPronouns.has(prevFull)) return false;

        // Preceded by elided subject: j', qu'il, etc. — check the raw word
        if (/^(j|qu)['']$/i.test(words[i])) return false; // "j'ferme" = verb
      }

      if (i === index - 2) {
        // "de la ferme", "dans une ferme" — preposition + determiner + word
        const between = words[i + 1].toLowerCase().replace(/['']/g, "'").replace(/['']$/, '');
        if (prepositions.has(prev) && determiners.has(between)) return true;
      }
    }

    return false; // default: don't suppress verb detection
  }

  return { analyze, analyzeCompound, isLikelyNoun, getTenseInfo, getVerbData, isEtreVerb, tenseInfo, irregularVerbs };
})();
