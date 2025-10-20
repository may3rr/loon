// 微博去广告脚本
// 修复问题：避免过滤用户自己发布的微博

const url = $request.url;
let body = $response.body;

// 如果响应体为空，直接返回
if (!body) {
  $done({});
}

try {
  let obj = JSON.parse(body);

  // 获取当前登录用户的ID（如果可用）
  const currentUserId = obj.login_uid || obj.uid || null;

  // 处理不同的API端点
  if (url.includes("/2/checkin/show") || url.includes("/2/client/publisher_list") || url.includes("/2/push/active")) {
    // 移除首页推广
    if (obj.feed_redpacket) {
      obj.feed_redpacket = {};
    }
    if (obj.floating_windows) {
      obj.floating_windows = [];
    }
    if (obj.surprise_config) {
      obj.surprise_config = [];
    }
  } else if (url.includes("/2/groups/allgroups/v2")) {
    // 移除首页顶部标签中的广告
    if (obj.pageDatas) {
      obj.pageDatas = obj.pageDatas.filter(item => {
        return item.title !== "广告" && item.title !== "推广";
      });
    }
  } else if (url.includes("/2/cardlist") || url.includes("/2/page")) {
    // 移除信息流广告
    if (obj.cards) {
      obj.cards = filterAds(obj.cards, currentUserId);
    }
  } else if (url.includes("/2/comments/build_comments")) {
    // 移除评论区广告
    if (obj.datas) {
      obj.datas = obj.datas.filter(item => {
        // 保留非广告评论
        return !item.adType && !item.is_ad;
      });
    }
    if (obj.recommend_max_id) {
      delete obj.recommend_max_id;
    }
  } else if (url.includes("/2/container/asyn") || url.includes("/2/flowlist") || url.includes("/2/flowpage")) {
    // 移除个人微博详情页广告
    if (obj.items) {
      obj.items = filterAds(obj.items, currentUserId);
    }
  } else if (url.includes("/2/friendships/create") || url.includes("/2/friendships/destroy")) {
    // 移除关注、取消关注弹窗
    if (obj.toast) {
      delete obj.toast;
    }
  } else if (url.includes("/2/profile/container_timeline") || url.includes("/2/profile/dealatt") || 
             url.includes("/2/profile/me") || url.includes("/2/profile/statuses/tab") || 
             url.includes("/2/profile/userinfo")) {
    // 移除个人主页广告
    if (obj.cards) {
      obj.cards = filterAds(obj.cards, currentUserId);
    }
    if (obj.items) {
      obj.items = filterAds(obj.items, currentUserId);
    }
    // 移除推广模块
    if (obj.cardlistInfo?.cardlist_head_cards) {
      delete obj.cardlistInfo.cardlist_head_cards;
    }
  } else if (url.includes("/2/shproxy/chaohua/discovery/searchactive")) {
    // 移除超话搜索页广告
    if (obj.groups) {
      obj.groups = obj.groups.filter(item => !item.is_ad);
    }
  } else if (url.includes("/2/statuses/container_detail") || url.includes("/2/statuses/container_timeline") ||
             url.includes("/2/statuses/repost_timeline") || url.includes("/2/statuses/unread_hot_timeline")) {
    // 移除信息流广告 - 这是主要的好友圈时间线
    if (obj.statuses) {
      obj.statuses = filterStatuses(obj.statuses, currentUserId);
    }
    if (obj.items) {
      obj.items = filterAds(obj.items, currentUserId);
    }
    if (obj.advertises) {
      obj.advertises = [];
    }
    if (obj.ad) {
      obj.ad = [];
    }
  } else if (url.includes("/2/statuses/extend") || url.includes("/2/statuses/show")) {
    // 移除微博详情页广告
    if (obj.trend) {
      delete obj.trend;
    }
    if (obj.recommend_max_id) {
      delete obj.recommend_max_id;
    }
  } else if (url.includes("/2/video/full_screen_stream") || url.includes("/2/video/tiny_stream_mid_detail") || 
             url.includes("/2/video/tiny_stream_video_list")) {
    // 移除视频流广告
    if (obj.items) {
      obj.items = filterAds(obj.items, currentUserId);
    }
  } else if (url.includes("/2/!/huati/discovery_home_bottom_channels")) {
    // 移除超话顶部标签
    if (obj.channels) {
      obj.channels = obj.channels.filter(item => !item.is_ad);
    }
  } else if (url.includes("/2/direct_messages/user_list")) {
    // 移除消息页列表广告
    if (obj.user_list) {
      obj.user_list = obj.user_list.filter(item => {
        return !item.is_ad && item.user?.id !== "advertise";
      });
    }
  } else if (url.includes("/2/messageflow/notice")) {
    // 移除消息页提醒
    delete obj.group;
  } else if (url.includes("/2/search/container_timeline") || url.includes("/2/search/finder")) {
    // 移除热门微博信息流广告
    if (obj.cards) {
      obj.cards = filterAds(obj.cards, currentUserId);
    }
    if (obj.items) {
      obj.items = filterAds(obj.items, currentUserId);
    }
  } else if (url.includes("/2/searchall")) {
    // 移除发现页搜索结果广告
    if (obj.cards) {
      obj.cards = filterAds(obj.cards, currentUserId);
    }
  } else if (url.includes("bootpreload.uve.weibo.com") || url.includes("sdkapp.uve.weibo.com") || 
             url.includes("wbapp.uve.weibo.com")) {
    // 移除开屏广告
    obj = { ok: 1 };
  }

  body = JSON.stringify(obj);
} catch (e) {
  console.log(`微博去广告脚本错误: ${e}`);
}

$done({ body });

// 辅助函数：过滤微博状态列表，保留用户自己发布的微博
function filterStatuses(statuses, currentUserId) {
  if (!Array.isArray(statuses)) return statuses;
  
  return statuses.filter(status => {
    // 如果是广告标记的内容
    if (status.ad_marked === true || status.isAd === true) {
      // 检查是否是用户自己发布的
      // 用户自己发布的微博不应该被过滤，即使有 ad_marked 标记
      if (currentUserId && status.user) {
        const postUserId = status.user.id || status.user.idstr;
        // 如果是用户自己的微博，保留它
        if (postUserId && String(postUserId) === String(currentUserId)) {
          return true;
        }
      }
      // 如果不是用户自己的微博且有广告标记，则过滤掉
      return false;
    }
    
    // 过滤推广类型
    if (status.promotion) {
      // 同样检查是否是用户自己的微博
      if (currentUserId && status.user) {
        const postUserId = status.user.id || status.user.idstr;
        if (postUserId && String(postUserId) === String(currentUserId)) {
          return true;
        }
      }
      return false;
    }
    
    // 检查mblog字段（嵌套的微博对象）
    if (status.mblog) {
      if (status.mblog.ad_marked === true || status.mblog.isAd === true) {
        // 检查mblog中的用户信息
        if (currentUserId && status.mblog.user) {
          const postUserId = status.mblog.user.id || status.mblog.user.idstr;
          if (postUserId && String(postUserId) === String(currentUserId)) {
            return true;
          }
        }
        return false;
      }
    }
    
    // 默认保留
    return true;
  });
}

// 辅助函数：通用的广告过滤函数
function filterAds(items, currentUserId) {
  if (!Array.isArray(items)) return items;
  
  return items.filter(item => {
    // 检查广告标记
    if (item.ad_marked === true || item.isAd === true || item.is_ad === true) {
      // 如果有用户信息，检查是否是当前用户
      if (currentUserId && item.user) {
        const postUserId = item.user.id || item.user.idstr;
        if (postUserId && String(postUserId) === String(currentUserId)) {
          return true;
        }
      }
      return false;
    }
    
    // 检查卡片类型
    if (item.card_type === 9 || item.card_type === "9") {
      return false;
    }
    
    // 检查mblog字段
    if (item.mblog) {
      if (item.mblog.ad_marked === true || item.mblog.isAd === true) {
        // 检查是否是用户自己的微博
        if (currentUserId && item.mblog.user) {
          const postUserId = item.mblog.user.id || item.mblog.user.idstr;
          if (postUserId && String(postUserId) === String(currentUserId)) {
            return true;
          }
        }
        return false;
      }
    }
    
    // 检查card_group（卡片组）
    if (item.card_group) {
      item.card_group = filterAds(item.card_group, currentUserId);
    }
    
    // 默认保留
    return true;
  });
}
