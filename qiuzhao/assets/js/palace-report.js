(function (root) {
  'use strict';

  const STRATEGIES = {
    preparation: {
      title: '先摸清局面，再安排下一步',
      keyword: '有备而来',
      detail: '在这局秋选中，你把一部分有限的时间投入到了准备。这样的行动会影响你后来能拿出什么材料、听懂什么暗示，以及面对追问时能否接得住。回顾时，可以一起看准备带来的帮助和它占用的时间。'
    },
    initiative: {
      title: '主动把机会争取到手里',
      keyword: '主动争取',
      detail: '这局里，你在机会出现时作出了主动争取的行动。主动表达可以让别人看见你，也会让后续的承诺、展示与追问落到你身上。真正值得带走的经验，是争取到机会之后，你怎样把它接稳。'
    },
    collaboration: {
      title: '把同行的人也放进计划里',
      keyword: '借力同行',
      detail: '你的部分行动把合作与同伴纳入了考虑。支持别人、提出求助或一起处理难题，会改变这局里人物愿意怎样回应你。复盘时，可以分清哪些帮助产生了后续回应，哪些投入需要更清楚的边界。'
    },
    adaptability: {
      title: '在变化发生后重新找路',
      keyword: '临场转向',
      detail: '局面变化时，你尝试过调整走法。换方案、换目标或换一种表达，都可能保住继续向前的机会；与此同时，也会改变原本准备的用途。看看哪次转向确实解决了眼前的问题，以及它留下了什么新的代价。'
    },
    evidence: {
      title: '让关键判断有具体凭据',
      keyword: '拿出凭据',
      detail: '你在这局里作出过补充凭据、说明事实或展示成果的行动。具体材料能够让别人沿着你的思路继续追问，也让你的说法更容易被核对。值得保留的做法，是把主张、证据和结果连在一起，而不是只记住一句漂亮的表达。'
    },
    boundaries: {
      title: '在争取机会时保留自己的尺度',
      keyword: '留有边界',
      detail: '你的部分选择为时间、承诺或最终去向划出了边界。这会让某些机会被保留，也可能让另一些机会从手边过去。可以把当时最在意的条件写下来，看看最后的取舍是否仍然符合最初的目标。'
    }
  };
  const ENDING_WORDS = {
    appointed: ['项目统筹', '兑现准备'],
    specialist: ['专业入局', '作品立身'],
    alliance: ['竞合联聘', '共担成果'],
    independent: ['独立委托', '宫外开局'],
    redirected: ['执行协调', '另辟路径'],
    walkaway: ['主动选择', '带着经验返程'],
    deferred: ['机会逾期', '重排节奏'],
    rejected: ['此轮止步', '留下复盘线索']
  };
  const text = value => value == null ? '' : String(value);
  function prose(value) {
    return (Array.isArray(value) ? value : [value]).map(text).map(value => value.trim()).filter(Boolean).join('；');
  }
  function sentence(value) { const body = prose(value); return !body || /[。！？.!?]$/.test(body) ? body : `${body}。`; }
  function publicURL(value) {
    try {
      const url = new URL(text(value));
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      url.hash = '';
      return url.href;
    } catch (_) { return ''; }
  }
  function actionLabel(answer, index) {
    return `第 ${index + 1} 次行动「${text(answer.nodeTitle) || '秋选抉择'}」`;
  }
  function strategyEvidence(answers, key) {
    return answers.flatMap((answer, index) => {
      const values = answer.strategy || answer.strategyDelta || {};
      const tags = Array.isArray(answer.strategyTags) ? answer.strategyTags : [];
      return Number(values[key]) > 0 || tags.includes(key) ? [{ answer, index }] : [];
    });
  }
  function buildStyle(run, answers) {
    const selected = Object.keys(STRATEGIES).map((key, order) => ({ key, order, count: Number((run.strategy || {})[key]) || 0, evidence: strategyEvidence(answers, key) }))
      .filter(item => item.count > 0 && item.evidence.length)
      .sort((a, b) => b.count - a.count || a.order - b.order).slice(0, 3);
    return selected.map(({ key, evidence }) => ({
      key,
      title: STRATEGIES[key].title,
      detail: STRATEGIES[key].detail,
      evidence: evidence.slice(0, 2).map(({ answer, index }) => `${actionLabel(answer, index)}，你选择了「${text(answer.choiceText)}」。${prose(answer.consequence || answer.feedback)}`).join(' ')
    }));
  }
  function makeAdvice(ending, history) {
    const nextIndex = Number.isInteger(ending.nextTry && ending.nextTry.nodeIndex) ? Math.max(0, Math.min(history.length - 1, ending.nextTry.nodeIndex)) : 0;
    const next = history[nextIndex];
    const hint = text(ending.nextTry && ending.nextTry.hint);
    const first = {
      t: `重做一次「${next.nodeTitle}」`,
      d: `先回看第 ${nextIndex + 1} 次行动：${next.choiceText}。${hint}给自己 20 分钟，写出当时的目标、手里已有的材料、最担心的代价，再写一个可以实际执行的替代行动。最后用一句话说明：如果重来，你希望后续哪件事发生变化。`
    };
    const endings = {
      appointed: [
        { t: '把统筹经历讲成两分钟案例', d: '挑一条帮助你入选的真实因果，按“共同目标、各方任务、出现的冲突、你怎样协调、最终交付”讲述。现实秋招时，用自己的课程、实习或项目经历替换剧情，写清你本人作出的决定，再请朋友追问三个具体细节。' },
        { t: '为一个真实任务画出依赖顺序', d: '选一项一周内要完成的小任务，列出关键产出、负责人、前置条件与截止时间。圈出最容易拖住其他人的一步，写好一个可替代方案。练习向同伴用三句话说清：现在卡在哪、需要谁做什么、何时再确认。' }
      ],
      specialist: [
        { t: '把一件作品拆到能够复现', d: '从自己的作品、分析或方案里挑一个片段，整理输入材料、关键步骤、取舍理由和验证方法。请一个没有参与过的人沿着记录复现或理解过程，记下对方卡住的地方，再补齐说明。让专业积累能够被看见，也能够被追问。' },
        { t: '练习把专业细节讲回实际用途', d: '对同一件作品做两版三分钟介绍：一版讲给熟悉领域的人，说明方法与限制；另一版讲给不了解的人，说明它解决什么问题、为什么这样取舍、怎样知道有效。比较两版的共同核心，留下可以放入作品集的简短说明。' }
      ],
      alliance: [
        { t: '把合作中的贡献与责任写明', d: '找一段真实小组经历，列出共同目标、各自交付、需要一起决定的事项与成果署名。选一个最容易重复劳动或互相等待的地方，补一句清楚的交接约定。让别人能够看见你的贡献，也能看见你怎样让共同成果落地。' },
        { t: '做一轮有分歧的双人复盘', d: '和同伴分别写下同一段合作中最难的一次分歧，再对照双方当时掌握的信息、担心的代价和实际行动。先确认共同事实，再各提出一个下次可执行的调整。最后把双方都认可的做法写成三条简短约定。' }
      ],
      independent: [
        { t: '把委托写成一页可交付说明', d: '选一个可以独立完成的小项目，写清目标、交付物、工作范围、验收方式和预计时间。把还需要确认的问题单独列出，尤其标明哪些临时增加的内容会影响安排。练习让接手的人读完这一页，就知道你准备交付什么。' },
        { t: '用一次小交付验证自己的安排', d: '先做最小的一份样稿、分析或演示，在约定的时间内交出来，再根据反馈完成一次修改。记录实际耗时、返工原因和下次需要提前问清的条件。把“我能独立做”变成一条从澄清任务到交付复盘的完整经历。' }
      ],
      redirected: [
        { t: '把执行交接整理成一页清单', d: '选择一次真实的活动、课程协作或实习任务，把物料、负责人、交付时间、当前状态和待确认事项列成清单。请未参与的人试着接手，看看哪里仍要反复询问，再补齐最影响执行的信息。' },
        { t: '给现场变化安排一个可用的备选', d: '从清单里挑一个可能变化的条件，例如场地、人员或材料到位时间。写出变化发生时先保住什么、通知谁、怎样重新安排顺序，再用十分钟口头演练。把幕后协调留下的具体成果，整理成简历里的一条经历。' }
      ],
      walkaway: [
        { t: '把“我为什么不接”写具体', d: '列出求职时最在意的三个条件，为每项写出可接受范围与需要确认的问题。找一个真实岗位逐项核对，并保留事实来源。这样下一次拒绝或接受机会时，你能说清具体依据，也能看见哪些条件仍有商量空间。' },
        { t: '为离开的决定准备下一步', d: '从正在考虑的岗位中挑出两个可以继续了解的方向，分别写下一项一周内能完成的行动，例如补齐一份作品、约一次经历复盘或核对招聘要求。给行动设置日期，结束一次选择后仍然保有前进的安排。' }
      ],
      deferred: [
        { t: '为手里的机会补上确认时间表', d: '把每个正在等待答复的机会写成一行，记录对方要求的回复时间、确认方式、联系人、尚未问清的问题，以及自己最晚何时作决定。为临近的节点预留提前沟通的时间，结束一轮面试后就更新一次。' },
        { t: '练一份及时确认或申请延期的回复', d: '写一份尚未发送的回复草稿，说明已经收到机会、仍需确认的具体事项，以及自己能够给出明确答复的日期。如果预计无法按原期限决定，练习提前询问是否可以延期，并把对方实际回复记录下来。重点是让沟通发生在机会关闭之前。' }
      ],
      rejected: [
        { t: '补一条能够被追问的证据', d: '从自己的课程、项目或实习里选一件实际完成的事，整理背景、本人行动、结果与限制，保留能支持说法的材料。找朋友连续追问“为什么这样做”“你负责哪部分”“结果怎么知道”，把答不上来的地方记成下一轮准备清单。' },
        { t: '做一次有时间限制的模拟', d: '用十分钟模拟介绍经历、应对追问和结束提问，录音后只挑一个最影响理解的地方修改。第二次再讲同一段，比较是否更清楚。把这一轮的遗憾变成一个能重复练习的小环节，避免一次性推翻所有准备。' }
      ]
    };
    const fallback = [
      { t: '把下一步落实为一个小动作', d: '从这局最想重做的地方选一个具体目标，写下一周内能完成的行动和完成标准。做完后对照实际结果，留下可以继续调整的记录。' },
      { t: '重新核对自己的选择条件', d: '写下这次决定最看重的三个条件，分别区分已知事实、仍需确认的信息和个人期待。下一次遇到类似机会时，带着这张清单再作判断。' }
    ];
    return [first].concat(endings[ending.id] || fallback);
  }
  function build(run, name, url) {
    if (!root.PalaceGame || typeof root.PalaceGame.getEnding !== 'function') throw new Error('秋选故事尚未载入');
    const answers = run && Array.isArray(run.answers) ? run.answers : [];
    const configuredSteps = Number(root.PalaceGame.TOTAL_STEPS);
    const totalSteps = Number.isInteger(configuredSteps) && configuredSteps > 0 ? configuredSteps : answers.length;
    if (!run || !answers.length || answers.length !== totalSteps) throw new Error(`请完成本局 ${totalSteps || '全部'} 次行动，再生成秋选经历档案`);
    const ending = root.PalaceGame.getEnding(run);
    if (!ending || !ending.id) throw new Error('本局秋选尚未落幕');
    const summary = root.PalaceGame.summarize(run);
    const catalog = Array.isArray(root.PalaceGame.ENDING_CATALOG) ? root.PalaceGame.ENDING_CATALOG : [];
    const totalEndings = catalog.length;
    const chapterCount = new Set(answers.map(answer => answer.chapter).filter(chapter => chapter !== null && chapter !== undefined)).size;
    const history = answers.map((answer, nodeIndex) => ({
      title: `行动 ${String(nodeIndex + 1).padStart(2, '0')}｜${text(answer.nodeTitle) || '秋选抉择'}`,
      nodeTitle: text(answer.nodeTitle) || '秋选抉择',
      nodeId: text(answer.nodeId),
      optionId: text(answer.optionId),
      nodeIndex,
      chapter: text(answer.chapter),
      choiceText: text(answer.choiceText),
      feedback: prose(answer.feedback),
      consequence: prose(answer.consequence),
      detail: `你的选择：${sentence(answer.choiceText)}${sentence(answer.feedback)}${answer.consequence ? `后续影响：${sentence(answer.consequence)}` : ''}`
    }));
    const allCauses = (ending.causes || []).map(item => ({ title: text(item.title), detail: text(item.detail), nodeIndex: item.nodeIndex }));
    const recap = allCauses;
    const style = buildStyle(run, answers);
    const advice = makeAdvice(ending, history);
    const sections = [
      { title: '这一次，秋选如何落幕', paragraphs: (ending.paragraphs || []).map(text).concat(ending.offer ? [`此局去向：${text(ending.offer)}`] : []) },
      { title: '是什么把你带到了这个结局', paragraphs: allCauses.map(item => `${item.title}。${item.detail}`) }
    ];
    if (style.length) sections.push({ title: '本局策略｜从实际行动里看见的走法', paragraphs: style.flatMap(item => [`${item.title}。${item.detail}`, `行动依据：${item.evidence}`]) });
    history.forEach(item => sections.push({
      title: item.title,
      paragraphs: [`你的选择：${item.choiceText}`, item.feedback, item.consequence ? `后续影响：${item.consequence}` : ''].filter(Boolean)
    }));
    sections.push({ title: '宫门之外｜把经历带回现实', paragraphs: [text(ending.returnText), ending.nextTry && ending.nextTry.hint ? `下次可从第 ${Math.max(0, Math.min(answers.length - 1, Number(ending.nextTry.nodeIndex) || 0)) + 1} 次行动重新想一想：${text(ending.nextTry.hint)}` : ''].filter(Boolean) });
    const keywords = (ENDING_WORDS[ending.id] || []).concat(style.slice(0, 2).map(item => STRATEGIES[item.key].keyword));
    return {
      kind: 'story',
      name: text(name).trim() || '入宫人',
      title: text(ending.title),
      tagline: text(ending.tagline),
      typeLabel: `秋选结局 · ${(ENDING_WORDS[ending.id] || ['经历留档'])[0]}`,
      keywords,
      totalSteps,
      actionCount: answers.length,
      totalEndings,
      chapterCount,
      ending,
      recap,
      history,
      style,
      advice,
      sections,
      summary,
      methodology: `这份档案根据本局${chapterCount ? ` ${chapterCount} 幕、` : ''}${answers.length} 次行动与实际发生的分支生成。策略描述只对应这段秋选经历；把准备、合作和取舍带回现实，再结合具体岗位与个人情况继续尝试。`,
      gameUrl: publicURL(url),
      axes: [],
      dimensions: [],
      nearby: []
    };
  }
  root.PalaceReport = Object.freeze({ build });
})(globalThis);
