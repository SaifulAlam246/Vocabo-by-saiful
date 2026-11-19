import { Lesson } from '../types/vocab';

export const SAMPLE_LESSON_1_1: Lesson = {
  id: 'lesson_sample_1_1',
  partNumber: 1,
  lessonIndexInPart: 1,
  lessonCode: '1.1',
  wordRangeStart: 1,
  wordRangeEnd: 10,
  completed: false,
  lastStudiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  words: [
    {
      id: 'w_sample_1',
      sourceNumber: 1,
      word: 'Abandon',
      partOfSpeech: 'verb',
      cefrLevel: 'B2',
      banglaMeaning: 'ত্যাগ করা, পরিত্যাগ করা',
      exampleSentence: 'He decided to abandon his old plan and start fresh.',
      banglaTranslation: 'সে তার পুরোনো পরিকল্পনা পরিত্যাগ করে নতুনভাবে শুরু করার সিদ্ধান্ত নিল।',
      synonyms: [
        { term: 'Leave', meaning: 'ছেড়ে যাওয়া' },
        { term: 'Give up', meaning: 'হাল ছেড়ে দেওয়া' },
        { term: 'Desert', meaning: 'ফেলে চলে যাওয়া' },
      ],
      antonyms: [
        { term: 'Continue', meaning: 'চালিয়ে যাওয়া' },
        { term: 'Keep', meaning: 'রাখা' },
      ],
      isFavorite: true,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_2',
      sourceNumber: 2,
      word: 'Ability',
      partOfSpeech: 'noun',
      cefrLevel: 'A2',
      banglaMeaning: 'দক্ষতা, সামর্থ্য, ক্ষমতা',
      exampleSentence: 'She has the ability to explain complex ideas clearly.',
      banglaTranslation: 'জটিল ধারণাগুলো স্পষ্টভাবে বোঝানোর দক্ষতা তার আছে।',
      synonyms: [
        { term: 'Skill', meaning: 'দক্ষতা' },
        { term: 'Capability', meaning: 'সামর্থ্য' },
        { term: 'Talent', meaning: 'প্রতিভা' },
      ],
      antonyms: [
        { term: 'Inability', meaning: 'অক্ষমতা' },
        { term: 'Weakness', meaning: 'দুর্বলতা' },
      ],
      isFavorite: false,
      revisionStatus: 'known',
      reviewCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_3',
      sourceNumber: 3,
      word: 'Abroad',
      partOfSpeech: 'adverb',
      cefrLevel: 'B1',
      banglaMeaning: 'বিদেশে, বিদেশের মাটিতে',
      exampleSentence: 'Many students go abroad for higher studies every year.',
      banglaTranslation: 'প্রতি বছর অনেক শিক্ষার্থী উচ্চশিক্ষার জন্য বিদেশে যায়।',
      synonyms: [
        { term: 'Overseas', meaning: 'সাগরপারে' },
        { term: 'Internationally', meaning: 'আন্তর্জাতিকভাবে' },
      ],
      antonyms: [
        { term: 'Locally', meaning: 'স্থানীয়ভাবে' },
        { term: 'At home', meaning: 'দেশে' },
      ],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_4',
      sourceNumber: 4,
      word: 'Absolute',
      partOfSpeech: 'adjective',
      cefrLevel: 'B2',
      banglaMeaning: 'সম্পূর্ণ, চূড়ান্ত, পরম',
      exampleSentence: 'The teacher asked for absolute silence during the exam.',
      banglaTranslation: 'পরীক্ষার সময় শিক্ষক সম্পূর্ণ নীরবতা বজায় রাখতে বললেন।',
      synonyms: [
        { term: 'Complete', meaning: 'সম্পূর্ণ' },
        { term: 'Total', meaning: 'মোট' },
        { term: 'Pure', meaning: 'খাঁটি' },
      ],
      antonyms: [
        { term: 'Partial', meaning: 'আংশিক' },
        { term: 'Limited', meaning: 'সীমিত' },
      ],
      isFavorite: false,
      revisionStatus: 'difficult',
      reviewCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      difficultCount: 1,
    },
    {
      id: 'w_sample_5',
      sourceNumber: 5,
      word: 'Absorb',
      partOfSpeech: 'verb',
      cefrLevel: 'B2',
      banglaMeaning: 'শোষণ করা, আত্মস্থ করা',
      exampleSentence: 'Dry soil can quickly absorb rainwater.',
      banglaTranslation: 'শুকনো মাটি দ্রুত বৃষ্টির পানি শোষণ করতে পারে।',
      synonyms: [
        { term: 'Soak up', meaning: 'টেনে নেওয়া' },
        { term: 'Assimilate', meaning: 'আত্মস্থ করা' },
      ],
      antonyms: [
        { term: 'Release', meaning: 'ছেড়ে দেওয়া' },
        { term: 'Emit', meaning: 'নির্গত করা' },
      ],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_6',
      sourceNumber: 6,
      word: 'Abstract',
      partOfSpeech: 'adjective',
      cefrLevel: 'B2',
      banglaMeaning: 'বিমূর্ত, তাত্ত্বিক',
      exampleSentence: 'Freedom is an abstract concept that everyone values.',
      banglaTranslation: 'স্বাধীনতা একটি বিমূর্ত ধারণা যা সবাই মূল্য দেয়।',
      synonyms: [
        { term: 'Theoretical', meaning: 'তাত্ত্বিক' },
        { term: 'Conceptual', meaning: 'ধারণাগত' },
      ],
      antonyms: [
        { term: 'Concrete', meaning: 'বাস্তব' },
        { term: 'Tangible', meaning: 'স্পর্শযোগ্য' },
      ],
      isFavorite: true,
      revisionStatus: 'difficult',
      reviewCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      difficultCount: 1,
    },
    {
      id: 'w_sample_7',
      sourceNumber: 7,
      word: 'Academic',
      partOfSpeech: 'adjective',
      cefrLevel: 'B1',
      banglaMeaning: 'শিক্ষাগত, প্রাতিষ্ঠানিক',
      exampleSentence: 'Her academic performance improved dramatically this semester.',
      banglaTranslation: 'এই সেমিস্টারে তার শিক্ষাগত ফলাফল উল্লেখযোগ্যভাবে উন্নত হয়েছে।',
      synonyms: [
        { term: 'Educational', meaning: 'শিক্ষামূলক' },
        { term: 'Scholarly', meaning: 'পাণ্ডিত্যপূর্ণ' },
      ],
      antonyms: [
        { term: 'Practical', meaning: 'ব্যবহারিক' },
        { term: 'Non-academic', meaning: 'অশিক্ষাগত' },
      ],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_8',
      sourceNumber: 8,
      word: 'Accept',
      partOfSpeech: 'verb',
      cefrLevel: 'A2',
      banglaMeaning: 'গ্রহণ করা, মেনে নেওয়া',
      exampleSentence: 'They were happy to accept the invitation.',
      banglaTranslation: 'তারা আমন্ত্রণটি গ্রহণ করতে পেরে খুশি হয়েছিল।',
      synonyms: [
        { term: 'Receive', meaning: 'গ্রহণ করা' },
        { term: 'Approve', meaning: 'অনুমোদন করা' },
        { term: 'Agree to', meaning: 'সম্মত হওয়া' },
      ],
      antonyms: [
        { term: 'Refuse', meaning: 'প্রত্যাখ্যান করা' },
        { term: 'Reject', meaning: 'বাতিল করা' },
      ],
      isFavorite: false,
      revisionStatus: 'known',
      reviewCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_9',
      sourceNumber: 9,
      word: 'Access',
      partOfSpeech: 'noun',
      cefrLevel: 'B1',
      banglaMeaning: 'প্রবেশাধিকার, সুযোগ',
      exampleSentence: 'All library members have free access to digital journals.',
      banglaTranslation: 'সকল লাইব্রেরি সদস্যের ডিজিটাল জার্নালে বিনামূল্যে প্রবেশাধিকার রয়েছে।',
      synonyms: [
        { term: 'Entry', meaning: 'প্রবেশ' },
        { term: 'Admission', meaning: 'ভর্তি বা প্রবেশাধিকার' },
      ],
      antonyms: [
        { term: 'Denial', meaning: 'অস্বীকৃতি' },
        { term: 'Restriction', meaning: 'বাধা বা সীমাবদ্ধতা' },
      ],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
    {
      id: 'w_sample_10',
      sourceNumber: 10,
      word: 'Accomplish',
      partOfSpeech: 'verb',
      cefrLevel: 'B2',
      banglaMeaning: 'সম্পন্ন করা, অর্জন করা',
      exampleSentence: 'With steady effort, you can accomplish any goal.',
      banglaTranslation: 'ধারাবাহিক প্রচেষ্টার মাধ্যমে তুমি যেকোনো লক্ষ্য অর্জন করতে পারো।',
      synonyms: [
        { term: 'Achieve', meaning: 'অর্জন করা' },
        { term: 'Complete', meaning: 'সম্পূর্ণ করা' },
        { term: 'Fulfill', meaning: 'পূরণ করা' },
      ],
      antonyms: [
        { term: 'Fail', meaning: 'ব্যর্থ হওয়া' },
        { term: 'Neglect', meaning: 'অবহেলা করা' },
      ],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    },
  ],
  story:
    'Rafi dreamed of studying **abroad** at a renowned university, yet his early **academic** results made him want to **abandon** the dream altogether. One evening, his mentor reminded him that real **ability** grows when a person refuses to quit. Instead of treating success as an **abstract** wish, Rafi built a daily study routine with **absolute** focus. He used free **access** to the local library to **absorb** new English vocabulary every morning. Months later, when the university wrote to **accept** his application, Rafi realized how much discipline could **accomplish**.',
  banglaSummary:
    'রাফির স্বপ্ন ছিল বিদেশে একটি খ্যাতনামা বিশ্ববিদ্যালয়ে পড়াশোনা করার, কিন্তু শুরুর দিকের দুর্বল শিক্ষাগত ফলাফলের কারণে সে স্বপ্নটি ত্যাগ করার কথা ভাবছিল। তার পরামর্শদাতা তাকে বোঝান যে লেগে থাকলে দক্ষতা গড়ে ওঠে। এরপর রাফি পূর্ণ মনোযোগ দিয়ে প্রতিদিন লাইব্রেরির সুযোগ কাজে লাগিয়ে নতুন ইংরেজি শব্দ আত্মস্থ করতে থাকে। কয়েক মাস পর বিশ্ববিদ্যালয়ে তার আবেদন গৃহীত হলে সে বুঝতে পারে নিয়মিত অধ্যবসায় দিয়ে কী অর্জন করা সম্ভব।',
  storyWordReview: [
    {
      id: 'rev_s_1',
      word: 'Abandon',
      meaning: 'পরিত্যাগ করা',
      usage: 'Rafi almost gave up on his dream because of poor early grades.',
    },
    {
      id: 'rev_s_2',
      word: 'Ability',
      meaning: 'দক্ষতা',
      usage: 'His mentor explained that real skill develops through persistence.',
    },
    {
      id: 'rev_s_3',
      word: 'Abroad',
      meaning: 'বিদেশে',
      usage: 'Rafi wanted to travel to another country for higher education.',
    },
    {
      id: 'rev_s_4',
      word: 'Absolute',
      meaning: 'সম্পূর্ণ',
      usage: 'He committed to total, uninterrupted focus on his study plan.',
    },
    {
      id: 'rev_s_5',
      word: 'Absorb',
      meaning: 'আত্মস্থ করা',
      usage: 'He soaked up and mastered new vocabulary words each morning.',
    },
    {
      id: 'rev_s_6',
      word: 'Abstract',
      meaning: 'বিমূর্ত',
      usage: 'Success stopped being a vague idea and became concrete action.',
    },
    {
      id: 'rev_s_7',
      word: 'Academic',
      meaning: 'শিক্ষাগত',
      usage: 'Refers to his school and study grades at the beginning.',
    },
    {
      id: 'rev_s_8',
      word: 'Accept',
      meaning: 'গ্রহণ করা',
      usage: 'The university formally approved and admitted his application.',
    },
    {
      id: 'rev_s_9',
      word: 'Access',
      meaning: 'প্রবেশাধিকার',
      usage: 'He utilized free entry to the local library resources.',
    },
    {
      id: 'rev_s_10',
      word: 'Accomplish',
      meaning: 'অর্জন করা',
      usage: 'Shows what steady daily discipline helped him achieve.',
    },
  ],
};

export const PASTE_TEMPLATE_EXAMPLE = `## 11. Accurate (adj.) [B1]

**Meaning:** সঠিক, নির্ভুল

**Example:** Make sure your measurements are accurate before cutting the wood.

**বাংলা:** কাঠ কাটার আগে নিশ্চিত করুন আপনার মাপগুলো সঠিক আছে।

**Synonyms:** Exact (সঠিক), Precise (নির্ভুল), Correct (সঠিক)

**Antonyms:** Inaccurate (ভুল), Wrong (ভুল)

---

## 12. Achieve (v.) [B1]

**Meaning:** অর্জন করা, লাভ করা

**Example:** She worked hard to achieve her career goals.

**বাংলা:** তার পেশাগত লক্ষ্য অর্জনের জন্য সে কঠোর পরিশ্রম করেছে।

**Synonyms:** Accomplish (সম্পন্ন করা), Attain (লাভ করা), Reach (পৌঁছানো)

**Antonyms:** Fail (ব্যর্থ হওয়া), Lose (হারানো)

---

## 13. Acknowledge (v.) [B2]

**Meaning:** স্বীকার করা, প্রাপ্তি স্বীকার করা

**Example:** He refused to acknowledge his mistake in front of the team.

**বাংলা:** দলের সামনে সে তার ভুল স্বীকার করতে অস্বীকার করল।

**Synonyms:** Admit (স্বীকার করা), Recognize (চিনতে পারা)

**Antonyms:** Deny (অস্বীকার করা), Ignore (উপেক্ষা করা)

---

## 14. Acquire (v.) [B2]

**Meaning:** অর্জন করা, আয়ত্ত করা

**Example:** Children acquire language skills naturally by listening.

**বাংলা:** শিশুরা শোনার মাধ্যমেই স্বাভাবিকভাবে ভাষার দক্ষতা অর্জন করে।

**Synonyms:** Gain (লাভ করা), Obtain (পাওয়া)

**Antonyms:** Lose (হারানো), Forfeit (ত্যাগ করা)

---

## 15. Adapt (v.) [B2]

**Meaning:** খাপ খাওয়ানো, মানিয়ে নেওয়া

**Example:** It took a few weeks to adapt to the new city.

**বাংলা:** নতুন শহরের সাথে মানিয়ে নিতে কয়েক সপ্তাহ সময় লেগেছিল।

**Synonyms:** Adjust (সমন্বয় করা), Modify (পরিবর্তন করা)

**Antonyms:** Resist (প্রতিরোধ করা), Neglect (অবহেলা করা)

---

## 16. Adequate (adj.) [B2]

**Meaning:** পর্যাপ্ত, যথেষ্ট

**Example:** Ensure you get adequate sleep before the exam.

**বাংলা:** পরীক্ষার আগে পর্যাপ্ত ঘুম নিশ্চিত করুন।

**Synonyms:** Sufficient (যথেষ্ট), Enough (পর্যাপ্ত)

**Antonyms:** Inadequate (অপর্যাপ্ত), Insufficient (কম)

---

## 17. Adjust (v.) [B2]

**Meaning:** সমন্বয় করা, ঠিক করা

**Example:** You can adjust the brightness of the screen in settings.

**বাংলা:** আপনি সেটিংস থেকে স্ক্রিনের উজ্জ্বলতা ঠিক করতে পারেন।

**Synonyms:** Adapt (খাপ খাওয়ানো), Regulate (নিয়ন্ত্রণ করা)

**Antonyms:** Disturb (বিঘ্নিত করা), Disarrange (এলোমেলো করা)

---

## 18. Admire (v.) [B1]

**Meaning:** প্রশংসা করা, শ্রদ্ধা করা

**Example:** I deeply admire her patience and dedication.

**বাংলা:** আমি তার ধৈর্য এবং নিষ্ঠার গভীর প্রশংসা করি।

**Synonyms:** Respect (সম্মান করা), Praise (প্রশংসা করা)

**Antonyms:** Despise (ঘৃণা করা), Criticize (সমালোচনা করা)

---

## 19. Admit (v.) [B1]

**Meaning:** স্বীকার করা, প্রবেশের অনুমতি দেওয়া

**Example:** She was brave enough to admit that she needed help.

**বাংলা:** তার সাহায্যের প্রয়োজন ছিল তা স্বীকার করার মতো সাহস তার ছিল।

**Synonyms:** Confess (স্বীকার করা), Allow (অনুমতি দেওয়া)

**Antonyms:** Deny (অস্বীকার করা), Reject (প্রত্যাখ্যান করা)

---

## 20. Adopt (v.) [B2]

**Meaning:** গ্রহণ করা, দত্তক নেওয়া

**Example:** The school decided to adopt a new digital learning method.

**বাংলা:** স্কুলটি একটি নতুন ডিজিটাল শেখার পদ্ধতি গ্রহণ করার সিদ্ধান্ত নিয়েছে।

**Synonyms:** Embrace (গ্রহণ করা), Select (বেছে নেওয়া)

**Antonyms:** Reject (প্রত্যাখ্যান করা), Abandon (ত্যাগ করা)

---

## Story

When Nadia moved to a new town for work, she knew she had to **adapt** quickly. At first, she struggled to **adjust** her daily schedule, and she felt she did not have **adequate** time to rest. Instead of hiding her stress, she was honest enough to **admit** the problem and **acknowledge** that she needed a better plan. Her colleagues began to **admire** her openness. Determined to **achieve** balance, she decided to **adopt** an **accurate** time-blocking habit and gradually **acquire** stronger organizational skills.

## বাংলা সারাংশ

কাজের জন্য নতুন শহরে যাওয়ার পর নাদিয়া বুঝতে পারে তাকে দ্রুত মানিয়ে নিতে হবে। শুরুতে সময়ের অভাবে তার কষ্ট হচ্ছিল, কিন্তু সে নিজের সমস্যাটি স্বীকার করে একটি সঠিক রুটিন গ্রহণ করে। তার এই সৎ প্রচেষ্টার সবাই প্রশংসা করে এবং ধীরে ধীরে সে কাজের ভারসাম্য ও দক্ষতা অর্জন করে।

## Story Word Review

1. **Accurate** (সঠিক): Used to describe her precise time-blocking habit.
2. **Achieve** (অর্জন করা): Refers to reaching a healthy work-life balance.
3. **Acknowledge** (স্বীকার করা): Shows she recognized her need for a better routine.
4. **Acquire** (অর্জন করা): Describes gaining stronger organizational skills.
5. **Adapt** (মানিয়ে নেওয়া): Adjusting to life in a new town.
6. **Adequate** (পর্যাপ্ত): Refers to having enough time to rest.
7. **Adjust** (সমন্বয় করা): Modifying her daily schedule.
8. **Admire** (প্রশংসা করা): How her colleagues felt about her honesty.
9. **Admit** (স্বীকার করা): Being brave enough to state her struggle.
10. **Adopt** (গ্রহণ করা): Taking up a new daily habit.
`;
