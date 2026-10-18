// ==UserScript==
// @name         Canvas fillText 文本提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hook Canvas fillText 调用，点击 Canvas 时提取文本并复制到剪贴板
// @author       Kimi AI
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        // 是否也 hook strokeText（描边文字）
        hookStrokeText: true,
        // 点击后是否显示提示
        showNotification: true,
        // 通知显示时间(ms)
        notificationDuration: 3000,
        // 是否去重
        deduplicate: true,
        // 最大记录文本数量（防止内存泄漏）
        maxRecords: 10000,
        // 调试模式：在控制台输出详细日志
        debug: true
    };

    // ==================== 日志工具 ====================
    const Log = {
        info: (msg, data) => {
            if (CONFIG.debug) {
                console.log(`[CanvasHook][INFO] ${msg}`, data !== undefined ? data : '');
            }
        },
        warn: (msg, data) => {
            console.warn(`[CanvasHook][WARN] ${msg}`, data !== undefined ? data : '');
        },
        error: (msg, error) => {
            console.error(`[CanvasHook][ERROR] ${msg}`, error || '');
        }
    };

    // ==================== 全局文本存储 ====================
    // 使用 WeakMap：Canvas元素 -> 文本记录数组
    const canvasTextMap = new WeakMap();
    // 用于去重的 Set（存储 "canvasId|text|x|y" 的哈希）
    const seenTexts = new Set();

    // ==================== 生成唯一 Canvas ID ====================
    function getCanvasId(canvas) {
        try {
            if (!canvas) {
                Log.error('getCanvasId: canvas 参数为空');
                return 'unknown';
            }
            if (!canvas._canvasHookId) {
                canvas._canvasHookId = 'canvas_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            }
            return canvas._canvasHookId;
        } catch (e) {
            Log.error('getCanvasId 执行失败', e);
            return 'unknown';
        }
    }

    // ==================== 记录文本 ====================
    function recordText(canvas, text, x, y, method) {
        try {
            if (!canvas) {
                Log.error('recordText: canvas 参数为空');
                return;
            }
            if (typeof text !== 'string') {
                Log.warn('recordText: text 不是字符串，尝试转换', text);
                text = String(text);
            }

            const canvasId = getCanvasId(canvas);

            // 去重检查
            if (CONFIG.deduplicate) {
                const hash = `${canvasId}|${text}|${Math.round(x)}|${Math.round(y)}`;
                if (seenTexts.has(hash)) {
                    return; // 已存在，跳过
                }
                seenTexts.add(hash);

                // 清理旧记录防止内存无限增长
                if (seenTexts.size > CONFIG.maxRecords * 2) {
                    const iter = seenTexts.values();
                    for (let i = 0; i < CONFIG.maxRecords; i++) {
                        seenTexts.delete(iter.next().value);
                    }
                }
            }

            // 获取或创建该 canvas 的文本记录数组
            let records = canvasTextMap.get(canvas);
            if (!records) {
                records = [];
                canvasTextMap.set(canvas, records);
            }

            // 限制单 canvas 记录数量
            if (records.length >= CONFIG.maxRecords) {
                records.shift(); // 移除最旧的
            }

            const record = {
                text: text,
                x: x,
                y: y,
                method: method, // 'fillText' 或 'strokeText'
                timestamp: Date.now(),
                font: null,
                fillStyle: null
            };

            // 尝试获取当前绘制样式（可能失败，但不影响核心功能）
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    record.font = ctx.font;
                    record.fillStyle = ctx.fillStyle;
                }
            } catch (styleErr) {
                Log.warn('获取 canvas 样式失败', styleErr);
            }

            records.push(record);
            Log.info(`记录文本 [${method}]: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" @ (${x}, ${y})`, { canvasId });

        } catch (e) {
            Log.error('recordText 执行失败', e);
        }
    }

    // ==================== 提取 Canvas 的所有文本 ====================
    function extractCanvasText(canvas) {
        try {
            if (!canvas) {
                Log.error('extractCanvasText: canvas 参数为空');
                return null;
            }

            const records = canvasTextMap.get(canvas);
            if (!records || records.length === 0) {
                Log.info('该 Canvas 暂无记录的文本');
                return null;
            }

            // 按 y 坐标排序，然后按 x 坐标排序，模拟阅读顺序
            const sorted = [...records].sort((a, b) => {
                if (Math.abs(a.y - b.y) < 5) { // y 坐标接近时按 x 排序
                    return a.x - b.x;
                }
                return a.y - b.y;
            });

            // 合并同一行的文本
            const lines = [];
            let currentLine = [];
            let currentY = sorted[0].y;

            for (const record of sorted) {
                if (Math.abs(record.y - currentY) < 5) {
                    currentLine.push(record);
                } else {
                    if (currentLine.length > 0) {
                        lines.push(currentLine.sort((a, b) => a.x - b.x).map(r => r.text).join(''));
                    }
                    currentLine = [record];
                    currentY = record.y;
                }
            }
            if (currentLine.length > 0) {
                lines.push(currentLine.sort((a, b) => a.x - b.x).map(r => r.text).join(''));
            }

            const result = {
                canvasId: getCanvasId(canvas),
                totalRecords: records.length,
                lines: lines,
                rawText: lines.join('\n'),
                records: records
            };

            Log.info('提取完成', { lines: lines.length, chars: result.rawText.length });
            return result;

        } catch (e) {
            Log.error('extractCanvasText 执行失败', e);
            return null;
        }
    }

    // ==================== 复制到剪贴板 ====================
    async function copyToClipboard(text) {
        try {
            if (!text || text.length === 0) {
                Log.warn('copyToClipboard: 文本为空，跳过复制');
                return false;
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                Log.info('文本已复制到剪贴板（Clipboard API）');
                return true;
            } else {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();

                const success = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (success) {
                    Log.info('文本已复制到剪贴板（execCommand 降级）');
                    return true;
                } else {
                    throw new Error('execCommand("copy") 返回 false');
                }
            }
        } catch (e) {
            Log.error('复制到剪贴板失败', e);
            // 尝试用 prompt 作为最后的降级方案
            try {
                window.prompt('复制失败，请手动复制以下文本：', text);
            } catch (promptErr) {
                Log.error('prompt 降级也失败', promptErr);
            }
            return false;
        }
    }

    // ==================== 显示通知 ====================
    function showNotification(message, type = 'success') {
        try {
            if (!CONFIG.showNotification) return;

            const div = document.createElement('div');
            const colors = {
                success: '#4CAF50',
                error: '#f44336',
                info: '#2196F3'
            };

            div.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                background: ${colors[type] || colors.info};
                color: white;
                border-radius: 8px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 400px;
                word-break: break-all;
                transition: opacity 0.3s;
            `;
            div.textContent = message;
            document.body.appendChild(div);

            setTimeout(() => {
                div.style.opacity = '0';
                setTimeout(() => {
                    if (div.parentNode) div.parentNode.removeChild(div);
                }, 300);
            }, CONFIG.notificationDuration);

        } catch (e) {
            Log.error('showNotification 执行失败', e);
        }
    }

    // ==================== Hook fillText ====================
    function hookFillText() {
        try {
            const originalFillText = CanvasRenderingContext2D.prototype.fillText;

            if (!originalFillText) {
                Log.error('CanvasRenderingContext2D.prototype.fillText 不存在，无法 hook');
                return;
            }

            CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
                try {
                    // 获取关联的 canvas
                    let canvas = null;
                    try {
                        canvas = this.canvas;
                    } catch (canvasErr) {
                        Log.warn('获取 canvas 失败', canvasErr);
                    }

                    // 记录文本
                    recordText(canvas, text, x, y, 'fillText');

                    // 调用原始方法
                    return originalFillText.apply(this, arguments);

                } catch (hookErr) {
                    Log.error('fillText hook 内部错误', hookErr);
                    // 确保原始方法仍然被调用，避免破坏页面
                    try {
                        return originalFillText.apply(this, arguments);
                    } catch (fallbackErr) {
                        Log.error('fillText 原始方法调用也失败', fallbackErr);
                        throw fallbackErr;
                    }
                }
            };

            // 保留原始方法引用，方便调试
            CanvasRenderingContext2D.prototype.fillText._original = originalFillText;
            Log.info('fillText hook 安装成功');

        } catch (e) {
            Log.error('hookFillText 执行失败', e);
        }
    }

    // ==================== Hook strokeText（可选）====================
    function hookStrokeText() {
        if (!CONFIG.hookStrokeText) return;

        try {
            const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

            if (!originalStrokeText) {
                Log.warn('CanvasRenderingContext2D.prototype.strokeText 不存在，跳过 hook');
                return;
            }

            CanvasRenderingContext2D.prototype.strokeText = function(text, x, y, maxWidth) {
                try {
                    let canvas = null;
                    try {
                        canvas = this.canvas;
                    } catch (canvasErr) {
                        Log.warn('获取 canvas 失败（strokeText）', canvasErr);
                    }

                    recordText(canvas, text, x, y, 'strokeText');

                    return originalStrokeText.apply(this, arguments);

                } catch (hookErr) {
                    Log.error('strokeText hook 内部错误', hookErr);
                    try {
                        return originalStrokeText.apply(this, arguments);
                    } catch (fallbackErr) {
                        Log.error('strokeText 原始方法调用也失败', fallbackErr);
                        throw fallbackErr;
                    }
                }
            };

            CanvasRenderingContext2D.prototype.strokeText._original = originalStrokeText;
            Log.info('strokeText hook 安装成功');

        } catch (e) {
            Log.error('hookStrokeText 执行失败', e);
        }
    }

    // ==================== Hook getContext（捕获动态创建的 Canvas）====================
    function hookGetContext() {
        try {
            const originalGetContext = HTMLCanvasElement.prototype.getContext;

            if (!originalGetContext) {
                Log.error('HTMLCanvasElement.prototype.getContext 不存在，无法 hook');
                return;
            }

            HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
                try {
                    const ctx = originalGetContext.apply(this, arguments);

                    if (contextType === '2d' && ctx) {
                        // 确保这个 canvas 已经被记录
                        getCanvasId(this);
                        Log.info('动态 Canvas 获取 2D 上下文', { canvasId: getCanvasId(this) });
                    }

                    return ctx;

                } catch (e) {
                    Log.error('getContext hook 内部错误', e);
                    return originalGetContext.apply(this, arguments);
                }
            };

            Log.info('getContext hook 安装成功');

        } catch (e) {
            Log.error('hookGetContext 执行失败', e);
        }
    }

    // ==================== 点击事件处理 ====================
    function handleCanvasClick(event) {
        try {
            const canvas = event.target;

            if (!(canvas instanceof HTMLCanvasElement)) {
                Log.warn('点击目标不是 Canvas 元素', event.target);
                return;
            }

            Log.info('Canvas 被点击', { canvasId: getCanvasId(canvas) });

            const result = extractCanvasText(canvas);

            if (!result) {
                showNotification('该 Canvas 暂无记录的文本', 'info');
                return;
            }

            // 复制到剪贴板
            copyToClipboard(result.rawText).then(success => {
                if (success) {
                    const preview = result.rawText.substring(0, 100) +
                                   (result.rawText.length > 100 ? '...' : '');
                    showNotification(`已复制 ${result.rawText.length} 字符 ✓\n${preview}`, 'success');
                } else {
                    showNotification('复制失败，请查看控制台日志', 'error');
                }
            });

        } catch (e) {
            Log.error('handleCanvasClick 执行失败', e);
            showNotification('处理点击事件时出错：' + e.message, 'error');
        }
    }

    // ==================== 初始化 ====================
    function init() {
        try {
            Log.info('Canvas fillText Hook 初始化开始');

            // 1. 安装 hooks
            hookFillText();
            hookStrokeText();
            hookGetContext();

            // 2. 绑定点击事件（使用捕获阶段，确保能拦截）
            document.addEventListener('click', function(event) {
                if (event.target instanceof HTMLCanvasElement) {
                    handleCanvasClick(event);
                }
            }, true);

            // 3. 为已存在的 canvas 添加标识
            const existingCanvases = document.querySelectorAll('canvas');
            existingCanvases.forEach(canvas => getCanvasId(canvas));
            Log.info(`已为 ${existingCanvases.length} 个已有 Canvas 添加标识`);

            // 4. 监听新添加的 Canvas
            const observer = new MutationObserver((mutations) => {
                try {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            if (node instanceof HTMLCanvasElement) {
                                getCanvasId(node);
                                Log.info('检测到新 Canvas', { canvasId: getCanvasId(node) });
                            }
                            // 递归检查子元素
                            if (node.querySelectorAll) {
                                node.querySelectorAll('canvas').forEach(canvas => {
                                    getCanvasId(canvas);
                                    Log.info('检测到嵌套新 Canvas', { canvasId: getCanvasId(canvas) });
                                });
                            }
                        });
                    });
                } catch (e) {
                    Log.error('MutationObserver 回调错误', e);
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            Log.info('MutationObserver 已启动，监听新 Canvas');

            Log.info('Canvas fillText Hook 初始化完成');

        } catch (e) {
            Log.error('init 执行失败', e);
        }
    }

    // ==================== 启动 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
