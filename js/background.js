// 是否已经添加了标签栏监听，防止多次添加
var addedTabsListener = false;

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {

        function getAllTabs(highlightInfo) {
            // 获取存储的宽度
            chrome.storage.sync.get(['mainDivWidth'], function (items) {
                // 不用 executeScript 向指定标签页执行，因为不是在原有 content script 基础上执行，获取不到原有的资源，写起来更麻烦
                // 重新查询一遍是因为不能调用外部资源
                chrome.tabs.query({}, function (tabs) {
                    // 向指定 Tab 的 content script 发送消息，防止多个标签页执行监听
                    chrome.tabs.query({active: true, currentWindow: true}, function (currentTabs) {
                        chrome.tabs.sendMessage(currentTabs[0].id, {
                            tabs: tabs,
                            mainDivWidth: items.mainDivWidth
                        });
                    });
                });
            });
        }

        // 获取所有标签页传递给 content
        if (msg.requestType === RequestTypeEnum.GET_ALL_TABS) {
            chrome.tabs.query({}, function (tabs) {
                getAllTabs();
                // 保证监听只添加一次
                if (!addedTabsListener) {
                    addedTabsListener = true;
                    // 添加标签栏事件
                    chrome.tabs.onHighlighted.addListener(getAllTabs);
                    // chrome.tabs.onCreated.addListener(getAllTabs);
                    chrome.tabs.onRemoved.addListener(getAllTabs);
                    // 因为首次加载也算更新，所以首次加载会执行两遍
                    chrome.tabs.onUpdated.addListener(getAllTabs);
                    // chrome.tabs.onMoved.addListener(getAllTabs);
                    // // chrome.tabs.onActivated.addListener(getAllTabs);
                    // // 独立成新窗口
                    // chrome.tabs.onDetached.addListener(getAllTabs);
                    // // 附加一个窗口
                    // chrome.tabs.onAttached.addListener(getAllTabs);
                    // // TODO 添加页面缩放监听
                }
            });
        } else if (msg.requestType === RequestTypeEnum.SAVE_MAIN_DIV_WIDTH) {
            chrome.storage.sync.set({"mainDivWidth": msg.mainDivWidth});
        } else if (msg.requestType === RequestTypeEnum.GOTO_TAB) {
            chrome.tabs.get(msg.tabId, function (tab) {
                chrome.tabs.highlight({"tabs": tab.index});
            });
        } else if (msg.requestType === RequestTypeEnum.REMOVE_TAB) {
            chrome.tabs.remove(msg.tabId);
        } else if (msg.requestType === RequestTypeEnum.MUTED_TAB) {
            chrome.tabs.update(msg.tabId, {muted: true});
        } else if (msg.requestType === RequestTypeEnum.VOCAL_TAB) {
            chrome.tabs.update(msg.tabId, {muted: false});
        }
    });
});
