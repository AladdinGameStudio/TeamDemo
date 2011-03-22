FUI.ns("Space.impression.pc");

Space.impression.pc = {

    Popup: function(base, container) {
        var maskHeight = $(base).height();
        var maskWidth = $(base).width();
        var dialogTop = maskHeight / 2 - $(container).height() / 2;
        var dialogLeft = maskWidth / 2 - $(container).width() / 2;
        $(container).css({ top: dialogTop, left: dialogLeft }).show();
    },

    OpenSetting: function() {
        var self = Space.impression.pc;
        ($).ajax({
            url: '/impression/pc/getsetting?dt=' + new Date().getMilliseconds(),
            dataType: 'json',
            type: 'get',
            success: function(data) {
                var settings = '<li><input id="chkReview" type="checkbox" ';
                if (data.EnableReview) {
                    settings += 'checked';
                }
                settings += '/><label for="checkbox-1">允许好友对我评价</label></li>';
                settings += '<li><input id="chkActivity" type="checkbox" ';
                if (data.EnableActivity) {
                    settings += 'checked';
                }
                settings += '/><label for="checkbox-2">允许同步到空间动态</label></li><li><input id="chkMsgOwn" type="checkbox" ';
                if (data.EnableMsgOwn) {
                    settings += 'checked';
                }

                settings += '/><label for="checkbox-3">收到新印象短信通知我</label></li>';
                $("#ulSetting").html(settings);
                self.Popup($("#divBase"), $("#divPop"));
            },
            error: function(e) {
                self.ShowMsg("操作失败！", 3000);
            }
        });
    },

    Init: function() {
        if (typeof (__has_impressions) != 'undefined') {
            this.RenderImpression();
            this.OnHover();
        }
        if (typeof (__SELF_PAGE__) != 'undefined') {
            $("#lnkSetting").click(this.OpenSetting);
            $("#btnSaveSetting").click(this.SaveSetting);
            $("#lnkMore").click(this.DisplayMoreLogs);
            this.BindEvents();
        } 
    },

    InitForAdd: function() {
        $("#btnSubmit").click(this.AddImpression);
    },

    SaveSetting: function() {
        var self = Space.impression.pc;
        var enableReview = $("#chkReview").attr("checked") ? 'true' : '';
        var enableActivity = $("#chkActivity").attr("checked") ? 'true' : '';
        var enableMsgOwn = $("#chkMsgOwn").attr("checked") ? 'true' : '';
        ($).ajax({ url: '/impression/savesetting',
            dataType: 'json',
            data: { chkReview: enableReview, chkActivity: enableActivity, chkMsgOwn: enableMsgOwn },
            type: 'post',
            success: function(data) {
                if (data == "ok") {
                    window.location.reload();
                } else {
                    self.ShowMsg("操作失败！", 3000);
                }
            },
            error: function(e) {
                self.ShowMsg("操作失败！", 3000);
            }
        });
    },

    DisplayMoreLogs: function() {
        var self = Space.impression.pc;
        ($).ajax({ url: '/impression/pc/morelogs',
            dataType: 'json',
            type: 'post',
            success: function(data) {
                var html = $("<ul></ul>");
                if (data.length > 0) {
                    $.each(data, function(index, item) {
                        var template = index % 2 == 0 ?
                            '<li class="bg"><a href="javascript:void(0);" title="{0}" onclick="window.external.ShowContactInfo(\'{1}\');">{2}</a><span>{3}</span>{4}</li>' :
                            '<li><a href="javascript:void(0);" title="{0}" onclick="window.external.ShowContactInfo(\'{1}\');">{2}</a><span>{3}</span>{4}</li>';
                        $(html).append(String.Format(template,
                            '描述' + item["CreatorNickname"],
                            item["CreatorSid"],
                            item["CreatorNickname"],
                            item["Description"],
                            item["ImpressionText"]
                            ));
                    });
                    $("#divImpList").append(html);
                    $("#divImpList").show();
                }
            },
            error: function(e) {
                self.ShowMsg("操作失败！", 3000);
            }
        });

    },

    __STYLES__: [
        ['impress_pic_cont_bg01', 'impress_pic_cont_bg01_cur'], //1~2个字
        ['impress_pic_cont_bg03', 'impress_pic_cont_bg03_cur'], //3~4个字
        ['impress_pic_cont_bg04', 'impress_pic_cont_bg04_cur'], //5~8个字
        ['impress_pic_cont_bg02', 'impress_pic_cont_bg02_cur']//9~10个字
    ],

    _containerSelector: '#divImpressions',

    _impressionListSelector: "#divImpressions > div",

    RenderImpression: function() {
        this.sortedList = $(this._impressionListSelector).sort(
            function(a, b) {
                return parseInt($(a).attr('count')) <=
                parseInt($(b).attr('count'));
            }
        );
        this._blockWidth = 90;
        this._blockHeight = 40;
        this._Width = $(this._containerSelector).width();
        this._Height = $(this._containerSelector).height();
        this._Center = {
            X: this._Width / 2 - (this._blockWidth / 2),
            Y: this._Height / 2 - (this._blockHeight / 2)
        };
        this._drawImpressionNode(this.sortedList[0], this._Center);

        this.sortedList.splice(0, 1);

        var seed = 4;
        var delta = 100;
        var deltaAngle = Math.PI / 10; //偏转角
        var perangle = 2 * Math.PI / 4;

        while (this.sortedList.length != 0) {
            var arr = this.sortedList.slice(0, seed);
            var start = 0;
            var center = this._Center;
            var self = this;
            $.each(arr, function(index, item) {
                var angle = start * perangle + deltaAngle;
                var itemX = parseInt(Math.cos(angle) * delta);
                var itemY = parseInt(Math.sin(angle) * delta / 2);
                var itemXY = {
                    X: itemX + center.X < 0 ? 0 : itemX + center.X,
                    Y: -itemY + center.Y < 0 ? 0 : -itemY + center.Y
                };
                self._drawImpressionNode(item, itemXY);
                start++;
            });
            this.sortedList.splice(0, seed);
            perangle = perangle / 2;
            deltaAngle += deltaAngle;
            seed = seed * 2;
            delta += 90;
        }
    },

    _drawImpressionNode: function(item, location) {
        var text = $($(item).find('div > span')[0]).text();
        $($(item).find('div')[0]).addClass(this._getClassByTextLength(text.length, false));
        //为了避免右侧的印象块跟窗口右边框太接近，做一下修正 310约等于整个区域的宽度- 最大的印象块的宽度 - 10px
        if (location.X > 310) { location.X = 310 };
        $(item).css({ left: location.X, top: location.Y });
    },

    _getClassByTextLength: function(length, ishover) {
        if (length <= 2) return this.__STYLES__[0][ishover ? 1 : 0];
        if (length > 2 && length <= 4) return this.__STYLES__[1][ishover ? 1 : 0];
        if (length >= 5 && length <= 8) return this.__STYLES__[2][ishover ? 1 : 0];
        if (length > 8) return this.__STYLES__[3][ishover ? 1 : 0];
    },

    BindEvents: function() {
        /**
        
        **/
        var self = this;
        var items = $(self._impressionListSelector);

        $.each(items, function(index, item) {
            var clsObj = $(item).find('div')[0];
            var impressionId = $(clsObj).attr('impressionid');
            var text = $($(item).find('div > span')[0]).text();
            var deleteHtm = '<em class="impress_pic_del"><a title="删除此印象" href="javascript:void(0);" onclick="Space.impression.pc.DeleteImpression(' + impressionId + ', \'' + text + '\')">删除</a></em>';

            var hoverClass = self._getClassByTextLength(text.length, true);
            var plainClass = self._getClassByTextLength(text.length, false);
            $(item).hover(
            function() {
                $(clsObj).prepend($(deleteHtm));
                $(clsObj).removeClass(plainClass).addClass(hoverClass);
            },
            function() {
                $($(clsObj).find('em')[0]).remove();
                $(clsObj).removeClass(hoverClass).addClass(plainClass);
            }
            );
        });
    },

    OnHover: function() {
        var self = this;
        var items = $(self._impressionListSelector);
        $.each(items, function(index, item) {
            $(item).hover(
            function() {
                $(item).css('z-index', 1000); //通过设置z-index来解决遮挡
            },
            function() {
                $(item).css('z-index', parseInt($(item).attr('count')));
            }
          );
        });
    },

    DeleteImpression: function(id, text) {
        var innerHtml =
        String.Format('<span><p>是否删除印象“{0}”</p><div class="impress_pop_set"><a href="javascript:void(0);" onclick="Space.impression.pc.DeleteConfirm(' + id + ')">是</a><a href="javascript:void(0);" onclick="$(\'.impress_pop\').hide();">否</a></div></span>', text);
        this.Popup($("#divBase"), $(".impress_pop").html(innerHtml));
    },

    DeleteConfirm: function(id) {
        var self = this;
        ($).ajax({
            url: '/impression/delete/' + id,
            dataType: 'json',
            type: 'post',
            success: function(data) {
                if (data.State == "ok") {
                    self.ShowMsg('删除成功', 3000);
                    setTimeout(function() {
                        window.location.reload();
                    }, 2000);
                }
            },
            error: function(err) {
                self.ShowMsg('删除失败，请重试！', 2000);
            }
        });
    },

    ShowMsg: function(message, timeout) {
        var win = $(".impress_pop");
        message = String.Format('<span>{0}</span>', message);
        this.Popup($("#divBase"), $(win).html(message));

        setTimeout(function() { (win).hide(); }, timeout);
    },

    AddImpression: function() {
        var self = Space.impression.pc;
        var impression = $("#txtImpression").val();
        impression = $.trim(impression);
        if (impression.length == 0) {
            self.ShowMsg('请输入描述内容', 2000);
            return;
        } else {
            var friendId = _currentFriendId;
            ($).ajax({
                url: '/impression/save',
                dataType: 'json',
                data: { txtImpression: impression, friendId: friendId },
                type: 'post',
                success: function(data) {
                    if (data.State == "0") {
                        self.ShowMsg('描述成功', 2000);
                        var backUrl = $("#lnkBackUrl").attr('href');
                        setTimeout(function() {
                            window.location = backUrl;
                        }, 2000);
                    }
                    else if (data.State == "3") {
                        self.ShowMsg('描述失败', 3000);
                    }
                    else if (data.State == "4") {
                        self.ShowMsg('好友不允许被评价', 3000);
                    }
                    else {
                        self.ShowMsg(data.Message, 3000);
                    }
                },
                error: function(err) {
                    self.ShowMsg('描述失败', 3000);
                }
            });
        }
    }
}

Space.impression.pc.AjaxPager = {
    DataSouce: null,
    TotalCount: 0,
    PageSize: 0,
    PageIndex: 0,
    PageCount: 0,

    RowTemplate: '<td onclick="Space.impression.pc.AjaxPager._dataSelected(this);"><span title="{0}" class="tag_item"><a href="javascript:void(0);" class="tag_color1">{1}</a></span></td>',
    AlternativeRowTemplate: '<td onclick="Space.impression.pc.AjaxPager._dataSelected(this);"><span title="{0}" class="tag_item"><a href="javascript:void(0);" class="tag_color2">{1}</a></span></td>',

    handleRequest: function() {
        var start = this.PageIndex * this.PageSize;
        var end = start + this.PageSize;

        var data = end > this.DataSouce.length ? this.DataSouce.slice(start) : this.DataSouce.slice(start, end);
        $(".impress_give_tag").html(this.buildHtml(data));
    },

    prev: function() {
        var self = Space.impression.pc.AjaxPager;
        if (self.PageIndex == 0) {//已经是第一页
            return;
        }
        self.PageIndex--;
        self.handleRequest();
    },

    next: function() {
        var self = Space.impression.pc.AjaxPager;
        if (self.PageIndex == self.PageCount - 1) {
            return;
        }
        self.PageIndex++;
        self.handleRequest();
    },

    buildHtml: function(data) {
        var self = this;
        var html = '';
        var rowIndex = 0;
        var rowdata = data.splice(0, 6);
        while (rowdata.length > 0) {
            var rowTemplate = (rowIndex++) % 2 == 0 ? self.RowTemplate : self.AlternativeRowTemplate;
            html += this._buildRow(rowTemplate, rowdata);
            rowdata = data.splice(0, 6);
        }
        return html;
    },

    _buildRow: function(template, data) {
        var html = '<table cellspacing="0" cellpadding="0" border="0"><tbody><tr>';
        var self = this;
        $.each(data, function(index, item) {
            html += String.Format(template, item, item);
        });
        html += '</tr></tbody></table>';
        return html;
    },

    Init: function(data) {
        this.DataSouce = eval(data);
        this.PageIndex = 0;
        this.PageSize = 24;
        this.PageCount = Math.ceil(this.DataSouce.length / this.PageSize);
        this.handleRequest();

        this._bindEvents();
    },

    _bindEvents: function() {
        $("#lnkLeft").click(this.prev);
        $("#lnkRight").click(this.next);
    },

    _dataSelected: function(item) {
        var txt = $($(item).find('span')[0]).attr('title');
        $("#txtImpression").val(txt);
    }
}

String.Format = function() {
    if (arguments.length == 0)
        return null;
    var value = arguments[0];
    for (var i = 1, count = arguments.length; i < count; i++) {
        var pattern = new RegExp('\\{' + (i - 1) + '\\}', 'gm');
        value = value.replace(pattern, arguments[i]);
    }
    return value;
}