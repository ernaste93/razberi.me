(function () {
  'use strict';

  var W = 240;
  var path = window.location.pathname;

  // Ако сме в урок, материалите отварят директно за него
  var lessonKey = '';
  if (path.startsWith('/lessons/') && path.endsWith('.html')) {
    var slug = path.split('/').pop().replace('.html', '');
    if (slug && slug !== 'materiali' && !slug.includes('quiz') && slug !== 'pishi7' && slug !== 'sachine' && slug !== 'lesson-ai') {
      lessonKey = slug;
    }
  }
  var materialiHref = lessonKey ? ('/lessons/materiali.html?key=' + lessonKey) : '/lessons/materiali.html';

  function svg(d) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  var ITEMS = [
    {
      label: 'Дневник',
      href: '/dnevnik.html',
      match: ['/dnevnik.html'],
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>')
    },
    {
      label: 'Бележник',
      href: '/dnevnik-book.html',
      match: ['/dnevnik-book.html'],
      icon: svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')
    },
    {
      label: 'Уроци',
      href: '/urotsi.html',
      match: ['/urotsi.html'],
      icon: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')
    },
    {
      label: 'Тестове',
      href: '/testove.html',
      match: ['/testove.html'],
      icon: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')
    },
    {
      label: 'Помагала',
      href: materialiHref,
      match: ['/lessons/materiali.html'],
      icon: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>')
    },
    {
      label: 'История',
      href: '/istoriya.html',
      match: ['/istoriya.html'],
      icon: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')
    },
  ];

  var BOTTOM = [];

  var settingsIcon = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');

  function isActive(item) {
    if (item.match.indexOf(path) !== -1) return true;
    return item.match.some(function (m) { return m !== '/' && path.startsWith(m); });
  }

  function renderItem(item) {
    return '<a href="' + item.href + '" class="sb-item' + (isActive(item) ? ' sb-active' : '') + '">'
      + '<span class="sb-ico">' + item.icon + '</span>'
      + '<span class="sb-lbl">' + item.label + '</span>'
      + '</a>';
  }

  var css = [
    '#app-sidebar{position:fixed;top:0;left:0;bottom:0;width:' + W + 'px;background:#fff;border-right:1px solid #e8edf5;display:flex;flex-direction:column;z-index:400;box-shadow:2px 0 16px rgba(26,47,90,.05);}',
    '.sb-logo{padding:16px 18px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;}',
    '.sb-logo img{height:74px;width:auto;}',
    '.sb-nav{flex:1;padding:10px 10px 0;overflow-y:auto;display:flex;flex-direction:column;}',
    '.sb-znayko-tip{margin-top:auto;padding-bottom:10px;}',
    '.sb-znayko-inner{background:#fffbf2;border:1px solid #fde68a;border-left:3px solid #E8A020;border-radius:12px;padding:12px 14px;}',
    '.sb-znayko-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;}',
    '.sb-znayko-av{width:24px;height:24px;border-radius:50%;background:#E8A020;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;}',
    '.sb-znayko-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#b45309;}',
    '.sb-znayko-txt{font-size:12px;color:#44403c;line-height:1.6;}',
    '.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;color:#64748b;font-size:14px;font-weight:600;font-family:inherit;margin-bottom:2px;transition:background .12s,color .12s;}',
    '.sb-item:hover{background:#f1f5f9;color:#1a2f5a;}',
    '.sb-active{background:#eef2f9!important;color:#1a2f5a!important;font-weight:700;}',
    '.sb-ico{display:flex;align-items:center;flex-shrink:0;}',
    '.sb-divider{height:1px;background:#f1f5f9;margin:8px 10px;}',
    '.sb-bottom{padding:10px 12px 14px;display:flex;flex-direction:column;gap:10px;}',
    /* User row */
    '.sb-user{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;border:1px solid #f1f5f9;background:#f8fafc;}',
    '.sb-avatar{width:30px;height:30px;border-radius:50%;background:#1a2f5a;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.sb-user-name{font-size:12px;font-weight:700;color:#1a2f5a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}',
    '.sb-logout{background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px;display:flex;align-items:center;flex-shrink:0;transition:color .15s;}',
    '.sb-logout:hover{color:#e53e3e;}',
    /* Plan card */
    '.sb-plan-card{padding:8px 10px;border-radius:10px;background:#f8fafc;border:1px solid #f1f5f9;}',
    '.sb-plan-top{display:flex;align-items:center;justify-content:center;gap:8px;}',
    '.sb-plan-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
    '.sb-plan-dot.dot-active{background:#22c55e;}',
    '.sb-plan-dot.dot-trial{background:#f59e0b;}',
    '.sb-plan-dot.dot-expired{background:#ef4444;}',
    '.sb-plan-name{font-size:13px;font-weight:700;color:#1a2f5a;flex:1;}',
    '.sb-plan-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.4px;}',
    '.sb-plan-badge.st-active{background:#dcfce7;color:#16a34a;}',
    '.sb-plan-badge.st-trial{background:#fef3c7;color:#d97706;}',
    '.sb-plan-badge.st-expired{background:#fee2e2;color:#dc2626;}',
    '.sb-plan-status{display:none;}',
    '.sb-plan-until{font-size:11px;color:#94a3b8;margin-top:3px;text-align:center;}',
    '.sb-plan-link{font-size:11px;font-weight:600;text-decoration:none;color:#94a3b8;margin-top:4px;display:block;text-align:center;}',
    '.sb-plan-link:hover{color:#1a2f5a;}',
    /* Body offset + hide existing topbar */
    'body.has-sidebar .topbar{display:none!important;}',
    'body.has-sidebar{padding-left:' + W + 'px!important;padding-top:0!important;margin-top:0!important;}',
    '@media(max-width:768px){#app-sidebar{display:none;}body.has-sidebar{padding-left:0!important;}body.has-sidebar .topbar{display:block!important;}}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var logoutSvg = svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');

  var sidebar = document.createElement('aside');
  sidebar.id = 'app-sidebar';
  sidebar.innerHTML =
    '<div class="sb-logo"><a href="/"><img src="/logos/transparent_logo.png" alt="Разбери.Ме"/></a></div>'
    + '<div class="sb-nav">'
    + ITEMS.map(renderItem).join('')
    + '<div class="sb-znayko-tip"><div class="sb-znayko-inner">'
    + '<div class="sb-znayko-row"><span class="sb-znayko-lbl">Знаеше ли, че...?</span></div>'
    + '<div class="sb-znayko-txt" id="sb-znayko-tip-txt"></div>'
    + '</div></div>'
    + '</div>'
    + '<div class="sb-bottom">'
    + '<div class="sb-divider" style="margin:0 0 6px;"></div>'
    + '<a href="/admin.html" class="sb-item" id="sb-admin-link" style="display:none;margin-bottom:2px;">'
    + '<span class="sb-ico">' + svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>') + '</span>'
    + '<span class="sb-lbl">Админ панел</span>'
    + '</a>'
    + '<div class="sb-plan-card" id="sb-plan-card" style="display:none;">'
    + '<div class="sb-plan-top"><div class="sb-plan-dot" id="sb-plan-dot"></div><span class="sb-plan-name" id="sb-plan-name"></span><span class="sb-plan-badge" id="sb-plan-status"></span></div>'
    + '<div class="sb-plan-until" id="sb-plan-until"></div>'
    + '<a href="/settings.html?tab=subscription" class="sb-plan-link" id="sb-plan-link"></a>'
    + '</div>'
    + '<div class="sb-user" id="sb-user" style="display:none;">'
    + '<div class="sb-avatar" id="sb-avatar">?</div>'
    + '<div class="sb-user-name" id="sb-user-name"></div>'
    + '<a href="/settings.html" class="sb-logout" title="Настройки">' + settingsIcon + '</a>'
    + '<button class="sb-logout" id="sb-logout" title="Изход">' + logoutSvg + '</button>'
    + '</div>'
    + '</div>';

  document.body.prepend(sidebar);
  document.body.classList.add('has-sidebar');

  async function init() {
    try {
      var mod = await import('https://esm.sh/@supabase/supabase-js@2');
      var sb = mod.createClient(
        'https://wbcppvfgtvkrsfmclmjp.supabase.co',
        'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l'
      );

      /* ── Знаеше ли? – зарежда се веднага ── */
      var TIPS = [
        'Мозъкът използва около 20% от цялата енергия на тялото, въпреки че тежи само ~2% от него.',
        'Октоподите имат три сърца и синя кръв, защото тя съдържа мед вместо желязо.',
        'Медът никога не се разваля – в египетски гробници е намерен мед на 3000 години, все още годен за ядене.',
        'Мълнията е 5 пъти по-гореща от повърхността на Слънцето.',
        'Жирафите имат същия брой шийни прешлени като хората – 7. Само са много по-дълги.',
        'Морска звезда няма мозък и кръв. Движи се с морска вода, която циркулира в тялото й.',
        'Банановото дърво всъщност не е дърво – то е гигантско тревисто растение.',
        'Числото нула е изобретено в Индия около 5 век сл. Хр. Без него нямаше да има компютри.',
        'Светлината от Слънцето пътува ~8 минути до Земята. От най-близката звезда – 4 години.',
        'Пеперудите опитват храната с краката си – там са вкусовите им рецептори.',
        'Вода в течно състояние не съществува никъде другаде в Слънчевата система – само на Земята.',
        'Сърцето на синия кит е с размерите на малка кола и тежи около 180 кг.',
        'Мравките могат да носят тежест, 50 пъти по-голяма от собственото им тяло.',
        'Кокошките са най-многобройните птици на Земята – над 30 милиарда, почти 4 на всеки човек.',
        'Акулите са по-стари от дърветата. Акулите съществуват от ~450 млн. г., дърветата – от ~350 млн. г.',
        'Паяците нямат мускули за разтягане на краката – използват хидравлично налягане.',
        'Слоновете са единствените животни, освен хората, за които е известно, че оплакват мъртвите си.',
        'Морските кончета са единствените риби, при които мъжкият ражда малките.',
        'Молекулата на ДНК е толкова тънка, че в напречен разрез на един косъм се побират 1 милион ДНК нишки.',
        'Делфините спят с едно полукълбо на мозъка в даден момент – другото остава будно.',
        'Кислородът е открит независимо от двама учени – Шийл и Пристли – в един и същ период, без да знаят един за друг.',
        'Питагоровата теорема е известна 1200 години преди Питагор – вавилонците я ползвали от 1800 г. пр. Хр.',
        'Думата „хаос" идва от гръцки и означава „зееща празнота" – първобитното пространство преди създаването на света.',
        'Думата „трагедия" на гръцки буквално означава „песен на козела".',
        'Езикът е единственият мускул в тялото, прикрепен само от едната страна.',
        'Буквата „Ъ" в българския език е уникална – не съществува в нито един друг писмен език.',
        'Кирилицата е създадена в България, в Преславската книжовна школа, от учениците на Кирил и Методий.',
        'България е основана през 681 г. и е сред най-старите държави в Европа, запазили неизменно името си.',
        'Рилският манастир е основан в 10 век и е бил основен пазител на българската книжовност.',
        'Иван Вазов написва „Под игото" само за 3 месеца, докато е в емиграция в Одеса.',
        'Фредерик Шопен моли сърцето му да бъде върнато в Полша след смъртта му – и желанието му е изпълнено.',
        'Бетовен написва 9-а симфония, след като напълно оглушава.',
        'Леонардо да Винчи рисувал с едната ръка и едновременно писал с другата.',
        'Клеопатра е живяла по-близо до нас, отколкото до построяването на пирамидите – пирамидите са на ~2500 г. пр. Хр., тя – на ~50 г. пр. Хр.',
        'Великата китайска стена не се вижда от Космоса с просто око – мит е.',
        'Викингите не са носили шлемове с рога – нито един такъв шлем не е намерен на исторически обект.',
        'Колесницата е изобретена ~3500 г. пр. Хр., хиляди години преди да се появи употребата й във война.',
        'Коперник публикува хелиоцентричната теория на 70-годишна възраст, малко преди смъртта си, за да избегне преследване.',
        'Исак Нютон открива гравитацията на 23 години, докато Кеймбридж е затворен заради чума.',
        'Айнщайн отхвърля предложението да стане президент на Израел – „нямам нито опит, нито естествено влечение към хората".',
        'Морзовата азбука е създадена не от Морс, а от неговия асистент Алфред Вейл.',
        'Телефонът е изобретен от Антонио Мойчи през 1854 г., но Бел го патентова – 22 години по-късно.',
        'Интернет и Световната мрежа (www) са различни неща – интернет е мрежата, www е услуга върху нея.',
        'Луната се отдалечава от Земята с около 3.8 см всяка година.',
        'Сатурн е по-малко плътен от водата – ако имаше океан достатъчно голям, той щеше да плава.',
        'Диамантът и графитът са изградени от един и същи елемент – въглерод. Разликата е в наредбата на атомите.',
        'Стъклото е течност, движеща се толкова бавно, че изглежда като твърдо тяло.',
        'Кислородът прави ~21% от въздуха. Ако стане 35% – всичко на Земята ще се запали.',
        'Гръмотевицата е звукът от бързото разширяване на въздуха около мълния – загрят до 30 000°C.',
        'Розовите фламинго се раждат бели – розовият цвят идва от пигменти в скаридите, с които се хранят.',
        'Котките не чуват собствените си мъркания – то е за успокоение на другите, не за комуникация.',
        'Кучетата могат да усетят промени в атмосферното налягане и да „предсказват" бури.',
        'Пингвините предлагат на избраницата си камък за чифтосване – „годежен пръстен" от камък.',
        'Коалите имат пръстови отпечатъци, неразличими от човешките дори под микроскоп.',
        'Рибата-меч може да загрее очите и мозъка си до 15°C над температурата на водата – за по-добро виждане.',
        'Плъховете могат да издават ултразвукови звуци, подобни на смях, когато ги гъделичкат.',
        'Пчелите могат да разпознаят човешки лица – ползват ги за навигация.',
        'Слоновете са единствените животни с 4 колена.',
        'Котките пият вода с езика, извит надолу – капките се качват по инерция нагоре.',
        'Делфините имат имена – уникален звук, с който останалите ги извикват.',
        'Плюещата кобра може да уцели очите на жертвата от 2.5 метра.',
        'Кенгурата не могат да ходят назад.',
        'Морските краставици дишат през задния отвор на тялото.',
        'Орлите могат да видят заек от 3 км разстояние.',
        'Комарите убиват повече хора годишно, отколкото всички хищници взети заедно.',
        'Мухите преди да кацнат на храна, я повръщат върху нея – така я разтварят, за да я смучат.',
        'Земята не е идеална сфера – малко е изпъкнала при екватора заради въртенето.',
        'Сахара не е най-голямата пустиня – Антарктика е. Пустиня = район с малко валежи.',
        'Тихият океан е по-голям от всички континенти взети заедно.',
        'Амазонка изхвърля толкова прясна вода в Атлантика, че може да се пие на 160 км от брега.',
        'Всяка снежинка има 6-странна симетрия, но никои две не са еднакви.',
        'Гробницата на Тутанкамон е открита случайно – работникът спъва крак в горната й стъпало.',
        'Нилският крокодил може да издържи без храна ~2 години.',
        'Камилата не пази вода в гърбиците – пази мазнина. Водата е разпределена в тялото.',
        'Броненосците са сред малкото животни, които могат да се заразят с бактерията, причиняваща проказа.',
        'Нинджите в историята на Япония основно са шпиони и разузнавачи, не убийци.',
        'Чингис хан убива толкова много хора, че нивата на CO₂ спадат и глобалните температури намаляват.',
        'Последният мамут е изчезнал около 1650 г. пр. Хр. – Стоунхендж вече е съществувал.',
        'Клеопатра е говорела на 9 езика – единствената от династията Птолемей, учила египетски.',
        'Наполеон не е бил нисък – 1.69 м, среден за времето си. Заблудата идва от английска пропаганда.',
        'Кралят на Франция Луи XIX управлява 20 минути – след абдикацията на баща му.',
        'Ватикана е най-малката държава в света – с площ само 0.44 кв. км, приблизително колкото 60 футболни игрища.',
        'Русия е толкова голяма, че има 11 часови зони.',
        'Австралия е по-широка от Луната – 4000 км срещу 3474 км.',
        'Канада има ~60% от всички езера в света.',
        'Мозъкът произвежда достатъчно електричество да запали малка крушка.',
        'Хората са единствените животни, които се изчервяват от срам.',
        'Костите на човека са 5 пъти по-твърди от стоманата при еднакво тегло.',
        'Стомашната киселина е достатъчно силна, за да разтвори цинк.',
        'Косата расте ~15 см годишно и расте по-бързо на лявата ръка при десничари.',
        'Роговицата на окото е единствената тъкан в тялото без кръвоносни съдове.',
        'Ушите и носът не спират да растат през целия живот.',
        'Прозявката е заразна дори при четене на думата „прозявка".',
        'Сълзите от радост се появяват от дясното oкo, от тъга – от лявото.',
        'Тялото произвежда ~25 млн. нови клетки в секунда.',
        'Мозъкът не усеща болка – няма болкови рецептори.',
        'Около 37 трилиона клетки изграждат човешкото тяло.',
        'Отпечатъкът на езика е уникален, като пръстовия.',
        'Кожата е най-тежкият орган – около 4.5–5 кг при среден човек.',
        'Ноктите на ръцете растат 4 пъти по-бързо от тези на краката.',
        'Слухът е последното чувство, което изчезва преди смъртта.',
        'Хората са 99.9% идентични генетично – 0.1% е разликата между всеки двама хора.',
        'Пясъкът на пустинята Сахара понякога достига Великобритания – пренесен от вятъра.',
        'Вулканът Мауна Кеа в Хавай е по-висок от Еверест – ако се мери от дъното на океана.',
        'Гейзерите избухват, защото водата под тях е притисната от скалите и се прегрява.',
        'Магнитният северен полюс се движи – всяка година се измества с ~50 км.',
        'Трусoвете на Луната се наричат „лунотресения“ и могат да продължат до час.',
        'Вулканичната лава може да тече с до 60 км/ч по хълм.',
        'Ледниците съдържат 69% от прясната вода на Земята.',
        'Марс е червен заради ръжда – повърхността е покрита с железен оксид.',
        'Юпитер е толкова голям, че Земята може да се побере в него 1300 пъти.',
        'Венера се върти обратно на повечето планети – на Венера Слънцето изгрява на запад.',
        'Нептун има ветрове до 2100 км/ч – най-силните в Слънчевата система.',
        'Звездата Бетелгейзе е толкова голяма, че ако беше вместо Слънцето, щеше да поглъща Юпитер.',
        'Галактиката Млечен Път е с диаметър ~100 000 светлинни години.',
        'Има повече звезди в Космоса, отколкото пясъчни зърна на всички плажове на Земята.',
        'Черните дупки не засмукват всичко – само нещата, прекалено близо до „хоризонта на събитията".',
        'Светлината е едновременно вълна и частица – „двойствеността" е основна мистерия на квантовата физика.',
        'Ако извадим цялото празно пространство от атомите на хората на Земята, всички бихме се събрали в захарен куб.',
        'Температурата на абсолютната нула (-273.15°C) е границата – под нея физически не може да се достигне.',
        'Водородът е най-разпространеният елемент в Космоса – ~75% от видимата материя.',
        'Златото се образува при сблъсък на неутронни звезди – то е буквално звезден прах.',
        'Водата се разширява при замръзване – затова ледът плава. При повечето вещества твърдото е по-плътно.',
        'Статичното електричество, което усещаш, може да достигне 30 000 волта – но с нулева сила на тока.',
        'Обикновена лупа може да запали хартия – но само ако слънчевите лъчи са перпендикулярни.',
        'Звукът не може да се разпространява в Космоса – няма молекули, които да трептят.',
        'Хелият е единственият елемент, открит първо на Слънцето, а след това на Земята.',
        'Атомът е предимно празно пространство – ако ядрото му беше с размер на портокал, електроните биха кръжели на 10 км.',
        'Квантовите компютри не използват обикновени битове, а кюбити – частици информация, които могат да бъдат в комбинация от 0 и 1 едновременно.',
        'Математическата константа π се знае с над 100 трилиона десетични знака.',
        '„Гугол“ е числото 10 на степен 100 – единица със 100 нули след нея. Името Google идва от тази дума, но е изписано по различен начин.',
        'В математиката 0.999... (нула цяло и безкрайно много деветки) е точно равно на 1.',
        'Числата на Фибоначи се срещат в броя на венчелистчетата, спиралите на охлювите и семената на слънчогледа.',
        'Простите числа нямат никакъв известен модел – разпределени са напълно непредсказуемо.',
        'Има безкрайно много прости числа – Евклид го е доказал преди 2300 години.',
        'Ако сгънеш лист хартия 42 пъти, той ще достигне до Луната. На 103 пъти – до границата на известния Космос.',
        'Кулата на Пиза не е единствената накривена кула – само е най-известна.',
        'Музиката на Бах е изпратена в Космоса на плочата на Вояджър – заедно с китайска, индийска и джаз музика.',
        'Рентгеновите лъчи са открити случайно – Рьонтген е снимал ръката на жена си.',
        'Пеницилинът е открит защото Флеминг е забравил да измие чашката за Петри и е намерил плесен.',
        'Тефлонът е открит случайно при опит да се произведе нов хладилен газ.',
        'Велкрото е измислено след разходка в гората – изобретателят вижда как репеите залепват за дрехата му.',
        'Хартията е измислена в Китай ~100 г. сл. Хр., но Европа я получава ~1100 години по-късно.',
        'Първата снимка в историята е правена 8 часа – от 1826 г., от прозореца на Нисефор Нипс.',
        'Първото интернет съобщение е изпратено на 29 октомври 1969 г. и системата се срива след буквата „g" от „login".',
        'Думата „робот" идва от чешки – „robota" означава „принудителен труд".',
        'Думата „quiz" може би идва от латинското „quis" – „кой?", но никой не е сигурен.',
        'На английски „set" има ~430 различни значения – рекорд.',
        'Думата „шах и мат" в шаха идва от персийски – „шах мат" означава „царят е мъртъв".',
        'Финландският и унгарският са единствените европейски езици, несвързани с останалите – идват от Урал.',
        'В японски има три азбуки, ползвани едновременно в един текст.',
        'Шумерите са имали дума за бира, преди да имат дума за свобода.',
        'Пиза означава „блато" – градът е построен на мочурище.',
        'Думата „джин" в английски идва от „джуниперберри" (хвойна) – основната съставка на питието.',
        'Езиковеди смятат, че „мама" и „тате" звучат почти идентично в повечето езици – случайно ли е?',
        'Шекспир е добавил над 1700 думи в английски – „bedroom", „lonely", „generous" са негови.',
        'Оскар Уайлд е казал: „Мога да устоя на всичко, освен на изкушението."',
        'Толстой написва „Война и мир" – над 580 000 думи – на ръка, многократно преписван.',
        'Жул Верн предсказва видеоконференциите, луномобилите и подводниците в романите си от 19 век.',
        'Агата Кристи е второто най-продавано художествено произведение в историята – след Библията.',
        'Достоевски написва „Играчът" за 26 дни на залог – иначе губи всичко.',
        'Гарсия Маркес чете „Метаморфозата" и казва: „Не знаех, че е позволено да се пише така."',
        'Хемингуей пишел прав – вярвал, че това подобрява концентрацията.',
        'В „Хамлет" думата „the" се среща 1088 пъти.',
        'Романът „Великият Гетсби" е отхвърлен от 5 издателства преди да стане класика.',
        'Митрополит Климент Охридски е написал специални обяснения за произношението на 5 от буквите на кирилицата.',
        'Черно море получава водата от реките, но почти нищо не изпуска – само изпарява.',
        'България е единствената страна в ЕС с кирилица в логото.',
        'Балканът е дал името на цял полуостров – думата „балкан" на турски означава „залесена планинска верига".',
        'Соколът скитник е най-бързото животно на Земята – гмурка се с над 380 км/ч.',
        'Медузата Turritopsis dohrnii е биологически безсмъртна – връща се в ларвена форма вместо да умира.',
        'Дърветата общуват под земята чрез мрежа от гъби – наречена „горският интернет".',
        'Бамбукът расте до 90 см на ден – видима промяна на всеки час.',
        'Секвоите могат да живеят до 3000 години.',
        'Растенията реагират на звук – корените им растат към шума от течаща вода.',
        'Цветята на слънчогледа не се обръщат към Слънцето – само младите стъбла го правят.',
        'Трюфелите не могат да се отглеждат в плантации – растат само в съжителство с определени дъбови корени.',
        'Кафето е открито, когато козар забелязал, че козите не спят нощем след ядене на червени зърна.',
        'Шоколадът е отровен за кучета – те не могат да разграждат теоброминът.',
        'Ябълките и крушите принадлежат към семейство Розови – роднини са на розите.',
        'Лукът кара очите да сълзят заради серни газове, отделяни при нарязване.',
        'Морковите не са оранжеви по природа – холандците ги изселектирали в оранжево в чест на кралската фамилия Орания.',
        'Авокадото е плод, не зеленчук – и технически е ягода.',
        'Ананасът е кръстен от американски индианци – думата им „наанас" означава „отличен плод".',
        'Чесънът убива бактерии – алицинът му е естествен антибиотик.',
        'Човек прекарва средно ~6 години от живота си в сънуване.',
        'Смехът намалява нивото на стресовите хормони и укрепва имунната система.',
        'Хората и делфините са единствените животни, забелязани да се занимават с игра без полза за оцеляване.',
        'Скуката е полезна – мозъкът в тих режим решава проблеми и поражда идеи.',
        'Мозъкът не различава болезнен спомен от реалната болка – реагира почти идентично.',
        'Писането на ръка активира повече мозъчни зони, отколкото писането на клавиатура.',
        'Четенето на художествена литература увеличава емпатията – доказано в неврологични изследвания.',
        'Мозъкът на новородено бебе е 25% от размера на мозъка на възрастен – при шимпанзетата е 45%.',
        'Паметта не е запис – тя е реконструкция. Всеки път като си спомняш нещо, малко го променяш.',
        'Децата, учещи музикален инструмент, показват по-добри резултати по математика и езици.',
        'Двуезичните хора развиват деменция средно 5 години по-късно от едноезичните.',
        'Физическото упражнение преди учене увеличава задържането на информация с до 20%.',
        'Любопитството активира хипокампуса и мотивационните пътища – буквално помага за запомняне.',
        'Принт Щрайт е 3.2 км широк – най-тесният международен воден път в света.',
        'Гробницата на Тутанкамон е открита случайно – работникът спъва крак в горната й стъпало.',
      ];
      var tipEl = document.getElementById('sb-znayko-tip-txt');
      if (tipEl) tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      TIPS = null; // освободи памет

      var sessionRes = await sb.auth.getSession();
      var session = sessionRes.data.session;
      if (!session) return;

      var userRes = await sb.auth.getUser();
      var user = userRes.data?.user || session.user;

      var profileRes = await sb.from('profiles')
        .select('full_name,plan,trial_started_at')
        .eq('id', user.id)
        .single();
      var profile = profileRes.data || {};

      // ── Access gate ──
      var PAID_PLANS_SB = ['active', 'focus', 'podgotovka', 'otlichnik'];
      var OPEN_PATHS = ['/settings.html', '/auth.html', '/', '/index.html', '/terms.html', '/privacy.html', '/dnevnik.html', '/istoriya.html', '/dnevnik-book.html'];
      var currentPath = window.location.pathname;
      var isOpenPath = OPEN_PATHS.indexOf(currentPath) !== -1 || currentPath === '/admin.html' || currentPath.startsWith('/admin/');

      if (!isOpenPath) {
        var plan = profile.plan;
        var isPaidNow = PAID_PLANS_SB.indexOf(plan) !== -1;
        var isExpiredPlan = plan === 'expired';
        var trialMs = profile.trial_started_at ? (Date.now() - new Date(profile.trial_started_at)) / 86400000 : 0;
        var isTrialExpired = !isPaidNow && !isExpiredPlan && profile.trial_started_at && trialMs > 3;

        if (isExpiredPlan || isTrialExpired) {
          // Greyout page content
          var style = document.createElement('style');
          style.textContent = 'body.access-locked main, body.access-locked .lesson-page, body.access-locked .ur-wrap { filter: blur(3px) grayscale(0.4); pointer-events: none; user-select: none; }';
          document.head.appendChild(style);
          document.body.classList.add('access-locked');

          // Overlay
          var msg = isExpiredPlan
            ? 'Абонаментът ти е изтекъл.'
            : 'Пробният ти период е изтекъл.';
          var overlay = document.createElement('div');
          overlay.style.cssText = [
            'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;',
            'background:rgba(15,23,42,0.55);backdrop-filter:blur(2px);'
          ].join('');
          overlay.innerHTML = [
            '<div style="background:#fff;border-radius:24px;padding:44px 48px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.22);">',
            '<div style="margin-bottom:20px;color:#0f172a;">' + svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>').replace('width="20" height="20"', 'width="52" height="52"').replace('stroke-width="1.6"', 'stroke-width="1.4"') + '</div>',
            '<div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px;">' + msg + '</div>',
            '<div style="font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.6;">За да продължиш да учиш, поднови абонамента си.</div>',
            '<a href="/settings.html?tab=subscription" style="display:inline-block;background:#E8A020;color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Поднови плана →</a>',
            '<div style="margin-top:16px;"><a href="/dnevnik.html" style="font-size:13px;color:#64748b;text-decoration:none;">Обратно към дневника</a></div>',
            '</div>'
          ].join('');
          document.body.appendChild(overlay);
          return;
        }
      }

      // User row
      var initials = (function () {
        var n = profile.full_name || user.user_metadata?.full_name || '';
        if (n.trim()) {
          var parts = n.trim().split(' ');
          return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        }
        return user.email.slice(0, 2).toUpperCase();
      })();

      var displayName = (function () {
        var n = (profile.full_name || user.user_metadata?.full_name || '').trim();
        if (n) {
          var parts = n.split(' ').filter(Boolean);
          return parts.length >= 2 ? parts[0] + ' ' + parts[1][0] + '.' : parts[0];
        }
        return user.email.split('@')[0];
      })();

      var savedAvatar = localStorage.getItem('userAvatar');
      var avatarEl = document.getElementById('sb-avatar');
      if (savedAvatar) {
        avatarEl.textContent = savedAvatar;
        avatarEl.style.fontSize = '18px';
      } else {
        avatarEl.textContent = initials;
        avatarEl.style.fontSize = '';
      }
      document.getElementById('sb-user-name').textContent = displayName;
      document.getElementById('sb-user').style.display = 'flex';

      // Admin link
      var ADMIN_EMAILS = ['kirilmodev@gmail.com', 'help.razberi.me@gmail.com'];
      if (ADMIN_EMAILS.indexOf(user.email) !== -1) {
        document.getElementById('sb-admin-link').style.display = 'flex';
      }

      // Logout
      document.getElementById('sb-logout').addEventListener('click', async function () {
        await sb.auth.signOut();
        window.location.href = '/';
      });

      // Plan card
      var plan = profile.plan;
      if (plan && plan !== 'free') {
        var card = document.getElementById('sb-plan-card');
        var dot = document.getElementById('sb-plan-dot');
        var nameEl = document.getElementById('sb-plan-name');
        var statusEl = document.getElementById('sb-plan-status');
        var untilEl = document.getElementById('sb-plan-until');
        var linkEl = document.getElementById('sb-plan-link');
        var PLAN_NAMES = { focus: 'Фокус план', podgotovka: 'Подготовка', otlichnik: 'Отличник', active: 'Активен план', trial: 'Пробен период', expired: 'Абонамент' };

        if (plan === 'expired') {
          card.className = 'sb-plan-card';
          dot.className = 'sb-plan-dot dot-expired';
          nameEl.textContent = 'Абонаментът е изтекъл';
          statusEl.className = 'sb-plan-badge st-expired';
          statusEl.textContent = 'Неактивен';
          untilEl.textContent = '';
          linkEl.className = 'sb-plan-link';
          linkEl.textContent = 'Поднови плана →';
        } else if (plan === 'trial') {
          var trialDays = profile.trial_started_at ? (Date.now() - new Date(profile.trial_started_at)) / 86400000 : 0;
          var TRIAL_DAYS_SB = 3;
          var daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS_SB - trialDays));
          card.className = 'sb-plan-card';
          dot.className = 'sb-plan-dot dot-trial';
          nameEl.textContent = 'Пробен период';
          statusEl.className = 'sb-plan-badge st-trial';
          statusEl.textContent = daysLeft > 0 ? (daysLeft + (daysLeft === 1 ? ' ден' : ' дни')) : 'Изтекъл';
          untilEl.textContent = '';
          linkEl.className = 'sb-plan-link';
          linkEl.textContent = 'Виж плановете →';
        } else {
          card.className = 'sb-plan-card';
          dot.style.display = 'none';
          nameEl.textContent = '';
          nameEl.style.display = 'none';
          statusEl.className = 'sb-plan-badge st-active';
          statusEl.textContent = 'Активен';
          var renewsAt = profile.subscription_renews_at;
          if (renewsAt) {
            var d = new Date(renewsAt);
            untilEl.textContent = 'Подновяване: ' + d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
          } else {
            untilEl.textContent = '';
          }
          linkEl.className = 'sb-plan-link';
          linkEl.textContent = 'Управление на плана →';
        }
        card.style.display = 'block';
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
