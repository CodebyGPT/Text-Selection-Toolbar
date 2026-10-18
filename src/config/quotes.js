/**
 * @file quotes.js
 * @description 名人名言/格言警句数据源模块。提供多语言的名言文案，并在设置或 Popup 页面随机展示以提升用户交互体验。
 */

const quotes = [{
  en: "The unexamined life is not worth living.",
  ru: "Неосмысленная жизнь не стоит того, чтобы её прожить.",
  zh: "未经审视的人生不值得过。"
}, {
  en: "I think, therefore I am.",
  ru: "Мыслю, следовательно, существую.",
  zh: "我思故我在。"
}, {
  en: "He who has a why to live for can bear almost any how.",
  ru: "Тот, у кого есть «зачем» жить, вынесет почти любое «как».",
  zh: "知道为何而活的人，几乎能忍受任何一种生活。"
}, {
  en: "Life is what happens when you're busy making other plans.",
  ru: "Жизнь — это то, что происходит с нами, пока мы строим другие планы.",
  zh: "生活就是当你忙着制定其他计划时所发生的事情。"
}, {
  en: "Get busy living or get busy dying.",
  ru: "Занимайся жизнью или занимайся смертью.",
  zh: "要么忙着活，要么忙着死。"
}, {
  en: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  ru: "Мы есть то, что мы постоянно делаем. Совершенство — не действие, а привычка.",
  zh: "我们由我们反复做的事情构成的。因此，卓越不是一种行为，而是一种习惯。"
}, {
  en: "Man is condemned to be free.",
  ru: "Человек обречён быть свободным.",
  zh: "人注定是自由的。"
}, {
  en: "To be, or not to be: that is the question.",
  ru: "Быть или не быть — вот в чём вопрос.",
  zh: "生存还是毁灭，这是一个问题。"
}, {
  en: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate, to have it make some difference that you have lived and lived well.",
  ru: "Цель жизни не в том, чтобы быть счастливым, а в том, чтобы быть полезным, достойным, сострадательным — чтобы твоя жизнь что-то значила.",
  zh: "人生的目的不是快乐，而是有用、高尚、富有同情心，让你活过并且活得好，从而使世界有所不同。"
}, {
  en: "Life is 10% what happens to us and 90% how we react to it.",
  ru: "Жизнь на 10% состоит из того, что с нами происходит, и на 90% — из того, как мы на это реагируем.",
  zh: "生活 10% 取决于发生在我们身上的事，90% 取决于我们如何反应。"
}, {
  en: "The two most important days in your life are the day you are born and the day you find out why.",
  ru: "Два самых важных дня в вашей жизни — день, когда вы родились, и день, когда вы поняли зачем.",
  zh: "你一生中最重要的两天是：你出生的那天和你明白你为何出生的那天。"
}, {
  en: "In three words I can sum up everything I've learned about life: it goes on.",
  ru: "Всё, что я узнал о жизни, укладывается в три слова: она продолжается.",
  zh: "关于人生，我所学到的一切可以总结为三个词：它在继续。"
}, {
  en: "Not all those who wander are lost.",
  ru: "Не всякий, кто блуждает, — заблудился.",
  zh: "并非所有流浪者都迷失了方向。"
}, {
  en: "Life is simple, but we insist on making it complicated.",
  ru: "Жизнь проста, но мы упорно её усложняем.",
  zh: "生活本简单，但我们坚持要把它弄复杂。"
}, {
  en: "Our life is what our thoughts make it.",
  ru: "Наша жизнь такова, какой её делают наши мысли.",
  zh: "我们的生活是由我们的思想造成的。"
}, {
  en: "Find purpose, the means will follow.",
  ru: "Найди цель — средства найдутся.",
  zh: "找到目标，方法自会随之而来。"
}, {
  en: "The goal of life is living in agreement with nature.",
  ru: "Цель жизни — жить в согласии с природой.",
  zh: "生活的目标是与自然和谐相处。"
}, {
  en: "The only true wisdom is in knowing you know nothing.",
  ru: "Единственная подлинная мудрость — знать, что ты ничего не знаешь.",
  zh: "唯一的真正智慧在于知道自己一无所有。"
}, {
  en: "Knowledge is power.",
  ru: "Знание — сила.",
  zh: "知识就是力量。"
}, {
  en: "Knowing yourself is the beginning of all wisdom.",
  ru: "Познание себя — начало всякой мудрости.",
  zh: "了解自己是所有智慧的开端。"
}, {
  en: "The journey of a thousand miles begins with a single step.",
  ru: "Путь в тысячу ли начинается с первого шага.",
  zh: "千里之行，始于足下。"
}, {
  en: "The only source of knowledge is experience.",
  ru: "Единственный источник знания — опыт.",
  zh: "知识的唯一来源是经验。"
}, {
  en: "A fool thinks himself to be wise, but a wise man knows himself to be a fool.",
  ru: "Глупец считает себя мудрым, а мудрец знает, что он глупец.",
  zh: "愚者自以为聪明，智者自知愚蠢。"
}, {
  en: "We learn from failure, not from success!",
  ru: "Мы учимся на неудачах, а не на успехах!",
  zh: "我们从失败中学习，而不是从成功中！"
}, {
  en: "The wise man is one who knows what he does not know.",
  ru: "Мудр тот, кто знает, чего он не знает.",
  zh: "智者，知其所不知。"
}, {
  en: "To know that we know what we know, and that we do not know what we do not know, that is true knowledge.",
  ru: "Знать, что мы знаем то, что знаем, и не знаем того, чего не знаем, — вот истинное знание.",
  zh: "知之为知之，不知为不知，是知也。"
}, {
  en: "Curiosity is the wick in the candle of learning.",
  ru: "Любопытство — фитиль в свече познания.",
  zh: "好奇心是学习这支蜡烛的灯芯。"
}, {
  en: "It is the mark of an educated mind to be able to entertain a thought without accepting it.",
  ru: "Признак образованного ума — способность обдумывать мысль, не принимая её.",
  zh: "能够容纳一种思想而不同意它，这是一个受过教育的头脑的标志。"
}, {
  en: "Never stop questioning.",
  ru: "Никогда не переставай задавать вопросы.",
  zh: "永远不要停止提问。"
}, {
  en: "The man who asks a question is a fool for a minute, the man who does not ask is a fool for life.",
  ru: "Задающий вопрос глуп минуту; не спрашивающий глуп всю жизнь.",
  zh: "问问题的人，只傻一分钟；不问的人，傻一生。"
}, {
  en: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.",
  ru: "Мудрость — не продукт обучения, а результат пожизненных попыток её обрести.",
  zh: "智慧不是学校教育的产物，而是终生努力获得的产物。"
}, {
  en: "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge.",
  ru: "Главный враг знания — не невежество, а иллюзия знания.",
  zh: "知识最大的敌人不是无知，而是自以为拥有知识的幻觉。"
}, {
  en: "True wisdom comes to each of us when we realize how little we understand about life, ourselves, and the world around us.",
  ru: "Истинная мудрость приходит к каждому, когда он понимает, как мало знает о жизни, о себе и об окружающем мире.",
  zh: "当我们认识到自己对生命、对自身、对周围世界了解得多么少时，真正的智慧才会降临到我们每个人身上。"
}, {
  en: "Beware of false knowledge; it is more dangerous than ignorance.",
  ru: "Остерегайтесь ложного знания: оно опаснее невежества.",
  zh: "谨防虚假的知识；它比无知更危险。"
}, {
  en: "What does not kill me makes me stronger.",
  ru: "Что меня не убивает, делает меня сильнее.",
  zh: "杀不死我的，使我更强大。"
}, {
  en: "The only constant in life is change.",
  ru: "Единственное постоянное в жизни — перемены.",
  zh: "生活中唯一不变的就是变化。"
}, {
  en: "If you are going through hell, keep going.",
  ru: "Если идёшь через ад — иди не останавливаясь.",
  zh: "如果你正在经历地狱，那就继续走下去。"
}, {
  en: "In the middle of difficulty lies opportunity.",
  ru: "В середине трудности лежит возможность.",
  zh: "机会蕴藏在困难之中。"
}, {
  en: "It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change.",
  ru: "Выживает не самый сильный и не самый умный, а тот, кто лучше приспосабливается к переменам.",
  zh: "存活下来的物种不是最强壮的，也不是最聪明的，而是最能适应变化的。"
}, {
  en: "We must become the change we wish to see in the world.",
  ru: "Мы должны сами стать теми переменами, которые хотим видеть в мире.",
  zh: "我们必须成为我们希望在世界上看到的改变。"
}, {
  en: "A smooth sea never made a skilled sailor.",
  ru: "Спокойное море не сделает моряка искусным.",
  zh: "平静的大海练不出熟练的水手。"
}, {
  en: "Obstacles don't block the path, they are the path.",
  ru: "Препятствия не преграждают путь — они и есть путь.",
  zh: "障碍不是挡住了路，障碍本身就是路。"
}, {
  en: "Fall seven times, stand up eight.",
  ru: "Упади семь раз — поднимись восемь.",
  zh: "七次跌倒，八次站起。"
}, {
  en: "The art of life lies in a constant readjustment to our surroundings.",
  ru: "Искусство жизни — в постоянном приспособлении к окружающему.",
  zh: "生活的艺术在于不断地调整自己以适应环境。"
}, {
  en: "Adversity introduces a man to himself.",
  ru: "Беда знакомит человека с самим собой.",
  zh: "逆境使人认识自己。"
}, {
  en: "The wound is the place where the Light enters you.",
  ru: "Рана — это место, через которое в тебя входит свет.",
  zh: "伤口是光进入你内心的入口。"
}, {
  en: "When we are no longer able to change a situation, we are challenged to change ourselves.",
  ru: "Когда мы больше не в силах изменить ситуацию, нам брошен вызов изменить себя.",
  zh: "当我们无法改变现状时，我们就需要改变自己。"
}, {
  en: "Be the change you wish to see in the world.",
  ru: "Будь той переменой, которую хочешь видеть в мире.",
  zh: "成为你希望在世界上看到的改变。"
}, {
  en: "Do not pray for an easy life, pray for the strength to endure a difficult one.",
  ru: "Не молись о лёгкой жизни — молись о силе вынести трудную.",
  zh: "不要祈祷生活安逸，要祈祷有力量去忍受艰难的生活。"
}, {
  en: "A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.",
  ru: "Пессимист видит трудность в каждой возможности; оптимист — возможность в каждой трудности.",
  zh: "悲观者在每个机会中都看到困难；乐观者在每个困难中都看到机会。"
}, {
  en: "It's not what happens to you, but how you react to it that matters.",
  ru: "Важно не то, что с тобой случается, а то, как ты на это реагируешь.",
  zh: "重要的不是发生在你身上的事，而是你如何应对它。"
}, {
  en: "To love oneself is the beginning of a lifelong romance.",
  ru: "Любовь к себе — начало романа длиною в жизнь.",
  zh: "爱自己是终身浪漫的开始。"
}, {
  en: "Love is composed of a single soul inhabiting two bodies.",
  ru: "Любовь — это одна душа, живущая в двух телах.",
  zh: "爱是栖息于两个身体中的同一个灵魂。"
}, {
  en: "Man is the measure of all things.",
  ru: "Человек есть мера всех вещей.",
  zh: "人是万物的尺度。"
}, {
  en: "The best and most beautiful things in this world cannot be seen or even heard, but must be felt with the heart.",
  ru: "Лучшее и самое прекрасное в этом мире нельзя увидеть или услышать — это нужно почувствовать сердцем.",
  zh: "世界上最好最美的东西是看不见也听不见的，必须用心去感受。"
}, {
  en: "Where there is love there is life.",
  ru: "Где любовь, там и жизнь.",
  zh: "有爱的地方就有生命。"
}, {
  en: "If you want to be loved, be lovable.",
  ru: "Хочешь быть любимым — будь достойным любви.",
  zh: "如果你想被爱，就要变得可爱。"
}, {
  en: "We are all in the gutter, but some of us are looking at the stars.",
  ru: "Все мы в сточной канаве, но некоторые из нас смотрят на звёзды.",
  zh: "我们都身处沟渠，但仍有人仰望星空。"
}, {
  en: "The only thing we have to fear is fear itself.",
  ru: "Единственное, чего нам следует бояться, — это сам страх.",
  zh: "我们唯一需要恐惧的就是恐惧本身。"
}, {
  en: "Be kind, for everyone you meet is fighting a hard battle.",
  ru: "Будь добр: каждый, кого ты встречаешь, ведёт свою тяжёлую битву.",
  zh: "要友善，因为你遇到的每个人都在打一场艰苦的战斗。"
}, {
  en: "Man is born free, and everywhere he is in chains.",
  ru: "Человек рождается свободным, но повсюду он в оковах.",
  zh: "人生而自由，却无往不在枷锁之中。"
}, {
  en: "We love the things we love for what they are.",
  ru: "Мы любим то, что любим, за то, что оно есть.",
  zh: "我们爱我们所爱之物，只因它们本来的样子。"
}, {
  en: "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.",
  ru: "Тьму не изгнать тьмой — только свет способен на это. Ненависть не изгнать ненавистью — только любовь способна на это.",
  zh: "黑暗无法驱逐黑暗，只有光明可以；仇恨无法驱逐仇恨，只有爱可以。"
}, {
  en: "An eye for an eye only ends up making the whole world blind.",
  ru: "Око за око — и весь мир ослепнет.",
  zh: "以眼还眼，只会让整个世界都盲目。"
}, {
  en: "Hell is other people.",
  ru: "Ад — это другие.",
  zh: "他人即地狱。"
}, {
  en: "You will not be punished for your anger, you will be punished by your anger.",
  ru: "Тебя накажут не за твой гнев — тебя накажет сам твой гнев.",
  zh: "你不会因为你的愤怒而受到惩罚，你会被你的愤怒所惩罚。"
}, {
  en: "To err is human, to forgive divine.",
  ru: "Человеку свойственно ошибаться, прощать — божественно.",
  zh: "犯错是人性，宽恕是神性。"
}, {
  en: "Man is the only creature who refuses to be what he is.",
  ru: "Человек — единственное существо, которое отказывается быть тем, что оно есть.",
  zh: "人是唯一拒绝承认自己本质的生物。"
}, {
  en: "Beauty is in the eye of the beholder.",
  ru: "Красота в глазах смотрящего.",
  zh: "情人眼里出西施。"
}, {
  en: "All that we see or seem is but a dream within a dream.",
  ru: "Всё, что мы видим и чем кажемся, — лишь сон во сне.",
  zh: "我们所见所感，皆如梦中之梦。"
}, {
  en: "Everything you can imagine is real.",
  ru: "Всё, что можно вообразить, реально.",
  zh: "你能想象的一切都是真实的。"
}, {
  en: "The map is not the territory.",
  ru: "Карта — не территория.",
  zh: "地图并非领土。"
}, {
  en: "We don't see things as they are, we see them as we are.",
  ru: "Мы видим вещи не такими, какие они есть, а такими, каковы мы сами.",
  zh: "我们看到的不是事物的原貌，而是我们自己的样子。"
}, {
  en: "There are two ways to be fooled. One is to believe what isn't true; the other is to refuse to believe what is true.",
  ru: "Обмануться можно двумя способами: поверить в то, чего нет, и отказаться верить в то, что есть.",
  zh: "被愚弄有两种方式。一种是相信不真实的东西；另一种是拒绝相信真实的东西。"
}, {
  en: "Simplicity is the ultimate sophistication.",
  ru: "Простота — высшая форма изысканности.",
  zh: "简约是极致的复杂。"
}, {
  en: "The truth will set you free.",
  ru: "Истина сделает вас свободными.",
  zh: "真相将使你自由。"
}, {
  en: "Reality is merely an illusion, albeit a very persistent one.",
  ru: "Реальность — всего лишь иллюзия, хотя и очень стойкая.",
  zh: "现实只是一种幻觉，尽管是一种非常持久的幻觉。"
}, {
  en: "What is rational is actual and what is actual is rational.",
  ru: "Что разумно, то действительно; что действительно, то разумно.",
  zh: "凡是合乎理性的东西都是现实的，凡是现实的东西都是合乎理性的。"
}, {
  en: "Truth is like the sun. You can shut it out for a time, but it ain't goin' away.",
  ru: "Правда как солнце: на время её можно заслонить, но никуда она не денется.",
  zh: "真相就像太阳。你可以暂时将它遮住，但它不会消失。"
}, {
  en: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.",
  ru: "Всё, что мы слышим, — мнение, а не факт. Всё, что мы видим, — точка зрения, а не истина.",
  zh: "我们听到的一切都只是观点，而非事实。我们看到的一切都只是视角，而非真相。"
}, {
  en: "There is no truth. There is only perception.",
  ru: "Нет истины. Есть только восприятие.",
  zh: "没有真相，只有认知。"
}, {
  en: "If you look deep enough into anything, you will find mathematics.",
  ru: "Если заглянуть достаточно глубоко в любую вещь, найдёшь математику.",
  zh: "如果你对任何事物看得足够深入，你都会发现数学。"
}, {
  en: "The medium is the message.",
  ru: "Средство сообщения и есть сообщение.",
  zh: "媒介即信息。"
}, {
  en: "Nothing is true, everything is permitted.",
  ru: "Ничто не истинно, всё дозволено.",
  zh: "没有什么是真实的，一切都被允许。"
}, {
  en: "We are what we believe we are.",
  ru: "Мы есть то, чем себя считаем.",
  zh: "我们相信自己是什么，我们就是什么。"
}, {
  en: "Yesterday is history, tomorrow is a mystery, but today is a gift. That is why it is called the present.",
  ru: "Вчера — история, завтра — тайна, а сегодня — дар. Потому оно и зовётся настоящим.",
  zh: "昨天是历史，明天是谜团，但今天是礼物。这就是为什么它被称为‘现在’(Present)。"
}, {
  en: "Time is money.",
  ru: "Время — деньги.",
  zh: "时间就是金钱。"
}, {
  en: "The only thing necessary for the triumph of evil is for good men to do nothing.",
  ru: "Для торжества зла достаточно, чтобы добрые люди бездействовали.",
  zh: "邪恶得逞的唯一条件是好人袖手旁观。"
}, {
  en: "Carpe diem.",
  ru: "Лови мгновение.",
  zh: "活在当下。"
}, {
  en: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
  ru: "Не живи прошлым, не мечтай о будущем — сосредоточь ум на настоящем мгновении.",
  zh: "不要沉湎于过去，不要幻想未来，集中精神活在当下。"
}, {
  en: "The best time to plant a tree was 20 years ago. The second best time is now.",
  ru: "Лучшее время посадить дерево было двадцать лет назад. Второе лучшее — сейчас.",
  zh: "种树的最佳时机是20年前。其次是现在。"
}, {
  en: "Action speaks louder than words.",
  ru: "Дела говорят громче слов.",
  zh: "事实胜于雄辩。"
}, {
  en: "Honesty is the first chapter in the book of wisdom.",
  ru: "Честность — первая глава в книге мудрости.",
  zh: "诚实是智慧之书的第一章。"
}, {
  en: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
  ru: "Две вещи бесконечны: вселенная и человеческая глупость; впрочем, насчёт вселенной я не уверен.",
  zh: "有两样东西是无限的：宇宙和人类的愚蠢；而且我不太确定宇宙是否无限。"
}, {
  en: "You cannot step twice into the same river.",
  ru: "Нельзя дважды войти в одну и ту же реку.",
  zh: "人不能两次踏进同一条河流。"
}, {
  en: "The future belongs to those who believe in the beauty of their dreams.",
  ru: "Будущее принадлежит тем, кто верит в красоту своей мечты.",
  zh: "未来属于那些相信梦想之美的人。"
}, {
  en: "Procrastination is the thief of time.",
  ru: "Промедление — вор времени.",
  zh: "拖延是时间的大敌。"
}, {
  en: "An investment in knowledge pays the best interest.",
  ru: "Вложения в знания приносят наибольший процент.",
  zh: "投资知识，收益最佳。"
}, {
  en: "I have not failed. I've just found 10,000 ways that won't work.",
  ru: "Я не потерпел неудачу. Я просто нашёл 10 000 способов, которые не работают.",
  zh: "我没有失败。我只是找到了一万种行不通的方法。"
}, {
  en: "That which is done, is done.",
  ru: "Что сделано, то сделано.",
  zh: "木已成舟。"
}];

/**
 * 随机获取一条多语言格言警句
 * @returns {{en: string, zh: string, zh_TW: string, ja: string, ko: string}} 包含多国语言翻译的名言对象
 */
export function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}
