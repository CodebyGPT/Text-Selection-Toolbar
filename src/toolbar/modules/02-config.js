// Module 02: Configuration & State

const DEFAULT_CONFIG = {
    language: 'auto', // 'auto' (default) | 'zh-CN' | 'en' | 'ru'
    offset: 12, // px
    timeout: 2400, // ms, 0 = stays indefinitely
    buttonStyle: 'row', // 'row' (capsule) | 'col' (rounded rect)
    forceWhiteBlack: true, // true = force white bg/black text
    searchEngine: 'baidu', // legacy single-engine setting, migrated into searchEngines
    enableHiddenLinks: true, // also collect links from selected <a href="...">
    unlockHotkey: 'ControlLeft',
    enablePaste: true,
    enableSafeCopyAlarm: false, // full-screen warning; the toast is always on
    // Link check scope: 'domain' (hostname, default) | 'sld' (SLD+TLD) | 'full' | 'off'
    safeCopyLinkScope: 'domain',
    showPastePreview: false, // show the pending lightning-paste text
    pasteTtl: 8, // seconds, 3-30; anything else falls back to the default
    searchEngines: [], // [{ name, url }], max 8

    enableDragPreview: false,
    scrollRepaintMode: 'always',
    disableFestivalEffect: false, // hide festival emoji particles
    enableTranslate: true, // show the KISS translate action
    // Sensitivity for the language-match gate: 15 / 35 / 55 / 75 (%).
    translateHideThreshold: 15,
    showBlockMenu: true,   // show the "hide page elements" menu entry
    showTranslateMenu: true,
};

// Chinese-only extras (cloud-drive codes, smart fallback engine) follow the
// interface language: explicit zh-CN, or "auto" on a Chinese browser.
const isChineseUI = () => {
    const lang = configCache['language'] || 'auto';
    return lang === 'zh-CN' || (lang === 'auto' && String(navigator.language || '').startsWith('zh'));
};

// Compare base language tags (zh-CN / zh-TW / zh-Hans are all "zh").
const baseLanguageTag = (value) =>
    String(value || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];

const getCurrentLanguage = () => {
    const lang = configCache['language'] || 'auto';
    return lang === 'auto' ? String(navigator.language || '') : lang;
};

// Paste previews are bounded by display width: ASCII/half-width characters
// count as 0.5, everything else as 1. The ellipsis occupies the final unit, so
// a truncated preview never exceeds maxUnits.
function truncatePasteText(text, maxUnits) {
    const chars = Array.from(String(text ?? ''));
    const widthOf = (ch) => {
        const code = ch.codePointAt(0);
        if (code >= 0x200b && code <= 0x200f) return 0;
        return code < 128 ? 0.5 : 1;
    };
    const totalWidth = chars.reduce((sum, ch) => sum + widthOf(ch), 0);
    if (totalWidth <= maxUnits) return chars.join('');

    const contentLimit = maxUnits - 1;
    let width = 0;
    let result = '';
    for (const ch of chars) {
        const charWidth = widthOf(ch);
        if (width + charWidth > contentLimit) break;
        result += ch;
        width += charWidth;
    }
    return result + '…';
}

// Quote previews with the UI language's own quotation marks.
function getPasteQuotePair() {
    const lang = baseLanguageTag(getCurrentLanguage());
    if (lang === 'zh') return ['“', '”'];
    if (lang === 'ru') return ['«', '»'];
    return ['"', '"'];
}

// Which script(s) count as "the current language" for the ratio step.
const LANGUAGE_SCRIPTS = {
    zh: ['han'],
    ja: ['hiragana', 'katakana', 'han'],
    ko: ['hangul'],
    ru: ['cyrillic'],
    el: ['greek'],
    en: ['latin'],
    de: ['latin'],
    fr: ['latin'],
    es: ['latin'],
};

// Page declarations that carry no usable language information.
const UNKNOWN_LANGUAGE_TAGS = new Set(['', 'und', 'zxx', 'mul', 'mis']);

const getPageLanguage = () => {
    const declared = document.documentElement?.lang || document.body?.lang;
    if (declared) return declared;
    const meta = document.querySelector('meta[http-equiv="content-language" i]')
        || document.querySelector('meta[name="language" i]')
        || document.querySelector('meta[property="og:locale" i]');
    return meta?.getAttribute('content') || '';
};

// Count actual language letters; digits, punctuation, symbols, emoji, tabs,
// zero-width and other control characters are noise. One letter (even
// surrounded by noise) is not worth translating.
const countLanguageChars = (text) =>
    (String(text || '').match(/\p{L}/gu) || []).length;

const shouldHideTranslate = (text) => {
    const totalLetters = countLanguageChars(text);
    if (totalLetters <= 1) return true; // pure noise / single character

    const currentLang = baseLanguageTag(getCurrentLanguage());
    if (!currentLang) return false;

    let detected = '';
    try {
        // Sync, character-set based: no network and no noticeable latency.
        detected = typeof detectLanguage === 'function' ? detectLanguage(text) : '';
    } catch (err) {
        return false;
    }
    // Different or unknown language: the button stays available.
    if (baseLanguageTag(detected) !== currentLang) return false;

    // Current language occupies too little of the selection: still translate.
    const scripts = LANGUAGE_SCRIPTS[currentLang] || [];
    if (!scripts.length || typeof countScriptChars !== 'function') return false;
    let stats;
    try {
        stats = countScriptChars(text);
    } catch (err) {
        return false;
    }
    const currentChars = scripts.reduce((sum, key) => sum + (stats[key] || 0), 0);
    const ratio = currentChars / totalLetters;
    const threshold = Number(getConfig('translateHideThreshold'));
    const percent = Number.isFinite(threshold) && threshold > 0 ? threshold : 15;
    if (ratio < percent / 100) return false;

    // Final tie-breaker: a page written in another language still needs translation.
    // Unknown declarations are treated as the current language: hide rather than
    // showing a translate button on same-language pages with no lang metadata.
    const pageLang = baseLanguageTag(getPageLanguage());
    if (UNKNOWN_LANGUAGE_TAGS.has(pageLang)) return true;
    return pageLang === currentLang;
};

const SCROLL_REPAINT_MODE = {
    ALWAYS: 'always',      // 1. Always repaint (default)
    VIEWPORT: 'viewport',  // 2. Repaint only when anchor is within viewport
    HIDE: 'hide'           // 3. Hide on scroll, never repaint
};

const PASTE_MODE_THREE_BTNS = 'copy-search-paste';   // Lightning paste three-button mode marker
const PASTE_MODE_WHITESPACE = 'whitespace-delete-paste'; // Input whitespace selection

const SEARCH_ENGINES = {
    google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
    baidu: { name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
    brave: { name: 'Brave', url: 'https://search.brave.com/search?q=%s' },
};

// Effective search engine list, with a one-item fallback for the legacy
// single-engine setting so old installs keep working.
function getSearchEngineList() {
    const list = Array.isArray(configCache.searchEngines) ? configCache.searchEngines : [];
    const normalized = list
        .map((engine) => ({
            name: String(engine && engine.name || '').trim(),
            url: String(engine && engine.url || '').trim()
        }))
        .filter((engine) => engine.name && engine.url)
        .slice(0, 8);
    if (normalized.length > 0) return normalized;

    const legacy = configCache.searchEngine || 'baidu';
    if (SEARCH_ENGINES[legacy]) return [{ ...SEARCH_ENGINES[legacy] }];
    if (typeof legacy === 'string' && legacy.includes('%s')) {
        return [{ name: 'Custom', url: legacy }];
    }
    return [{ ...SEARCH_ENGINES.google }];
}

// Known TLDs, generated from the Public Suffix List (ICANN section).
// Source: https://publicsuffix.org/list/public_suffix_list.dat (MPL-2.0)
// Regenerate with: node scripts/update-tlds.mjs
const TLD_SET = new Set(("aaa,aarp,abb,abbott,abbvie,abc,able,abogado,abudhabi,ac,academy,accenture,accountant,accountants,aco,actor,ad,ads,adult,ae,aeg,aero,aetna,af,afl,africa,ag,agakhan,agency,ai,aig,airbus,airforce,airtel,akdn,al,alibaba,alipay,allfinanz,allstate,ally,alsace,alstom,am,amazon,americanexpress,americanfamily,amex,amfam,amica,amsterdam,analytics,android,anquan,anz,ao,aol,apartments,app,apple,aq,aquarelle,ar,arab,aramco,archi,army,arpa,art,arte,as,asda,asia,associates,at,athleta,attorney,au,auction,audi,audible,audio,auspost,author,auto,autos,aw,aws,ax,axa,az,azure,ba,baby,baidu,banamex,band,bank,bar,barcelona,barclaycard,barclays,barefoot,bargains,baseball,basketball,bauhaus,bayern,bb,bbc,bbt,bbva,bcg,bcn,bd,be,beats,beauty,beer,berlin,best,bestbuy,bet,bf,bg,bh,bharti,bi,bible,bid,bike,bing,bingo,bio,biz,bj,black,blackfriday,blockbuster,blog,bloomberg,blue,bm,bms,bmw,bn,bnpparibas,bo,boats,boehringer,bofa,bom,bond,boo,book,booking,bosch,bostik,boston,bot,boutique,box,br,bradesco,bridgestone,broadway,broker,brother,brussels,bs,bt,build,builders,business,buy,buzz,bv,bw,by,bz,bzh,ca,cab,cafe,cal,call,calvinklein,cam,camera,camp,canon,capetown,capital,capitalone,car,caravan,cards,care,career,careers,cars,casa,case,cash,casino,cat,catering,catholic,cba,cbn,cbre,cc,cd,center,ceo,cern,cf,cfa,cfd,cg,ch,chanel,channel,charity,chase,chat,cheap,chintai,christmas,chrome,church,ci,cipriani,circle,cisco,citadel,citi,citic,city,ck,cl,claims,cleaning,click,clinic,clinique,clothing,cloud,club,clubmed,cm,cn,co,coach,codes,coffee,college,cologne,com,commbank,community,company,compare,computer,comsec,condos,construction,consulting,contact,contractors,cooking,cool,coop,corsica,country,coupon,coupons,courses,cpa,cr,credit,creditcard,creditunion,cricket,crown,crs,cruise,cruises,cu,cuisinella,cv,cw,cx,cy,cymru,cyou,cz,dad,dance,data,date,dating,datsun,day,dclk,dds,de,deal,dealer,deals,degree,delivery,dell,deloitte,delta,democrat,dental,dentist,desi,design,dev,dhl,diamonds,diet,digital,direct,directory,discount,discover,dish,diy,dj,dk,dm,dnp,do,docs,doctor,dog,domains,dot,download,drive,dtv,dubai,dupont,durban,dvag,dvr,dz,earth,eat,ec,eco,edeka,edu,education,ee,eg,email,emerck,energy,engineer,engineering,enterprises,epson,equipment,ericsson,erni,es,esq,estate,et,eu,eurovision,eus,events,exchange,expert,exposed,express,extraspace,fage,fail,fairwinds,faith,family,fan,fans,farm,farmers,fashion,fast,fedex,feedback,ferrari,ferrero,fi,fidelity,fido,film,final,finance,financial,fire,firestone,firmdale,fish,fishing,fit,fitness,fj,flickr,flights,flir,florist,flowers,fly,fm,fo,foo,food,football,ford,forex,forsale,forum,foundation,fox,fr,free,fresenius,frl,frogans,frontier,ftr,fujitsu,fun,fund,furniture,futbol,fyi,ga,gal,gallery,gallo,gallup,game,games,gap,garden,gay,gb,gbiz,gd,gdn,ge,gea,gent,genting,george,gf,gg,ggee,gh,gi,gift,gifts,gives,giving,gl,glass,gle,global,globo,gm,gmail,gmbh,gmo,gmx,gn,godaddy,gold,goldpoint,golf,goodyear,goog,google,gop,got,gov,gp,gq,gr,grainger,graphics,gratis,green,gripe,grocery,group,gs,gt,gu,gucci,guge,guide,guitars,guru,gw,gy,hair,hamburg,hangout,haus,hbo,hdfc,hdfcbank,health,healthcare,help,helsinki,here,hermes,hiphop,hisamitsu,hitachi,hiv,hk,hkt,hm,hn,hockey,holdings,holiday,homedepot,homegoods,homes,homesense,honda,horse,hospital,host,hosting,hot,hotel,hotels,hotmail,house,how,hr,hsbc,ht,hu,hughes,hyatt,hyundai,ibm,icbc,ice,icu,id,ie,ieee,ifm,ikano,il,im,imamat,imdb,immo,immobilien,in,inc,industries,infiniti,info,ing,ink,institute,insurance,insure,int,international,intuit,investments,io,ipiranga,iq,ir,irish,is,ismaili,ist,istanbul,it,itau,itv,jaguar,java,jcb,je,jeep,jetzt,jewelry,jio,jll,jmp,jnj,jo,jobs,joburg,jot,joy,jp,jpmorgan,jprs,juegos,kaufen,kddi,ke,kerryhotels,kerryproperties,kfh,kg,kh,ki,kia,kids,kim,kindle,kitchen,kiwi,km,kn,koeln,komatsu,kosher,kp,kpmg,kpn,kr,krd,kred,kuokgroup,kw,ky,kyoto,kz,la,lacaixa,lamborghini,lamer,land,landrover,lanxess,lasalle,lat,latino,latrobe,law,lawyer,lb,lc,lds,lease,leclerc,lefrak,legal,lego,lexus,lgbt,li,lidl,life,lifeinsurance,lifestyle,lighting,like,lilly,limited,limo,lincoln,link,live,living,lk,llc,llp,loan,loans,locker,locus,lol,london,lotte,lotto,love,lpl,lplfinancial,lr,ls,lt,ltd,ltda,lu,lundbeck,luxe,luxury,lv,ly,ma,madrid,maif,maison,makeup,man,management,mango,map,market,marketing,markets,marriott,marshalls,mattel,mba,mc,mckinsey,md,me,med,media,meet,melbourne,meme,memorial,men,menu,merck,merckmsd,mg,mh,miami,microsoft,mil,mini,mint,mit,mitsubishi,mk,ml,mlb,mls,mma,mn,mo,mobi,mobile,moda,moe,moi,mom,monash,money,monster,mormon,mortgage,moscow,moto,motorcycles,mov,movie,mp,mq,mr,ms,msd,mt,mtn,mtr,mu,museum,music,mv,mw,mx,my,mz,na,nab,nagoya,name,navy,nba,nc,ne,nec,net,netbank,netflix,network,neustar,new,news,next,nextdirect,nexus,nf,nfl,ng,ngo,nhk,ni,nico,nike,nikon,ninja,nissan,nissay,nl,no,nokia,norton,now,nowruz,nowtv,nr,nra,nrw,ntt,nu,nyc,nz,obi,observer,office,okinawa,olayan,olayangroup,ollo,om,omega,one,ong,onion,onl,online,ooo,open,oracle,orange,org,organic,origins,osaka,otsuka,ott,ovh,pa,page,panasonic,paris,pars,partners,parts,party,pay,pccw,pe,pet,pf,pfizer,ph,pharmacy,phd,philips,phone,photo,photography,photos,physio,pics,pictet,pictures,pid,pin,ping,pink,pioneer,pizza,pk,pl,place,play,playstation,plumbing,plus,pm,pn,pnc,pohl,poker,politie,porn,post,pr,praxi,press,prime,pro,prod,productions,prof,progressive,promo,properties,property,protection,pru,prudential,ps,pt,pub,pw,pwc,py,qa,qpon,quebec,quest,racing,radio,re,read,realestate,realtor,realty,recipes,red,redumbrella,rehab,reise,reisen,reit,reliance,ren,rent,rentals,repair,report,republican,rest,restaurant,review,reviews,rexroth,rich,richardli,ricoh,ril,rio,rip,ro,rocks,rodeo,rogers,room,rs,rsvp,ru,rugby,ruhr,run,rw,rwe,ryukyu,sa,saarland,safe,safety,sakura,sale,salon,samsclub,samsung,sandvik,sandvikcoromant,sanofi,sap,sarl,sas,save,saxo,sb,sbi,sbs,sc,scb,schaeffler,schmidt,scholarships,school,schule,schwarz,science,scot,sd,se,search,seat,secure,security,seek,select,sener,services,seven,sew,sex,sexy,sfr,sg,sh,shangrila,sharp,shell,shia,shiksha,shoes,shop,shopping,shouji,show,si,silk,sina,singles,site,sj,sk,ski,skin,sky,skype,sl,sling,sm,smart,smile,sn,sncf,so,soccer,social,softbank,software,sohu,solar,solutions,song,sony,soy,spa,space,sport,spot,sr,srl,ss,st,stada,staples,star,statebank,statefarm,stc,stcgroup,stockholm,storage,store,stream,studio,study,style,su,sucks,supplies,supply,support,surf,surgery,suzuki,sv,swatch,swiss,sx,sy,sydney,systems,sz,tab,taipei,talk,taobao,target,tatamotors,tatar,tattoo,tax,taxi,tc,tci,td,tdk,team,tech,technology,tel,temasek,tennis,teva,tf,tg,th,thd,theater,theatre,tiaa,tickets,tienda,tips,tires,tirol,tj,tjmaxx,tjx,tk,tkmaxx,tl,tm,tmall,tn,to,today,tokyo,tools,top,toray,toshiba,total,tours,town,toyota,toys,tr,trade,trading,training,travel,travelers,travelersinsurance,trust,trv,tt,tube,tui,tunes,tushu,tv,tvs,tw,tz,ua,ubank,ubs,ug,uk,unicom,university,uno,uol,ups,us,uy,uz,va,vacations,vana,vanguard,vc,ve,vegas,ventures,verisign,versicherung,vet,vg,vi,viajes,video,vig,viking,villas,vin,vip,virgin,visa,vision,viva,vivo,vlaanderen,vn,vodka,volvo,vote,voting,voto,voyage,vu,wales,walmart,walter,wang,wanggou,watch,watches,weather,weatherchannel,web,webcam,weber,website,wed,wedding,weibo,weir,wf,whoswho,wien,wiki,williamhill,win,windows,wine,winners,wme,woodside,work,works,world,wow,ws,wtc,wtf,xbox,xerox,xihuan,xin,xxx,xyz,yachts,yahoo,yamaxun,yandex,ye,yodobashi,yoga,yokohama,you,youtube,yt,yun,za,zappos,zara,zero,zip,zm,zone,zuerich,zw").split(","));

// Runtime state
let cachedSelection = { text: '', html: '' };
let uiTimer = null;
let toastTimer = null;
let isScrolling = false;
let scrollTimeout = null;
let shadowRoot = null;
let hostElement = null;

// Config cache object (initialized to defaults)
let configCache = { ...DEFAULT_CONFIG };

// Synchronous read (direct memory access, fastest, non-blocking)
const getConfig = (key) => {
    return configCache[key];
};

// Keep an old or hand-edited setting from making the lightning-paste button
// live forever. The settings UI uses the same bounds.
const PASTE_TTL_DEFAULT = 8;
const PASTE_TTL_MIN = 3;
const PASTE_TTL_MAX = 30;

const normalizePasteTtl = (value) => {
    const seconds = Number(value);
    return Number.isInteger(seconds) && seconds >= PASTE_TTL_MIN && seconds <= PASTE_TTL_MAX
        ? seconds
        : PASTE_TTL_DEFAULT;
};

const getPasteTtlMs = () => normalizePasteTtl(getConfig('pasteTtl')) * 1000;

// Async write (update memory + persist to storage)
const setConfig = async (key, val) => {
    configCache[key] = val; // Immediate memory update for responsive interaction
    await safeSetValue(key, val); // Async persist to storage
};
