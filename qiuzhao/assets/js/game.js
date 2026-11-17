
// ══════════════════════════════════════════
//  打包后的本地素材基址
// ══════════════════════════════════════════
const S = 'assets/images/';
const BG = {
  splash:   S+'char_hr.png',   // 占位，splash 用独立色
  court:    'assets/images/bg_gongting---8836cb75-876f-4266-a7de-f23a321b9d14.png',
  garden:   S+'bg_garden_sun.png',
  chamber:  'assets/images/bg_shufang---828c83cf-5ac2-42f9-88f3-e5cb1d7da66e.png',
  hall:     'assets/images/bg_hougong---4953856d-25f8-4382-897d-75b18f258197.png',
};

// 修复后的半身立绘共用尺寸规则，衣物与团扇保持不透明。
const REPAIRED_SPRITES = {'char_shen.png':'assets/images/shen-halfbody-v2.png','char_jing.png':'assets/images/jing-halfbody-v2.png'};
function characterSpriteUrl(character){return REPAIRED_SPRITES[character.sp]||S+character.sp}

// 角色配置：sprite / name / bg / side('left'|'both' 表示需要与玩家面对面)
const CHARS = {
  hr:    {sp:'char_hr.png', name:'苏嬷嬷（秋选接引）', bg:'court'},
  su:    {sp:'char_su.png', name:'苏培盛（秋选接引）', bg:'court'},
  hua:   {sp:'char_hua.png', name:'华妃（同场竞争者）', bg:'garden'},
  shen:  {sp:'char_shen.png', name:'沈眉庄（同行盟友）', bg:'chamber'},
  jing:  {sp:'char_jing.png', name:'敬妃（公开试艺主考）', bg:'chamber'},
  queen: {sp:'char_queen.png', name:'皇后（终面考官）', bg:'hall'},
};

const PLAYER_SP = {female:'char_player_f_bust_v8.png', male:'char_player_m_bust_v13.png'};

// 宫廷秋招采用独立的确定性分支引擎；外观选择不改变机会与结局规则。
const STORY_NPCS={recruiter:{female:'hr',male:'su'},rival:{female:'hua',male:'hua'},mentor:{female:'shen',male:'shen'},specialist:{female:'jing',male:'jing'},examiner:{female:'queen',male:'queen'}};
const STORY_ROLES={recruiter:'秋选接引 · 招聘负责人',rival:'首席候选 · 同场竞争者',mentor:'同行候选 · 可选盟友',specialist:'公开试艺 · 专业评审',examiner:'终面考官 · 录用决策者'};
function storyCharacter(role){return CHARS[STORY_NPCS[role][state.gender]]}
let currentResult=null;
const endingCollection=new Set();
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

let state = {
  gender:'female', name:'',
  sceneIdx:0, qIdxInScene:0, dialoguePhase:'intro', lineIdx:0,
  answers:[],run:null,activeNpcRole:'recruiter',
  phase:'splash',
};

// ══════════════════════════════════════════
//  工具
// ══════════════════════════════════════════
function setBg(key){
  const url = BG[key];
  if(url && !url.endsWith('char_hr.png')){
    const bg = document.getElementById('bg');
    bg.style.background = `#1a0e05 url('${url}') center center / cover no-repeat`;
    bg.style.backgroundImage = `url('${url}')`;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center center';
    bg.style.backgroundRepeat = 'no-repeat';
  }
}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function spawnPetals(n=5){['🌸','🌺','✨','🍂','⭐'].forEach((e,i)=>{if(i>=n)return;const p=document.createElement('div');p.className='petal';p.textContent=e;p.style.left=Math.random()*100+'vw';p.style.top='-20px';p.style.fontSize=(13+Math.random()*12)+'px';p.style.animationDuration=(2+Math.random()*2.5)+'s';p.style.animationDelay=(Math.random()*(n>4?.8:.3))+'s';document.body.appendChild(p);setTimeout(()=>p.remove(),5e3)})}

function setSprites(charKey,{portrait,scene=true}={}){
  const ch=CHARS[charKey],wrap=document.getElementById('npc-sprite');
  wrap.dataset.character=charKey;
  let npcEl=document.getElementById('npc-img');
  if(portrait){
    portrait.id='npc-img';portrait.classList.remove('is-ready');
    delete portrait.dataset.crop;
    wrap.replaceChildren(portrait);npcEl=portrait;
  }else if(portrait===null){
    npcEl=document.createElement('img');npcEl.id='npc-img';npcEl.hidden=true;
    wrap.replaceChildren(npcEl);
  }else npcEl.src=characterSpriteUrl(ch);
  if(portrait!==null)npcEl.hidden=false;
  npcEl.alt=ch.name.split('（')[0]+'立绘';npcEl.style.transform='scaleX(1)';

  const plEl=document.getElementById('player-img');
  plEl.src=S+PLAYER_SP[state.gender];plEl.alt='你的故事人物';
  plEl.style.transformOrigin='right bottom';plEl.style.transform='scaleX(1)';
  setSpriteSpeaking();
  document.getElementById('npc-name-text').textContent=ch.name;
  if(scene)setBg(ch.bg);
}

// ══════════════════════════════════════════
//  屏幕控制
// ══════════════════════════════════════════
let musicOn=false;
let effectsEnabled=true;
let musicRequested=false,musicRequestId=0;
const landingSoundPreview={active:false,session:0,timer:null,previousEffectsEnabled:true};
function unlockEffects(){
  try{return Promise.resolve(globalThis.PalaceEffects?PalaceEffects.unlock():false).then(Boolean,()=>false)}
  catch(_){return Promise.resolve(false)}
}
function cueEffect(type){if(globalThis.PalaceEffects&&PalaceEffects.cue)PalaceEffects.cue(type)}
function stopEffects(){if(globalThis.PalaceEffects)PalaceEffects.stop()}
function setEffectsEnabled(value){
  effectsEnabled=Boolean(value);
  if(globalThis.PalaceEffects)PalaceEffects.setEnabled(effectsEnabled);
  setEffectsUI();
}
function setEffectsUI(){
  const button=document.getElementById('effects-toggle');
  if(!button)return;
  button.textContent=effectsEnabled?'配音音效：开':'配音音效：关';
  button.setAttribute('aria-pressed',String(effectsEnabled));
  button.setAttribute('aria-label',effectsEnabled?'关闭角色配音与剧情音效':'开启角色配音与剧情音效');
}
function toggleEffects(event){
  if(event)event.stopPropagation();
  const next=!effectsEnabled;
  stopLandingSoundPreview('试听已停止。',{restoreEffects:false});
  if(next)unlockEffects();
  setEffectsEnabled(next);
  if(effectsEnabled)cueEffect('confirm');
}
function setMusicUI(on){
  const b=document.getElementById('music-toggle');
  if(!b)return;
  b.classList.toggle('off',!on);
  b.setAttribute('aria-pressed',String(on));
  b.setAttribute('aria-label',on?'背景音乐已开启':'背景音乐已关闭');
}
function stopMusic(){
  musicRequestId++;musicRequested=false;musicOn=false;
  const a=document.getElementById('bgm');
  if(a)a.pause();
  setMusicUI(false);
}
function playMusic({notify=true,onError}={}){
  const a=document.getElementById('bgm');
  if(!a||typeof a.play!=='function')return Promise.resolve(false);
  const request=++musicRequestId;musicRequested=true;
  a.volume=.42;
  const failed=()=>{
    if(request!==musicRequestId)return false;
    musicRequested=false;musicOn=false;a.pause();setMusicUI(false);
    if(onError)onError();
    if(notify)showToast('配乐暂未能播放，可以稍后点击音乐按钮重试');
    return false;
  };
  let pending;
  try{pending=a.play()}catch(_){return Promise.resolve(failed())}
  return Promise.resolve(pending).then(()=>{
    // A late play promise cannot revive a cancelled preview or silence a newer request.
    if(request!==musicRequestId||!musicRequested){if(!musicRequested)a.pause();return false}
    musicOn=true;setMusicUI(true);
    if(notify)showToast('背景音乐已开启');
    return true;
  },failed);
}
function toggleMusic(e){
  if(e)e.stopPropagation();
  if(landingSoundPreview.active){stopLandingSoundPreview('试听已停止，配乐已关闭。');showToast('已关闭背景音乐');return}
  const a=document.getElementById('bgm');
  if(musicRequested||musicOn||(a&&!a.paused)){stopMusic();showToast('已关闭背景音乐')}
  else playMusic();
}
function setLandingSoundUI(message){
  const button=document.getElementById('landing-sound-preview');
  if(button){
    button.textContent=landingSoundPreview.active?'停止试听':'先听一段';
    button.setAttribute('aria-pressed',String(landingSoundPreview.active));
    button.setAttribute('aria-label',landingSoundPreview.active?'停止试听配音与配乐':'试听约六秒配音与配乐');
  }
  const status=document.getElementById('landing-sound-status');
  if(status){status.setAttribute('aria-live','polite');if(message!==undefined)status.textContent=message}
}
function stopLandingSoundPreview(message='试听已停止，可开启声音进入。',{restoreEffects=true}={}){
  const preview=landingSoundPreview,wasActive=preview.active;
  preview.session++;preview.active=false;
  clearTimeout(preview.timer);preview.timer=null;
  if(!wasActive)return false;
  stopEffects();stopMusic();
  if(restoreEffects)setEffectsEnabled(preview.previousEffectsEnabled);
  setLandingSoundUI(message);
  return true;
}
function previewLandingSound(){
  const screen=document.getElementById('screen-splash');
  if(state.phase!=='splash'||!screen||screen.style.display==='none')return false;
  if(landingSoundPreview.active){stopLandingSoundPreview();return false}
  const preview=landingSoundPreview;
  preview.session++;preview.active=true;preview.previousEffectsEnabled=effectsEnabled;
  const session=preview.session;
  stopEffects();setEffectsEnabled(true);
  setLandingSoundUI('正在试听配乐与沈眉庄的声音，约六秒。');
  const current=()=>preview.active&&preview.session===session&&state.phase==='splash'&&screen.style.display!=='none';
  // Both browser audio permissions are requested directly inside this click handler.
  const unlocked=unlockEffects();
  playMusic({notify:false,onError:()=>{if(current())setLandingSoundUI('配乐暂未能播放；若未听到配音，请检查设备音量后再试。')}});
  Promise.resolve(unlocked).then(ready=>{
    if(!current())return;
    if(ready&&globalThis.PalaceEffects)PalaceEffects.play('approval','mentor','shenCalm');
    else setLandingSoundUI('若未听到声音，请检查设备音量后再试。');
  },()=>{if(current())setLandingSoundUI('若未听到声音，请检查设备音量后再试。')});
  preview.timer=setTimeout(()=>{if(current())stopLandingSoundPreview('试听结束，可开启声音进入。')},6000);
  return true;
}
function startGameFromLanding(withSound=true){
  stopLandingSoundPreview();
  if(withSound){
    setEffectsEnabled(true);unlockEffects();
    playMusic({notify:false,onError:()=>showToast('配乐暂未能播放，可点击右上角音乐按钮重试')});
    cueEffect('confirm');
  }else{
    setEffectsEnabled(false);stopEffects();stopMusic();
  }
  showGenderScreen(false);
}
function showGenderScreen(withConfirmation=true){
  stopLandingSoundPreview();
  if(withConfirmation){unlockEffects();cueEffect('confirm')}
  document.body.classList.remove('landing-open');
  document.getElementById('screen-splash').style.display='none';
  document.getElementById('screen-gender').classList.add('active');
}
function selectGender(g){
  unlockEffects();cueEffect('confirm');
  state.gender=g;
  preloadCinemaAssets();
  document.getElementById('name-hint-text').textContent = '这份秋选名帖，该写下谁的名字？';
  document.getElementById('screen-gender').classList.remove('active');
  document.getElementById('screen-name').classList.add('active');
}
function confirmName(){
  unlockEffects();
  state.name = document.getElementById('name-input').value.trim() || '初来者';
  document.getElementById('screen-name').classList.remove('active');
  startPrologue();
}

// ══════════════════════════════════════════
//  游戏主流程
// ══════════════════════════════════════════
// 自动序章与正式答题各自管理播放状态。
// 序章只讲故事，不记录答案；四位同行人的职责也用于正式对话姓名牌。
const prologueCinema={active:false,session:0,frameToken:0,schedule:0,index:0,frames:[],remaining:0,startedAt:0,playing:false,loading:false,assetError:false,manualPaused:false,hiddenPaused:false,timer:null,raf:null,loaders:new Set()};
// 缓存已解码的图片节点。切幕只订阅加载结果，离开序章不会让迟到的请求改写画面。
const cinemaAssetCache=new Map();
// 正式剧情保留独立的已解码节点，人物换场不会移走序章的 DOM。
const storyPortraitCache=new Map();
const CINEMA_ASSET_TIMEOUT=15000;
function prepareCinemaAsset(url,priority='low',cache=cinemaAssetCache){
  let asset=cache.get(url);
  if(asset&&asset.status!=='error'){
    if(priority==='high')asset.image.fetchPriority='high';
    return asset;
  }
  const image=new Image();
  asset={image,status:'loading',listeners:new Set(),timer:null};
  cache.set(url,asset);
  image.decoding='async';image.fetchPriority=priority;
  const settle=ok=>{
    if(asset.status!=='loading')return;
    clearTimeout(asset.timer);asset.timer=null;image.onload=null;image.onerror=null;
    asset.status=ok?'ready':'error';
    const listeners=[...asset.listeners];asset.listeners.clear();
    listeners.forEach(listener=>listener(asset));
  };
  image.onload=()=>{
    // load 只代表下载完成；等 decode 后再连同文字一起入场。
    if(typeof image.decode==='function')image.decode().then(()=>settle(true),()=>settle(false));
    else settle(true);
  };
  image.onerror=()=>settle(false);
  asset.timer=setTimeout(()=>settle(false),CINEMA_ASSET_TIMEOUT);
  image.src=url;
  return asset;
}
function prepareStoryPortrait(charKey){
  const url=characterSpriteUrl(CHARS[charKey]);
  return storyPortraitCache.get(url)||prepareCinemaAsset(url,'high',storyPortraitCache);
}
function preloadStoryPortraits(){
  for(const[url,asset]of storyPortraitCache)if(asset.status==='error')storyPortraitCache.delete(url);
  [...new Set(Object.values(STORY_NPCS).map(route=>route[state.gender]))].forEach(prepareStoryPortrait);
}
function preloadCinemaAssets(){
  preloadStoryPortraits();
  const frames=cinemaFrames();
  // 从取名阶段开始准备；人物优先，背景随后，正式剧情也能复用浏览器缓存。
  frames.filter(frame=>frame.character).forEach(frame=>prepareCinemaAsset(characterSpriteUrl(frame.character)));
  [...new Set(frames.map(frame=>frame.bg).filter(Boolean))].forEach(url=>prepareCinemaAsset(url));
}
function cinemaElement(id){return document.getElementById(id)}
function cinemaFrames(){
  const name=state.name||'初来者';
  return [
    {duration:6500,modern:true,bg:null,eyebrow:'现实 · 凌晨 01:47',title:'投递成功？',role:name+' 的秋招倒计时',subtitle:'你刚把“简历_最终版”拖进投递框，屏幕却弹出一行陌生小字：“秋选名帖已收，三日后定去留。”下一秒，键盘声变成了宫门落锁的声响。'},
    {duration:5500,bg:BG.court,eyebrow:'穿越 · 宫门已闭',title:'秋招，换了个朝代',role:'名帖是简历 · 试差是群面 · 殿试是终面',subtitle:'手机没有信号，手里却多了一纸候选名帖。你想回到原来的夜晚，必须先走完这场秋选——拿到什么机会，又要不要留下，都由你决定。'},
    {duration:6000,bg:BG.court,character:storyCharacter('recruiter'),eyebrow:'先认清规则',title:storyCharacter('recruiter').name.split('（')[0],role:STORY_ROLES.recruiter,subtitle:'“正选名额只有一个。白日同场试差，夜里自行准备；别人的好话未必是门路，自己留下的证据才带得进终面。”'},
    {duration:6000,bg:BG.garden,character:storyCharacter('rival'),eyebrow:'有人已经先你一步',title:'华妃',role:STORY_ROLES.rival,subtitle:'“初来乍到，跟着我的方案走，少吃些苦。”她将任务单翻到背面，署名的位置却已经写好了自己的名字。你注意到了。'},
    {duration:6000,bg:BG.chamber,character:storyCharacter('mentor'),eyebrow:'也有人愿意与你并肩',title:'沈眉庄',role:STORY_ROLES.mentor,subtitle:'“我也在候选名册里。若愿意，我们可以互相搭手；想独立准备，也自有通路。”她递来一份物料表，又指了指公开试艺的告示。'},
    {duration:5000,bg:BG.chamber,character:storyCharacter('specialist'),eyebrow:'机会，不只藏在一张榜里',title:'敬妃',role:STORY_ROLES.specialist,subtitle:'“筹办、专业、联合承办、宫外委托，各有考法。”她展开试艺榜：作品可以独立送审，竞争者也可以谈合作。选哪条路，要看你愿意交出什么。'},
    {duration:5500,bg:BG.hall,character:storyCharacter('examiner'),eyebrow:'三日秋选 · '+totalQuestions()+'次抉择',title:'你敢不敢改写名单',role:'争取录用机会，也看清录用的代价',subtitle:'皇后合上名册：“本宫要听你做成了什么，也会查你说过的话。”保住准备时辰，收好线索，记住承诺。宫门之内，每一步都会留下回声。'}
  ];
}
function clearCinemaLoads(){
  prologueCinema.loaders.forEach(cancel=>cancel());
  prologueCinema.loaders.clear();
}
function cancelCinemaSchedule(){
  const c=prologueCinema;c.schedule++;
  if(c.timer!==null)clearTimeout(c.timer);
  if(c.raf!==null)cancelAnimationFrame(c.raf);
  c.timer=null;c.raf=null;
}
function cinemaElapsed(){
  const c=prologueCinema;
  if(!c.frames.length)return 0;
  const spent=c.frames[c.index].duration-c.remaining+(c.playing?Math.max(0,performance.now()-c.startedAt):0);
  return c.frames.slice(0,c.index).reduce((sum,frame)=>sum+frame.duration,0)+Math.min(c.frames[c.index].duration,spent);
}
function updateCinemaProgress(){
  const c=prologueCinema,total=c.frames.reduce((sum,frame)=>sum+frame.duration,0);
  const fraction=total?Math.min(1,Math.max(0,cinemaElapsed()/total)):0;
  cinemaElement('cinema-progress-fill').style.transform=`scaleX(${fraction})`;
  cinemaElement('cinema-progress').setAttribute('aria-valuenow',String(Math.round(fraction*100)));
}
function updateCinemaControls(){
  const c=prologueCinema,paused=c.manualPaused||c.hiddenPaused;
  cinemaElement('screen-prologue').classList.toggle('is-paused',paused);
  cinemaElement('screen-prologue').classList.toggle('is-loading',c.loading);
  cinemaElement('cinema-stage').setAttribute('aria-busy',String(c.loading));
  const button=cinemaElement('cinema-pause');
  button.textContent=paused?'继续':'暂停';
  button.setAttribute('aria-label',paused?'继续播放序章':'暂停序章');
  button.setAttribute('aria-pressed',String(paused));
  cinemaElement('cinema-status').textContent=c.loading?'正在准备下一幕…':paused?'已暂停':c.assetError?'部分画面未载入，可继续':'';
  const next=cinemaElement('cinema-next');
  next.textContent=c.index===c.frames.length-1?'入局 ›':c.frames[c.index]?.character?'下一位 ›':'下一幕 ›';
  next.setAttribute('aria-label',c.index===c.frames.length-1?'结束序章并开始游戏':c.frames[c.index]?.character?'跳过当前人物介绍，前往下一幕':'前往下一幕');
}
function pauseCinemaPlayback(){
  const c=prologueCinema;
  if(c.playing)c.remaining=Math.max(0,c.remaining-Math.max(0,performance.now()-c.startedAt));
  c.playing=false;cancelCinemaSchedule();updateCinemaProgress();updateCinemaControls();
}
function resumeCinemaPlayback(){
  const c=prologueCinema;
  if(!c.active||state.phase!=='prologue'||c.loading||c.manualPaused||c.hiddenPaused||c.playing)return;
  cancelCinemaSchedule();c.playing=true;c.startedAt=performance.now();
  const session=c.session,schedule=c.schedule;
  const valid=()=>c.active&&c.session===session&&c.schedule===schedule&&c.playing&&state.phase==='prologue';
  const tick=()=>{if(!valid())return;updateCinemaProgress();c.raf=requestAnimationFrame(tick)};
  c.raf=requestAnimationFrame(tick);
  c.timer=setTimeout(()=>{
    if(!valid())return;
    c.remaining=0;c.playing=false;cancelCinemaSchedule();updateCinemaProgress();
    if(c.index+1<c.frames.length)renderCinemaFrame(c.index+1);else finishPrologue();
  },c.remaining);
  updateCinemaControls();
}
function loadCinemaAsset(url,onReady,onError){
  const c=prologueCinema,session=c.session,frameToken=c.frameToken;
  if(!url){onError();return}
  const asset=prepareCinemaAsset(url,'high');
  const valid=()=>c.active&&c.session===session&&c.frameToken===frameToken&&state.phase==='prologue';
  const cancel=()=>asset.listeners.delete(complete);
  const complete=result=>{
    c.loaders.delete(cancel);cancel();
    if(valid()){if(result.status==='ready')onReady(result.image);else onError()}
  };
  if(asset.status==='loading'){asset.listeners.add(complete);c.loaders.add(cancel)}
  else complete(asset);
}
function renderCinemaFrame(index){
  const c=prologueCinema;
  if(!c.active||state.phase!=='prologue')return;
  cancelCinemaSchedule();clearCinemaLoads();c.frameToken++;c.index=index;c.remaining=c.frames[index].duration;c.playing=false;c.loading=true;c.assetError=false;
  const frame=c.frames[index],screen=cinemaElement('screen-prologue');
  const session=c.session,token=c.frameToken;
  let waiting=frame.character?2:1,backgroundReady=false,portraitImage=null;
  updateCinemaControls();
  const commit=()=>{
    if(--waiting||!c.active||c.session!==session||c.frameToken!==token||state.phase!=='prologue')return;
    // 保留上一幕直到本幕素材就绪，同一帧更新人物、标题与字幕，不留下空立绘。
    c.loading=false;c.assetError=(!frame.modern&&!backgroundReady)||Boolean(frame.character&&!portraitImage);
    screen.dataset.scene=String(index);screen.dataset.hasCharacter=String(Boolean(portraitImage));screen.dataset.world=frame.modern?'modern':'palace';
    cinemaElement('cinema-eyebrow').textContent=frame.eyebrow;
    cinemaElement('cinema-title').textContent=frame.title;
    cinemaElement('cinema-role').textContent=frame.role;
    const subtitle=cinemaElement('cinema-subtitle');subtitle.textContent=frame.subtitle;
    cinemaElement('cinema-count').textContent=String(index+1).padStart(2,'0')+' / '+String(c.frames.length).padStart(2,'0');
    const next=cinemaElement('cinema-bg-'+(index%2)),previous=cinemaElement('cinema-bg-'+((index+1)%2));
    next.classList.remove('is-visible');
    if(backgroundReady&&frame.bg)next.style.backgroundImage=`url(${JSON.stringify(frame.bg)})`;
    else next.style.backgroundImage='';
    previous.classList.remove('is-visible');
    const wrap=cinemaElement('cinema-portrait-wrap'),copy=cinemaElement('cinema-copy');
    cinemaElement('cinema-portrait').classList.remove('is-ready');
    wrap.hidden=!portraitImage;
    if(portraitImage){
      // 直接挂载已解码的节点，避免对展示用 img 再赋 src 触发一次异步解码。
      portraitImage.id='cinema-portrait';portraitImage.alt=frame.title+'立绘';portraitImage.dataset.crop=frame.character.sp==='char_hua.png'?'upper':'normal';
      portraitImage.classList.remove('is-ready');wrap.replaceChildren(portraitImage);
    }
    copy.classList.remove('cinema-in');subtitle.classList.remove('cinema-in');void copy.offsetWidth;
    if(backgroundReady&&frame.bg)next.classList.add('is-visible');
    copy.classList.add('cinema-in');subtitle.classList.add('cinema-in');
    if(portraitImage)portraitImage.classList.add('is-ready');
    updateCinemaProgress();updateCinemaControls();resumeCinemaPlayback();
    cueEffect(index===1?'chapter':'page');
  };
  if(frame.modern){backgroundReady=true;commit()}else loadCinemaAsset(frame.bg,()=>{backgroundReady=true;commit()},commit);
  if(frame.character)loadCinemaAsset(characterSpriteUrl(frame.character),image=>{portraitImage=image;commit()},commit);
}
function advancePrologue(event){
  unlockEffects();
  if(event)event.stopPropagation();
  const c=prologueCinema;
  if((event&&event.detail>1)||!c.active||state.phase!=='prologue')return;
  // renderCinemaFrame 会废弃上一幕的计时器及素材回调，并保留暂停状态。
  if(c.index+1<c.frames.length)renderCinemaFrame(c.index+1);
  else finishPrologue();
}
function startPrologue(){
  stopLandingSoundPreview();
  stopPrologue();stopNarration();
  const c=prologueCinema;c.active=true;c.session++;c.frames=cinemaFrames();c.index=0;c.manualPaused=false;c.hiddenPaused=Boolean(document.hidden);
  state.phase='prologue';state.answers=[];
  setGameActionsVisible(true);
  document.getElementById('stage').classList.remove('playing');
  document.getElementById('dialogue-area').style.display='none';
  document.getElementById('choice-overlay').classList.remove('active');
  const screen=cinemaElement('screen-prologue');screen.classList.add('active');
  renderCinemaFrame(0);preloadCinemaAssets();screen.focus({preventScroll:true});
}
function toggleProloguePause(){
  const c=prologueCinema;if(!c.active||state.phase!=='prologue')return;
  c.manualPaused=!c.manualPaused;
  if(c.manualPaused||c.hiddenPaused)pauseCinemaPlayback();else resumeCinemaPlayback();
  updateCinemaControls();
}
function stopPrologue(){
  stopEffects();
  const c=prologueCinema;c.active=false;c.playing=false;c.session++;c.frameToken++;cancelCinemaSchedule();clearCinemaLoads();
  setGameActionsVisible(false);
  c.manualPaused=false;c.hiddenPaused=false;c.loading=false;c.assetError=false;c.remaining=0;c.frames=[];c.index=0;
  const screen=cinemaElement('screen-prologue');screen.classList.remove('active','is-paused','is-loading');delete screen.dataset.scene;delete screen.dataset.hasCharacter;delete screen.dataset.world;
  cinemaElement('cinema-copy').classList.remove('cinema-in');
  cinemaElement('cinema-subtitle').classList.remove('cinema-in');
  ['cinema-eyebrow','cinema-title','cinema-role','cinema-subtitle','cinema-count'].forEach(id=>{cinemaElement(id).textContent=''});
  ['cinema-bg-0','cinema-bg-1'].forEach(id=>{const bg=cinemaElement(id);bg.classList.remove('is-visible');bg.style.backgroundImage=''});
  const portrait=cinemaElement('cinema-portrait');portrait.classList.remove('is-ready');cinemaElement('cinema-portrait-wrap').hidden=true;
  cinemaElement('cinema-progress-fill').style.transform='scaleX(0)';cinemaElement('cinema-progress').setAttribute('aria-valuenow','0');updateCinemaControls();
}
function finishPrologue(){
  if(!prologueCinema.active||state.phase!=='prologue')return;
  stopPrologue();startGame();
}
document.addEventListener('visibilitychange',()=>{
  const c=prologueCinema;if(!c.active||state.phase!=='prologue')return;
  c.hiddenPaused=Boolean(document.hidden);
  if(c.hiddenPaused)pauseCinemaPlayback();else if(!c.manualPaused)resumeCinemaPlayback();else updateCinemaControls();
});
window.addEventListener('keydown',event=>{
  if(shareDialogState.open)return;
  if(!prologueCinema.active||state.phase!=='prologue'||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
  const target=event.target;
  if(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON','A','SUMMARY'].includes(target.tagName)))return;
  if(event.key===' '){event.preventDefault();toggleProloguePause()}
  else if(event.key==='ArrowRight'){event.preventDefault();advancePrologue()}
  else if(event.key==='Escape'){event.preventDefault();finishPrologue()}
});

function totalQuestions(){return PalaceGame.TOTAL_STEPS}
function startGame(){
  stopLandingSoundPreview();
  closeShareDialog(false);
  resetChoiceGuidance(true);
  resetPDFDownload();stopPrologue();stopNarration();
  currentResult=null;state.run=PalaceGame.createRun();state.answers=[];state.phase='playing';
  preloadStoryPortraits();
  document.getElementById('screen-result').classList.remove('active');
  document.getElementById('stage').classList.add('playing');
  setGameActionsVisible(true);startQuestionStory();
}
// The inventory points to actions; locating a clue never spends it or submits an answer.
let choiceHelpSeen=false,lastChoiceHelpKey='';
function resetChoiceGuidance(newRun=false){
  if(newRun)choiceHelpSeen=false;
  lastChoiceHelpKey='';
  document.getElementById('choice-guidance').hidden=true;
  document.getElementById('choice-guidance-title').textContent='';
  document.getElementById('choice-guidance-text').textContent='';
  Array.from(document.getElementById('choice-list').children).forEach(button=>button.classList.remove('clue-target'));
  document.getElementById('inventory-panel').open=false;
}
function showChoiceGuidance(key,title,text){
  if(lastChoiceHelpKey===key)return;
  lastChoiceHelpKey=key;
  document.getElementById('choice-guidance-title').textContent=title;
  document.getElementById('choice-guidance-text').textContent=text;
  document.getElementById('choice-guidance').hidden=false;
  requestAnimationFrame(updateDiaH);
}
function explainLockedChoice(nodeId,index){
  if(storyPortraitLoad.loading||state.phase!=='playing'||state.dialoguePhase!=='question'||!state.run)return;
  const node=PalaceGame.getNode(state.run),option=node.options[index];
  if(node.id!==nodeId||!option||option.available)return;
  unlockEffects();if(lastChoiceHelpKey!==node.id+':'+option.id)cueEffect('locked');
  choiceHelpSeen=true;
  showChoiceGuidance(node.id+':'+option.id,'这条路暂时走不通',option.lockedReason+' 你可以选择本幕的其他行动，结局后也能回到此前的关键选择再试。');
}
function locateClueAction(itemId,optionId){
  if(storyPortraitLoad.loading||state.phase!=='playing'||state.dialoguePhase!=='question'||!state.run)return;
  const node=PalaceGame.getNode(state.run),index=node.options.findIndex(option=>option.id===optionId),option=node.options[index];
  const item=PalaceGame.summarize(state.run).inventory.find(entry=>entry.id===itemId);
  if(!item||!option||!option.available||!option.uses.includes(itemId))return;
  unlockEffects();cueEffect('clue');
  Array.from(document.getElementById('choice-list').children).forEach(button=>button.classList.remove('clue-target'));
  const button=document.getElementById('choice-list').children[index];
  button.classList.add('clue-target');document.getElementById('inventory-panel').open=false;
  showChoiceGuidance('clue:'+node.id+':'+itemId+':'+optionId,'已找到线索的用处','“'+item.label+'”可用于下方标出的行动。确认选择后才会出示；线索会留在手札中，相关场合可以再次引用。');
  button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',behavior:'auto'});
}
function updateRunLedger(){
  if(!state.run)return;
  const summary=PalaceGame.summarize(state.run);
  document.getElementById('run-time').textContent=summary.time+' 个时辰';
  document.getElementById('run-support').textContent=summary.relation;
  document.getElementById('story-goal').textContent=PalaceGame.CHAPTERS[state.sceneIdx].goal;
  document.getElementById('inventory-count').textContent=String(summary.inventory.length);
  const list=document.getElementById('run-inventory');list.innerHTML='';
  const intro=document.createElement('li');intro.className='inventory-guide';
  intro.textContent='线索如何使用？展开用途，定位相关行动，再确认选择；无需拖动，线索会随手札保留。';list.appendChild(intro);
  if(!summary.inventory.length){const empty=document.createElement('li');empty.textContent='名帖刚入册。获得的线索与成果会留在这里。';list.appendChild(empty);return}
  summary.inventory.forEach(item=>{
    const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('span');
    title.textContent=item.label;detail.textContent=item.detail;li.appendChild(title);li.appendChild(detail);
    const uses=item.uses||[];
    if(state.dialoguePhase==='question'&&uses.length){
      uses.forEach(use=>{
        const element=document.createElement(use.available?'button':'p');element.className=use.available?'clue-use-action':'clue-use-blocked';
        if(use.available){element.type='button';element.dataset.itemId=item.id;element.dataset.optionId=use.optionId;element.textContent='定位行动 · '+use.label;element.onclick=event=>{if(event)event.stopPropagation();locateClueAction(item.id,use.optionId)}}
        else element.textContent='本幕暂用不了 · '+use.reason;
        li.appendChild(element);
      });
    }else{
      const later=document.createElement('p');later.className='clue-use-later';
      later.textContent=state.dialoguePhase==='reply'?'当前回应结束后，可查看接下来的用途。':uses.length?'本幕可派上用场 · 读完对话后，在这里定位相关行动。':'先收好 · 遇到相关行动时，这里会出现使用入口。';
      li.appendChild(later);
    }
    if(item.lastUsedText){const record=document.createElement('p');record.className='clue-use-record';record.textContent=item.lastUsedText;li.appendChild(record)}
    list.appendChild(li);
  });
}
// 每段对话由玩家主动推进；读完前情才出题，读完回应才进入下一段。
let dialogueQueue=[],dialogueNext=null;
let typeTimer=null,currentTypedText='';
const storyPortraitLoad={token:0,loading:false,cancel:null};
function cancelStoryPortraitLoad(){
  storyPortraitLoad.token++;
  if(storyPortraitLoad.cancel)storyPortraitLoad.cancel();
  storyPortraitLoad.cancel=null;storyPortraitLoad.loading=false;
  document.getElementById('dialogue-area').removeAttribute('aria-busy');
}
function validStoryRole(role){return typeof role==='string'&&Object.prototype.hasOwnProperty.call(STORY_NPCS,role)}
function defaultStoryRole(){return validStoryRole(state.activeNpcRole)?state.activeNpcRole:'recruiter'}
function displayStoryPortrait(role,render){
  cancelStoryPortraitLoad();
  const token=storyPortraitLoad.token,charKey=STORY_NPCS[role][state.gender];
  const asset=prepareStoryPortrait(charKey);
  const commit=()=>{
    if(token!==storyPortraitLoad.token||state.phase!=='playing')return;
    if(storyPortraitLoad.cancel)storyPortraitLoad.cancel();
    storyPortraitLoad.cancel=null;storyPortraitLoad.loading=false;
    document.getElementById('dialogue-area').removeAttribute('aria-busy');
    setSprites(charKey,{portrait:asset.status==='ready'?asset.image:null,scene:false});
    render();
  };
  if(asset.status!=='loading'){commit();return}
  storyPortraitLoad.loading=true;
  document.getElementById('dialogue-area').setAttribute('aria-busy','true');
  document.getElementById('tap-hint').textContent='人物入场中…';
  document.getElementById('tap-hint').setAttribute('aria-label','人物入场中');
  const complete=()=>commit();
  asset.listeners.add(complete);
  storyPortraitLoad.cancel=()=>asset.listeners.delete(complete);
}
function resolveStoryVoice(line,role){
  if(line.speaker!=='npc')return null;
  const roles={huaAnger:'rival',shenCalm:'mentor',queenCaution:'examiner'};
  if(!Object.prototype.hasOwnProperty.call(roles,line.voice)||roles[line.voice]!==role)return null;
  return line.voice;
}
function stopNarration(){
  cancelStoryPortraitLoad();stopEffects();
  if(typeTimer!==null)clearInterval(typeTimer);
  typeTimer=null;currentTypedText='';dialogueQueue=[];dialogueNext=null;
  document.getElementById('stage').onclick=null;
}
function beginDialogue(lines,phase,onDone){
  cancelStoryPortraitLoad();stopEffects();resetChoiceGuidance();
  if(typeTimer!==null)clearInterval(typeTimer);
  typeTimer=null;
  document.getElementById('decision-feedback').hidden=phase!=='reply';
  dialogueQueue=lines;dialogueNext=onDone;
  state.dialoguePhase=phase;state.lineIdx=0;updateRunLedger();
  document.getElementById('choice-overlay').classList.remove('active');
  document.getElementById('dialogue-area').style.display='block';
  document.getElementById('stage').onclick=advanceNarrative;
  showDialogueLine();
  requestAnimationFrame(()=>{if(state.phase==='playing'&&state.dialoguePhase!=='question')document.getElementById('tap-hint').focus({preventScroll:true})});
}
function startQuestionStory(){
  if(!state.run||state.run.index>=totalQuestions())return;
  const node=PalaceGame.getNode(state.run),chapter=PalaceGame.CHAPTERS[node.chapter];
  const chapterChanged=state.run.index===0||state.sceneIdx!==node.chapter;
  state.sceneIdx=node.chapter;state.qIdxInScene=state.run.index%2;state.activeNpcRole=node.speaker;
  setBg(chapter.bg);
  document.getElementById('scene-label').textContent=chapter.name;
  document.getElementById('choice-node-title').textContent=node.title;
  updateStoryProgress();updateRunLedger();
  beginDialogue(node.before,'before',showCurrentQuestion);
  if(chapterChanged)cueEffect('chapter');
}
function updateStoryProgress(){
  const done=state.run?state.run.index:0;
  document.getElementById('progress-fill').style.width=(done/totalQuestions()*100)+'%';
  document.getElementById('question-counter').textContent=done===totalQuestions()?'秋选放榜':String(done+1).padStart(2,'0')+' / '+String(totalQuestions()).padStart(2,'0');
}
// 用明暗区分发言者，始终保留人物的不透明身体和衣物。
function setSpriteSpeaking(speaker='narrator'){
  ['npc','player'].forEach(role=>{
    const sprite=document.getElementById(role+'-sprite');
    sprite.style.opacity='1';
    sprite.dataset.speaking=speaker==='npc'||speaker==='player'?String(speaker===role):'neutral';
  });
}
function setStorySpeaker(speaker,role=defaultStoryRole()){
  const npc=storyCharacter(role);
  document.getElementById('dialogue-area').dataset.speaker=speaker;
  document.getElementById('npc-name-text').textContent=speaker==='player'?state.name+' · 你':speaker==='narrator'?'秋选纪事':npc.name.split('（')[0]+' · '+STORY_ROLES[role].split(' · ')[0];
  setSpriteSpeaking(speaker);
}
function updateNarrativeHint(){
  const last=state.lineIdx===dialogueQueue.length-1;
  const label=typeTimer!==null?'显示全文 ›':last&&state.dialoguePhase==='before'?'作出选择 ›':last&&state.dialoguePhase==='ending'?'揭晓秋选结局 ›':'继续对话 ›';
  const button=document.getElementById('tap-hint');
  button.textContent=label;button.setAttribute('aria-label',label.replace(' ›',''));
  document.getElementById('story-reading-hint').textContent=state.dialoguePhase==='reply'?'你的选择，故事的回声':state.dialoguePhase==='ending'?'殿门将开 · 你的名字会在哪里':'轻触画面或按空格继续';
}
function showDialogueLine(){
  if(state.phase!=='playing')return;
  cancelStoryPortraitLoad();
  if(state.lineIdx>=dialogueQueue.length){
    const next=dialogueNext;dialogueNext=null;dialogueQueue=[];
    if(next)next();
    return;
  }
  const line=dialogueQueue[state.lineIdx];
  const role=validStoryRole(line.npcRole)?line.npcRole:defaultStoryRole();
  stopEffects();
  displayStoryPortrait(role,()=>{
    setStorySpeaker(line.speaker||'npc',role);
    if(line.emotion&&globalThis.PalaceEffects){
      const voice=resolveStoryVoice(line,role);
      if(voice)PalaceEffects.play(line.emotion,role,voice);
      else PalaceEffects.play(line.emotion,role);
    }else cueEffect('page');
    typeText(line.text);
    requestAnimationFrame(updateDiaH);
  });
}

function advanceNarrative(event){
  unlockEffects();
  if(event&&event.detail>1)return;
  if(storyPortraitLoad.loading)return;
  if(state.phase!=='playing'||!['intro','before','reply','ending'].includes(state.dialoguePhase))return;
  if(typeTimer!==null){
    clearInterval(typeTimer);typeTimer=null;
    document.getElementById('dialogue-text').textContent=currentTypedText;
    updateNarrativeHint();requestAnimationFrame(updateDiaH);
    return;
  }
  state.lineIdx++;
  showDialogueLine();
}
function typeText(text){
  if(typeTimer!==null)clearInterval(typeTimer);
  currentTypedText=text;
  const el=document.getElementById('dialogue-text');
  el.textContent='';
  const characters=Array.from(text);let i=0;
  typeTimer=setInterval(()=>{
    el.textContent+=characters[i++];
    if(i>=characters.length){clearInterval(typeTimer);typeTimer=null;updateNarrativeHint();requestAnimationFrame(updateDiaH)}
  },28);
  updateNarrativeHint();
}

function showCurrentQuestion(){
  cancelStoryPortraitLoad();
  if(typeTimer!==null)clearInterval(typeTimer);
  stopEffects();resetChoiceGuidance();cueEffect('page');
  typeTimer=null;state.dialoguePhase='question';document.getElementById('stage').onclick=null;
  const node=PalaceGame.getNode(state.run);updateStoryProgress();updateRunLedger();
  displayStoryPortrait(defaultStoryRole(),()=>renderCurrentQuestion(node));
}
function renderCurrentQuestion(node){
  const items=PalaceGame.summarize(state.run).inventory;
  document.getElementById('dialogue-area').style.display='none';setSpriteSpeaking();
  document.getElementById('choice-q').textContent=node.question;
  const list=document.getElementById('choice-list');list.innerHTML='';
  node.options.forEach((opt,i)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='choice-btn';btn.id='choice-option-'+i;
    btn.classList.toggle('is-locked',!opt.available);btn.setAttribute('aria-disabled',String(!opt.available));
    const usedLabels=(opt.uses||[]).map(id=>items.find(item=>item.id===id)?.label).filter(Boolean);
    btn.innerHTML=`<span class="choice-tag">${['甲','乙','丙','丁'][i]}</span><span class="choice-option-copy"><span>${escapeHTML(opt.text)}</span><small>${escapeHTML(opt.available?opt.hint:'暂不可选 · 点击了解缘由')}</small>${usedLabels.length?`<span class="choice-clue">将用上：${escapeHTML(usedLabels.join('、'))}</span>`:''}</span>`;
    btn.onclick=event=>{if(event)event.stopPropagation();if(opt.available)selectChoice(node.id,i);else explainLockedChoice(node.id,i)};
    list.appendChild(btn);
  });
  document.getElementById('choice-overlay').classList.add('active');
  if(!choiceHelpSeen&&node.options.some(option=>!option.available)){
    choiceHelpSeen=true;
    showChoiceGuidance('first-lock','此前的准备，会影响眼前的机会','灰色行动需要特定准备或剩余时辰。点一下可查看缘由；你也可以走其他路线，继续争取属于自己的机会。');
  }
  requestAnimationFrame(()=>{updateDiaH();if(state.phase==='playing'&&state.dialoguePhase==='question'){const first=list.querySelector('button:not([aria-disabled="true"])');if(first)first.focus({preventScroll:true})}});
}
function selectChoice(questionId,optionIndex){
  unlockEffects();
  if(storyPortraitLoad.loading||state.phase!=='playing'||state.dialoguePhase!=='question'||!state.run)return;
  const node=PalaceGame.getNode(state.run),opt=node.options[optionIndex];
  if(node.id!==questionId||!Number.isInteger(optionIndex)||!opt||!opt.available)return;
  let outcome;try{outcome=PalaceGame.choose(state.run,opt.id)}catch(error){showToast(error.message);return}
  state.run=outcome.run;state.answers=state.run.answers;
  updateStoryProgress();updateRunLedger();
  document.getElementById('decision-feedback').innerHTML=outcome.feedback.map(text=>`<span>${escapeHTML(text)}</span>`).join('');
  beginDialogue(outcome.reply,'reply',()=>{
    if(state.run.index<totalQuestions()){startQuestionStory();return}
    beginDialogue([
      {speaker:'narrator',text:'殿门缓缓打开。有人攥紧名帖，有人转身离去。你低头看见那些带进终面的材料，终于明白这份名单从第一步就已经开始书写。'},
      {speaker:'npc',text:'秋选已毕。你一路留下的选择，本宫已逐一核过。现在，看看属于你的那一行。'}
    ],'ending',showResult);
  });
  cueEffect('confirm');
}

// 按键只在对话阶段推进；焦点在按钮上时交给按钮的原生点击行为。
window.addEventListener('keydown',event=>{
  if(shareDialogState.open)return;
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||![' ','Enter'].includes(event.key))return;
  if(event.target&&['INPUT','TEXTAREA','BUTTON','A','SUMMARY'].includes(event.target.tagName))return;
  if(state.phase!=='playing'||!['intro','before','reply','ending'].includes(state.dialoguePhase))return;
  event.preventDefault();advanceNarrative(event);
});

// ══════════════════════════════════════════
//  结果页
// ══════════════════════════════════════════
function showResult(){
  stopNarration();
  try{currentResult=PalaceReport.build(state.run,state.name,getGameShareUrl())}catch(error){showToast(error.message);return}
  state.phase='result';setGameActionsVisible(false);
  document.getElementById('stage').classList.remove('playing');
  document.getElementById('dialogue-area').style.display='none';document.getElementById('choice-overlay').classList.remove('active');
  const r=currentResult;endingCollection.add(r.ending.id);
  document.getElementById('result-hero-bg').style.backgroundImage=`url('${BG.hall}')`;
  document.getElementById('result-type').textContent=PalaceGame.CHAPTERS.length+'幕 · '+totalQuestions()+'次抉择 · '+state.name+'的秋选';
  document.getElementById('result-role-name').textContent=r.title;document.getElementById('result-role-sub').textContent=r.tagline;
  document.getElementById('result-offer').textContent=r.ending.offer;
  document.getElementById('ending-story').innerHTML=r.ending.paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('');
  document.getElementById('ending-return').textContent=r.ending.returnText;
  document.getElementById('ending-causes').innerHTML=r.recap.map((cause,i)=>`<article><span class="cause-index">0${i+1}</span><h3>${escapeHTML(cause.title)}</h3><p>${escapeHTML(cause.detail)}</p><button type="button" onclick="replayFromDecision(${cause.nodeIndex})">回到这次选择 ↺</button></article>`).join('');
  document.getElementById('ending-next-hint').textContent=r.ending.nextTry.hint;
  document.getElementById('ending-replay').onclick=()=>replayFromDecision(r.ending.nextTry.nodeIndex);
  document.getElementById('ending-style').innerHTML=r.style.map(item=>`<article><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p><small>${escapeHTML(item.evidence)}</small></article>`).join('');
  document.getElementById('ending-history').innerHTML=r.history.map((item,i)=>`<li><span>第 ${i+1} 次选择</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></li>`).join('');
  document.getElementById('ending-advice').innerHTML=r.advice.map(item=>`<article><h3>${escapeHTML(item.t)}</h3><p>${escapeHTML(item.d)}</p></article>`).join('');
  document.getElementById('ending-collection-count').textContent=`本次打开已见 ${endingCollection.size} / ${PalaceGame.ENDING_CATALOG.length} 个结局`;
  document.getElementById('ending-collection').innerHTML=PalaceGame.ENDING_CATALOG.map((entry,i)=>`<article class="${endingCollection.has(entry.id)?'unlocked':'locked'}"><span>${endingCollection.has(entry.id)?'已见':'待探索'} · 0${i+1}</span><h3>${escapeHTML(endingCollection.has(entry.id)?entry.title:'未揭晓的前程')}</h3><p>${escapeHTML(entry.teaser)}</p></article>`).join('');
  document.getElementById('screen-result').classList.add('active');document.getElementById('screen-result').scrollTop=0;
  document.getElementById('result-role-name').focus({preventScroll:true});
  cueEffect('ending');
}
function replayFromDecision(index){
  if(state.phase!=='result'||!state.run||!Number.isInteger(index)||index<0||index>=totalQuestions())return;
  closeShareDialog(false);
  const replay=PalaceGame.replayTo(state.run,index);
  resetPDFDownload();stopNarration();currentResult=null;
  state.run=replay;state.answers=replay.answers;state.phase='playing';
  document.getElementById('screen-result').classList.remove('active');
  document.getElementById('stage').classList.add('playing');setGameActionsVisible(true);startQuestionStory();
  showToast('已回到第 '+(index+1)+' 次抉择；之后的选择与收获已重置');
}
const pdfDownloadState={token:0,busy:false,status:'idle',url:null,filename:''};
function pdfStatusHost(){return document.fullscreenElement||document.webkitFullscreenElement||document.body}
function mountPDFStatus(){
  const panel=document.getElementById('pdf-download-status'),host=pdfStatusHost();
  if(!panel.hidden&&panel.parentElement!==host)host.appendChild(panel);
}
function updatePDFStatus(status){
  const s=pdfDownloadState,panel=document.getElementById('pdf-download-status');
  s.status=status;panel.dataset.status=status;panel.hidden=false;mountPDFStatus();
  const messages={
    generating:['正在生成 PDF…','正在整理你的秋选结局与选择回顾，请稍候。'],
    downloading:['正在下载 PDF…','报告已生成，正在向浏览器发起下载。'],
    success:['PDF 已生成，下载已发起','请在浏览器的下载记录中查看；若未出现文件，可以再次下载。'],
    error:['PDF 导出未完成','请点击重试；若浏览器拦截了下载，请允许此页面下载文件。']
  };
  const [title,detail]=messages[status];
  document.getElementById('pdf-status-title').textContent=title;
  document.getElementById('pdf-status-detail').textContent=detail;
  document.getElementById('pdf-status-file').textContent=s.filename;
  document.getElementById('pdf-status-icon').textContent=status==='success'?'✓':status==='error'?'!':'';
  document.getElementById('pdf-status-actions').hidden=s.busy;
  document.getElementById('pdf-status-retry').textContent=status==='error'?'重试下载':'再次下载';
  const button=document.getElementById('share-result-btn');
  button.disabled=s.busy;button.setAttribute('aria-busy',String(s.busy));
  button.textContent=status==='generating'?'正在生成 PDF…':s.busy?'正在下载 PDF…':'下载完整结果 PDF';
}
function resetPDFDownload(){
  const s=pdfDownloadState;s.token++;s.busy=false;s.status='idle';
  // 给已发起的下载留出读取 blob 的时间；关闭提示后再释放缓存。
  if(s.url){const url=s.url;setTimeout(()=>URL.revokeObjectURL(url),60000)}
  s.url=null;s.filename='';document.getElementById('pdf-download-status').hidden=true;
  const button=document.getElementById('share-result-btn');button.disabled=false;button.textContent='下载完整结果 PDF';button.setAttribute('aria-busy','false');
}
function closePDFStatus(){
  if(pdfDownloadState.busy)return;
  resetPDFDownload();document.getElementById('share-result-btn').focus({preventScroll:true});
}
function paintPDFStatus(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,32)))}
async function dispatchPDFDownload(token){
  const s=pdfDownloadState;
  if(s.token!==token)return;
  updatePDFStatus('downloading');
  await paintPDFStatus();
  if(s.token!==token)return;
  const link=document.createElement('a');link.href=s.url;link.download=s.filename;link.style.display='none';
  pdfStatusHost().appendChild(link);
  try{link.click()}finally{link.remove()}
  // 只表示下载请求已交给浏览器；不把定时器当作磁盘保存成功的证据。
  await new Promise(resolve=>setTimeout(resolve,650));
  if(s.token!==token)return;
  s.busy=false;updatePDFStatus('success');
}
function failPDFDownload(error,token){
  if(pdfDownloadState.token!==token)return;
  console.error('PDF export failed',error);pdfDownloadState.busy=false;updatePDFStatus('error');
}
async function retryPDFDownload(){
  const s=pdfDownloadState;if(s.busy)return;
  if(!s.url)return downloadResultPDF();
  s.busy=true;const token=++s.token;
  try{await dispatchPDFDownload(token)}catch(error){failPDFDownload(error,token)}
}
document.addEventListener('fullscreenchange',mountPDFStatus);
document.addEventListener('webkitfullscreenchange',mountPDFStatus);
async function downloadResultPDF(){
  if(!currentResult){showToast('走完这场秋选后，就能下载经历档案');return}
  if(pdfDownloadState.busy)return;
  const snapshot=currentResult;
  resetPDFDownload();
  const token=pdfDownloadState.token;pdfDownloadState.busy=true;updatePDFStatus('generating');
  try{
    await paintPDFStatus();
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    if(pdfDownloadState.token!==token)return;
    // 网页与导出共用同一份真实经历，包括本局全部选择。
    const report=snapshot;
    const blob=await createReportPDF(report);
    if(pdfDownloadState.token!==token)return;
    const name=(snapshot.name||'我的报告').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'');
    pdfDownloadState.filename=`秋招步步惊心-${name}-${snapshot.typeLabel}-完整报告.pdf`;
    pdfDownloadState.url=URL.createObjectURL(blob);
    await dispatchPDFDownload(token);
  }catch(error){failPDFDownload(error,token)}
}

function getGameShareUrl(){
  const url=new URL(window.location.href);
  if(url.protocol==='file:')return 'https://cowork.xiaohongshu.com/f/qiuzhao-bubujingxin/?__anonymous=true';
  url.hash='';url.searchParams.delete('_t');
  return url.href;
}
const shareDialogState={token:0,open:false,busy:false,returnFocus:null};
function mountShareDialog(){
  if(!shareDialogState.open)return;
  const dialog=document.getElementById('share-dialog'),host=document.fullscreenElement||document.webkitFullscreenElement||document.body;
  if(dialog.parentElement!==host){
    const focused=document.activeElement,keepFocus=focused&&dialog.contains(focused);
    host.appendChild(dialog);
    if(keepFocus)focused.focus({preventScroll:true});
  }
}
function shareGame(){
  unlockEffects();cueEffect('clue');
  const s=shareDialogState,dialog=document.getElementById('share-dialog');
  s.token++;s.open=true;s.busy=false;s.returnFocus=document.getElementById('share-game-btn');
  document.getElementById('share-link-input').value=getGameShareUrl();
  document.getElementById('share-copy-status').textContent='复制链接，邀朋友也来走一回这场秋选。';
  document.getElementById('share-copy-status').dataset.state='idle';
  const copy=document.getElementById('share-copy-btn');copy.disabled=false;copy.textContent='复制游戏链接';copy.setAttribute('aria-busy','false');
  dialog.hidden=false;mountShareDialog();copy.focus({preventScroll:true});
}
function closeShareDialog(restoreFocus=true){
  const s=shareDialogState,wasOpen=s.open;
  s.token++;s.open=false;s.busy=false;
  const dialog=document.getElementById('share-dialog');dialog.hidden=true;
  document.getElementById('share-copy-btn').disabled=false;
  document.getElementById('share-copy-btn').setAttribute('aria-busy','false');
  if(dialog.parentElement!==document.body)document.body.appendChild(dialog);
  if(wasOpen&&restoreFocus&&s.returnFocus)s.returnFocus.focus({preventScroll:true});
  s.returnFocus=null;
}
function closeShareBackdrop(event){
  if(event.target===event.currentTarget)closeShareDialog();
}
async function copyShareText(text,isCurrent=()=>true){
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return true}
  }catch(error){/* The visible field also works when clipboard permission is unavailable. */}
  if(!isCurrent())return false;
  const input=document.getElementById('share-link-input');input.focus({preventScroll:true});input.select();
  try{return Boolean(document.execCommand&&document.execCommand('copy'))}catch(error){return false}
}
async function copyGameLink(){
  const s=shareDialogState;if(!s.open||s.busy)return;
  unlockEffects();const token=++s.token;s.busy=true;
  const button=document.getElementById('share-copy-btn'),status=document.getElementById('share-copy-status'),input=document.getElementById('share-link-input');
  button.disabled=true;button.textContent='正在复制…';button.setAttribute('aria-busy','true');status.textContent='正在将邀帖链接放入剪贴板…';status.dataset.state='copying';
  const current=()=>s.open&&s.token===token;
  const copied=await copyShareText(input.value,current);
  if(!current())return;
  s.busy=false;button.disabled=false;button.setAttribute('aria-busy','false');
  if(copied){
    button.textContent='已复制 · 再复制一次';status.textContent='链接已复制。粘贴给好友，就能一起改写秋选名单。';status.dataset.state='success';cueEffect('confirm');button.focus({preventScroll:true});
  }else{
    button.textContent='重试复制';status.textContent='暂时无法自动复制，链接已选中。请按 Ctrl / ⌘ + C，或长按链接复制。';status.dataset.state='error';input.focus({preventScroll:true});input.select();
  }
}
function handleShareDialogKey(event){
  if(!shareDialogState.open)return;
  if(event.key==='Escape'){event.preventDefault();if(event.stopPropagation)event.stopPropagation();closeShareDialog();return}
  if(event.key!=='Tab')return;
  event.preventDefault();if(event.stopPropagation)event.stopPropagation();
  const elements=['share-close-btn','share-link-input','share-copy-btn'].map(id=>document.getElementById(id)).filter(element=>!element.disabled);
  const index=elements.indexOf(document.activeElement);
  const next=index<0?(event.shiftKey?elements.length-1:0):(index+(event.shiftKey?-1:1)+elements.length)%elements.length;
  elements[next].focus({preventScroll:true});
}
document.addEventListener('keydown',handleShareDialogKey);
document.addEventListener('fullscreenchange',mountShareDialog);
document.addEventListener('webkitfullscreenchange',mountShareDialog);
/* Complete, local PDF export. Canvas keeps Chinese text independent of external fonts. */
const QiuReportPDF = (() => {
  const W = 1190, H = 1684, SCALE = 1.5, M = 78, CW = W - M * 2, BOTTOM = H - 115;
  const C = { paper: '#fffaf0', ink: '#4d382d', wine: '#783d45', gold: '#b89053', rule: '#dfcdaa', muted: '#917965', tint: '#f4ead5', white: '#fffdf8' };
  const SERIF = '"Songti SC", "Noto Serif CJK SC", "SimSun", serif';
  const SANS = '"Hiragino Sans GB", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const clean = value => String(value == null ? '' : value).replace(/\r/g, '').replace(/[\u2010-\u2015\u2212]/g, '-');
  const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
  function font(ctx, size = 28, weight = 'normal', family = SERIF) { ctx.font = `${weight} ${size}px ${family}`; }
  function lines(ctx, value, width) {
    const output = [];
    const closing = /[。，、；：！？…）》」』】〕〉〗〙〛”’％%!?;:,.\)\]\}]/;
    const opening = /[（《「『【〔〈〖〘〚“‘\(\[\{]/;
    clean(value).split('\n').forEach(paragraph => {
      const chars = Array.from(paragraph);
      if (!chars.length) { output.push(''); return; }
      let start = 0;
      while (start < chars.length) {
        let end = start, line = '';
        while (end < chars.length && (!line || ctx.measureText(line + chars[end]).width <= width)) line += chars[end++];
        if (end < chars.length) {
          let breakAt = end;
          // Move a complete punctuation pair/cluster to the next line as needed.
          // This keeps closing punctuation off line starts and opening punctuation off line ends.
          while (breakAt > start && (closing.test(chars[breakAt]) || opening.test(chars[breakAt - 1]))) breakAt--;
          if (breakAt > start) end = breakAt;
          else while (end < chars.length && closing.test(chars[end])) end++;
        }
        output.push(chars.slice(start, end).join(''));
        start = end;
      }
    });
    return output;
  }
  function text(ctx, value, x, y, size = 28, color = C.ink, weight = 'normal', family = SERIF) {
    font(ctx, size, weight, family); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(clean(value), x, y);
  }
  function rule(ctx, x, y, width, color = C.rule) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.stroke(); }
  function box(ctx, x, y, w, h, color = C.tint, border = false) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    if (border) { ctx.lineWidth = 1.2; ctx.strokeStyle = C.rule; ctx.stroke(); }
  }
  function center(ctx, value, x, y, size, color = C.ink, weight = 'normal', family = SERIF) {
    font(ctx, size, weight, family); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(clean(value), x, y); ctx.textAlign = 'left';
  }
  function wrapFixed(ctx, value, x, y, width, size, leading, color = C.ink, weight = 'normal', family = SERIF) {
    font(ctx, size, weight, family); const wrapped = lines(ctx, value, width);
    wrapped.forEach((line, i) => text(ctx, line, x, y + i * leading, size, color, weight, family));
    return wrapped.length * leading;
  }
  function drawRadar(ctx, dimensions, x, y, width) {
    const cx = x + width / 2, cy = y + 280, radius = 132;
    const point = (i, ratio) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + Math.cos(a) * radius * ratio, cy + Math.sin(a) * radius * ratio]; };
    const polygon = (points, fill, stroke) => { ctx.beginPath(); points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); } };
    for (let level = 5; level >= 1; level--) polygon(Array.from({ length: 6 }, (_, i) => point(i, level / 5)), level % 2 ? '#fbf4e5' : '#fffaf0', C.rule);
    for (let i = 0; i < 6; i++) { const p = point(i, 1); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...p); ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.stroke(); }
    const entries = Array.from({ length: 6 }, (_, i) => dimensions[i] || { label: '', percent: 0 });
    const values = entries.map((d, i) => point(i, clamp(d.percent) / 100));
    polygon(values, 'rgba(120,61,69,.20)', C.wine);
    values.forEach(([px, py], i) => { ctx.beginPath(); ctx.arc(px, py, 5.2, 0, Math.PI * 2); ctx.fillStyle = entries[i].color || C.wine; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.white; ctx.stroke(); });
    entries.forEach((d, i) => {
      const [px, py] = point(i, 1.24);
      const ly = i === 0 ? py - 32 : i === 3 ? py + 1 : py - 18;
      center(ctx, d.label, px, ly, 23, d.color || C.wine, '600', SANS);
      center(ctx, `${d.displayPercent == null ? Math.round(clamp(d.percent)) : d.displayPercent}`, px, ly + 30, 21, C.muted, 'normal', SANS);
    });
    center(ctx, '个人相对指数 · 最突出风格为 100', cx, y + 524, 20, C.muted, 'normal', SANS);
    center(ctx, '呈现本次选择的倾向，不代表能力高低', cx, y + 554, 18, C.muted, 'normal', SANS);
  }
  async function renderReportPages(report) {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) await document.fonts.ready;
    const isStory = report.kind === 'story';
    const pages = []; let ctx, y;
    function newPage(first = false) {
      const canvas = document.createElement('canvas'); canvas.width = Math.round(W * SCALE); canvas.height = Math.round(H * SCALE);
      ctx = canvas.getContext('2d'); if (!ctx) throw new Error('当前浏览器无法生成 PDF 画布');
      ctx.scale(SCALE, SCALE); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.wine; ctx.fillRect(0, 0, W, 12);
      pages.push(canvas);
      if (!first) {
        text(ctx, isStory ? '秋招步步惊心  /  秋选经历档案' : '秋招步步惊心  /  宫廷性格手札', M, 49, 21, C.muted, 'normal', SANS);
        font(ctx, 21, 'normal', SANS); ctx.textAlign = 'right'; ctx.fillStyle = C.wine;
        ctx.fillText(clean(report.typeLabel), W - M, 49); ctx.textAlign = 'left';
        rule(ctx, M, 91, CW); y = 127;
      } else y = 61;
    }
    function ensure(height) { if (y + height > BOTTOM) newPage(); }
    function paragraph(value, opts = {}) {
      const size = opts.size || 28, leading = opts.leading || 47, indent = opts.indent || 0, gap = opts.gap == null ? 23 : opts.gap;
      font(ctx, size, opts.weight || 'normal', opts.family || SERIF); const wrapped = lines(ctx, value, CW - indent);
      let offset = 0;
      while (offset < wrapped.length) {
        let capacity = Math.floor((BOTTOM - y) / leading), remaining = wrapped.length - offset;
        if (capacity < Math.min(2, remaining)) { newPage(); capacity = Math.floor((BOTTOM - y) / leading); }
        let count = Math.min(capacity, remaining);
        if (remaining - count === 1) {
          if (count >= 3) count--;
          else { newPage(); continue; }
        }
        for (let i = 0; i < count; i++) text(ctx, wrapped[offset + i], M + indent, y + i * leading, size, opts.color || C.ink, opts.weight || 'normal', opts.family || SERIF);
        offset += count; y += count * leading;
        if (offset < wrapped.length) newPage();
      }
      y += gap;
    }
    function heading(value, index) {
      font(ctx, 31, '600', SERIF); const wrapped = lines(ctx, value, CW - 54);
      ensure(wrapped.length * 43 + 24 + (y > 150 ? 28 : 0) + 141);
      if (y > 150) { rule(ctx, M, y, CW); y += 28; }
      ctx.beginPath(); ctx.moveTo(M + 12, y + 6); ctx.lineTo(M + 22, y + 18); ctx.lineTo(M + 12, y + 30); ctx.lineTo(M + 2, y + 18); ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill();
      wrapped.forEach((line, i) => text(ctx, line, M + 54, y + i * 43, 31, C.wine, '600'));
      y += wrapped.length * 43 + 24;
    }
    newPage(true);
    text(ctx, isStory ? '秋选落幕  ·  你的秋选经历档案' : '御笔亲封  ·  你的宫廷性格手札', M, y, 24, C.gold, '600', SANS); y += 51;
    font(ctx, 52, '600'); const titleLines = lines(ctx, report.title || (isStory ? '秋选经历档案' : '宫廷性格报告'), CW);
    titleLines.forEach(line => { text(ctx, line, M, y, 52, C.wine, '600'); y += 70; });
    if (report.typeLabel) { text(ctx, report.typeLabel, M, y + 2, 28, C.gold, '600', SANS); y += 46; }
    if (!isStory && report.careerIds && typeof CAREER_PATHS !== 'undefined') y += wrapFixed(ctx, '现代岗位探索：'+report.careerIds.map(id=>CAREER_PATHS[id] && CAREER_PATHS[id].name).filter(Boolean).join(' / '), M, y, CW, 25, 39, C.wine) + 12;
    if (report.tagline) y += wrapFixed(ctx, report.tagline, M, y, CW, 27, 42, C.ink) + 12;
    const actionCount = Array.isArray(report.history) ? report.history.length : Number(report.actionCount || report.totalSteps) || 0;
    const identity = `${clean(report.name) || '入宫人'} 的${isStory ? `${actionCount ? `${actionCount} 次行动与` : ''}一次秋选` : '答题记录'}`;
    y += wrapFixed(ctx, identity, M, y, CW, 22, 32, C.muted, 'normal', SANS) + 8;
    if (report.keywords && report.keywords.length) y += wrapFixed(ctx, report.keywords.join('  ·  '), M, y, CW, 23, 34, C.wine, 'normal', SANS) + 19;
    if (report.methodology) {
      font(ctx, 22, 'normal', SANS); const noteLines = lines(ctx, report.methodology, CW - 44), height = noteLines.length * 34 + 34;
      ensure(height); box(ctx, M, y, CW, height); noteLines.forEach((line, i) => text(ctx, line, M + 22, y + 17 + i * 34, 22, C.muted, 'normal', SANS)); y += height + 28;
    }
    if (!isStory) {
      // Keep the two complementary charts together; neither can be sliced by a page boundary.
      const gap = 26, col = (CW - gap) / 2;
      let chartHeight = 601;
      const axisLayouts = (report.axes || []).map(axis => {
        font(ctx, 19, 'normal', SANS); const noteLines = lines(ctx, axis.note || '', col - 46);
        return { axis, noteLines, height: 91 + (axis.note ? noteLines.length * 27 : 0) };
      });
      chartHeight = Math.max(chartHeight, 78 + axisLayouts.reduce((sum, entry) => sum + entry.height, 0));
      // The four short preference notes fit on a page. Long notes flow later instead of overflowing the chart.
      const deferAxisNotes = chartHeight > 990;
      if (deferAxisNotes) chartHeight = 601;
      ensure(chartHeight + 26);
      box(ctx, M, y, col, chartHeight, C.white, true); box(ctx, M + col + gap, y, col, chartHeight, C.white, true);
      text(ctx, '四组偏好 · 倾向刻度', M + 23, y + 23, 27, C.wine, '600');
      text(ctx, '工作风格六维', M + col + gap + 23, y + 23, 27, C.wine, '600');
      let ay = y + 78;
      axisLayouts.forEach(({ axis, noteLines, height }) => {
        const ax = M + 23, aw = col - 46;
        text(ctx, axis.label, ax, ay, 22, C.muted, 'normal', SANS);
        const left = Math.round(clamp(axis.leftPercent)), right = Math.round(clamp(axis.rightPercent));
        text(ctx, `${clean(axis.leftLabel)} ${left}`, ax, ay + 33, 23, C.ink, '600', SANS);
        font(ctx, 23, '600', SANS); ctx.textAlign = 'right'; ctx.fillStyle = C.ink; ctx.fillText(`${clean(axis.rightLabel)} ${right}`, ax + aw, ay + 33); ctx.textAlign = 'left';
        box(ctx, ax, ay + 67, aw, 9, C.tint); if (left > 0) box(ctx, ax, ay + 67, aw * left / 100, 9, C.wine);
        if (!deferAxisNotes && axis.note) noteLines.forEach((line, i) => text(ctx, line, ax, ay + 88 + i * 27, 19, C.muted, 'normal', SANS));
        ay += deferAxisNotes ? 112 : height;
      });
      drawRadar(ctx, report.dimensions || [], M + col + gap, y, col); y += chartHeight + 32;
      if (deferAxisNotes) axisLayouts.forEach(({ axis }) => { if (axis.note) paragraph(`${axis.label}：${axis.note}`, { size: 24, leading: 39, family: SANS }); });
    }
    let sectionIndex = 0;
    for (const section of report.sections || []) {
      if (isStory && /^行动 \d+｜/.test(clean(section.title))) {
        // An action's choice, feedback and consequence read as one compact record.
        // Keep the whole record together when it fits on a page.
        font(ctx, 31, '600', SERIF);
        let recordHeight = lines(ctx, section.title, CW - 54).length * 43 + 24 + (y > 150 ? 28 : 0);
        font(ctx, 28, 'normal', SERIF);
        for (const part of section.paragraphs || []) if (clean(part).trim()) recordHeight += lines(ctx, part, CW).length * 47 + 23;
        if (recordHeight <= BOTTOM - 127) ensure(recordHeight);
      }
      heading(section.title, ++sectionIndex);
      for (const part of section.paragraphs || []) if (clean(part).trim()) paragraph(part);
    }
    if (report.advice && report.advice.length) {
      heading(isStory ? '带回现实的秋招练习' : '御赐行动锦囊', ++sectionIndex);
      report.advice.forEach(item => {
        font(ctx, 26, '600'); const titleLines = lines(ctx, item.t, CW - 25);
        ensure(titleLines.length * 39 + 12 + 132);
        titleLines.forEach((line, i) => text(ctx, line, M + 23, y + i * 39, 26, C.wine, '600'));
        ctx.fillStyle = C.gold; ctx.fillRect(M, y + 6, 4, 24); y += titleLines.length * 39 + 12;
        paragraph(item.d, { size: 26, leading: 44, gap: 27 });
      });
    }
    if (/^https?:\/\//i.test(clean(report.gameUrl))) {
      heading('邀好友共赴宫廷', ++sectionIndex);
      paragraph(isStory ? '在浏览器打开以下链接，也来经历自己的宫廷秋选。' : '在浏览器打开以下链接，也来写下自己的宫廷性格手札。', { size: 23, leading: 37, color: C.muted, family: SANS });
      paragraph(report.gameUrl, { size: 20, leading: 31, color: C.muted, family: SANS });
    }
    pages.forEach((canvas, i) => {
      const pageCtx = canvas.getContext('2d'); rule(pageCtx, M, H - 83, CW);
      text(pageCtx, isStory ? '秋招步步惊心  ·  秋选经历档案' : '秋招步步惊心  ·  原创情景性格探索', M, H - 59, 19, C.muted, 'normal', SANS);
      font(pageCtx, 19, 'normal', SANS); pageCtx.textAlign = 'right'; pageCtx.fillStyle = C.muted; pageCtx.fillText(`${i + 1} / ${pages.length}`, W - M, H - 59); pageCtx.textAlign = 'left';
    });
    return pages;
  }
  function utf16Hex(value) {
    let result = 'FEFF'; const str = clean(value);
    for (let i = 0; i < str.length; i++) result += str.charCodeAt(i).toString(16).padStart(4, '0');
    return `<${result}>`;
  }
  function canvasesToPDF(canvases, title = '秋招步步惊心 · 宫廷性格手札') {
    if (!canvases.length) throw new Error('没有可导出的结果页');
    const enc = new TextEncoder(), chunks = [], offsets = [0]; let byteLength = 0;
    function append(value) { const bytes = typeof value === 'string' ? enc.encode(value) : value; chunks.push(bytes); byteLength += bytes.length; }
    function obj(id, body, data) { offsets[id] = byteLength; append(`${id} 0 obj\n${body}`); if (data) { append('\nstream\n'); append(data); append('\nendstream'); } append('\nendobj\n'); }
    append('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
    const kids = canvases.map((_, i) => `${5 + i * 3} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${canvases.length} >>`);
    canvases.forEach((canvas, i) => {
      const jpeg = canvas.toDataURL('image/jpeg', 0.94);
      if (!jpeg.startsWith('data:image/jpeg;base64,')) throw new Error('浏览器无法生成 PDF 图像');
      const raw = atob(jpeg.slice(jpeg.indexOf(',') + 1)), bytes = new Uint8Array(raw.length);
      for (let j = 0; j < raw.length; j++) bytes[j] = raw.charCodeAt(j);
      const imageId = 3 + i * 3, contentId = imageId + 1, pageId = imageId + 2;
      obj(imageId, `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`, bytes);
      const content = enc.encode('q\n595.28 0 0 841.89 0 0 cm\n/ReportPage Do\nQ');
      obj(contentId, `<< /Length ${content.length} >>`, content);
      obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /ReportPage ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    });
    const infoId = 3 + canvases.length * 3;
    obj(infoId, `<< /Title ${utf16Hex(title)} /Creator ${utf16Hex('秋招步步惊心')} /Producer (Local Canvas PDF) >>`);
    const xref = byteLength;
    append(`xref\n0 ${infoId + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= infoId; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    append(`trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function createReportPDF(report) {
    const pages = await renderReportPages(report);
    return canvasesToPDF(pages, `${clean(report.name) || '我的'} · ${clean(report.title) || (report.kind === 'story' ? '秋选经历档案' : '宫廷性格手札')}`);
  }
  return { createReportPDF, renderReportPages, canvasesToPDF };
})();
async function createReportPDF(report) { return QiuReportPDF.createReportPDF(report); }
async function renderReportPages(report) { return QiuReportPDF.renderReportPages(report); }
function canvasesToPDF(canvases, title) { return QiuReportPDF.canvasesToPDF(canvases, title); }


function setGameActionsVisible(visible){
  document.getElementById('game-actions').hidden=!visible;
  document.getElementById('game-restart').title=state.phase==='prologue'?'重新播放序章，保留姓名与身份':'清空本局答案，保留姓名与身份重新开始';
}
function restartCurrentGame(event){
  if(event)event.stopPropagation();
  if((event&&event.detail>1)||!['prologue','playing'].includes(state.phase))return;
  currentResult=null;
  if(state.phase==='prologue')startPrologue();
  else startGame();
}
function exitGame(event){
  if(event)event.stopPropagation();
  if(!['prologue','playing'].includes(state.phase))return;
  restart();
  const entry=document.querySelector('#screen-splash .btn-gold');
  if(entry)entry.focus({preventScroll:true});
}
function restart(){
  stopLandingSoundPreview();stopMusic();
  closeShareDialog(false);
  resetChoiceGuidance(true);
  resetPDFDownload();
  stopPrologue();
  stopNarration();
  setSpriteSpeaking();
  currentResult=null;
  document.getElementById('screen-prologue').classList.remove('active');
  document.getElementById('stage').classList.remove('playing');
  document.getElementById('screen-result').classList.remove('active');
  document.getElementById('screen-gender').classList.remove('active');
  document.getElementById('screen-name').classList.remove('active');
  document.getElementById('screen-splash').style.display='block';
  document.body.classList.add('landing-open');
  setLandingSoundUI('建议开启声音，感受关键对白配音、剧情音效与古风配乐。');
  document.getElementById('dialogue-area').style.display='none';
  document.getElementById('choice-overlay').classList.remove('active');
  document.getElementById('npc-sprite').style.opacity='0';
  document.getElementById('player-sprite').style.opacity='0';
  document.getElementById('name-input').value='';
  state={gender:'female',name:'',sceneIdx:0,qIdxInScene:0,dialoguePhase:'intro',lineIdx:0,answers:[],run:null,activeNpcRole:'recruiter',phase:'splash'};
  document.getElementById('bg').style.backgroundImage='';
  document.getElementById('bg').style.background='';
}

// 绑定 BGM 只做音量让位，不会自动播放音乐。
if(globalThis.PalaceEffects&&PalaceEffects.setMusicElement)PalaceEffects.setMusicElement(document.getElementById('bgm'));
setEffectsUI();setMusicUI(false);setLandingSoundUI();
document.getElementById('inventory-panel').addEventListener('toggle',()=>{if(document.getElementById('inventory-panel').open&&state.phase==='playing'){unlockEffects();cueEffect('clue')}});

// 初始背景
document.getElementById('bg').style.background='linear-gradient(160deg,#1a0e05,#2c1a0e 55%,#1e1008)';

// 动态计算对话框高度供 CSS 变量使用
function updateDiaH(){
  const dia=document.getElementById('dialogue-area'),choices=document.getElementById('choice-overlay');
  const panel=choices.classList.contains('active')?choices.querySelector('.choice-panel'):null;
  const activePanel=panel||(dia&&dia.style.display!=='none'?dia:null);
  const total=window.innerHeight;
  const stageHeight=document.getElementById('stage').clientHeight||total;
  // 对话文字和四个选项高度不同。立绘的完整边界始终落在独立左右区域。
  const panelBottom=panel?parseFloat(getComputedStyle(choices).paddingBottom)||0:0;
  const occupied=activePanel?activePanel.offsetHeight+panelBottom:stageHeight*.28;
  const bottom=Math.min(stageHeight-60,Math.max(0,occupied-2));
  const height=Math.max(0,Math.min(stageHeight*.64,stageHeight-bottom-(window.innerWidth<=700?160:145)));
  document.documentElement.style.setProperty('--dia-h',occupied+'px');
  document.documentElement.style.setProperty('--sprite-bottom',bottom+'px');
  document.documentElement.style.setProperty('--sprite-height',height+'px');
}
window.addEventListener('resize',updateDiaH);
setTimeout(updateDiaH,100);
document.getElementById('name-input').addEventListener('keydown',e=>{if(e.key==='Enter')confirmName()});
