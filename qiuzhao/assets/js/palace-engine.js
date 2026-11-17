/* 秋招步步惊心 v8：纯函数分支剧情引擎，无网络与 DOM 依赖。 */
globalThis.PalaceGame = (() => {
'use strict';
const TOTAL_STEPS=10;
const CHAPTERS=[
{name:'第一幕 · 名帖入局',kicker:'投递与准备',goal:'带着自己的筹码入局，挑选要承担的试差任务。',bg:'court',role:'招聘接引'},
{name:'第二幕 · 各自为谋',kicker:'竞争与谈判',goal:'为贡献争取位置，决定独立、竞合还是另找突破口。',bg:'garden',role:'同场竞争者'},
{name:'第三幕 · 雨夜翻盘',kicker:'准备与救场',goal:'让先前的准备经受风雨，做出真实交付。',bg:'chamber',role:'终面考官'},
{name:'第四幕 · 四门试艺',kicker:'试艺与核验',goal:'选择目标赛道，用公开试艺和证据争取相应机会。',bg:'hall',role:'专业主考'},
{name:'第五幕 · 自择前程',kicker:'补证与落款',goal:'在真实机会和工作条件之间，做出自己的决定。',bg:'court',role:'招聘接引'}];
const ENDING_CATALOG=[
{id:'appointed',title:'金榜入局',teaser:'把分散的人与事收成一局，接下整体筹办。'},
{id:'specialist',title:'一技入殿',teaser:'让一项可复核的专业本领，为你打开门。'},
{id:'alliance',title:'双印同诏',teaser:'曾经的竞争者，能否成为有边界的搭档？'},
{id:'independent',title:'宫外开局',teaser:'以真实成果和清楚的条款，赢得第一份委托。'},
{id:'redirected',title:'另辟前程',teaser:'幕后交付，也能通向一份正式机会。'},
{id:'walkaway',title:'不受此诏',teaser:'先获得资格，再决定什么值得留下。'},
{id:'deferred',title:'过期的诏书',teaser:'机会曾在手里，等待也会改变它的去向。'},
{id:'rejected',title:'待下一榜',teaser:'本轮未获录用，把具体缺口带回下一次准备。'}];
const ITEMS={
pact:{label:'双署分工约',detail:'与华妃明确各自署名、责任和失误分担；可进入联合试艺并作交叉核验。'},
owned:{label:'独立交付边界单',detail:'记明自己的成果、修改权和交付范围；可以举证，也可向宫外委托人说明承接边界。'},
manual:{label:'尚工试验札记',detail:'你用准备时辰拆解了灯架结构、荷载和物料替代；技术试艺与现场加试可调用。'},
brief:{label:'商会委托简章',detail:'写明需求、预算上限、验收与尾款；可以据此准备真实的宫外项目报价。'},
showcase:{label:'公开试艺记录',detail:'考官记录了现场演示与追问，是独立于同伴关系的一份核验材料。'},
quote:{label:'委托报价与验收单',detail:'根据已经完成的示范列出范围、成本、验收和分阶段付款，尚需最终核验通过。'},
sample:{label:'灯宴作品原稿',detail:'保留构思与修改过程，可用于署名争议、临场推演和终面举证。'},
rubric:{label:'考官关注清单',detail:'试差看重交付与复盘，可用于调整雨夜答辩和应对加试。'},
signed:{label:'签字分工单',detail:'各人负责的部分和时间均有记录，可核对贡献归属。'},
gear:{label:'场地勘查单',detail:'标明连廊、备用物料和转场路线，可用于应急与现场答辩。'},
clue:{label:'节流批注',detail:'你提前看见雨棚预算被删，知道雨夜风险并非突然出现。'},
backup:{label:'防水材料包',detail:'封存了关键图纸，可支撑雨天交付和之后的过程核验。'},
rainkit:{label:'盟友备用物料',detail:'沈眉庄借来的灯罩和草图，是此前相助换来的临场支援。'},
indoor:{label:'连廊缩编方案',detail:'减少华丽展示，保留核心交付，雨天可按方案直接执行。'},
terms:{label:'岗位条件单',detail:'御前司含轮值、临时调度和异地巡展；典务司侧重执行与物料协调。'},
rehearsal:{label:'加试答辩手稿',detail:'用已有积累补出的可核验答辩，为本轮表现增加新依据。'}};
const KEYS=['preparation','initiative','collaboration','adaptability','evidence','boundaries'];
const L=(speaker,text)=>({speaker,text});
const H=(r,id)=>r.inventory.includes(id);
const A=(r,id)=>{if(!H(r,id))r.inventory.push(id)};
const C=x=>JSON.parse(JSON.stringify(x));
function createRun(){return{version:7,index:0,answers:[],time:6,inventory:[],support:0,merit:0,delivery:0,insight:0,trust:1,expertise:0,flags:{target:'project'},strategy:Object.fromEntries(KEYS.map(k=>[k,0]))}}
function O(id,text,hint,effect,reply,feedback,strategy,consequence,available=true,lockedReason=''){return{id,text,hint,effect,reply:reply.map((t,i)=>L(i===0?'npc':'narrator',t)),feedback,strategy,consequence,available,lockedReason}}
const TARGETS={project:{ending:'appointed',name:'御前筹办司',role:'整体筹办',modern:'项目统筹、管培生、活动策划（文旅、会展、品牌、公服）',conditions:'轮值、临时调度与异地巡展，需要统筹多人交付'},craft:{ending:'specialist',name:'尚工院',role:'专业岗位',modern:'工艺技术、质量改进、工程助理、设计制图（制造、建筑、文博）',conditions:'按技术标准完成试验与复核，持续学习，并承担质量责任'},alliance:{ending:'alliance',name:'联合筹办席',role:'竞合联聘',modern:'联合项目组、项目合伙团队、跨专业策划（会展、文旅、设计服务）',conditions:'双署名、分工可核对、收益按约定拆分；重要变更需双方确认'},commission:{ending:'independent',name:'宫外商会',role:'独立委托',modern:'独立策划、设计服务、项目承包（展陈、社区活动、小型商业项目）',conditions:'固定范围与预算，分阶段验收和付款；返工与成本风险由承接人承担'}};
function offers(r){const verified=!!r.flags.verified;
const eligible={appointed:!!r.flags.projectTrialPassed&&r.merit>=5&&r.delivery>=3&&r.trust>=3&&verified,
specialist:!!r.flags.specialistTrialPassed&&r.trust>=2&&verified&&r.delivery>=1,
alliance:!!r.flags.rivalPact&&!!r.flags.jointTrialPassed&&r.delivery>=3&&r.trust>=2&&verified,
independent:!!r.flags.commissionTrialPassed&&r.delivery>=2&&r.trust>=2&&verified};
const target=TARGETS[r.flags.target||'project'];return{...eligible,primary:eligible.appointed,target:!!eligible[target.ending],targetInfo:target,alternate:r.trust>=2&&(r.delivery>=2||r.insight>=2)}}
const N=[
r=>({id:'arrival',title:'一封名帖，三更之前',chapter:0,speaker:'recruiter',before:[
L('narrator','你还记得电脑前那份没改完的秋招简历。转眼间，键盘声已经变成宫门落锁的声响，空白名帖被塞进你的手心。'),
L('npc','接引官提醒你：“我管这回招录。御前筹办司有一席正选，尚工院与典务司也来选人，宫外商会另有委托。先过灯宴试差，再选试艺方向，三日后定结果。”'),
L('player','简历成了名帖，小组面成了试差。你摸到袖中写着“应届”的纸，知道这不是旁观别人的宫廷故事。'),
L('npc','“报名后有六个准备时辰，是你能自由安排的工夫。华妃早占了台前，沈眉庄还在理物料。先想好，你带什么入局？”')],question:'宫门将闭，你先把有限的准备时间花在哪里？',options:[
O('sample','打磨灯宴作品，留下修改原稿','用 2 个准备时辰；带入可展示、可核验的作品。',n=>{n.time-=2;n.merit++;A(n,'sample')},['接引官翻了两页：“不只有漂亮封面，过程也留着，追问时才说得清。”','你错过第一轮寒暄，却把构思与修改痕迹一起收进袖中。'],['准备时辰 −2','获得：灯宴作品原稿'],{preparation:2,evidence:1},'你用寒暄时间换来一份可展示、可追溯的作品。'),
O('rubric','先打听这场试差到底考什么','用 1 个准备时辰；先拿评判线索，暂时没有成品。',n=>{n.time--;n.insight++;A(n,'rubric')},['接引官低声道：“场面要好看，但皇后最后追问的是交没交成，出了事谁能收住。”','别人已经动笔，你先记下了交付与复盘两个词。'],['准备时辰 −1','获得：考官关注清单'],{preparation:1,evidence:1},'你先弄清评判标准，为后续调整答辩留下线索。'),
O('ally','帮沈眉庄整理散落的报名物料','用 1 个准备时辰；自己的材料稍后做，先结识同行者。',n=>{n.time--;n.support++;n.flags.allyBond=true},['沈眉庄抱稳灯册：“多谢。我也是候选人，曾在典务司帮过忙。以后缺材料，来找我。”','自己的名帖仍很简略，但宫门内已经有人记住你的名字。'],['准备时辰 −1','沈眉庄记住了这份相助'],{collaboration:2},'你用准备时间建立互助关系，之后可以请求见证或借用物料。'),
O('pitch','先占报名席，当场讲出自己的构想','不花准备时辰；先被看见，之后要用表现兑现。',n=>{n.merit++;n.flags.earlyPitch=true},['接引官提笔记名：“说得响，明日我可要看看你怎样落地。”','华妃从人群里看了你一眼。你得到注意，也把承诺摆到众人面前。'],['保留全部准备时辰','构想被招录官记下'],{initiative:2},'你先争取曝光，后续交付会决定这份印象能否站住。')]}),
r=>({id:'role',title:'灯宴试差，谁在台前',chapter:0,speaker:'rival',before:[
L('narrator','你们被分进同组，明晚要为来访宾客办一场秋灯宴。御前正选只有一席，其他司也在旁观；灯宴却必须一起办成。'),
L('npc','华妃将主讲名签按在桌上：“我熟悉规矩，最后奏报由我来。其余的，你们自行挑。”'),
L('player',H(r,'rubric')?'你想起接引官的提醒：考官会问交付，不只看台前。所挑的位置，决定你能留下什么成果。':'台前是奏报册，桌下是未拆物料。抢到展示未必办得成事，默默做事也未必有人替你说明。'),
L('npc','“别等我替你安排，”华妃挑眉，“红榜可不会写‘参与过’三个字。”')],question:'这场小组试差，你主动接下哪一部分？',options:[
O('record','接统筹工作，让大家先确认分工','用 2 个准备时辰；留下责任记录，台前时间较少。',n=>{n.time-=2;n.delivery++;n.trust++;A(n,'signed')},['华妃皱眉，最终还是落了名：“行，别让这些纸耽误正事。”','谁做什么、何时交付，都留在纸上。你折好一份副本，没有交出去。'],['准备时辰 −2','获得：签字分工单'],{preparation:1,evidence:2},'你承担统筹，并留下之后能核对署名的证据。',r.time>=2,'至少需要 2 个准备时辰。'),
O('stage','争取独立展示，当众承担亮点','用 1 个准备时辰；获得展示机会，也独自面对追问。',n=>{n.time--;n.merit+=2;n.flags.stage=true},['华妃把奏报册推来半寸：“给你一段，出了岔子可别说我没让你出头。”','你得到台前位置。成功和失误，都会比原来更显眼。'],['准备时辰 −1','获得独立展示机会'],{initiative:2},'你争取到更高的可见度，也承接独立展示的压力。',r.time>=1,'至少需要 1 个准备时辰。'),
O('site','接现场执行，亲自走一遍场地','用 1 个准备时辰；摸清连廊与物料，成果主要在幕后。',n=>{n.time--;n.delivery+=2;n.insight++;A(n,'gear')},['华妃已经开始排练。你沿场地走到尽头，发现侧门连着一条避雨长廊。','勘查单记下灯架、物料和转场路线。这些东西暂时上不了奏报封面。'],['准备时辰 −1','获得：场地勘查单'],{preparation:1,adaptability:1},'你用勘查换来可执行的细节，突发情况有了备用路线。',r.time>=1,'至少需要 1 个准备时辰。'),
O('observe','做协调联络，留意各方的安排','不花准备时辰；暂不争主讲，收集被忽略的信息。',n=>{n.insight++;A(n,'clue')},['华妃递来改过的预算：“替我送去。”你看见雨棚一栏被划掉，旁边写着“秋日无雨”。','你照常完成联络，把改动记下来。尚未发生的风险，先留下了痕迹。'],['保留准备时辰','获得：节流批注'],{evidence:1,boundaries:1},'你发现雨棚预算被删，提前看见灯宴的潜在风险。')]}),
r=>({id:'credit',title:'被改掉的署名',chapter:1,speaker:'rival',before:[
L('narrator','午后送来的预报名册，只在方案一栏写了华妃的名字。你负责的部分被归到“随行协助”。'),
L('npc','华妃没有回避：“总要有人对上负责，名字太多考官记不住。办成之后，我自然会提你们。”'),
L('player',H(r,'signed')?'分工副本还在袖中。你可以把责任摆出来，但争署名也会让后续合作更紧绷。':r.support>0?'沈眉庄看见名字被挪了位置，朝你摇头。她记得昨日每个人做了什么。':'你已付出准备，却没替所有工作留下同样清楚的记录。现在得决定怎样争取被看见。'),
L('npc','“只剩一夜，”华妃合起名册，“放肆！现在争这个，还是先把事办完？”')],question:'贡献被模糊掉了，你怎么把自己的位置争回来？',options:[
O('proof','拿出原稿或分工单，请接引官核对','用 1 个准备时辰核对已有记录；贡献正式登记，合作气氛也会变紧。',n=>{n.time--;n.merit++;n.trust++;n.flags.creditProtected=true},['华妃没再说“随行协助”。接引官添了一行：“此部分由你负责。”','贡献有了名字，华妃也开始逐项检查进度。此后的交付更不能含糊。'],['准备时辰 −1','贡献正式登记，记录保留到终面'],{evidence:2,initiative:1},'你花时间用已有记录纠正署名，贡献得到正式登记。',r.time>=1&&(H(r,'sample')||H(r,'signed')),'需要至少 1 个准备时辰，以及作品原稿或签字分工单。'),
O('witness','请沈眉庄共同说明各自贡献','需要此前支持；共同署名更稳妥，也要承认彼此工作。',n=>{n.support++;n.trust++;n.flags.allyBond=true;n.flags.sharedCredit=true},['沈眉庄走到你身侧：“我亲眼见过，不能只留一个人的名字。我的部分也请写清。”','名册改成共同交付。你获得见证，也接受掌声由几个人共同分。'],['获得同伴见证','成果登记为共同交付'],{collaboration:2,evidence:1},'你让同伴见证进入记录，并主动接受共享成果。',r.support>=1,'需要前面建立与沈眉庄的支持关系。'),
O('trade','让出主讲，换一块独立交付的任务','不花准备时辰；曝光减少，以完整成果证明自己。',n=>{n.delivery++;n.flags.trade=true},['华妃应得很快：“可以，场地交接由你定。出了问题，也由你解释。”','你不再争几分钟的主讲，换来一块能够从头负责到尾的任务。'],['获得独立交付责任','减少台前署名争夺'],{collaboration:1,boundaries:1},'你用主讲机会换来独立任务，之后需要把它真正交付。'),
O('claim','当众承诺独立做成亮点，争取加签','不花准备时辰；先争机会，之后必须用实绩补依据。',n=>{n.merit++;n.trust--;n.flags.promise=true},['华妃笑了：“既然说能独立做成，我就等你的成品。”接引官只加了一个“待验”。','名字暂时保住，你也把举证期限推到了灯宴现场。失手时，这句承诺会被翻出。'],['署名暂列“待验”','后续需要兑现独立交付承诺'],{initiative:2},'你靠承诺争到机会，招录官仍在等待实际交付。')]}),
r=>({id:'rain',title:'一封迟到的雨信',chapter:2,speaker:'recruiter',before:[
L('narrator',H(r,'clue')?'傍晚风起。你想起被删的雨棚预算，几乎同时，驿官送来明夜暴雨的消息。先前的风险终于到了眼前。':'傍晚，驿官送来明夜暴雨的消息。你这才发现，为把场面做得更华丽，雨棚预算早被华妃删掉。'),
L('npc','接引官放下雨信：“华妃仍想照旧，怕改场暴露准备不足。你若有另一种打算，就在今夜安排。明日考官只看实际交付。”'),
L('player','维持完整方案可能赢得满堂目光，临时收缩可能显得不够出彩。你的准备时间却已经花去不少。'),
L('npc',`“你还剩 ${r.time} 个准备时辰。留一条退路，明日才有得选。”`)],question:'面对雨信，你今晚做哪一手准备？',options:[
O('backup','赶制防水备份，保住方案的关键部分','用 2 个准备时辰；保留规模，今晚少一轮练习。',n=>{n.time-=2;A(n,'backup')},['你自己誊写、试封，再把关键页逐一核对。最后一页晾干时，更鼓已响。','没来得及再排练，关键图纸与流程却封进了防水材料包。'],['准备时辰 −2','获得：防水材料包'],{preparation:2,evidence:1},'你提前支付时间成本，保住雨夜继续展示的可能。',r.time>=2,'至少需要 2 个准备时辰。'),
O('borrow','请沈眉庄动用熟人，借备用物料','需要此前支持；不花时辰，使用一次同伴人情。',n=>{n.support--;n.flags.allyBond=true;A(n,'rainkit')},['沈眉庄温声道：“嗯，别急。”她搬来灯罩和草图：“上回你肯搭手，这回我也不让你一个人扛。”','你保住排练时间。这批物料能救急，上台时也不能抹去帮过你的人。'],['使用一次同伴支持','获得：盟友备用物料'],{collaboration:2},'此前互助换成真实物料，成为临场可调用的资源。',r.support>=1,'需要此前积累的同伴支持。'),
O('indoor','改到连廊，主动收缩灯宴规模','不花准备时辰；少些华丽，换取可控制的交付范围。',n=>{n.delivery++;A(n,'indoor')},['华妃隔窗留下一句：“明日若不下雨，你自己解释这场小宴。”','你删去最耗物料的部分，把核心流程搬进连廊。它没那么夺目，却能够落地。'],['获得：连廊缩编方案','规模减少，交付范围更明确'],{adaptability:2,boundaries:1},'你主动缩小规模，把能完成的核心流程放在华丽效果之前。'),
O('hold','照原计划排练，把完整展示做到最好','不花准备时辰；保住舞台效果，天气风险留待现场。',n=>{n.merit++;n.flags.riskAccepted=true},['华妃点头：“至少还有人敢把宴办得像样。”场地值守提醒众人记好撤场位置。',H(r,'gear')?'你已有勘查记录，决定临场再调整。展示练得更流畅，防水备份仍然空着。':'你把精力留给排练。亮点更加流畅，雨天的退路却尚未准备好。'],['完整展示继续排练','天气风险留待现场处理'],{initiative:2},'你争取完整效果，后续需要靠已有信息或临场行动承担天气风险。')]}),
r=>{const prepared=['backup','rainkit','indoor','gear'].find(id=>H(r,id));const text={backup:'打开防水材料包，带关键展示转入内厅',rainkit:'启用盟友物料，和沈眉庄接住现场',indoor:'按连廊缩编方案，完成已经排好的流程',gear:'照勘查单转场，启用已知的备用物料'};const improv=H(r,'sample')||H(r,'gear')||r.insight>=2;return{id:'trial',title:'暴雨落下，谁来收场',chapter:2,speaker:'examiner',before:[
L('narrator','开场前，骤雨击穿没有雨棚的外场。奏报册被打湿、灯架倾倒，皇后仪仗却已到门前。华妃仍在抢救自己的开场词。'),
L('npc','皇后停在檐下：“宾客还在雨里。谁能给出可执行的安排，现在就说。”'),
L('player',prepared?`你手里还有${ITEMS[prepared].label}。花掉的时间、积累的信息或求来的支持，此刻变成了一条可行动的路。`:'你没有现成的雨天方案。还能改汇报，或保住团队的基本交付，却不能凭空补回前一夜的准备。'),
L('npc','“此事须慎重。先护人，再护物。把你的判断落到行动，不必等谁替你开口。”')],question:'这是考官真正看到你的时刻，你如何救场？',options:[
O('prepared',text[prepared]||'启用此前准备的退路，稳定现场','需要雨天准备或场地勘查信息；把已有资源真正用起来。',n=>{n.delivery+=prepared==='backup'||prepared==='rainkit'?3:2;n.merit+=prepared==='indoor'?1:2;n.trust++;n.flags.delivered=true;n.flags.usedPlan=prepared},[prepared==='rainkit'?'你与沈眉庄按借来的物料重新分配任务。避雨、灯架、讲解各有去处，慌乱终于停住。':'你按自己的方案逐项调度，值守人员各就各位。避雨、灯架、讲解都有了去处，慌乱终于停住。',prepared==='indoor'?'场面比原定小，核心流程却完整交到宾客面前。皇后问起时，你能解释为何收缩。':'准备过的东西接住了真正的风雨。皇后停下仪仗，看你把一件件事交还到正确的人手里。'],['此前准备在现场生效','完成可被核验的交付'],{preparation:1,adaptability:2},prepared?`你用${ITEMS[prepared].label}稳住现场，前期准备转化为交付。`:'你调用已有准备。',!!prepared,'需要雨天方案、备用物料或场地勘查单。'),
O('focused','按考官关注点，改做核心方案短答辩','需要考官关注清单；放下完整舞台，集中讲交付与复盘。',n=>{n.delivery++;n.merit+=2;n.trust++;n.flags.delivered=true;n.flags.focused=true},['你请皇后移步檐下，将开场压成问题、方案、应急三点。华妃的长篇奏报没能再打断你。','灯宴不再完整，你的判断却被听见。考官问的恰是事先打听过的交付与复盘。'],['考官关注清单发挥作用','针对性答辩保住展示机会'],{evidence:1,adaptability:2},'你利用评判线索，将失控展示改成有针对性的短答辩。',H(r,'rubric'),'需要报名时取得考官关注清单。'),
O('stabilize','先安置宾客和物料，把台前交给队友','减少个人展示，保住团队最低交付。',n=>{n.delivery+=2;n.flags.teamWitness=true;n.flags.teamRescue=true},['你让场地值守说明情况，自己带人移走危险灯架、引导宾客。团队终于能继续讲解。','台前未必念到你的名字，现场却确实恢复了秩序。现场交接簿完整记下了这段过程。'],['保住团队基本交付','现场交接簿记下救场过程'],{collaboration:2,adaptability:1},'你让出台前稳住基本交付，幕后贡献进入现场交接记录。'),
O('improvise','把展示留在自己手里，脱稿现场推演','需要构思或现场信息支撑，不能只靠气势。',n=>{n.merit+=improv?2:1;n.delivery+=improv?1:0;n.trust+=improv?1:-1;n.flags.improviseWorked=improv;n.flags.delivered=improv},[improv?'你画出流程，说明替代路线。皇后追问一处细节，你用准备过的内容回答了。':'开场仍很流畅，可皇后一问物料与转场细节，你就停住了。华妃接过话头，展示被迫缩短。',improv?'推演撑住了这一段。临场机敏之下，垫着前面真正做过的功课。':'这次没完成独立交付。终面仍有说明与补证的机会，前面的承诺却已成了追问。'],improv?['积累支撑了临场推演','独立展示完成']:['临场细节未能答上','独立交付留有缺口'],{initiative:1,adaptability:2},improv?'你凭前期积累撑住脱稿推演，让临场表现有实质内容。':'你选择独自推演，但可调用的信息不足，关键细节未能完成。')]}},
r=>{const proof=H(r,'signed')||H(r,'sample')||H(r,'backup')||H(r,'owned')||H(r,'showcase')||(r.flags.trade&&r.flags.delivered);const live=r.insight>=2||H(r,'gear')||H(r,'manual')||r.merit>=5;return{id:'hearing',title:'终面之前，旧账翻来',chapter:2,speaker:'examiner',before:[
L('narrator',r.flags.rivalPact?'试艺散后，华妃依约交出双署补报。核对官却标出一处责任交叠：共同署名也要逐项确认，双方分别说明做过什么。':'试艺散后，你以为只等名单。华妃却呈上补报：她把救场称作统一调度，将你的名字写在“执行配合”之下。'),
L('npc',r.flags.rivalPact?'皇后翻开双署约：“你们的合作我看到了，但签在一起也要分清责任。各说各的依据，再交叉核对。”':'皇后没有立即表态：“我招能做事、也说得清责任的人。华妃是一面之词，你也不必只凭一张嘴反驳。”'),
L('player',r.flags.promise&&!r.flags.delivered?'独立完成的承诺被翻出。你抹不掉现场停顿，却可以把真正做过与准备不足的部分分开说明。':r.flags.sharedCredit||r.flags.teamRescue?'这次交付不是一人的功劳。分清共同与独立完成的部分，才不让帮助变成下一场争功。':'袖中的记录、真实的现场表现，都将接受核对。你要决定怎样让贡献站得住。'),
L('npc','“名额有限，但我再给一次核验。告诉我，你拿什么证明自己的判断？”')],question:'面对抢功和追问，你用什么完成这次核验？',options:[
O('records','按原稿、分工或交付过程逐项举证','需要记录或完成的独立交付；只认领实际负责的部分。',n=>{n.merit++;n.trust+=2;n.flags.verified=true;n.flags.verificationMethod='records'},['皇后让人核了两处：“此处确是你的，记下；共同完成的，仍列共同。”',r.flags.rivalPact?'双署补报按核验结果定稿。共同完成与独立负责的部分分别写清，合作也有了可追溯的边界。':'华妃的补报退回重写。你没包揽功劳，被确认的部分却不会再被轻易挪走。'],['个人贡献通过核验','保留同伴的共同署名'],{evidence:2},'你用可复核过程确认贡献，录用判断有了可靠依据。',!!proof,'需要原稿、分工单、防水备份，或已完成的独立交付。'),
O('testimony','请同伴复述现场，交叉说明贡献','需要支持或同伴见证；接受成果被共同核对。',n=>{n.trust+=2;n.flags.verified=true;n.flags.verificationMethod='testimony'},[r.flags.rivalPact?'华妃拿着双署分工约，说明各自完成与接手的部分。你们互相核对，谁也不能包揽全部功劳。':r.flags.allyBond?'沈眉庄被叫到殿前，说明分工、你收住的部分和旁人补上的部分。':'场地值守带来交接簿，说明你如何安置宾客和物料。记录不依靠私人交情，也能逐项核对。','叙述不全是夸赞，却相互对得上。皇后把“执行配合”改成了明确责任。'],['同伴见证通过交叉核验','实际责任重新登记'],{collaboration:1,evidence:2},'此前关系带来可核对的见证，真实贡献被正式记录。',r.support>=1||!!r.flags.allyBond||!!r.flags.rivalPact||!!r.flags.teamWitness,'需要同伴互助、双署分工约或现场交接见证。'),
O('limits','承认缺口，清楚说明自己完成了什么','不争全部台前功劳，按真实交付重新评估。',n=>{n.trust++;n.flags.altFocus=true;n.flags.limits=true},['你分开讲未完成的、借助他人的和自己收住的。皇后合起补报：“至少知道责任边界。”','主目标的竞争没有消失，典务司主事却开始问起你的现场执行。另一扇门有了动静。'],['责任边界得到认可','执行岗位开始关注实际交付'],{evidence:1,boundaries:2},'你如实说明完成与未完成的部分，让评价回到真实责任。'),
O('live','接受现场加试，重新演一遍判断过程','用已有场地信息、判断或展示经验应对追问。',n=>{n.merit+=live?1:0;n.trust+=live?1:-1;n.flags.livePassed=live;if(live){n.flags.verified=true;n.flags.verificationMethod='live'}},[live?'皇后换了一个物料受限的场景。你解释先后顺序、替代办法和停止条件。':'皇后问预算再减半怎么办。你沿用原展示，却解释不清哪些环节必须保留。',live?'这不是复述华妃的奏报。你的思路得到独立核验，补上记录不足的一环。':'加试没补齐证据。红榜尚未落笔，补充材料是最后的修复窗口。'],live?['现场加试通过','个人判断得到核验']:['现场加试未通过','仍可在红榜落笔前补证'],{initiative:1,adaptability:1},live?'前期积累支撑你通过加试，个人判断得到独立核验。':'现有积累未能支撑新的追问，核验仍留有缺口。')]}},
buildTerms,
buildDecree
];
// Two additional decisions preserve resources and responsibilities across all five chapters.
N.splice(3,0,buildBargain);
N.splice(6,0,buildExhibition);
function buildBargain(r){return{id:'bargain',title:'灯下谈判，各留一手',speaker:'rival',before:[
L('narrator','名册争议之后，华妃没有离开。她把尚工院的观摩帖和一封商会来信推到灯下：这场试差，原来不只一位用人者在看。'),
L('npc',r.flags.creditProtected?'华妃看着被改正的署名：“你肯护自己的成果，我知道了。不过抢同一席，不代表每一步都要互相拆台。”':'华妃摊开场地安排：“与其到最后争一句谁做的，不如现在谈清楚。你我可以争，也可以各取所长。”'),
L('player','有的人想拿主位，有的人只想凭一门本事入选，还有人关心能不能独立接下宫外项目。你第一次意识到，终点也可以由自己挑。'),
L('npc','“条件要明写。谈合作、守边界、补技术，还是看宫外需求？这一夜可没法全都做。”')],question:'你怎样安排自己与这场竞争的关系？',options:[
O('pact','与华妃订双署约：分工、署名、失误各自负责','用 1 个准备时辰谈清条款；共享部分成果，解锁联合试艺。',n=>{n.time--;n.trust++;n.flags.rivalPact=true;A(n,'pact')},['华妃逐条改过：“我负责呈报与资源，你负责实施与应变。各自的失误，不推给对方。”','你们不是突然成了知己，而是有了可核对的合作约定。最后也必须按约分享署名与收益。'],['准备时辰 −1','获得：双署分工约','联合试艺路线开放'],{collaboration:2,boundaries:1},'你用时间谈成有边界的竞合，获得联合试艺资格，同时接受共享署名与责任。',r.time>=1,'至少需要 1 个准备时辰讨论并确认双署条款。'),
O('autonomy','保持独立，把自己的交付与修改边界登记清楚','不花准备时辰；不占用同伴资源，后续依靠自己的成果核验。',n=>{n.flags.ownsWork=true;A(n,'owned')},['华妃收回合聘草案：“可以，各自的成果各自说话。临场也别等我替你解释。”','你在接引处登记负责范围、修改权与交付方式。独立并不意味着没有协作，而是能说清自己的承诺。'],['获得：独立交付边界单','保留独立核验与承接项目的依据'],{boundaries:2,evidence:1},'你明确独立成果与交付边界，后续可直接举证，也可向委托人说明承接范围。'),
O('study','先拆灯架和物料难题，把一个技术点吃透','用 1 个准备时辰；减少台前经营，积累可演示的专业方法。',n=>{n.time--;n.expertise+=2;n.insight++;A(n,'manual')},['华妃见你翻起结构札记：“你真要把名额押在这根灯架上？”你没有接话，先验算了荷载与替代材料。','尚工院留下的试验方法被你重新走了一遍。下一回追问，你不必只用口才作答。'],['准备时辰 −1','获得：尚工试验札记','积累专业试艺与加试依据'],{preparation:2,evidence:1},'你花时间拆解技术问题，积累可在公开试艺与加试中演示的方法。',r.time>=1,'至少需要 1 个准备时辰完成一次试验与记录。'),
O('brief','追问宫外商会的真实需求，记下预算和验收','不花准备时辰；暂不与华妃联手，探索有明确条件的项目委托。',n=>{n.insight++;n.flags.clientLead=true;A(n,'brief')},['华妃将来信推来：“那边要的是能按预算交付的小展，不吃宫里的头衔。”你顺势问清范围、验收和尾款。','你拿到的只是一份需求，不是订单。要赢得委托，还得拿出示范成果并通过核验。'],['获得：商会委托简章','知道独立委托的交付条件'],{boundaries:1,evidence:1},'你提前拿到真实需求、预算和验收条件，之后可用已有成果争取宫外委托。')]} }
function buildExhibition(r){
const project=r.merit>=3&&r.delivery>=2;
const craft=r.expertise+r.insight+(H(r,'sample')?1:0)+(H(r,'gear')?1:0)>=2&&r.delivery>=1;
const joint=!!r.flags.rivalPact&&r.delivery>=2&&r.trust>=1;
const commissioned=r.delivery>=2&&(H(r,'sample')||H(r,'gear')||r.flags.ownsWork)&&(r.insight>=1||H(r,'brief'));
const record=n=>{A(n,'showcase');n.flags.publicRecord=true};
return{id:'exhibition',title:'四门试艺，亲选前程',speaker:'specialist',before:[
L('narrator','雨势渐歇，敬妃让人撤去湿掉的帷幕，露出四张不同的试艺台：总筹案、工艺台、双署席、委托桌。皇后要看结果，也允许你选择用哪种工作证明自己。'),
L('npc','敬妃说明：“我是尚工院的专业主考，今日也替各司记录演示。你只选一项深做。目标不同，要展示的本领就不同。”'),
L('player',r.flags.rivalPact?'你和华妃已有双署约，可以把分工拿到台上验证。独立赛道也仍开放，签约没有替你决定最后去向。':r.flags.clientLead?'商会需求已在袖中，眼前可以用真实交付争取委托。宫内的统筹与专业席位，也都需要各自的证明。':H(r,'manual')?'你准备过的技术方法终于有了独立演示台。它不必依附谁的人情，也可以成为正式岗位的入场证。':'你可以凭自己的作品、现场经验或清楚的责任记录争取机会。各张台前都摆着具体任务，等待你挑一个真正想做的方向。'),
L('npc','“选择是一份意向，不是录用保证。试艺留下什么，终面就核对什么。”')],question:'你想争取哪种前程，并当场展示相应的依据？',options:[
O('project','争御前统筹席：把整场灯宴复盘成可执行计划','展示全局安排与真实交付；需要台前判断和落地经历共同支撑。',n=>{n.flags.target='project';n.flags.projectTrialPassed=project;if(project){n.merit++;record(n)}},[project?'你串起任务、风险、交接与应变。敬妃在总筹案上记下：“能说明为什么这样安排，也有落地佐证。”':'你讲出了宏大构想，但一追问谁在什么时候完成哪一步，计划就出现空白。敬妃记录了尚缺的交付环节。',project?'这次演示让你获得总筹方向的试艺记录；最终仍须通过责任与材料核验。':'选择总筹并未直接换来资格。终面会继续看真实表现，执行岗位也仍可能出现。'],project?['目标：御前统筹席','获得：公开试艺记录']:['目标：御前统筹席','总筹试艺尚缺可执行与交付依据'],{initiative:1,evidence:1},project?'你选择统筹方向，用已有判断与交付完成公开复盘，留下独立试艺记录。':'你选择统筹方向，但已有展示与交付尚未同时支撑计划，试艺记录留下了具体缺口。'),
O('craft','争尚工专业席：演示一个技术或设计问题的解法','需要试验、勘查或作品积累；以方法、验证过程和质量标准说话。',n=>{n.flags.target='craft';n.flags.specialistTrialPassed=craft;if(craft){n.expertise+=2;n.trust++;record(n)}},[craft?'你选定一个实际问题，展示材料替代、结构判断或设计验证。敬妃改变一个条件，你仍能解释如何重算、重试。':'你报出了理想效果，但讲不出验证步骤。敬妃换了一种材料，方案就无法继续，台前声势没有代替专业方法。',craft?'记录写的是可复现的方法，不是谁替你引荐。专业席位开始按这份能力证据评估。':'这次演示把准备不足显露出来。选了专业方向，不等于已经具有可被核验的专业成果。'],craft?['目标：尚工专业席','专业试艺通过，获得公开记录']:['目标：尚工专业席','专业试艺尚缺方法与验证'],{preparation:1,evidence:2},craft?'你凭实际准备完成专业演示，经得起条件变化的追问，获得专业岗位的核心依据。':'你尝试专业试艺，但现有准备不足以支撑验证过程，未取得专业资格记录。'),
O('joint','争双署联合席：与华妃互换环节，验证能否配合','需要双署分工约；让出部分独占署名，检验分工、交接与共同交付。',n=>{n.flags.target='alliance';n.flags.jointTrialPassed=joint;if(joint){n.delivery++;n.trust++;record(n)}},[joint?'华妃先说明资源与呈报，你接上实施；敬妃忽然交换两处环节。你们按约补位，也明确说出谁需要谁的支持。':'你们拿出了双署约，换到陌生环节时却接不住。敬妃提醒：签名一致，不代表合作已经能交付。',joint?'试艺记录同时写下两人的名字与责任。优势来自各自补位，代价是成果、收益和决定权都不能独占。':'合作仍可继续，但这次尚不足以获得联合席；不能仅凭签约就算通过。'],joint?['目标：双署联合席','协作试艺通过，共享责任与署名']:['目标：双署联合席','协作试艺尚未完成交接验证'],{collaboration:2,boundaries:1},joint?'你与竞争者按书面分工完成交换环节的试艺，证明共同交付，接受共享署名和责任。':'你选择联合方向，但现有实际交付尚不能支撑协作试艺，双署约未直接换来资格。',!!r.flags.rivalPact,'需要先在竞合谈判中签订双署分工约。'),
O('commission','争宫外委托：用已做过的成果提交范围与报价','需要可展示交付及需求或现场信息；按预算、验收与付款条件争取真实订单。',n=>{n.flags.target='commission';n.flags.commissionTrialPassed=commissioned;if(commissioned){n.trust++;record(n);A(n,'quote')}},[commissioned?'你用已交付的部分做示范，写下范围、成本、验收与返工边界。商会代表追问一笔支出，你拿现场信息说明了来源。':'你提出想独立承接，商会却先问样例、成本与验收。现有材料无法同时回答这些问题，意向没有变成订单。',commissioned?'商会留下一份附条件的委托意向：材料核验通过后才能签约，尾款按验收结算。宫外不是无条件的退路。':'代表愿意让你带走需求，却没有承诺委托。先把承接依据补好，才谈得上独立开局。'],commissioned?['目标：宫外独立委托','获得报价与验收单、公开试艺记录']:['目标：宫外独立委托','尚未取得有依据的委托意向'],{boundaries:1,evidence:2},commissioned?'你用真实成果、现场或需求信息形成可核对的报价与验收单，取得待核验的委托意向。':'你选择宫外方向，但示范交付、需求或成本信息不足，未获得委托意向。')]} }
function buildTerms(r){const e=offers(r),t=e.targetInfo;const repair=H(r,'sample')||H(r,'rubric')||H(r,'gear')||H(r,'manual')||H(r,'showcase')||r.insight>=2;const paper=['signed','backup','sample','owned','showcase','quote'].some(id=>H(r,id));const witness=r.flags.rivalPact||r.flags.teamWitness||r.flags.allyBond;return{id:'terms',title:'落款之前，最后一盏灯',speaker:'recruiter',before:[
L('narrator',e.target?`你选择的${t.name}已有明确意向，尚待确认最终条款。接引官将这份机会与典务司的招录情况摆在案前。`:e.alternate?`你争取的${t.name}仍有缺口，典务司却看中了已有交付或判断。你还有最后一次补充与比较的机会。`:'目前没有确定的机会。接引官留给你一盏灯的时间，只接受真实的新依据，不接受把旧承诺再说一遍。'),
L('npc',`接引官念出条件：“${t.name}，${t.conditions}。典务司则侧重现场执行、物料协调和交接。哪一种机会，都不是只换一块好听的牌子。”`),
L('player','你想起穿越前浏览的招聘页面：职责、回报与代价，一直写在那里，只是你曾经只盯着录用两个字。'),
L('npc','“补足依据、请合作方核对，或先问清条件。最后一个动作，仍由你自己做。”')],question:'你如何使用最后一次主动权？',options:[
O('scope','把职责、回报与不可接受的条件逐项问清','了解代价，资格仍依据已经发生的表现。',n=>{A(n,'terms');n.flags.fitKnown=true},[`接引官按${t.name}的条款逐项回答，并说明典务司的责任范围。没有任何机会承诺只享头衔、不承担工作。`,'你把需要接受的日常写在纸上。最终拿什么机会，要靠表现；愿意接受什么，终于有自己的判断。'],['条件已确认','可以按职责和代价作最终决定'],{boundaries:2,evidence:1},`你确认${t.name}与执行岗位的实际条件，为接受、转向或拒绝提供依据。`),
O('repair','用已有成果，补做一次针对性核验','有真实积累才补得上，不能凭最后一次选择制造经历。',n=>{if(repair){n.merit++;n.trust++;n.flags.verified=true;n.flags.repaired=true;A(n,'rehearsal')}else if(n.delivery>=4){n.trust++;n.flags.repairForAlternate=true}else{n.trust--;n.flags.repairFailed=true}},[repair?'你取出作品、试验或试艺记录，集中补一个被追问的环节。接引官核完：“有新依据，我会送去。”':r.delivery>=4?'你没有强编新亮点，而是将已经完成的交付按责任与时间重新整理，送去典务司。':'接引官停笔：“这一段还是承诺。没有原始依据，不能当成已经做过。”',repair?'补证修复的是核验链条，没有抹去试艺里未完成的演示，也没有替你凭空增加一份订单。':r.delivery>=4?'实际交付被看得更清楚，目标赛道的专业或协作门槛仍按试艺结果判断。':'最后窗口用完，机会将按本轮已有表现落定。'],repair?['补充核验通过','获得加试答辩手稿']:r.delivery>=4?['实际交付被进一步核对']:['补充缺少新依据'],{preparation:1,adaptability:1},repair?'你用真实积累补齐责任核验，试艺资格仍依此前实际表现。':r.delivery>=4?'你补充了真实交付的说明，让执行岗位可以进一步评估。':'最后补充仍缺实质依据，未改变先前暴露的缺口。'),
O('referral','请合作方核对交付，并向合适的岗位说明','需要双署约、现场交接见证或同伴互助；关系只传递已做成的事。',n=>{n.trust++;n.flags.referral=true;A(n,'terms')},[r.flags.rivalPact?'华妃按双署约确认你负责的成果：“我不替你吹嘘，但答应的分工，该算谁的就是谁的。”':r.flags.teamWitness?'现场主事将交接簿递给用人者：“这段调度与执行有记录，按实际内容评估即可。”':'沈眉庄交出见证：“我说明亲眼见过的部分，其余仍由考官核对。”','说明没有创造资格，也没有替你决定接受哪种机会；它让真实交付送到了相关的人面前。'],['合作或交接记录进入用人讨论','不以关系替代试艺资格'],{collaboration:2,boundaries:1},'合作方传递并核对真实贡献，增加可信度，没有替代专业、联合或委托条件。',!!witness,'需要双署约、现场交接见证或同伴互助之一。'),
O('supplement','用一个准备时辰，将记录整理成完整案例','需要 1 个准备时辰与原始记录；写清背景、过程、结果和责任。',n=>{n.time--;n.merit++;n.trust++;n.flags.verified=true;n.flags.supplemented=true},['你把原始材料串成可复核的案例，不只保留成功，也写下应急和返工。接引官在封面标记“材料齐备”。','整理没有创造新经历，却让已经做过的事更容易被看懂。是否通过试艺，仍有现场记录。'],['准备时辰 −1','案例材料完成核验'],{preparation:1,evidence:2},'你把原始材料整理为完整案例，让真实贡献更容易核验。',r.time>=1&&paper,'需要至少 1 个准备时辰，以及原稿、分工、独立边界或公开试艺记录。')]} }
function buildDecree(r){const e=offers(r),t=e.targetInfo,any=e.target||e.alternate;const end=(n,id)=>{n.flags.outcome=id};return{id:'decree',title:'前程各有路，由你落款',speaker:'examiner',before:[
L('narrator',r.flags.target==='commission'?'红榜与商会契纸同时送进殿中。你看向自己提交过报价的那张案桌，知道宫外机会也必须经过真实核验。':'红榜分列各司与联合席，不再只有最醒目的一个名字。你寻找自己选择的方向，也看见其他工作如何被认可。'),
L('npc',e.target?`皇后说明：“${t.name}已认可这一轮的对应试艺、交付与核验。它愿意给你机会，所附责任也不会少。”`:e.alternate?`皇后说明：“${t.name}的条件尚未齐备，典务司却认可已有的交付与判断。你可以认真考虑这份正式机会。”`:'皇后合起名册：“这一轮尚未形成足以支撑录用或委托的依据。换个好听的头衔，不会替你补完缺口。”'),
L('player',any?`${t.name}的条件已经公开：${t.conditions}。典务司则以明确的执行与交接负责。它们不是同一种日常，也不是同一种风险。`:'你回望准备、竞合、救场与试艺，开始看清这些经历里哪些环节还没有接上。'),
L('npc',any?'“所有机会都要今日确认。接下目标、转向执行岗位、明确拒绝，或继续等待，由你承担相应后果。”':'“把缺口带走，再用新的行动验证。宫外商会也要见成果与账目，下次把能交付什么讲实，再来谈条件。”')],question:any?'面对真实机会与条件，你如何落款？':'这一轮没有获得机会，你准备怎样继续？',options:any?[
O('accept_target',`接受${t.name}的${r.flags.target==='commission'?'委托':'录用'}，走自己选择的方向`,`需要目标资格已满足；${t.conditions}。`,n=>end(n,t.ending),[r.flags.target==='commission'?'商会核对最后一页报价，在验收与付款条件旁盖章。你接下第一阶段任务，而不是一句没有保障的“以后再合作”。':r.flags.target==='alliance'?'华妃先落一枚印，你在另一处签名。两人的名字同时生效，责任、收益与变更都按约定来。':r.flags.target==='craft'?'敬妃递来第一份试验与复核安排：“方法经得起条件变化，才是能长期依靠的本事。”':'皇后把整体筹办的交接簿递给你：“下一场要接住的，不只是一份自己的作品。”','你接受的是已经挣到的真实机会，也接受它清楚写明的日常与代价。'],[`确认${t.name}机会`,'按已公开条件开始下一阶段'],{initiative:1},`你凭本轮对应表现获得${t.name}机会，并明确接受其责任与条件。`,e.target,'目标试艺或其后的真实交付、责任核验尚未全部满足。'),
O('accept_other','接受典务司录用，走执行与协调方向','需要已有交付或判断被认可；选择稳定交接责任，不要求特定同伴关系。',n=>end(n,'redirected'),['典务司主事递来交接簿：“谁能把现场接住、把流程交清，这里就需要谁。”','你按已做过的事进入另一岗位。另一位用人者看见了不同贡献，愿意把下一份交付正式交到你手里。'],['确认典务司录用','进入执行与协调方向'],{boundaries:1},'你凭已有交付或判断赢得执行岗位机会，并在最终选择接受它。',e.alternate,'需要足够可信的交付或判断积累，典务司才会提供录用。'),
O('decline','明确谢绝已获得的机会，继续找更适合的路','已有真实机会才能选择；不保留本轮席位或委托名额。',n=>end(n,'walkaway'),['皇后将笔放回：“先有资格，再作取舍。拒绝一份不愿承担其日常的机会，不等于抹掉已经做成的事。”','你明确答复不接受，交回诏书或契纸，没有让对方无限等待。'],['主动谢绝真实机会','本轮成果与经验仍然成立'],{boundaries:2},'你先挣到真实机会，了解条件后明确拒绝，而非把未获机会写成主动退出。'),
O('defer','暂不答复，等更理想的条件再决定','今日截止；延期会释放已有席位或委托给候补，不能保留占位。',n=>{end(n,'deferred');n.flags.deferred=true},['接引官最后确认一次，你仍未签名。更鼓响起，名额或委托按事先说明的规则交给候补。','你曾经有机会，也没有被判定能力不足；改变本轮结果的是确认期限被错过。'],['已有机会超过确认期限','席位或委托释放给候补'],{boundaries:1},'你在已获得机会后继续等待，错过明确期限，导致真实机会被释放。')]:[
O('review','带走核验意见，下次补齐具体依据','本轮未获机会；先定位交付、试艺或核验里的缺口。',n=>end(n,'rejected'),['皇后标出一个没有接上的环节：“从这里补，不必把准备全部推倒。”','你没有接到录用或订单，却带走一个可以继续验证的问题。'],['本轮未获录用或委托','带走具体核验缺口'],{evidence:1,preparation:1},'你把下一步定为补齐具体依据，不用笼统的自我否定代替复盘。'),
O('retry','记住分岔点，重试一种准备与路线','本轮未获机会；换一个早期决定，比较真实后果。',n=>end(n,'rejected'),['接引官递来空白名帖：“下一局可以先换走法，再看哪扇门会开。”','这次记录不会被抹去。你想回到真正改变过后续行动的那一步。'],['本轮未获录用或委托','可回到分岔点重新探索'],{adaptability:1},'你决定通过不同早期选择检验另一条路径，而非重复相同承诺。'),
O('practice','先做一个可核验的小交付，再挑战目标','本轮未获机会；用实际练习补强想争取的工作方向。',n=>end(n,'rejected'),['敬妃留下一个小练习：“把过程、试验与结果留齐，比只练一段漂亮介绍有用。”','你收好练习任务，决定完成之后再带着真实过程，争取新的面谈与评估。'],['本轮未获录用或委托','下一步：完成可核验的真实练习'],{preparation:1,initiative:1},'你把下一次机会的依据放到实际完成并能复核的小项目上。'),
O('explore','重新研究岗位与委托条件，再决定方向','本轮未获机会；比较日常工作，重定下一次目标。',n=>end(n,'rejected'),['接引官收起名册：“先看每天做什么、承担什么，再决定哪块牌子值得追。”','你抄下各方向的条件，决定在下一份名帖落笔前，先问清自己愿意承担什么责任。'],['本轮未获录用或委托','下一步：按工作内容重新比较方向'],{boundaries:2},'你先重新核对岗位与委托条件，再选择下一轮竞争方向。')]} }
function check(r,complete=false){if(!r||!Number.isInteger(r.index)||r.index<0||r.index>TOTAL_STEPS||!Array.isArray(r.answers)||r.answers.length!==r.index)throw Error('无效故事进度');if(complete&&r.index!==TOTAL_STEPS)throw Error('请完成本轮全部抉择再查看结局')}
// Presentation metadata follows existing branches; it never changes option gates or costs.
const INSIGHT_ITEMS=['rubric','gear','clue','manual','brief'];
function actionItemCandidates(r,nodeId,optionId){
  const owned=ids=>[...new Set(ids.filter(id=>id&&H(r,id)))];
  const insight=()=>r.insight>=2?owned(INSIGHT_ITEMS):[];
  const direct=owned(['sample','gear']);
  const key=nodeId+'/'+optionId;
  switch(key){
    case 'credit/proof':return owned(['sample','signed']);
    case 'rain/hold':return owned(['gear']);
    case 'trial/prepared':return owned([['backup','rainkit','indoor','gear'].find(id=>H(r,id))]);
    case 'trial/focused':return owned(['rubric']);
    case 'trial/improvise':return direct.length?direct:insight();
    case 'exhibition/project':
      return r.merit>=3&&r.delivery>=2?owned(['sample','signed','owned',r.flags.usedPlan]):[];
    case 'exhibition/craft':{
      const passes=r.expertise+r.insight+(H(r,'sample')?1:0)+(H(r,'gear')?1:0)>=2&&r.delivery>=1;
      return passes?owned(['manual','sample','gear',...INSIGHT_ITEMS]):[];
    }
    case 'exhibition/joint':return r.flags.rivalPact?owned(['pact']):[];
    case 'exhibition/commission':{
      const passes=r.delivery>=2&&(H(r,'sample')||H(r,'gear')||r.flags.ownsWork)&&(r.insight>=1||H(r,'brief'));
      return passes?owned(['sample','gear',r.flags.ownsWork?'owned':null,...INSIGHT_ITEMS]):[];
    }
    case 'hearing/records':{
      const documents=owned(['sample','signed','backup','owned','showcase']);
      return documents.length?documents:r.flags.trade&&r.flags.delivered?owned([r.flags.usedPlan]):[];
    }
    case 'hearing/testimony':return r.flags.rivalPact?owned(['pact']):[];
    case 'hearing/live':{
      const technical=owned(['gear','manual']);
      return technical.length?technical:insight();
    }
    case 'terms/repair':{
      const evidence=owned(['sample','rubric','gear','manual','showcase']);
      return evidence.length?evidence:insight();
    }
    case 'terms/referral':return r.flags.rivalPact?owned(['pact']):[];
    case 'terms/supplement':return owned(['sample','signed','backup','owned','showcase','quote']);
    case 'decree/accept_target':return owned(['terms',r.flags.repaired?'rehearsal':null,r.flags.target==='commission'?'quote':null,r.flags.target==='alliance'?'pact':null]);
    case 'decree/accept_other':return owned(['terms',r.flags.repaired?'rehearsal':null]);
    case 'decree/decline':return owned(['terms']);
    default:return [];
  }
}
function explainLocked(r,nodeId,o){
  if(o.available)return '';
  const time=cost=>`这一步要花 ${cost} 个准备时辰，你现在只剩 ${r.time} 个。`;
  switch(nodeId+'/'+o.id){
    case 'role/record':return time(2);
    case 'role/stage':case 'role/site':case 'bargain/pact':case 'bargain/study':return time(1);
    case 'credit/proof':return H(r,'sample')||H(r,'signed')?`记录已经在手，但${time(1)}`:'前面没有保留作品原稿或签字分工单，暂时拿不出可核对的记录。';
    case 'credit/witness':return '入局时还没有与沈眉庄建立互助，她暂时不能为这段贡献作证。';
    case 'rain/backup':return time(2);
    case 'rain/borrow':return '还没有积累可请求沈眉庄相助的人情，暂时借不到这批物料。';
    case 'trial/prepared':return '此前没有准备雨天备份、备用物料或连廊方案，也没有留下场地勘查单。';
    case 'trial/focused':return '入宫时没有选择了解考官关注点，手中还没有这份清单。';
    case 'hearing/records':return '还缺可核对的原稿、分工或试艺记录，独立任务也尚未形成完整交付。';
    case 'hearing/testimony':return '还没有同伴互助、双署分工约或现场交接记录可以作证。';
    case 'exhibition/joint':return '谈判时还没有与华妃订立双署分工约，暂时不能一起上台。';
    case 'terms/referral':return '还没有合作约或现场交接见证，也尚未建立可以提供见证的同伴关系。';
    case 'terms/supplement':{
      const paper=['sample','signed','backup','owned','showcase','quote'].some(id=>H(r,id));
      return paper?`原始记录已经在手，但${time(1)}`:'还缺原稿、分工、试艺或报价记录，暂时无法整理成完整案例。';
    }
    case 'decree/accept_target':{
      const target=r.flags.target||'project';
      if(target==='project'&&!r.flags.projectTrialPassed)return '公开试艺中，总筹计划还没有用真实展示与交付说清楚。';
      if(target==='craft'&&!r.flags.specialistTrialPassed)return '专业试艺还没给出能够复核的方法，尚工院暂未确认录用。';
      if(target==='alliance'&&!r.flags.rivalPact)return '此前没有订立双署分工约，联合席还缺正式合作安排。';
      if(target==='alliance'&&!r.flags.jointTrialPassed)return '联合试艺里，交换环节后的配合还没有通过现场验证。';
      if(target==='commission'&&!r.flags.commissionTrialPassed)return '还没用已有成果讲清报价与验收，商会暂未给出委托意向。';
      if(!r.flags.verified)return '目标试艺已有依据，但终面还没有完成个人责任核验。';
      if(r.trust<(target==='project'?3:2))return '部分承诺与实际记录还没有核对清楚，对方暂未确认这个机会。';
      if(r.delivery<(target==='project'||target==='alliance'?3:target==='commission'?2:1))return '已展示的想法还缺足够的实际交付，这个方向暂未确认机会。';
      return '统筹展示与案例还不足以支撑这一席，对方暂未确认录用。';
    }
    case 'decree/accept_other':return r.trust<2?'典务司还没能把你的贡献与实际记录核对清楚。':'本轮留下的执行交付与现场判断，尚不足以接下这份工作。';
    default:return o.lockedReason;
  }
}
function withEmotion(lines,index,emotion){return lines.map((line,i)=>i===index?{...line,emotion}:{...line})}
function beforeEmotions(r,node){
  const moments={arrival:[0,'discovery'],role:[1,'tension'],credit:[1,'anger'],bargain:[1,r.flags.creditProtected?'anger':'tension'],rain:[0,'tension'],trial:[0,'tension'],exhibition:[0,'discovery'],hearing:[0,r.flags.rivalPact?'tension':'anger'],terms:[1,'discovery'],decree:[1,(offers(r).target||offers(r).alternate)?'approval':'tension']};
  const moment=moments[node.id],lines=moment?withEmotion(node.before,...moment):node.before.map(line=>({...line}));
  const spoken={credit:[3,'rival','anger','huaAnger'],trial:[3,'examiner','tension','queenCaution'],exhibition:[1,'specialist','discovery']}[node.id];
  if(spoken){const[index,npcRole,emotion,voice]=spoken;lines[index]={...lines[index],npcRole,emotion,...(voice?{voice}:{})};}
  return lines;
}
function replyEmotions(before,after,nodeId,optionId,lines){
  const fixed={
    'arrival/sample':[0,'approval'],'arrival/rubric':[0,'discovery'],'arrival/ally':[0,'approval'],'arrival/pitch':[0,'tension'],
    'role/record':[0,'anger'],'role/stage':[0,'tension'],'role/site':[0,'discovery'],'role/observe':[0,'discovery'],
    'credit/proof':[0,'anger'],'credit/witness':[1,'approval'],'credit/trade':[0,'tension'],'credit/claim':[0,'tension'],
    'bargain/pact':[0,'approval'],'bargain/autonomy':[0,'tension'],'bargain/study':[1,'discovery'],'bargain/brief':[0,'discovery'],
    'rain/backup':[1,'discovery'],'rain/borrow':[0,'approval'],'rain/indoor':[0,'anger'],'rain/hold':[0,'approval'],
    'trial/prepared':[1,'approval'],'trial/focused':[1,'approval'],'trial/stabilize':[1,'approval'],
    'hearing/records':[0,'approval'],'hearing/testimony':[1,'approval'],'hearing/limits':[0,'approval'],
    'terms/scope':[0,'discovery'],'terms/referral':[0,'approval'],'terms/supplement':[0,'approval'],
    'decree/accept_target':[0,'approval'],'decree/accept_other':[0,'approval'],'decree/decline':[0,'approval'],'decree/defer':[0,'tension'],
    'decree/review':[0,'discovery'],'decree/retry':[0,'discovery'],'decree/practice':[0,'discovery'],'decree/explore':[0,'discovery']
  };
  let moment=fixed[nodeId+'/'+optionId];
  if(nodeId==='trial'&&optionId==='improvise')moment=after.flags.improviseWorked?[1,'approval']:[0,'tension'];
  if(nodeId==='hearing'&&optionId==='live')moment=after.flags.livePassed?[1,'approval']:[0,'tension'];
  if(nodeId==='terms'&&optionId==='repair')moment=after.flags.repaired||after.flags.repairForAlternate?[0,'approval']:[0,'tension'];
  if(nodeId==='exhibition'){
    const flag={project:'projectTrialPassed',craft:'specialistTrialPassed',joint:'jointTrialPassed',commission:'commissionTrialPassed'}[optionId];
    moment=after.flags[flag]?[1,optionId==='commission'?'discovery':'approval']:[0,'tension'];
  }
  const result=moment?withEmotion(lines,...moment):lines.map(line=>({...line}));
  const spoken={'arrival/sample':['recruiter'],'arrival/ally':['mentor'],'role/record':['rival'],'rain/borrow':['mentor','shenCalm']}[nodeId+'/'+optionId];
  if(spoken){const[npcRole,voice]=spoken;result[0]={...result[0],npcRole,...(voice?{voice}:{})};}
  return result;
}
function publicOption(r,nodeId,o){return{id:o.id,text:o.text,hint:o.hint,available:!!o.available,lockedReason:explainLocked(r,nodeId,o),uses:o.available?actionItemCandidates(r,nodeId,o.id):[]}}
function internalNode(r){const node=N[r.index](r);node.chapter=Math.floor(r.index/2);return node}
function getNode(r){check(r);if(r.index===TOTAL_STEPS)return null;const n=internalNode(r);return{id:n.id,title:n.title,chapter:n.chapter,speaker:n.speaker,before:beforeEmotions(r,n),question:n.question,options:n.options.map(o=>publicOption(r,n.id,o))}}
function choose(r,id){check(r);if(r.index>=TOTAL_STEPS)throw Error('本轮已结束');const node=internalNode(r),o=node.options.find(o=>o.id===id);if(!o)throw Error('未找到这个选择');if(!o.available)throw Error(explainLocked(r,node.id,o));const usedItems=actionItemCandidates(r,node.id,o.id).map(id=>({id,label:ITEMS[id].label}));const n=C(r);o.effect(n);if(n.time<0)throw Error('准备时辰不足');n.support=Math.max(0,n.support);for(const[k,v]of Object.entries(o.strategy))n.strategy[k]+=v;const feedback=o.feedback.slice();if(usedItems.length)feedback.push('用上了：'+usedItems.map(item=>item.label).join('、'));n.answers.push({nodeId:node.id,optionId:o.id,choiceText:o.text,nodeTitle:node.title,chapter:node.chapter,feedback:feedback.slice(),consequence:o.consequence,strategy:{...o.strategy},usedItems});n.index++;return{run:n,reply:replyEmotions(r,n,node.id,o.id,o.reply),feedback}}
function summarize(r){check(r);const ch=CHAPTERS[Math.min(CHAPTERS.length-1,Math.floor(r.index/2))];const relations=[];if(r.flags.rivalPact)relations.push('华妃双署竞合');if(r.flags.allyBond)relations.push('同伴互助');if(r.flags.teamWitness)relations.push('现场协作见证');const relation=relations.length?relations.join(' · '):r.flags.ownsWork?'独立交付 · 责任边界清楚':H(r,'manual')?'专业积累 · 凭方法争取':r.flags.clientLead?'需求对接 · 探索独立委托':'自主准备 · 按实际任务协作';const node=r.index<TOTAL_STEPS?internalNode(r):null;return{time:r.time,inventory:r.inventory.map(id=>{const uses=node?node.options.filter(o=>actionItemCandidates(r,node.id,o.id).includes(id)).map(o=>({nodeId:node.id,optionId:o.id,label:o.text,available:!!o.available,reason:o.available?'可用于这一步行动。':explainLocked(r,node.id,o)})):[];const lastIndex=r.answers.map(a=>(a.usedItems||[]).some(item=>item.id===id)).lastIndexOf(true);return{id,...ITEMS[id],...(id==='terms'?{detail:`${TARGETS[r.flags.target||'project'].name}：${TARGETS[r.flags.target||'project'].conditions}；典务司侧重现场执行、物料协调与交接。`}:{}),uses,...(lastIndex>=0?{lastUsedText:`第 ${lastIndex+1} 次选择 · ${r.answers[lastIndex].nodeTitle}`}:{})}}),relation,goal:ch.goal,chapterName:ch.name,target:TARGETS[r.flags.target||'project'].name}}

function cause(r,id,title){const i=r.answers.findIndex(a=>a.nodeId===id),a=r.answers[i];return{title,detail:`你选择“${a.choiceText}”。${a.consequence}`,nodeIndex:i}}
function replayTo(r,index){check(r);if(!Number.isInteger(index)||index<0||index>=TOTAL_STEPS||index>r.answers.length)throw Error('只能回到已到达的节点');let n=createRun();for(let i=0;i<index;i++)n=choose(n,r.answers[i].optionId).run;return n}
function getEnding(r){check(r,true);const id=r.flags.outcome,e=offers(r),t=e.targetInfo;const byId=Object.fromEntries(r.answers.map(a=>[a.nodeId,a]));const v=r.flags.repaired||r.flags.supplemented?byId.terms:byId.hearing;
const at=id=>r.answers.findIndex(a=>a.nodeId===id);
const earned=e.target?t.name:'典务司';
const earnedConditions=e.target?t.conditions:'现场执行、物料协调与明确的交接责任';
const causes=[cause(r,'arrival','起点：先带什么入局'),cause(r,'bargain','竞合：为自己选择什么关系'),cause(r,'trial','雨夜：哪种准备变成交付'),cause(r,'exhibition','试艺：目标与资格怎样对应'),cause(r,'hearing','核验：贡献凭什么站住')];
if(r.flags.repaired||r.flags.supplemented||r.flags.referral)causes.push(cause(r,'terms','最后补充：已有依据如何被看见'));
if(['walkaway','deferred','redirected'].includes(id))causes.push(cause(r,'decree','最终答复：机会怎样成为结果'));
const returnText='宫门在身后合拢，电脑屏幕重新亮起。简历还没改完，秋招邀约仍停在收件箱里。你记得每一次准备、合作、试艺和取舍怎样改变了手中的机会，这些经历也将陪你面对下一场现实中的面试。';
const ends={
appointed:{title:'金榜入局 · 御前统筹席',tagline:'把分散的人与事接成一局，凭交付争到主位。',paragraphs:[
'皇后将整场筹办的交接簿递给你，红榜上的名字对应的是一份完整责任。你不会只负责自己的亮点，还要在任务冲突、资源不足与临时变更之间安排他人，保证最后能够交成。',
`你先在竞合谈判中选择“${byId.bargain.choiceText}”，雨夜又以“${byId.trial.choiceText}”留下真实表现。公开试艺中的总筹复盘把这些经历串成计划，最终通过“${v.choiceText}”补齐了责任核验。这几步相互支撑，每一笔贡献最终都能回到真实记录。`,
'现代岗位更接近项目统筹、管培或活动策划。你已知道轮值、临时调度和异地任务的代价，仍然接下这一席：接下来，个人出彩与团队完成要同时负责。'],offer:'御前筹办司正式录用｜现代对应：项目统筹、管培生、活动策划（文旅、会展、品牌、公服等）',nextTry:{nodeIndex:at('bargain'),hint:'回到竞合谈判，尝试积累专业方法或获取委托需求，看看同样的作品能打开哪条新路。'}},
specialist:{title:'一技入殿 · 尚工院专业席',tagline:'一项经得起追问的方法，成为入职的凭据。',paragraphs:[
'敬妃没有先递一块耀眼的腰牌，而是给了你一份材料替代与质量复核任务。尚工院看中的是你在公开试艺中能够演示、解释并验证的方法；条件改变时，仍说得清下一步怎样试。',
`“${byId.exhibition.choiceText}”这次演示得到通过，并非因为最后临时选择了专业方向。它用上了之前的试验、勘查或作品积累；雨夜的实际工作提供了问题背景，之后“${v.choiceText}”让试艺记录与个人责任能够相互对应。`,
'这条路对应工艺技术、质量改进、工程助理或设计制图等专业岗位，可出现在制造、建筑与文博领域。你接受了持续学习、按标准复核与承担质量责任的日常，职位由一项可验证的本领打开。'],offer:'尚工院正式录用｜现代对应：工艺技术、质量改进、工程助理、设计制图（制造、建筑、文博等）',nextTry:{nodeIndex:at('bargain'),hint:'试着把独立专业成果带去竞合或委托赛道，比较技术岗位与项目责任的区别。'}},
alliance:{title:'双印同诏 · 联合筹办席',tagline:'没有突然成为知己，先成为能按约交付的搭档。',paragraphs:[
'同一张联合诏书上落下两枚印。华妃负责资源与呈报，你承担实施与应变；重要变更需要互相确认，署名、收益和失误也按书面约定拆分。胜利属于合作能运作这件事，不属于某个人把功劳全揽走。',
`你曾选择“${byId.bargain.choiceText}”，为谈清责任付出准备时间。公开试艺又让你们交换环节，真实检验能否补位；雨夜交付与后续“${v.choiceText}”则留下可以相互核对的依据。这份聘约由明确分工、现场配合与交付核验共同支撑。`,
'现代对应联合项目组、跨专业策划或项目合伙团队，常见于会展、文旅和设计服务。你保留自己的贡献，也接受不独占名字与决定权。这种关系需要明确边界和反复交接，绝非永不冲突的结盟。'],offer:'双署联合筹办聘约｜现代对应：联合项目组、跨专业策划、项目合作团队（会展、文旅、设计服务等）',nextTry:{nodeIndex:at('bargain'),hint:'保持之前的准备，改选独立边界，比较同一份成果在联合与独立路线上的去向。'}},
independent:{title:'宫外开局 · 首份独立委托',tagline:'真实成果赢得首份委托，交付与风险也由你承担。',paragraphs:[
'商会代表没有给你官职，而是在一份真实的项目契纸上签字。承接范围、预算上限、阶段验收和付款时间逐项写明；第一阶段按约启动，后续尾款与返工仍受验收条件约束。',
`你以“${byId.exhibition.choiceText}”提交了已有成果的示范、成本解释和验收安排，拿到附核验条件的委托意向。此前的作品、勘查、独立责任或需求准备让这份报价有根据；最后通过“${v.choiceText}”确认贡献，意向才转成可签的项目。`,
'现代对应独立策划、设计服务或小型项目承包，可能服务展陈、社区活动和商业项目。自由伴随报价、现金流、交付与返工风险。你接受了这些边界，带着已获得的首份委托出宫，开始核对第一阶段需要交付的工作。'],offer:'宫外商会项目委托已确认｜现代对应：独立策划、设计服务、小型项目承包（展陈、社区活动、商业项目等）',nextTry:{nodeIndex:at('exhibition'),hint:'保留已经积累的成果，改走专业岗位或统筹试艺，比较正式岗位与独立委托的责任。'}},
redirected:{title:'另辟前程 · 典务司执行席',tagline:e.target?'有另一份目标机会，也可以主动选择更愿承担的工作。':'原目标尚有缺口，真实交付仍能被另一岗位看见。',paragraphs:[
e.target?`你已争取到${t.name}的机会，最后却接下典务司的交接簿。你比较过职责与条件，主动选择执行与协调的日常。`:`${t.name}的对应条件没有全部满足，典务司却认可本轮的实际交付或判断。它递来正式交接簿，清楚写下入职后需要接住的具体工作。`,
`雨夜你选择“${byId.trial.choiceText}”，核验时又选择“${byId.hearing.choiceText}”。这些记录让用人者看清你已经能负责的部分。${r.flags.referral?'合作方或现场记录补充了真实说明，并没有代替岗位要求。':'独立成果与现场记录让用人者逐项看懂了你已经做成的事。'}`,
'项目执行、供应链协调、行政运营与现场管理都需要把交接落到实处。制造、零售、文旅与公共文化都有这样的工作。你知道它不总在台前，却明确选择承担这一类责任。'],offer:'典务司正式录用｜现代对应：项目执行、供应链协调、行政运营、现场管理（制造、零售、文旅、公服等）',nextTry:{nodeIndex:at('exhibition'),hint:'回到公开试艺，比较另一个目标需要哪些不同依据，也可以再次确认执行方向是否适合。'}},
walkaway:{title:'不受此诏 · 主动谢绝机会',tagline:'先争到选择权，再决定是否愿意承担它的日常。',paragraphs:[
`你面前确实摆着${earned}的真实机会。用人者或委托人已经认可本轮相应表现；你了解“${earnedConditions}”之后，选择明确谢绝，而不是迟迟不回话。`,
`公开试艺选择了“${byId.exhibition.choiceText}”，最终可获得什么，仍由此前实际准备、交付与责任核验决定。过去的努力让这次去留成为真正可以决定的事，诏书或契纸上的认可也不会因拒绝而消失。`,
'成果不会因拒绝而消失，席位或委托也不会替你一直保留。你清楚答复对方，带着被验证的经历回到自己的选择里，继续找愿意承担其条件的工作。'],offer:`已获${earned}机会，了解实际条件后主动谢绝`,nextTry:{nodeIndex:at('decree'),hint:'保留本局挣到的机会，回到最终答复，体验接受目标或选择执行岗位的结果。'}},
deferred:{title:'过期的诏书 · 错过确认期限',tagline:'机会曾经真实存在，失去它的原因是没有及时确认。',paragraphs:[
`你曾获得${earned}的机会，却选择再等更理想的条件。接引官明确提醒过今日截止；更鼓响起，你仍未落款，原有席位或委托随即释放给候补。`,
'这一局的准备、试艺与核验并没有被倒扣成失败。真正改变最终结果的是最后答复：你既没有明确接受，也没有主动拒绝，而是超过了已知的确认期限。它与因缺少资格而未获录用，是两种不同经历。',
'回到现实，机会窗口也是需要管理的条件。下一次可以提前列出必须核实的问题、可接受范围和最晚答复时间；保留选择权并不意味着能无限延长对方的等待。'],offer:`${earned}曾提供真实机会，因未在截止前确认而失效`,nextTry:{nodeIndex:at('decree'),hint:'前面的资格全部保留。只回到最终答复，在明确期限内接受、转向或主动谢绝。'}},
rejected:{title:'待下一榜 · 本轮未获机会',tagline:'这一轮的具体缺口，值得用下一次行动重新验证。',paragraphs:[
`本轮没有取得${t.name}的对应资格，也没有获得典务司的录用。宫外商会也在核对示范、报价与验收安排，本轮材料尚未使委托成立。准备、试艺、交付与核验，都留下了具体记录。`,
`你在雨夜选择“${byId.trial.choiceText}”，公开试艺选择“${byId.exhibition.choiceText}”。${!r.flags.verified?'最终缺少充分的个人责任核验，承诺与已完成的工作还没有接上。':r.trust<2?'虽然提交过核验材料，前后承诺和实际表现仍存在未修复的矛盾。':r.delivery<2&&r.insight<2?'可被呈现的实际交付与判断积累不足，目标试艺也未取得相应资格。':'目标试艺及对应要求尚未齐备，已有交付也不足以形成其他岗位机会。'}你把批注折好，记下下次需要亲手补上的那一步。`,
`最后你选择“${byId.decree.choiceText}”。先用一个可完成的小行动修复缺口，再验证新的路线，会比将本局结果等同于自己的全部可能更有帮助。`],offer:'本轮未获得正式录用或项目委托｜先补齐对应试艺、交付与核验依据',nextTry:{nodeIndex:at('bargain'),hint:'保留前面的入局选择，改试专业积累、独立边界或竞合路线，观察可选行动与资格怎样变化。'}}};
if(!ends[id])throw Error('结局尚未落定');return{id,...ends[id],causes,returnText}}
return Object.freeze({TOTAL_STEPS,CHAPTERS,ENDING_CATALOG,createRun,getNode,choose,summarize,getEnding,replayTo});
})();
