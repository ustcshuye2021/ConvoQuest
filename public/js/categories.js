/* Category definitions for 20 Questions game */

const CATEGORIES = {
  history: {
    id: 'history',
    icon: '🏛️',
    name: '历史人物',
    desc: '真实存在的历史人物',
    targetName: '人物',
    unknownAnswer: '正史无记载',
    portraitCategories: ['时代', '地域', '性别', '领域', '身份', '事迹', '生平', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '教科书级人物' },
      medium: { name: '中等', desc: '知名人物' },
      hard: { name: '困难', desc: '冷门人物' },
      hell: { name: '地狱', desc: '极度冷门人物' }
    },
    titles: {
      won: ['🏆 史神', '🎓 博古通今', '📖 学富五车', '⭐ 历史达人', '👍 历史爱好者', '🌱 历史入门'],
      lost: ['🤔 下次再挑战']
    },
    selectionPrompt: (diff) => `请为猜历史人物游戏选择一个人物。
难度：${diff}
要求：${diff === 'easy' ? '教科书级人物——全球或主要文化圈内几乎人人知晓' : diff === 'medium' ? '知名人物——有一定知名度但非教科书标配' : diff === 'hard' ? '冷门人物——较少人知道但有充分史料记载' : '极度冷门人物——极少人知道但确有史料记载的小众历史人物'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"中文名","name_en":"外文名（如有）","era":"时代","region":"地域","identity":"身份","achievement":"主要成就","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：人物必须有充分史料记载，真实性确定。`
  },
  nature: {
    id: 'nature',
    icon: '🌿',
    name: '动植物',
    desc: '动物、植物、真菌等自然界的生物',
    targetName: '生物',
    unknownAnswer: '无法确定',
    portraitCategories: ['类别', '栖息地', '体型', '食性', '特征', '分布', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '常见动植物' },
      medium: { name: '中等', desc: '知名物种' },
      hard: { name: '困难', desc: '稀有或特殊物种' },
      hell: { name: '地狱', desc: '极度稀有物种' }
    },
    titles: {
      won: ['🏆 自然学家', '🦋 博物达人', '🌲 自然爱好者', '🍃 生态入门'],
      lost: ['🌱 继续探索自然']
    },
    selectionPrompt: (diff) => `请为猜动植物游戏选择一个生物（动物、植物、真菌等）。
难度：${diff}
要求：${diff === 'easy' ? '常见动植物——日常生活中能见到或耳熟能详' : diff === 'medium' ? '知名物种——有一定知名度但不那么常见' : diff === 'hard' ? '稀有或特殊物种——较少人知道但有明确科学记载' : '极度稀有物种——非常冷门但确有科学记载的生物'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"中文名","name_en":"学名/外文名","category":"类别（动物/植物/真菌等）","habitat":"栖息地或生长环境","size":"体型特征","diet":"食性或营养方式","feature":"显著特征","distribution":"分布范围","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：必须是真实存在的物种，有科学记载。`
  },
  object: {
    id: 'object',
    icon: '🔧',
    name: '物品发明',
    desc: '人造物品、工具、发明、日常用品等',
    targetName: '物品',
    unknownAnswer: '无从考证',
    portraitCategories: ['类别', '时代', '用途', '材质', '发明者', '产地', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '日常常见物品' },
      medium: { name: '中等', desc: '知名发明产品' },
      hard: { name: '困难', desc: '特殊或冷门物品' },
      hell: { name: '地狱', desc: '极度冷门物品' }
    },
    titles: {
      won: ['🏆 发明达人', '⚙️ 工匠精神', '🔍 物品爱好者', '📦 入门玩家'],
      lost: ['🔧 继续探索']
    },
    selectionPrompt: (diff) => `请为猜物品发明游戏选择一个物品或发明。
难度：${diff}
要求：${diff === 'easy' ? '日常常见物品——几乎人人都能见到或使用' : diff === 'medium' ? '知名发明产品——有知名度但非日常标配' : diff === 'hard' ? '特殊或冷门物品——较少人知道但有明确记载' : '极度冷门物品——极少人知道但确有记载的特殊物品'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"中文名","name_en":"外文名（如有）","category":"类别","era":"发明/出现时代","usage":"主要用途","material":"材质特点","inventor":"发明者或来源","origin":"产地或来源地","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：必须是真实存在的物品或发明。`
  },
  event: {
    id: 'event',
    icon: '📅',
    name: '历史事件',
    desc: '重大历史事件、战争、革命、运动等',
    targetName: '事件',
    unknownAnswer: '史料不详',
    portraitCategories: ['时代', '地域', '类型', '参与方', '结果', '影响', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '教科书级事件' },
      medium: { name: '中等', desc: '知名历史事件' },
      hard: { name: '困难', desc: '较冷门事件' },
      hell: { name: '地狱', desc: '极度冷门事件' }
    },
    titles: {
      won: ['🏆 史学达人', '📜 历史见证者', '📅 事件爱好者', '📖 入门学者'],
      lost: ['🔍 继续探索历史']
    },
    selectionPrompt: (diff) => `请为猜历史事件游戏选择一个历史事件（战争、革命、运动、重大事故等）。
难度：${diff}
要求：${diff === 'easy' ? '教科书级事件——几乎所有人都知道' : diff === 'medium' ? '知名历史事件——有一定知名度' : diff === 'hard' ? '较冷门事件——较少人知道但有明确史料记载' : '极度冷门事件——极少人知道但确有史料记载的事件'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"中文名","name_en":"外文名（如有）","era":"发生时代","region":"发生地域","type":"事件类型","participants":"主要参与方","result":"结果","impact":"历史影响","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：必须是真实发生的历史事件，有史料记载。`
  },
  character: {
    id: 'character',
    icon: '🎬',
    name: '影视角色',
    desc: '电影、电视剧、动画、小说中的虚构角色',
    targetName: '角色',
    unknownAnswer: '原作未设定',
    portraitCategories: ['作品', '类型', '时代', '身份', '性格', '关系', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '经典知名角色' },
      medium: { name: '中等', desc: '较知名角色' },
      hard: { name: '困难', desc: '冷门角色' },
      hell: { name: '地狱', desc: '极度冷门角色' }
    },
    titles: {
      won: ['🏆 影迷达人', '🎬 角色收藏家', '🎥 影视爱好者', '📺 入门观众'],
      lost: ['🎬 继续探索影视']
    },
    selectionPrompt: (diff) => `请为猜影视角色游戏选择一个虚构角色（电影、电视剧、动画、小说中的人物）。
难度：${diff}
要求：${diff === 'easy' ? '经典知名角色——几乎所有观众都知道' : diff === 'medium' ? '较知名角色——有一定知名度' : diff === 'hard' ? '冷门角色——较少人知道但在作品中有明确设定' : '极度冷门角色——极少人知道但确有作品出处和设定的角色'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"角色名","name_en":"原名/英文名（如有）","work":"出处作品","type":"作品类型（电影/电视剧/动画/小说）","era":"作品时代背景","identity":"角色身份","personality":"性格特点","relations":"重要关系","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：必须是虚构作品中有明确设定的角色。`
  },
  place: {
    id: 'place',
    icon: '🗺️',
    name: '地理名胜',
    desc: '城市、国家、地标、自然奇观等',
    targetName: '地点',
    unknownAnswer: '资料不详',
    portraitCategories: ['类别', '位置', '时代', '特点', '用途', '名气', '其他'],
    difficulties: {
      easy: { name: '简单', desc: '知名地标城市' },
      medium: { name: '中等', desc: '较知名地点' },
      hard: { name: '困难', desc: '冷门地点' },
      hell: { name: '地狱', desc: '极度冷门地点' }
    },
    titles: {
      won: ['🏆 地理达人', '🌍 旅行家', '🗺️ 地理爱好者', '📍 入门探索'],
      lost: ['🗺️ 继续探索世界']
    },
    selectionPrompt: (diff) => `请为猜地理名胜游戏选择一个地点（城市、国家、地标建筑、自然奇观等）。
难度：${diff}
要求：${diff === 'easy' ? '知名地标城市——几乎所有人都知道' : diff === 'medium' ? '较知名地点——有一定知名度' : diff === 'hard' ? '冷门地点——较少人知道但有明确地理记载' : '极度冷门地点——极少人知道但确有地理记载的地点'}

请严格按以下JSON格式输出，不要输出任何其他内容：
{"name_cn":"中文名","name_en":"原名/英文名（如有）","category":"类别（城市/国家/地标/自然奇观）","location":"地理位置","era":"建造/形成时代（如适用）","feature":"主要特点","usage":"用途或功能","fame":"知名度","bio":"一句话简介","fun_fact":"趣闻轶事"}

注意：必须是真实存在的地点。`
  }
};