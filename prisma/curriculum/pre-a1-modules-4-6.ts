import type { SeedModule } from "./types";

/**
 * English Starter (Pre-A1) — Modules 4–6.
 */

export const MODULES_4_6: SeedModule[] = [
  // -------------------------------------------------------------------------
  {
    title: "Basic Sentences",
    description: "Your first real English sentences.",
    lessons: [
      {
        title: "I, You, He, She",
        description: "The most important words in every sentence.",
        objectives: ["Use the basic pronouns", "Point to people with he and she"],
        durationMin: 10,
        grammar: {
          title: "Basic pronouns",
          patterns: ["I — من", "you — تو / شما", "he — او (مرد)", "she — او (زن)", "it — آن (چیز)", "we — ما", "they — آنها"],
          examples: ["I am Ali.", "You are Sara.", "He is Reza.", "She is Maryam.", "We are a team.", "They are students."],
        },
blocks: [
          { type: "HEADING", text: "Pronouns" },
          { type: "TEXT", text: "Pronouns replace names. Start with these:" },
                    { type: "EXAMPLE", items: [{ text: "I am a firefighter.", note: "من آتش‌نشان هستم." }, { text: "She is my sister.", note: "او خواهر من است." }, { text: "This is my truck. It is red.", note: "این ماشین من است. آن قرمز است." }] },
          { type: "QUESTION", prompt: "My sister is here. ____ is a doctor. (He / She)", answer: "She" },
        ],
      },
      {
        title: "The verb “to be”",
        description: "am, is, are — the most used verb in English.",
        objectives: ["Use am, is, are correctly", "Make simple positive sentences"],
        durationMin: 15,
        grammar: {
          title: "Verb to be",
          patterns: ["I am", "You are", "He is", "She is", "It is", "We are", "They are"],
          examples: ["I am Ali.", "She is Sara.", "We are firefighters.", "It is a big fire station."],
        },
blocks: [
          { type: "HEADING", text: "am — is — are" },
          { type: "TEXT", text: "“To be” means “بودن”. It changes with the person:" },
                    { type: "EXAMPLE", items: [{ text: "I am ready.", note: "من آماده‌ام." }, { text: "The station is big.", note: "آتش‌نشانی بزرگ است." }, { text: "You are late!", note: "تو دیر کردی!" }] },
          { type: "WARNING", text: "Do not say “I is” or “She are”. Remember: I am — He/She/It is — You/We/They are." },
          { type: "QUESTION", prompt: "Complete: “She ____ a teacher.”", answer: "is", hint: "am, is, or are?" },
        ],
      },
      {
        title: "This and That",
        description: "Point to things: this is near, that is far.",
        objectives: ["Use this and that", "Talk about objects near and far"],
        durationMin: 10,
        grammar: {
          title: "This / That",
          patterns: ["This is my book. (near)", "That is your bag. (far)"],
          examples: ["This is my helmet.", "That is the fire truck.", "Is this your pen?", "That is our station."],
        },
blocks: [
          { type: "HEADING", text: "Near and far" },
          { type: "TEXT", text: "Use this for something near you. Use that for something far from you." },
                    { type: "EXAMPLE", items: [{ text: "This is my book. (I hold it.)", note: "این کتاب من است." }, { text: "That is your car. (far away)", note: "آن ماشین تو است." }] },
          { type: "QUESTION", prompt: "The door is far from you. You say: “____ is the exit.” (This / That)", answer: "That" },
        ],
        vocabulary: [
          { word: "this", translation: "این", phonetic: "/ðɪs/", exampleSentence: "This is my book." },
          { word: "that", translation: "آن", phonetic: "/ðæt/", exampleSentence: "That is your bag." },
        ],
      },
      {
        title: "Simple Questions",
        description: "Ask your first questions in English.",
        objectives: ["Use question words what, where, who", "Ask simple questions with am/is/are"],
        durationMin: 12,
        grammar: {
          title: "Questions with “to be”",
          explanation: "Put am/is/are before the person to make a question.",
          patterns: ["What is your name?", "Where are you from?", "Who is he?"],
          examples: ["What is your name? — My name is Ali.", "Where are you from? — I am from Tabriz.", "Who is she? — She is Sara."],
        },
blocks: [
          { type: "HEADING", text: "Question words" },
          { type: "EXAMPLE", intro: "The three most useful question words:", items: [{ text: "What? — چه چیزی", note: "What is your name?" }, { text: "Where? — کجا", note: "Where is the station?" }, { text: "Who? — چه کسی", note: "Who is your teacher?" }] },
                    { type: "QUESTION", prompt: "Complete: “____ is your name?” — “My name is Ali.”", answer: "What" },
        ],
        vocabulary: [
          { word: "what", translation: "چه", phonetic: "/wɑːt/", exampleSentence: "What is this?" },
          { word: "where", translation: "کجا", phonetic: "/wer/", exampleSentence: "Where is the fire station?" },
          { word: "who", translation: "چه کسی", phonetic: "/huː/", exampleSentence: "Who is your teacher?" },
        ],
      },
    ],
  },
  // -------------------------------------------------------------------------
  {
    title: "Numbers & Time",
    description: "Count, and talk about days and time.",
    lessons: [
      {
        title: "Numbers 1–20",
        description: "Count from one to twenty.",
        objectives: ["Count from 1 to 20", "Use numbers in simple sentences"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "One to twenty" },
          { type: "EXAMPLE", items: [{ text: "1 one · 2 two · 3 three · 4 four" }, { text: "5 five · 6 six · 7 seven · 8 eight" }, { text: "9 nine · 10 ten · 11 eleven · 12 twelve" }, { text: "13 thirteen · 14 fourteen · 15 fifteen" }, { text: "16 sixteen · 17 seventeen · 18 eighteen" }, { text: "19 nineteen · 20 twenty" }] },
          { type: "EXAMPLE", intro: "Numbers in action:", items: [{ text: "I have two brothers.", note: "دو برادر دارم." }, { text: "My shift starts at six.", note: "شیفت من ساعت شش شروع می‌شود." }] },
          { type: "TIP", text: "Count out loud every day — stairs, coffee cups, anything!" },
          { type: "QUESTION", prompt: "What is 3 + 4?", answer: "7 — seven." },
        ],
        vocabulary: [
          { word: "number", translation: "عدد، شماره", phonetic: "/ˈnʌmbər/", exampleSentence: "Say the number in English." },
          { word: "one", translation: "یک", phonetic: "/wʌn/", exampleSentence: "I have one question." },
          { word: "two", translation: "دو", phonetic: "/tuː/", exampleSentence: "Two coffees, please." },
          { word: "three", translation: "سه", phonetic: "/θriː/", exampleSentence: "We have three trucks." },
        ],
      },
      {
        title: "Numbers 20–100",
        description: "The tens, and how to build every number between.",
        objectives: ["Say the tens: twenty to one hundred", "Build numbers like twenty-five"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "The tens" },
          { type: "EXAMPLE", items: [{ text: "20 twenty · 30 thirty · 40 forty" }, { text: "50 fifty · 60 sixty · 70 seventy" }, { text: "80 eighty · 90 ninety · 100 one hundred" }] },
          { type: "HEADING", text: "Between the tens" },
          { type: "TEXT", text: "Put a dash between the ten and the single number:" },
          { type: "EXAMPLE", items: [{ text: "21 = twenty-one", note: "بیست و یک" }, { text: "35 = thirty-five", note: "سی و پنج" }, { text: "48 = forty-eight", note: "چهل و هشت" }, { text: "99 = ninety-nine", note: "نود و نه" }] },
          { type: "WARNING", text: "Careful with spelling: forty (no “u”), fifty (not “fivety”)." },
          { type: "QUESTION", prompt: "How do you say 45 in English?", answer: "Forty-five." },
        ],
      },
      {
        title: "Days of the Week",
        description: "The seven days, in order.",
        objectives: ["Say the days of the week", "Use today and tomorrow"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Seven days" },
          { type: "EXAMPLE", items: [{ text: "Monday — دوشنبه", note: "" }, { text: "Tuesday — سه‌شنبه", note: "" }, { text: "Wednesday — چهارشنبه", note: "" }, { text: "Thursday — پنج‌شنبه", note: "" }, { text: "Friday — جمعه", note: "" }, { text: "Saturday — شنبه", note: "" }, { text: "Sunday — یکشنبه", note: "" }] },
          { type: "EXAMPLE", intro: "Talking about days:", items: [{ text: "Today is Monday.", note: "امروز دوشنبه است." }, { text: "Tomorrow is Tuesday.", note: "فردا سه‌شنبه است." }, { text: "My day off is Friday.", note: "روز تعطیلی من جمعه است." }] },
          { type: "TIP", text: "Days always start with a big letter: Monday, NOT monday." },
          { type: "QUESTION", prompt: "The day after Monday is ____.", answer: "Tuesday" },
        ],
        vocabulary: [
          { word: "day", translation: "روز", phonetic: "/deɪ/", exampleSentence: "Today is a good day." },
          { word: "today", translation: "امروز", phonetic: "/təˈdeɪ/", exampleSentence: "Today is Monday." },
          { word: "tomorrow", translation: "فردا", phonetic: "/təˈmɑːroʊ/", exampleSentence: "See you tomorrow." },
          { word: "week", translation: "هفته", phonetic: "/wiːk/", exampleSentence: "There are seven days in a week." },
        ],
      },
      {
        title: "Months",
        description: "The twelve months of the year.",
        objectives: ["Name the twelve months", "Use “in” with months"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Twelve months" },
          { type: "EXAMPLE", items: [{ text: "January — ژانویه (دی/بهمن)" }, { text: "February — فوریه" }, { text: "March — مارس" }, { text: "April — آوریل" }, { text: "May — مه" }, { text: "June — ژوئن" }, { text: "July — ژوئیه" }, { text: "August — اوت" }, { text: "September — سپتامبر" }, { text: "October — اکتبر" }, { text: "November — نوامبر" }, { text: "December — دسامبر" }] },
          { type: "EXAMPLE", intro: "Talking about months:", items: [{ text: "My birthday is in May.", note: "تولد من در ماه مه است." }, { text: "The course starts in September.", note: "دوره در سپتامبر شروع می‌شود." }] },
          { type: "TIP", text: "Use “in” with months: in January, in June. Months always take a big letter." },
          { type: "QUESTION", prompt: "The first month of the year is ____.", answer: "January" },
        ],
        vocabulary: [
          { word: "month", translation: "ماه", phonetic: "/mʌnθ/", exampleSentence: "A year has twelve months." },
          { word: "year", translation: "سال", phonetic: "/jɪr/", exampleSentence: "See you next year!" },
        ],
      },
      {
        title: "What Time Is It?",
        description: "Tell the time with o'clock.",
        objectives: ["Tell the time on the hour", "Use morning, afternoon, evening, night"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "Telling time" },
          { type: "TEXT", text: "For exact hours, English uses “o'clock”:" },
          { type: "EXAMPLE", items: [{ text: "It is three o'clock. — ساعت سه است.", note: "3:00" }, { text: "It is seven o'clock. — ساعت هفت است.", note: "7:00" }, { text: "It is twelve o'clock. — ساعت دوازده است.", note: "12:00" }] },
          { type: "HEADING", text: "Parts of the day" },
          { type: "EXAMPLE", items: [{ text: "in the morning — صبح", note: "I wake up at six in the morning." }, { text: "in the afternoon — بعدازظهر", note: "I eat lunch in the afternoon." }, { text: "in the evening — عصر", note: "We have dinner in the evening." }, { text: "at night — شب", note: "I sleep at night." }] },
          { type: "QUESTION", prompt: "6:00 in the morning. Say it in English.", answer: "It is six o'clock (in the morning)." },
        ],
        vocabulary: [
          { word: "time", translation: "زمان، ساعت", phonetic: "/taɪm/", exampleSentence: "What time is it?" },
          { word: "morning", translation: "صبح", phonetic: "/ˈmɔːrnɪŋ/", exampleSentence: "I start work in the morning." },
          { word: "afternoon", translation: "بعدازظهر", phonetic: "/ˌæftərˈnuːn/", exampleSentence: "Lunch is in the afternoon." },
          { word: "night", translation: "شب", phonetic: "/naɪt/", exampleSentence: "I sleep at night." },
          { word: "o'clock", translation: "ساعت (دقیق)", phonetic: "/əˈklɑːk/", exampleSentence: "It is five o'clock." },
        ],
      },
    ],
  },
  // -------------------------------------------------------------------------
  {
    title: "Everyday English",
    description: "English you can use today — at home and at the fire station.",
    lessons: [
      {
        title: "Food and Drinks",
        description: "Simple words for food and drinks.",
        objectives: ["Name basic foods and drinks", "Say “I eat …” and “I drink …”"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "At the table" },
          { type: "EXAMPLE", items: [{ text: "I eat bread and cheese for breakfast.", note: "من نان و پنیر صبحانه می‌خورم." }, { text: "I drink tea in the morning.", note: "صبح‌ها چای می‌نوشم." }, { text: "Water, please.", note: "آب، لطفاً." }] },
          { type: "TIP", text: "“…, please” makes any order polite: “Tea, please.” “Water, please.”" },
          { type: "QUESTION", prompt: "Complete: “We ____ tea in the morning.” (eat / drink)", answer: "drink" },
        ],
        vocabulary: [
          { word: "bread", translation: "نان", phonetic: "/bred/", exampleSentence: "I eat bread for breakfast." },
          { word: "water", translation: "آب", phonetic: "/ˈwɔːtər/", exampleSentence: "I drink a lot of water." },
          { word: "tea", translation: "چای", phonetic: "/tiː/", exampleSentence: "Tea, please." },
          { word: "rice", translation: "برنج", phonetic: "/raɪs/", exampleSentence: "We eat rice for lunch." },
          { word: "apple", translation: "سیب", phonetic: "/ˈæpəl/", exampleSentence: "An apple a day." },
          { word: "milk", translation: "شیر", phonetic: "/mɪlk/", exampleSentence: "Children drink milk." },
          { word: "meat", translation: "گوشت", phonetic: "/miːt/", exampleSentence: "I buy meat at the shop." },
          { word: "breakfast", translation: "صبحانه", phonetic: "/ˈbrekfəst/", exampleSentence: "Breakfast is at seven." },
        ],
      },
      {
        title: "Workplace Words",
        description: "English words from your fire station.",
        objectives: ["Name important workplace words", "Talk about your job simply"],
        durationMin: 12,
        blocks: [
          { type: "HEADING", text: "At the fire station" },
          { type: "TEXT", text: "These words are for YOUR job. Say them out loud:" },
          { type: "EXAMPLE", items: [{ text: "I am a firefighter.", note: "من آتش‌نشان هستم." }, { text: "This is my fire station.", note: "این آتش‌نشانی ماست." }, { text: "The fire truck is red.", note: "ماشین آتش‌نشانی قرمز است." }, { text: "My helmet is yellow.", note: "کلاه ایمنی من زرد است." }, { text: "We work as a team.", note: "ما به‌عنوان یک تیم کار می‌کنیم." }] },
          { type: "TIP", text: "Practice with a colleague: one says the English word, the other points at the object!" },
          { type: "QUESTION", prompt: "I wear a ____ on my head. (helmet / window)", answer: "helmet" },
        ],
        vocabulary: [
          { word: "fire station", translation: "آتش‌نشانی", phonetic: "/ˈfaɪər ˌsteɪʃn/", exampleSentence: "This is our fire station." },
          { word: "fire truck", translation: "ماشین آتش‌نشانی", phonetic: "/ˈfaɪər trʌk/", exampleSentence: "The fire truck is fast." },
          { word: "fire", translation: "آتش", phonetic: "/ˈfaɪər/", exampleSentence: "The fire is big." },
          { word: "helmet", translation: "کلاه ایمنی", phonetic: "/ˈhelɪt/", exampleSentence: "Where is my helmet?" },
          { word: "team", translation: "تیم", phonetic: "/tiːm/", exampleSentence: "We are a strong team." },
          { word: "shift", translation: "شیفت، نوبت کاری", phonetic: "/ʃɪft/", exampleSentence: "My shift starts at eight." },
          { word: "work", translation: "کار", phonetic: "/wɜːrk/", exampleSentence: "I work at the station." },
          { word: "hose", translation: "شلنگ آب", phonetic: "/hoʊz/", exampleSentence: "Bring the hose, please." },
        ],
      },
      {
        title: "Simple Requests",
        description: "Ask for things politely.",
        objectives: ["Make polite requests with please", "Say thank you", "Ask for help"],
        durationMin: 10,
        blocks: [
          { type: "HEADING", text: "Polite requests" },
          { type: "EXAMPLE", items: [{ text: "Open the door, please.", note: "لطفاً در را باز کنید." }, { text: "Help me, please.", note: "لطفاً به من کمک کنید." }, { text: "Can you help me, please?", note: "می‌توانید کمکم کنید؟" }, { text: "Thank you very much!", note: "خیلی متشکرم!" }] },
          { type: "EXAMPLE", intro: "Two magic phrases:", items: [{ text: "Please. — لطفاً", note: "makes requests polite" }, { text: "Thank you. — متشکرم", note: "after someone helps you" }] },
          { type: "TIP", text: "A smile + “please” + “thank you” = perfect English manners." },
          { type: "QUESTION", prompt: "You want your colleague to open the window. Say it politely.", answer: "Open the window, please." },
        ],
        vocabulary: [
          { word: "please", translation: "لطفاً", phonetic: "/pliːz/", exampleSentence: "Water, please." },
          { word: "thank you", translation: "متشکرم", phonetic: "/ˈθæŋk juː/", exampleSentence: "Thank you for your help." },
          { word: "help", translation: "کمک", phonetic: "/help/", exampleSentence: "Can you help me?" },
          { word: "excuse me", translation: "ببخشید", phonetic: "/ɪkˈskjuːz miː/", exampleSentence: "Excuse me, where is the exit?" },
        ],
      },
      {
        title: "My Daily Routine",
        description: "Describe your day from morning to night.",
        objectives: ["Use simple daily-routine verbs", "Say what you do at what time"],
        durationMin: 12,
        grammar: {
          title: "Talking about your day",
          explanation: "Use I + verb + time. Put the time at the end.",
          patterns: ["I wake up at six o'clock.", "I work in the morning.", "I go home in the evening."],
          examples: ["I eat lunch at noon.", "I go to the gym on Monday.", "I call my family at night."],
        },
blocks: [
          { type: "HEADING", text: "My day" },
          { type: "EXAMPLE", items: [{ text: "I wake up at six o'clock.", note: "ساعت شش بیدار می‌شوم." }, { text: "I eat breakfast at seven.", note: "ساعت هفت صبحانه می‌خورم." }, { text: "I go to the fire station at eight.", note: "ساعت هشت به آتش‌نشانی می‌روم." }, { text: "I sleep at ten at night.", note: "شب ساعت ده می‌خوابم." }] },
                    { type: "QUESTION", prompt: "Complete: “I ____ up at six o'clock.” (wake / sleep)", answer: "wake" },
        ],
        vocabulary: [
          { word: "wake up", translation: "بیدار شدن", phonetic: "/weɪk ʌp/", exampleSentence: "I wake up at six." },
          { word: "eat", translation: "خوردن", phonetic: "/iːt/", exampleSentence: "I eat breakfast at seven." },
          { word: "go", translation: "رفتن", phonetic: "/ɡoʊ/", exampleSentence: "I go to work by car." },
          { word: "sleep", translation: "خوابیدن", phonetic: "/sliːp/", exampleSentence: "I sleep eight hours." },
          { word: "home", translation: "خانه", phonetic: "/hoʊm/", exampleSentence: "I go home in the evening." },
        ],
      },
    ],
  },
];
