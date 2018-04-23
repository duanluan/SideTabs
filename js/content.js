var $body = $("body");

$body.append("<style>" +
    ".icon-remove:hover {color: white; background: #db4437}" +
    // "::-webkit-scrollbar {width: 0px}" +
    "</style>" +

    // 主体内容
    "<div id='z_main' style='position: fixed; top: 0; left: 0; z-index:99999; width: 230px; height: " + document.body.clientHeight + "px; background: rgba(255,255,255,0.95);'>" +
    "   <ul id='z_tabs' style='float: left; padding: 5px; margin: 0; font-size: 12px; text-align: left; overflow-y: auto'></ul>" +
    "   <div id='z_show' style='float:right; width: 1px; height:100%'></div>" +
    "   <div id='z_border' style='float: right; height:100%; border-left: 1px solid #d1d1d1; cursor: col-resize'></div>" +
    "</div>" +

    // 右键菜单
    "<style>" +
    "#z_menu li {padding: 5px 0; padding-left: 10px}" +
    "#z_menu li:hover {background: #ebebeb}" +
    "</style>" +
    "<div id='z_menu' hidden style='position: fixed; z-index:99999; width: 190px; font-size: 12px; text-align: left; background: rgba(255, 255, 255, 1); border: 1px solid #bababa; box-shadow: 1px 1px 3px #888888;'>" +
    "   <div class='z_tab_id' hidden></div>" +
    "   <ul style='/*border: 1px solid #eee*/'>" +
    "       <li>" + chrome.i18n.getMessage("menuNewTab") + "</li>" +
    "       <li style='border-bottom: 1px solid #e9e9e9'>" + chrome.i18n.getMessage("menuReload") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuDuplicate") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuPinTab") + "</li>" +
    "       <li style='border-bottom: 1px solid #e9e9e9'>" + chrome.i18n.getMessage("menuMuteSite") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuCloseTab") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuCloseOtherTab") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuCloseTabsToTheBelow") + "</li>" +
    "       <li style='border-bottom: 1px solid #e9e9e9'>" + chrome.i18n.getMessage("menuCloseTabsToTheAbove") + "</li>" +
    "       <li>" + chrome.i18n.getMessage("menuReopenClosedTab") + "</li>" +
    "   </ul>" +
    "</div>");

$(function () {
    // 建立通道
    var port = chrome.runtime.connect({name: "content_backgroud"});

    var doc = $(document);
    // 主体内容
    var mainDiv = $("#z_main");
    // 列表
    var tabsDiv = $("#z_tabs");
    // 边框
    var borderDiv = $("#z_border");
    // 显示块
    var showDiv = $("#z_show");
    // 右键菜单
    var menuDiv = $("#z_menu");

    // region 初始化
    // 初始化全高为可视区域高度，受缩放比例影响
    mainDiv.height(document.documentElement.clientHeight);
    // 初始化列表高度
    tabsDiv.height(mainDiv.height() - parseInt(tabsDiv.css("padding-top")) - parseInt(tabsDiv.css("padding-bottom")))
    // 初始化列表宽度
    setWidth();
    // 默认隐藏
    mainDiv.css("left", -mainDiv.width() + showDiv.width());
    // endregion

    // region 方法
    /**
     * 改变宽度
     *
     * @param mainDivWidth 主体内容宽度
     */
    function setWidth(mainDivWidth) {
        if (mainDivWidth) {
            mainDiv.width(mainDivWidth);
        }
        // 改变列表宽度（包括内边距和边框） = 全宽（包括内边距） - 边框宽度（包括内外边距和边框） - 显示块宽度
        tabsDiv.outerWidth(mainDiv.innerWidth() - borderDiv.outerWidth(true) - showDiv.outerWidth());
    }

    /**
     * 鼠标移上显示块显示主体内容
     */
    function showMainDiv() {
        showDiv.mouseover(function () {
            mainDiv.velocity({left: 0}, {
                duration: "fast", queue: false, complete: function () {
                    // 显示主体内容后绑定鼠标移出隐藏事件
                    hideMainDiv(0);
                }
            })
        });
    }

    /**
     * 鼠标移出主体内容隐藏事件
     *
     * @param number 鼠标超过 ( 主体内容宽度 + number ) 才隐藏
     */
    function hideMainDiv(number) {
        // 显示后鼠标移出后再次隐藏
        doc.unbind("mousemove").mousemove(function (event) {
            // 此处的 number 是为了方便鼠标在显示状态下改变宽度和防止改变宽度时鼠标移动过快
            // 还因为右键菜单鼠标操作后可能在 main 的外面，避免 main 隐藏
            if (event.clientX > mainDiv.width() + ((number || 20) <= 20 ? 20 : number)) {
                mainDiv.velocity({left: -mainDiv.width() + showDiv.width()}, {duration: "fast", queue: false});

                // 隐藏后解绑这个事件
                doc.unbind("mousemove");
            }
        });
    }

    /**
     * 显示和隐藏操作图标
     *
     * @param isShow 是否显示
     */
    function showAndHideTabAction(isShow) {
        var $this = $(this);

        var iconSize = $this.find(".iconfont").length;
        var iconWidth = $this.find(".iconfont").first().width();

        // 音量图标不隐藏
        var paddingRight = 0;
        if ($this.find(".icon-vocal").length == 1 || $this.find(".icon-muted").length == 1) {
            iconSize -= 1;
            paddingRight += iconWidth;
        }

        $this.find(".z_tab_action").css("right", isShow ? 0 : -(iconSize * iconWidth));
        $this.css("padding-right", isShow ? $(this).find(".iconfont").length * iconWidth : paddingRight);
    }

    // endregion

    // region 动画
    // 边框按下鼠标拖动边缘
    borderDiv.mousedown(function () {
        // 禁止选中内容
        $body.css("user-select", "none");

        // 防止鼠标移上显示块又绑定鼠标移出主体内容隐藏事件
        showDiv.unbind("mouseover");
        // 拖动边缘时宽度随鼠标的左右移动而改变
        doc.unbind("mousemove").mousemove(function (e) {
            // e.clientX 为鼠标指针相对于浏览器页面的水平坐标
            // 此处 +10，不让拖动后的鼠标在外面，触发到第三方浏览器自带或其它插件的拖动元素功能
            var clientX = e.clientX + 10;
            // 限制最小宽度
            if (clientX < 200) {
                clientX = 200;
            }
            // 改变宽度
            setWidth(clientX);
        });
        // 改变宽度时松开鼠标固定宽度，并重新绑定鼠标移出主体内容改变宽度事件
        doc.mouseup(function () {
            // 取消禁止选中内容
            $body.css("user-select", "auto");
            // 将宽度保存到设置中
            port.postMessage({requestType: RequestTypeEnum.SAVE_MAIN_DIV_WIDTH, mainDivWidth: mainDiv.width()});
            // 重新绑定事件
            showMainDiv();
            hideMainDiv(0);
            // 解绑自己
            doc.unbind("mouseup");
        });
    });

    // 改变宽度后需要 mousemove 事件来完成鼠标移出隐藏操作，如果在这期间在侧边上操作鼠标，触发了 mouseup，会解绑 mousemove 事件，所以用空事件覆盖
    // 不用一个变量来判断因为改变宽度时很有可能触发鼠标移上显示块的事件导致这个变量的值改变，无法进入判断解绑 mousemove 事件
    mainDiv.mouseup(function () {
    });

    // 鼠标移上显示块时显示
    showMainDiv();
    // endregion

    // region 消息处理
    // 发送消息，初始化标签页列表
    port.postMessage({requestType: RequestTypeEnum.GET_ALL_TABS});
    // 监听消息，与 background 通信
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        // if (msg.type == RequestTypeEnum.GET_ALL_TABS) {
        tabsDiv.empty();
        $.each(msg.tabs, function (i, tab) {
            // 部分标签页自定义 icon
            var iconUrl = tab.favIconUrl;
            if (tab.url.indexOf("chrome://extensions/") == 0) {
                iconUrl = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNTE4NjE1OTgxMTMyIiBjbGFzcz0iaWNvbiIgc3R5bGU9IiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk3NSIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNODUwLjE0MDI3NyA0OTAuODY1NjU3bC02My40MDA5ODIgMEw3ODYuNzM5Mjk1IDMyMS43OTYwM2MwLTQ2LjcwNTc0Mi0zNy44Mjk1ODQtODQuNTM1MzI1LTg0LjUzNTMyNS04NC41MzUzMjVMNTMzLjEzMzMyIDIzNy4yNjA3MDVsMC02My40MDA5ODJjMC01OC4zMjk0NzctNDcuMzM5MTY4LTEwNS42Njg2NDUtMTA1LjY2ODY0NS0xMDUuNjY4NjQ1UzMyMS43OTYwMyAxMTUuNTMwMjQ2IDMyMS43OTYwMyAxNzMuODU5NzIzbDAgNjMuNDAwOTgyTDE1Mi43MjY0MDMgMjM3LjI2MDcwNWMtNDYuNzA1NzQyIDAtODQuMTEyNyAzNy44Mjk1ODQtODQuMTEyNyA4NC41MzUzMjVsLTAuMjExODI0IDE2MC42MTYwOTQgNjMuMTkwMTgxIDBjNjIuOTc4MzU3IDAgMTE0LjEyMjE3NyA1MS4xNDM4MiAxMTQuMTIyMTc3IDExNC4xMjIxNzdzLTUxLjE0MzgyIDExNC4xMjIxNzctMTE0LjEyMjE3NyAxMTQuMTIyMTc3TDY4LjQwMjkwMyA3MTAuNjU2NDc5bC0wLjIxMTgyNCAxNjAuNjE2MDk0YzAgNDYuNzA1NzQyIDM3LjgyOTU4NCA4NC41MzUzMjUgODQuNTM1MzI1IDg0LjUzNTMyNWwxNjAuNjE2MDk0IDAgMC02My40MDA5ODJjMC02Mi45NzgzNTcgNTEuMTQzODItMTE0LjEyMjE3NyAxMTQuMTIyMTc3LTExNC4xMjIxNzdzMTE0LjEyMjE3NyA1MS4xNDM4MiAxMTQuMTIyMTc3IDExNC4xMjIxNzdsMCA2My40MDA5ODIgMTYwLjYxNjA5NCAwYzQ2LjcwNTc0MiAwIDg0LjUzNTMyNS0zNy44Mjk1ODQgODQuNTM1MzI1LTg0LjUzNTMyNUw3ODYuNzM4MjcxIDcwMi4yMDM5N2w2My40MDA5ODIgMGM1OC4zMjk0NzcgMCAxMDUuNjY4NjQ1LTQ3LjMzOTE2OCAxMDUuNjY4NjQ1LTEwNS42Njg2NDVTOTA4LjQ2ODczIDQ5MC44NjU2NTcgODUwLjE0MDI3NyA0OTAuODY1NjU3eiIgZmlsbD0iIzdlN2U3ZSIgcC1pZD0iOTc2Ij48L3BhdGg+PC9zdmc+";
            } else if (tab.url.indexOf("chrome://settings/") == 0) {
                iconUrl = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNTE4NjE1OTUyMDQ4IiBjbGFzcz0iaWNvbiIgc3R5bGU9IiIgdmlld0JveD0iMCAwIDEwMjUgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijg1NyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMi4wMzEyNSIgaGVpZ2h0PSIzMiI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNODk2LjM2NDA1OSA1MTIuMzY3Mzg1YzAtMjMuOTQyNDItMi41MjI1NzEtNDEuMzA1Njg5LTIuNTIyNTcxLTQxLjMwNTY4OS0yLjI5MzMzOS0xNS43ODgzMjUgNy4xMzc5MDMtMzUuMjMwMDI5IDIwLjk1NzI5My00My4yMDE5NjdsNTIuMjYxNzMxLTMwLjE0NmMxMy44MjA0MTMtNy45NzI5NjEgMTguNTk0MzY2LTI1Ljc5Njc0IDEwLjYxMDE0OC0zOS42MDk5OUw4NzguNTQzMzUgMTg2LjYwMjY5NmMtNy45ODQyMTgtMTMuODEzMjUtMjUuODI1Mzk0LTE4LjU5NDM2Ni0zOS42NDY4My0xMC42MjU0OThsLTUyLjE5NDE5IDMwLjA5MzgwOWMtMTMuODIxNDM2IDcuOTY5ODkxLTM1LjQzNzc3IDYuNDc5ODg2LTQ4LjAzNTI3NC0zLjMxMDU1NCAwIDAtMTMuOTM2MDUyLTEwLjgzMDE2OS0zNC4yMDE1NTctMjIuNTE5OTU2LTIwLjM5MTM3Ny0xMS43NTIyMTItMzcuNDMzMzEzLTE4LjY5MTU4NC0zNy40MzMzMTMtMTguNjkxNTg0LTE0Ljc3NjIyNy02LjAxNjMwNi0yNi44NjcxNy0yMy45OTI1NjUtMjYuODY3MTctMzkuOTQ3Njk3TDY0MC4xNjUwMTYgNjEuMjg0NjU1YzAtMTUuOTU1MTMyLTEzLjA1MzkyLTI5LjAwOTA1Mi0yOS4wMDkwNTItMjkuMDA5MDUyTDQxMi45NzQwMDIgMzIuMjc1NjAyYy0xNS45NTUxMzIgMC0yOS4wMDkwNTIgMTMuMDUzOTItMjkuMDA5MDUyIDI5LjAwOTA1MmwwIDYwLjMxNzU4NGMwIDE1Ljk1NDEwOS0xMi4wODk5MTkgMzMuOTMwMzY4LTI2Ljg2NzE3IDM5Ljk0NzY5NyAwIDAtMTcuMDQxOTM2IDYuOTM4MzQ5LTM3LjM3MDg4OCAxOC42MjkxNi0yMC4zMjY5MDYgMTEuNzUyMjEyLTM0LjI2Mzk4MiAyMi41ODIzODEtMzQuMjYzOTgyIDIyLjU4MjM4MS0xMi41OTc1MDQgOS43OTA0NC0zNC4yMTA3NjcgMTEuMjc1MzI5LTQ4LjAyOTEzNCAzLjI5OTI5N2wtNTIuMjA2NDctMzAuMTMzNzJjLTEzLjgxNzM0My03Ljk3NjAzMS0zMS42NTIzNzktMy4xOTc5ODUtMzkuNjMyNTA0IDEwLjYxODMzNEw0Ni41MTQ1NjggMzU4LjA5NzU5OWMtNy45NzkxMDEgMTMuODE1Mjk2LTMuMjAyMDc5IDMxLjY0NTIxNiAxMC42MTUyNjQgMzkuNjIxMjQ3bDUyLjIwNzQ5MyAzMC4xMzM3MmMxMy44MTczNDMgNy45NzYwMzEgMjMuMjQ2NTM5IDI3LjQxOTc4MiAyMC45NTMxOTkgNDMuMjA4MTA3IDAgMC0yLjUyMjU3MSAxNy4zNjQyOTItMi41MjI1NzEgNDEuMzA1Njg5IDAgMjQuMDAzODIyIDIuNTIyNTcxIDQxLjM2OTEzNyAyLjUyMjU3MSA0MS4zNjkxMzcgMi4yOTMzMzkgMTUuNzg5MzQ5LTcuMTM4OTI2IDM1LjIyNzk4Mi0yMC45NTkzNCA0My4xOTY4NWwtNTIuMTk0MTkgMzAuMDkzODA5Yy0xMy44MjE0MzYgNy45Njg4NjgtMTguNTk4NDU5IDI1Ljc5MjY0Ny0xMC42MTYyODggMzkuNjA2OTJsOTkuMTM0NDczIDE3MS41NTgzNWM3Ljk4MzE5NSAxMy44MTMyNSAyNS44MTkyNTQgMTguNTkwMjcyIDM5LjYzNzYyIDEwLjYxNTI2NGw1Mi4yMDc0OTMtMzAuMTMzNzJjMTMuODE3MzQzLTcuOTc1MDA4IDM1LjQxNTI1Ni02LjQ3MDY3NSA0Ny45OTQzNCAzLjM0NDMyNSAwIDAgMTIuNzgxNzA4IDkuOTcyNTk3IDMyLjQyMTk0MiAyMS40NzUxMTEgMjAuODI5MzczIDEyLjE4OTE4NSAzOS4xOTA0MTQgMTkuNjc3MDc1IDM5LjE5MDQxNCAxOS42NzcwNzUgMTQuNzc0MTggNi4wMjU1MTYgMjYuODYxMDMgMjQuMDA3OTE1IDI2Ljg2MTAzIDM5Ljk2MzA0N2wwIDYwLjMxNjU2MWMwIDE1Ljk1NTEzMiAxMy4wNTM5MiAyOS4wMDkwNTIgMjkuMDA5MDUyIDI5LjAwOTA1MmwxOTguMTgwOTM4IDBjMTUuOTU1MTMyIDAgMjkuMDA5MDUyLTEzLjA1MzkyIDI5LjAwOTA1Mi0yOS4wMDkwNTJsMC02MC4zMTY1NjFjMC0xNS45NTUxMzIgMTIuMDkwOTQzLTMzLjkyODMyMSAyNi44NjkyMTYtMzkuOTQxNTU3IDAgMCAxNi45MTQwMTYtNi44ODMwODggMzcuMTE4MTItMTguNTEwNDUgMjAuMzkwMzU0LTExLjc1MjIxMiAzNC40NjA0NjYtMjIuNjk2OTk3IDM0LjQ2MDQ2Ni0yMi42OTY5OTcgMTIuNTkzNDEtOS43OTU1NTcgMzQuMjA0NjI3LTExLjI4NzYwOSA0OC4wMjUwNC0zLjMxNTY3MWw1Mi4yNjA3MDggMzAuMTQ2YzEzLjgyMDQxMyA3Ljk3MTkzOCAzMS42NTc0OTYgMy4xOTA4MjIgMzkuNjM2NTk3LTEwLjYyNTQ5OGw5OS4wODEyNTktMTcxLjU1MTE4N2M3Ljk4MDEyNS0xMy44MTYzMiAzLjIwMDAzMi0zMS42NDExMjItMTAuNjIxNDA1LTM5LjYwOTk5TDkxNC44MDA4MjcgNTk2LjkzMjM0OWMtMTMuODIxNDM2LTcuOTY4ODY4LTIzLjI1MzcwMi0yNy40MDc1MDEtMjAuOTU5MzQtNDMuMTk2ODVDODkzLjg0MTQ4OCA1NTMuNzM1NDk5IDg5Ni4zNjQwNTkgNTM2LjM3MTIwNiA4OTYuMzY0MDU5IDUxMi4zNjczODV6TTUxMi4wNjQ0NzEgNjcyLjM5NjYxNGMtODguNDQzNDgxIDAtMTYwLjEyNDQwMi03MS42Mzg5NjMtMTYwLjEyNDQwMi0xNjAuMDMwMjUzczcxLjY4MDkyMS0xNjAuMDMwMjUzIDE2MC4xMjQ0MDItMTYwLjAzMDI1M2M4OC40NDQ1MDQgMCAxNjAuMTI1NDI1IDcxLjYzODk2MyAxNjAuMTI1NDI1IDE2MC4wMzAyNTNTNjAwLjUwODk3NSA2NzIuMzk2NjE0IDUxMi4wNjQ0NzEgNjcyLjM5NjYxNHoiIGZpbGw9IiM3ZTdlN2UiIHAtaWQ9Ijg1OCI+PC9wYXRoPjwvc3ZnPg==";
            } else if (tab.url.indexOf("chrome://flags/") == 0) {
                iconUrl = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNTE4OTY3MTEwMTEyIiBjbGFzcz0iaWNvbiIgc3R5bGU9IiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjEzMzkiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxkZWZzPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+PC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTI3Ny4xMTQ4OCA4My4yMTAyNGwtMTcuNzU2MTYgMTAuMzAxNDRDMTI0LjY0MTI4IDE3MS42MjI0IDQwLjk2IDMxNi4yMzE2OCA0MC45NiA0NzEuMDR2MjAuNDhoMzI2LjcxNzQ0bDIuMjUyOC0xNy45MkExNDEuNzIxNiAxNDEuNzIxNiAwIDAgMSA0MjUuOTg0IDM3Ny4wMzY4bDE0LjQ3OTM2LTEwLjg3NDg4eiBtNDY5Ljc3MDI0IDAuMDYxNDRMNTgzLjU5ODA4IDM2Ni4xODI0bDE0LjQ3OTM2IDEwLjg3NDg4YTE0My44MzEwNCAxNDMuODMxMDQgMCAwIDEgNTYuMDEyOCA5Ni41NjMybDIuMjMyMzIgMTcuOTJIOTgzLjA0di0yMC40OGMwLTE1NC44MDgzMi04My42ODEyOC0yOTkuMzU2MTYtMjE4LjM5ODcyLTM3Ny40NDY0ek01MTIgMzg5LjEyYTEwMi40IDEwMi40IDAgMSAwIDAgMjA0LjggMTAyLjQgMTAyLjQgMCAwIDAgMC0yMDQuOHogbTczLjc2ODk2IDIyNi43OTU1MmwtMTYuNDg2NCA3LjA0NTEyYTE0Ny4xODk3NiAxNDcuMTg5NzYgMCAwIDEtMTEwLjM4NzIgMS41OTc0NGwtMTYuMjYxMTItNi4zMDc4NC0xNjMuNjc2MTYgMjc2LjYyMzM2IDE4LjE2NTc2IDEwLjMyMTkyQTQ0My43MTk2OCA0NDMuNzE5NjggMCAwIDAgNTE0Ljg2NzIgOTYyLjU2Yzc2LjA2MjcyIDAgMTUxLjQyOTEyLTE5Ljg0NTEyIDIxNy45MDcyLTU3LjM0NGwxOC4xNjU3Ni0xMC4zNDI0eiIgcC1pZD0iMTM0MCIgZmlsbD0iIzdkN2Q3ZCI+PC9wYXRoPjwvc3ZnPg==";
            }

            var iconWidth = 14;
            tabsDiv.append(
                "<li style='position: relative; padding: 5px 0; padding-left: 23px; border-bottom: 1px solid #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: url(" + iconUrl + ") no-repeat 0 50% / 18px'>" +

                "   <div class='z_tab_id' hidden>" + tab.id + "</div>" +
                "   <span class='z_tab_title' style='color: black; cursor: pointer'>" + tab.title + "</span>" +

                "   <div class='z_tab_action' style='position: absolute; top: 50%;'>" +
                "      <div class='iconfont icon-remove' style='position: absolute; right: 0; margin-top: -" + iconWidth / 2 + "px; height: " + iconWidth + "px; width: " + iconWidth + "px; line-height: " + iconWidth + "px; text-align: center; font-size: 8px; border-radius: 50%'></div>" +
                "   </div>" +

                "</li>"
            );

            var tabLi = tabsDiv.find("li:eq(" + i + ")");
            var tabActionDiv = tabLi.find(".z_tab_action");

            // 隐藏最后一项边框
            if (i == msg.tabs.length - 1) {
                tabLi.css("border", "none");
            }

            // 默认隐藏图标，即 right 为 -( 图标个数 * 宽度 )
            var iconSize = tabLi.find(".iconfont").length;
            tabActionDiv.css("right", -(iconSize * iconWidth));

            // 当前标签页加粗显示
            if (tab.highlighted) {
                tabLi.find(".z_tab_title").css("font-weight", "bold");
                // 滚动条偏移到当前标签页位置
                tabsDiv.scrollTop(tabLi.offset().top);
            }

            // 标签页是否固定
            if (tab.pinned) {
                // 将删除按钮更改为固定按钮
                var pinTabBtn = tabLi.find(".icon-remove").attr("class", "iconfont icon-pinned");

                // 显示固定标签页的图标，声音图标在其左，所以 right 为 0 即可
                tabActionDiv.css("right", 0);
                // 改变标题宽度，防止文字与图标重叠
                tabLi.css("padding-right", iconWidth + 2);
            } else {
                // 鼠标移上移出显示隐藏删除图标
                tabLi.mouseover(function () {
                    showAndHideTabAction.call($(this), true);
                });
                tabLi.mouseleave(function () {
                    showAndHideTabAction.call($(this), false);
                });
            }

            // 标签页是否静音
            if (tab.mutedInfo.muted) {
                tabActionDiv.prepend("<div class='iconfont icon-muted' style='position: absolute; right: " + iconSize * iconWidth + "px; margin-top: -" + iconWidth / 2 + "px; height: " + iconWidth + "px; width: " + iconWidth + "px; line-height: " + iconWidth + "px; text-align: center; font-size: 8px; border-radius: 50%'></div>");
                tabLi.css("padding-right", tabLi.find(".icon-pinned").width() + iconWidth);
                // 鼠标移上显示声音图标，移出恢复静音图标
                tabLi.find(".icon-muted").mouseover(function () {
                    $(this).attr("class", "iconfont icon-vocal");
                });
                tabLi.find(".icon-muted").mouseleave(function () {
                    $(this).attr("class", "iconfont icon-muted");
                });
            }
            // 如果有声音标志（不静音）
            else if (tab.audible) {
                tabActionDiv.prepend("<div class='iconfont icon-vocal' style='position: absolute; right: " + iconSize * iconWidth + "px; margin-top: -" + iconWidth / 2 + "px; height: " + iconWidth + "px; width: " + iconWidth + "px; line-height: " + iconWidth + "px; text-align: center; font-size: 8px; border-radius: 50%'></div>");
                tabLi.css("padding-right", tabLi.find(".icon-pinned").width() + iconWidth);
                // 鼠标移上显示静音图标，移出恢复声音图标
                tabLi.find(".icon-vocal").mouseover(function () {
                    $(this).attr("class", "iconfont icon-muted");
                });
                tabLi.find(".icon-vocal").mouseleave(function () {
                    $(this).attr("class", "iconfont icon-vocal");
                });
            }
        });

        // 根据设置改变宽度
        if (msg.mainDivWidth) {
            // 如果是点击操作按钮刷新了列表，则不需要隐藏
            if (manuallyOperated == false) {
                // 防止加载宽度后显示出来
                mainDiv.css("left", -msg.mainDivWidth + showDiv.width());
                manuallyOperated = false;
            }
            setWidth(msg.mainDivWidth);

        }
        return true;
    });
    // endregion

    // region 标签操作
    // 点击跳转到对应的标签页
    $body.on("click", ".z_tab_title", function () {
        var tabId = parseInt($(this).parent().find(".z_tab_id").text());
        port.postMessage({requestType: RequestTypeEnum.GOTO_TAB, tabId: tabId});
    });
    // 是否为手动操作刷新标签页状态
    var manuallyOperated = false;
    // 关闭标签页
    $body.on("click", ".icon-remove", function () {
        var tabId = parseInt($(this).parent().parent().find(".z_tab_id").text());
        port.postMessage({requestType: RequestTypeEnum.REMOVE_TAB, tabId: tabId});

        manuallyOperated = true;
    });
    // 静音和取消静音标签页
    $body.on("click", ".icon-vocal", function () {
        var $this = $(this);
        $this.unbind("mouseover");
        $this.unbind("mouseleave");
        $this.attr("class", "iconfont icon-vocal");
        $this.mouseover(function () {
            $(this).attr("class", "iconfont icon-muted");
        });
        $this.mouseleave(function () {
            $(this).attr("class", "iconfont icon-vocal");
        });

        var tabId = parseInt($(this).parent().parent().find(".z_tab_id").text());
        port.postMessage({requestType: RequestTypeEnum.VOCAL_TAB, tabId: tabId});

        manuallyOperated = true;
    });
    $body.on("click", ".icon-muted", function () {
        var $this = $(this);
        $this.unbind("mouseover");
        $this.unbind("mouseleave");
        $this.attr("class", "iconfont icon-muted");
        $this.mouseover(function () {
            $this.attr("class", "iconfont icon-vocal");
        });
        $this.mouseleave(function () {
            $this.attr("class", "iconfont icon-muted");
        });

        var tabId = parseInt($(this).parent().parent().find(".z_tab_id").text());
        port.postMessage({requestType: RequestTypeEnum.MUTED_TAB, tabId: tabId});

        manuallyOperated = true;
    });

    // 右键菜单
    // $body.on("contextmenu", "#z_tabs li", function (event) {
    //     // var tabId = parseInt($(this).parent().find(".z_tab_id").text());
    //     // 指定位置显示菜单，不受滚动条影响
    //     menuDiv.css("top", event.clientY);
    //     menuDiv.css("left", event.clientX);
    //     menuDiv.show();
    //
    //     // 将鼠标移出主体内容隐藏事件替换为移出右键菜单隐藏事件
    //     doc.unbind("mousemove").mousemove(function (event) {
    //         var clientX = event.clientX;
    //         var clientY = event.clientY;
    //
    //         var menuDivPosition = menuDiv.position();
    //         if (clientX < menuDivPosition.left - 5 || clientX > menuDivPosition.left + menuDiv.width() + 5 || clientY < menuDivPosition.top - 5 || clientY > menuDivPosition.top + menuDiv.height() + 5) {
    //             menuDiv.hide();
    //             // 再重新绑定鼠标移出主体内容隐藏事件
    //             hideMainDiv(parseInt(menuDiv.css("left")) + menuDiv.width() - mainDiv.width());
    //         }
    //     });
    //     return false;
    // });
    // 取消固定标签页
    // $body.on("click", ".icon-pinned", function () {
    //     var tabId = parseInt($(this).next().text());
    //     port.postMessage({requestType: RequestTypeEnum.UNPINNED_TAB, tabId: tabId});
    //     manuallyOperated = true;
    // });
    // endregion
});
