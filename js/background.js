chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {

        function getAllTabs() {
            chrome.storage.sync.get(['mainDivWidth'], function (items) {
                // 不用 executeScript 向指定标签页执行，因为不是在原有 content script 基础上执行，获取不到原有的资源，写起来更麻烦
                // 重新查询一遍是因为不能调用外部资源
                chrome.tabs.query({}, function (tabs) {
                    // port 必须在回调函数内，否则一个 chrome api 调用完毕后会断开连接，无法调用 port
                    port.postMessage({
                        requestType: RequestTypeEnum.GET_ALL_TABS,
                        tabs: tabs,
                        mainDivWidth: items.mainDivWidth
                        // mainDivWidth: localStorage.mainDivWidth
                    });
                });
            });
        }

        // 获取所有标签页传递给 content
        if (msg.requestType == RequestTypeEnum.GET_ALL_TABS) {
            chrome.tabs.query({}, function (tabs) {
                // 首次获取所有标签页时添加监听
                if (!msg.addedHighlightedListener) {
                    // 此处不直接向 content 发送让标签页更新列表的消息，因为那是发给跳转前的那个标签的。所有添加了监听的标签页都会触发
                    // 改变当前标签页
                    chrome.tabs.onHighlighted.addListener(getAllTabs);
                    chrome.tabs.onCreated.addListener(getAllTabs);
                    chrome.tabs.onRemoved.addListener(getAllTabs);
                    chrome.tabs.onUpdated.addListener(getAllTabs);
                    chrome.tabs.onMoved.addListener(getAllTabs);
                    // chrome.tabs.onActivated.addListener(getAllTabs);
                    // 独立成新窗口
                    chrome.tabs.onDetached.addListener(getAllTabs);
                    // 附加一个窗口
                    chrome.tabs.onAttached.addListener(getAllTabs);
                    // TODO 添加页面缩放监听
                }

                port.postMessage({
                    requestType: RequestTypeEnum.GET_ALL_TABS,
                    tabs: tabs
                });
            });
        } else if (msg.requestType == RequestTypeEnum.SAVE_MAIN_DIV_WIDTH) {
            chrome.storage.sync.set({"mainDivWidth": msg.mainDivWidth});
            // 采用 localStorage 存储，因为 chrome.storage 可能会发生延迟
            // localStorage.mainDivWidth = msg.mainDivWidth;
        } else if (msg.requestType == RequestTypeEnum.GOTO_TAB) {
            chrome.tabs.get(msg.tabId, function (tab) {
                chrome.tabs.highlight({"tabs": tab.index});
                // port.postMessage({requestType: RequestTypeEnum.GOTO_TAB});
            });
        } else if (msg.requestType == RequestTypeEnum.REMOVE_TAB) {
            chrome.tabs.remove(msg.tabId);
        } else if (msg.requestType == RequestTypeEnum.INAUDIBLE_TAB) {
            chrome.tabs.update(msg.tabId, {muted: true});
        } else if (msg.requestType == RequestTypeEnum.AUDIBLE_TAB) {
            chrome.tabs.update(msg.tabId, {muted: false});
        }
    });
});
