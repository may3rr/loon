# 微博去广告脚本修复说明

## 问题描述

在使用微博去广告插件时，用户自己在好友圈发布的微博会被错误地过滤掉，无法显示。

**可能原因：**
1. 用户自己发布的微博右上角会显示浏览量
2. 某些微博的浏览量旁边会有"推广"字样（付费推广功能提示）
3. 这些特征可能触发了广告过滤规则，导致整条微博被误判为广告

## 解决方案

### 核心思路
在过滤广告时，增加一个判断：**检查微博是否为当前登录用户发布**。如果是用户自己发布的微博，即使带有广告标记，也不应该被过滤。

### 技术实现

1. **获取当前用户ID**
   ```javascript
   const currentUserId = obj.login_uid || obj.uid || obj.userInfo?.id || 
                         obj.userInfo?.idstr || obj.user?.id || obj.user?.idstr || null;
   ```
   从API响应中尝试多个可能的字段来获取当前登录用户的ID。

2. **过滤时检查发布者**
   ```javascript
   if (status.ad_marked === true || status.isAd === true) {
     // 检查是否是用户自己发布的
     if (currentUserId && status.user) {
       const postUserId = status.user.id || status.user.idstr;
       if (postUserId && String(postUserId) === String(currentUserId)) {
         return true;  // 保留用户自己的微博
       }
     }
     return false;  // 过滤其他广告
   }
   ```

3. **处理多种数据结构**
   - 直接的微博对象（`status.user`）
   - 嵌套的微博对象（`status.mblog.user`）
   - 支持 `id` 和 `idstr` 两种ID格式

### 修改文件

1. **新增文件**
   - `Script/Weibo/Weibo_remove_ads.js` - 本地JavaScript脚本
   - `Script/Weibo/README.md` - 脚本说明文档

2. **修改文件**
   - `Lpx/Weibo_remove_ads.lpx` - 将外部脚本引用改为本地脚本

### 改进点

✅ **精准过滤**：只过滤真正的广告，不影响用户自己的内容  
✅ **向后兼容**：完全兼容原有的所有功能  
✅ **代码本地化**：使用本地脚本，不依赖外部URL  
✅ **完整注释**：所有注释使用中文，便于理解和维护  

## 使用方法

1. 在 Loon 中导入或更新 `Lpx/Weibo_remove_ads.lpx` 插件
2. 插件会自动使用本地脚本 `Script/Weibo/Weibo_remove_ads.js`
3. 用户自己发布的微博将不再被误过滤

## 测试验证

已通过以下测试场景：
- ✅ 用户自己的微博有广告标记（ad_marked）
- ✅ 用户自己的微博有推广标记（promotion）
- ✅ 转发微博的嵌套结构（mblog）
- ✅ 使用 idstr 字段的情况

## 注意事项

- 本修复仅针对 Loon 插件，不影响其他平台
- 保留了所有原有的广告过滤功能
- 如遇问题，请确保使用最新版本的插件文件
