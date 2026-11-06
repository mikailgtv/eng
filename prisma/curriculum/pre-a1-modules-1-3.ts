import type { SeedModule } from "./types";

/**
 * English Starter (Pre-A1) — Modules 1–3.
 * Real content for absolute beginners: short sentences, simple words,
 * Persian translations where they help.
 */

export const MODULES_1_3: SeedModule[] = [
  // -------------------------------------------------------------------------
  {
    title: "Getting Started",
    description: "Your very first steps in English.",
    lessons: [
      {
        title: "What is English?",
        description: "A short, friendly introduction to English and why it matters.",
        objectives: [
          "Understand what English is and where it is used",
          "Recognize a few simple English words",
          "Feel ready to start learning step by step",
        ],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Welcome to your English course!" },
          {
            type: "TEXT",
            text: "English is a language used by people all over the world — at work, in airports, in hospitals, and in fire stations. Even a little English helps you in your job and in daily life.",
          },
          {
            type: "TEXT",
            text: "You will start from zero. Do not worry about mistakes. Step by step, word by word, your English will grow.",
          },
          { type: "EXAMPLE", intro: "You already know these words from movies and the internet:", items: [{ text: "Hello!" }, { text: "Thank you." }, { text: "OK!" }, { text: "Stop!" }] },
          { type: "TIP", text: "Learn a little every day. Ten minutes every day is better than two hours once a week." },
          { type: "QUESTION", prompt: "How often should you study English?", answer: "A little every day — about ten minutes is a great start.", hint: "Think about every day vs. one long session." },
        ],
      },
      {
        title: "Hello and Goodbye",
        description: "Say hello and goodbye in simple English.",
        objectives: ["Say hello at different times of the day", "Say goodbye politely", "Greet a colleague in English"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "Saying hello" },
          { type: "TEXT", text: "We use different greetings at different times of the day." },
          { type: "EXAMPLE", intro: "Common greetings:", items: [{ text: "Hello!", note: "any time" }, { text: "Hi!", note: "with friends" }, { text: "Good morning.", note: "until 12:00" }, { text: "Good afternoon.", note: "12:00 – 18:00" }, { text: "Good evening.", note: "after 18:00" }, { text: "Good night.", note: "when you leave at night / go to sleep" }] },
          { type: "HEADING", text: "Saying goodbye" },
          { type: "TEXT", text: "With friends, people often say “Bye!” or “See you!”" },
          { type: "EXAMPLE", items: [{ text: "Goodbye, my friend!" }, { text: "Bye! See you tomorrow!" }, { text: "A: Good morning, Ali! — B: Good morning, Sara!" }] },
          { type: "WARNING", text: "“Good night” is only for goodbye at night — never for saying hello." },
          { type: "QUESTION", prompt: "It is 8 o'clock in the morning. You meet your teacher. What do you say?", answer: "Good morning!" },
        ],
        vocabulary: [
          { word: "hello", translation: "سلام", phonetic: "/həˈloʊ/", exampleSentence: "Hello! I am Ali." },
          { word: "hi", translation: "سلام (خودمانی)", phonetic: "/haɪ/", exampleSentence: "Hi, Sara!" },
          { word: "good morning", translation: "صبح بخیر", phonetic: "/ɡʊd ˈmɔːrnɪŋ/", exampleSentence: "Good morning, team!" },
          { word: "good afternoon", translation: "عصر بخیر", phonetic: "/ɡʊd ˌæftərˈnuːn/", exampleSentence: "Good afternoon, Mr. Karimi." },
          { word: "good night", translation: "شب بخیر (هنگام خداحافظی)", phonetic: "/ɡʊd naɪt/", exampleSentence: "Good night. See you tomorrow." },
          { word: "goodbye", translation: "خداحافظ", phonetic: "/ɡʊdˈbaɪ/", exampleSentence: "Goodbye, my friend!" },
        ],
      },
      {
        title: "My Name Is...",
        description: "Introduce yourself with your name.",
        objectives: ["Say “My name is …”", "Ask another person's name", "Use I and you"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "My name is …" },
          { type: "TEXT", text: "When you meet someone, say your name like this:" },
          { type: "EXAMPLE", items: [{ text: "My name is Ali." }, { text: "My name is Sara." }, { text: "Hello! My name is Reza." }] },
          { type: "HEADING", text: "Asking the other person" },
          { type: "EXAMPLE", items: [{ text: "What is your name?" }, { text: "A: Hello! What is your name? — B: My name is Ali. And you?" }, { text: "A: My name is Sara. Nice to meet you!" }] },
          { type: "TIP", text: "“Nice to meet you” is a friendly phrase for the first time you meet someone." },
          { type: "QUESTION", prompt: "Complete the sentence: “My ____ is Ali.”", answer: "name", hint: "The word for the word people call you." },
        ],
        grammar: {
          title: "I am / You are",
          explanation: "Use “I am …” for yourself. Use “You are …” for the person you talk to.",
          patterns: ["I am Ali.", "You are Sara."],
          examples: ["I am a firefighter.", "You are my teacher."],
        },
        vocabulary: [
          { word: "name", translation: "نام، اسم", phonetic: "/neɪm/", exampleSentence: "My name is Ali." },
          { word: "my", translation: "مالِ من", phonetic: "/maɪ/", exampleSentence: "This is my book." },
          { word: "your", translation: "مالِ تو", phonetic: "/jʊr/", exampleSentence: "What is your name?" },
          { word: "I", translation: "من", phonetic: "/aɪ/", exampleSentence: "I am a firefighter." },
          { word: "you", translation: "تو، شما", phonetic: "/juː/", exampleSentence: "You are my friend." },
        ],
      },
      {
        title: "Basic Classroom English",
        description: "Understand the simple words your teacher uses.",
        objectives: ["Understand common classroom instructions", "Respond to “Listen and repeat”", "Use polite words in lessons"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "In your lessons" },
          { type: "TEXT", text: "Your teacher uses simple words every lesson. Learn these first:" },
          { type: "EXAMPLE", items: [{ text: "Listen and repeat.", note: "گوش کنید و تکرار کنید" }, { text: "Read the sentence.", note: "جمله را بخوانید" }, { text: "Write your name.", note: "اسم خود را بنویسید" }, { text: "Open your book, please.", note: "کتاب خود را باز کنید" }, { text: "Close your book, please.", note: "کتاب خود را ببندید" }] },
          { type: "TIP", text: "“Please” makes a request polite. Use “please” and “thank you” often." },
          { type: "QUESTION", prompt: "Your teacher says: “Open your book.” What do you do?", answer: "I open my book." },
        ],
        vocabulary: [
          { word: "listen", translation: "گوش دادن", phonetic: "/ˈlɪsn/", exampleSentence: "Listen to the teacher." },
          { word: "repeat", translation: "تکرار کردن", phonetic: "/rɪˈpiːt/", exampleSentence: "Repeat after me." },
          { word: "read", translation: "خواندن", phonetic: "/riːd/", exampleSentence: "Read the sentence." },
          { word: "write", translation: "نوشتن", phonetic: "/raɪt/", exampleSentence: "Write your name." },
          { word: "open", translation: "باز کردن", phonetic: "/ˈoʊpən/", exampleSentence: "Open your book, please." },
          { word: "close", translation: "بستن", phonetic: "/kloʊz/", exampleSentence: "Close your book, please." },
        ],
      },
    ],
  },
  // -------------------------------------------------------------------------
  {
    title: "Alphabet & Sounds",
    description: "The building blocks of English: letters and sounds.",
    lessons: [
      {
        title: "The English Alphabet",
        description: "Meet the 26 letters of English.",
        objectives: ["Know that English has 26 letters", "See the alphabet in order", "Recognize big and small letters"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "26 letters" },
          { type: "TEXT", text: "The English alphabet has 26 letters. Every letter has a big form and a small form: A a, B b, C c …" },
          { type: "EXAMPLE", intro: "The alphabet in order:", items: [{ text: "A B C D E F G" }, { text: "H I J K L M N" }, { text: "O P Q R S T U" }, { text: "V W X Y Z" }] },
          { type: "TEXT", text: "Big letters (A, B, C) start names and sentences. Small letters (a, b, c) are used in most words." },
          { type: "TIP", text: "Try to sing the alphabet song — it helps you remember the order." },
          { type: "QUESTION", prompt: "How many letters are in the English alphabet?", answer: "26 letters." },
        ],
        vocabulary: [
          { word: "alphabet", translation: "الفبا", phonetic: "/ˈælfəbet/", exampleSentence: "The English alphabet has 26 letters." },
          { word: "letter", translation: "حرف", phonetic: "/ˈletər/", exampleSentence: "A is the first letter." },
        ],
      },
      {
        title: "Letter Names",
        description: "Say the name of every letter.",
        objectives: ["Say the names of the letters", "Know the five vowels"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "Letter names" },
          { type: "TEXT", text: "Every letter has a name. These names are important for spelling." },
          { type: "EXAMPLE", intro: "Listen and repeat:", items: [{ text: "A = “ay”, B = “bee”, C = “see”, D = “dee”, E = “ee”" }, { text: "F = “ef”, G = “jee”, H = “aych”, I = “eye”, J = “jay”" }, { text: "K = “kay”, L = “el”, M = “em”, N = “en”, O = “oh”" }, { text: "P = “pee”, Q = “kyoo”, R = “ar”, S = “es”, T = “tee”" }, { text: "U = “yoo”, V = “vee”, W = “double-u”, X = “ex”" }, { text: "Y = “why”, Z = “zee”" }] },
          { type: "EXAMPLE", intro: "The five special letters — the vowels:", items: [{ text: "A — E — I — O — U" }] },
          { type: "TIP", text: "When you spell a word, you say the letter names: B-O-O-K." },
          { type: "QUESTION", prompt: "Which letter comes after F?", answer: "G (“jee”)." },
        ],
        vocabulary: [
          { word: "vowel", translation: "حرف صدادار", phonetic: "/ˈvaʊəl/", exampleSentence: "A, E, I, O, U are vowels." },
          { word: "consonant", translation: "حرف بی‌صدا", phonetic: "/ˈkɑːnsənənt/", exampleSentence: "B, C and D are consonants." },
        ],
      },
      {
        title: "Basic English Sounds",
        description: "The most common sound of each vowel.",
        objectives: ["Hear short vowel sounds in simple words", "Connect sounds to letters"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Five sounds to start" },
          { type: "TEXT", text: "One letter can have different sounds. Start with the most common sound of each vowel:" },
          { type: "EXAMPLE", intro: "Listen and repeat:", items: [{ text: "a — /æ/ — cat, hat", note: "like “آ”" }, { text: "e — /e/ — bed, pen", note: "like “ِ”" }, { text: "i — /ɪ/ — sit, big", note: "like “ِ” (short)" }, { text: "o — /ɑː/ — hot, dog", note: "like “ا”" }, { text: "u — /ʌ/ — bus, cup", note: "like “َ”" }] },
          { type: "TIP", text: "Say each sound out loud three times. Your mouth learns like a muscle!" },
          { type: "QUESTION", prompt: "Which sound do you hear in “cat” — /æ/ or /iː/?", answer: "/æ/ — cat." },
        ],
      },
      {
        title: "Spelling Simple Words",
        description: "Spell your first English words with letter names.",
        objectives: ["Spell short words with letter names", "Understand “How do you spell …?”"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Spell it!" },
          { type: "TEXT", text: "To spell a word, say the name of each letter, one by one." },
          { type: "EXAMPLE", items: [{ text: "cat = C-A-T", note: "see-ay-tee" }, { text: "dog = D-O-G", note: "dee-oh-jee" }, { text: "pen = P-E-N", note: "pee-ee-en" }, { text: "book = B-O-O-K", note: "bee-oh-oh-kay" }] },
          { type: "EXAMPLE", intro: "The question you will hear often:", items: [{ text: "How do you spell “name”? — N-A-M-E." }] },
          { type: "QUESTION", prompt: "How do you spell “book”?", answer: "B-O-O-K.", hint: "Four letters. Double O in the middle." },
        ],
        vocabulary: [
          { word: "spell", translation: "هجی کردن", phonetic: "/spel/", exampleSentence: "How do you spell “book”?" },
          { word: "word", translation: "کلمه", phonetic: "/wɜːrd/", exampleSentence: "“Cat” is a short word." },
        ],
      },
    ],
  },
  // -------------------------------------------------------------------------
  {
    title: "Basic Words",
    description: "Your first useful English words.",
    lessons: [
      {
        title: "People",
        description: "Words for the people around you.",
        objectives: ["Name people in simple English", "Use “He is …” and “She is …”"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "People around you" },
          { type: "EXAMPLE", items: [{ text: "He is a man.", note: "او یک مرد است." }, { text: "She is a woman.", note: "او یک زن است." }, { text: "The boy and the girl are students.", note: "پسر و دختر دانش‌آموز هستند." }, { text: "I am a firefighter. You are my friend.", note: "من آتش‌نشان هستم. تو دوست من هستی." }] },
          { type: "TIP", text: "In English, “he” is for a man and “she” is for a woman." },
          { type: "QUESTION", prompt: "My mother is a ____. (man / woman)", answer: "woman" },
        ],
        vocabulary: [
          { word: "man", translation: "مرد", phonetic: "/mæn/", exampleSentence: "He is a man." },
          { word: "woman", translation: "زن", phonetic: "/ˈwʊmən/", exampleSentence: "She is a woman." },
          { word: "boy", translation: "پسر (کودک)", phonetic: "/bɔɪ/", exampleSentence: "The boy is my son." },
          { word: "girl", translation: "دختر (کودک)", phonetic: "/ɡɜːrl/", exampleSentence: "The girl is my daughter." },
          { word: "friend", translation: "دوست", phonetic: "/frend/", exampleSentence: "You are my friend." },
          { word: "teacher", translation: "معلم", phonetic: "/ˈtiːtʃər/", exampleSentence: "She is my English teacher." },
          { word: "student", translation: "دانش‌آموز، زبان‌آموز", phonetic: "/ˈstuːdənt/", exampleSentence: "I am a student." },
          { word: "firefighter", translation: "آتش‌نشان", phonetic: "/ˈfaɪərfaɪtər/", exampleSentence: "He is a firefighter." },
        ],
      },
      {
        title: "Family",
        description: "Talk about your family simply.",
        objectives: ["Name family members", "Say “This is my …”"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "My family" },
          { type: "TEXT", text: "Family is important. Here are the basic words:" },
          { type: "EXAMPLE", items: [{ text: "This is my father.", note: "این پدر من است." }, { text: "This is my mother.", note: "این مادر من است." }, { text: "I have one brother and two sisters.", note: "یک برادر و دو خواهر دارم." }, { text: "My family is big.", note: "خانواده من بزرگ است." }] },
          { type: "QUESTION", prompt: "My father and my mother are my ____. (parents / friends)", answer: "parents" },
        ],
        vocabulary: [
          { word: "family", translation: "خانواده", phonetic: "/ˈfæməli/", exampleSentence: "I love my family." },
          { word: "mother", translation: "مادر", phonetic: "/ˈmʌðər/", exampleSentence: "My mother is a teacher." },
          { word: "father", translation: "پدر", phonetic: "/ˈfɑːðər/", exampleSentence: "My father is a firefighter." },
          { word: "brother", translation: "برادر", phonetic: "/ˈbrʌðər/", exampleSentence: "He is my brother." },
          { word: "sister", translation: "خواهر", phonetic: "/ˈsɪstər/", exampleSentence: "She is my sister." },
          { word: "son", translation: "پسر (فرزند)", phonetic: "/sʌn/", exampleSentence: "My son is six years old." },
          { word: "daughter", translation: "دختر (فرزند)", phonetic: "/ˈdɔːtər/", exampleSentence: "My daughter is a student." },
          { word: "parents", translation: "پدر و مادر", phonetic: "/ˈperənts/", exampleSentence: "My parents live in Shiraz." },
        ],
      },
      {
        title: "Common Objects",
        description: "Everyday things you see and use.",
        objectives: ["Name common objects", "Use “This is a …”"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Things around you" },
          { type: "EXAMPLE", items: [{ text: "This is my book.", note: "این کتاب من است." }, { text: "That is your pen.", note: "آن خودکار تو است." }, { text: "The door is open.", note: "در باز است." }, { text: "My phone is on the table.", note: "تلفن من روی میز است." }] },
          { type: "TIP", text: "Look around the room. Say the English word for every object you know!" },
          { type: "QUESTION", prompt: "You write with a ____. (pen / door)", answer: "pen" },
        ],
        vocabulary: [
          { word: "book", translation: "کتاب", phonetic: "/bʊk/", exampleSentence: "This is my book." },
          { word: "pen", translation: "خودکار، قلم", phonetic: "/pen/", exampleSentence: "The pen is on the table." },
          { word: "door", translation: "در", phonetic: "/dɔːr/", exampleSentence: "Open the door, please." },
          { word: "window", translation: "پنجره", phonetic: "/ˈwɪndoʊ/", exampleSentence: "Close the window." },
          { word: "table", translation: "میز", phonetic: "/ˈteɪbəl/", exampleSentence: "The book is on the table." },
          { word: "chair", translation: "صندلی", phonetic: "/tʃer/", exampleSentence: "Sit on the chair." },
          { word: "phone", translation: "تلفن، موبایل", phonetic: "/foʊn/", exampleSentence: "My phone is new." },
          { word: "bag", translation: "کیف", phonetic: "/bæɡ/", exampleSentence: "This is my bag." },
        ],
      },
      {
        title: "Colors",
        description: "Say the colors of things.",
        objectives: ["Name basic colors", "Describe objects with colors"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Colors" },
          { type: "EXAMPLE", items: [{ text: "The fire truck is red.", note: "ماشین آتش‌نشانی قرمز است." }, { text: "The sky is blue.", note: "آسمان آبی است." }, { text: "The tree is green.", note: "درخت سبز است." }, { text: "The night is black.", note: "شب سیاه است." }, { text: "The snow is white.", note: "برف سفید است." }] },
          { type: "TIP", text: "In English, the color comes before the thing: a red truck, a blue sky." },
          { type: "QUESTION", prompt: "What color is a banana? It is ____. (yellow / blue)", answer: "yellow" },
        ],
        vocabulary: [
          { word: "color", translation: "رنگ", phonetic: "/ˈkʌlər/", exampleSentence: "What color is it?" },
          { word: "red", translation: "قرمز", phonetic: "/red/", exampleSentence: "The fire truck is red." },
          { word: "blue", translation: "آبی", phonetic: "/bluː/", exampleSentence: "The sky is blue." },
          { word: "green", translation: "سبز", phonetic: "/ɡriːn/", exampleSentence: "The tree is green." },
          { word: "yellow", translation: "زرد", phonetic: "/ˈjeloʊ/", exampleSentence: "The sun is yellow." },
          { word: "black", translation: "سیاه", phonetic: "/blæk/", exampleSentence: "My helmet is yellow, not black." },
          { word: "white", translation: "سفید", phonetic: "/waɪt/", exampleSentence: "The snow is white." },
          { word: "orange", translation: "نارنجی", phonetic: "/ˈɔːrɪndʒ/", exampleSentence: "The safety vest is orange." },
        ],
      },
    ],
  },
];
